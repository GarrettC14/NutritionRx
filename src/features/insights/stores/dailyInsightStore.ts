/**
 * Daily Insight Store
 * Manages cached daily insights, question scoring, and LLM generation
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collectDailyInsightData } from '../services/daily/DailyDataCollector';
import { questionAnalyzers } from '../services/daily/analyzers';
import { questionRegistry } from '../constants/dailyQuestionRegistry';
import { computeWidgetHeadline } from '../services/daily/WidgetHeadlineEngine';
import {
  buildSystemPrompt,
  buildQuestionPrompt,
  DAILY_INSIGHT_LLM_CONFIG,
} from '../services/daily/DailyInsightPromptBuilder';
import { parseInsightResponse } from '../services/daily/DailyInsightResponseParser';
import { LLMService } from '../services/LLMService';
import type {
  DailyInsightStoreState,
  DailyInsightCache,
  DailyQuestionId,
  DailyQuestionCategory,
  DailyInsightResponse,
  ScoredQuestion,
  WidgetHeadlineData,
} from '../types/dailyInsights.types';
import type { LLMStatus } from '../types/insights.types';

const CACHE_DATA_TTL = 15 * 60 * 1000; // 15 minutes
const CACHE_RESPONSE_TTL = 2 * 60 * 60 * 1000; // 2 hours

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const useDailyInsightStore = create<DailyInsightStoreState>()(
  persist(
    (set, get) => ({
      cache: null,
      isGenerating: false,
      activeQuestionId: null,
      generationError: null,
      llmStatus: 'unsupported' as LLMStatus,
      downloadProgress: 0,

      shouldRefreshData: () => {
        const { cache } = get();
        if (!cache) return true;
        if (cache.date !== getTodayString()) return true;
        if (Date.now() - cache.lastDataUpdate > CACHE_DATA_TTL) return true;
        return false;
      },

      refreshData: async () => {
        try {
          const data = await collectDailyInsightData();
          const today = getTodayString();

          // Score all questions
          const scores: ScoredQuestion[] = questionRegistry.map((def) => ({
            definition: def,
            available: def.isAvailable(data),
            relevanceScore: def.isAvailable(data) ? def.computeRelevance(data) : 0,
          }));

          // Compute headline
          const headline = computeWidgetHeadline(data);

          // Preserve existing LLM responses if still valid for today
          const existingCache = get().cache;
          const existingResponses =
            existingCache?.date === today ? existingCache.responses : {};

          set({
            cache: {
              date: today,
              headline,
              data,
              scores,
              responses: existingResponses,
              lastDataUpdate: Date.now(),
            },
          });
        } catch (error) {
          console.error('[DailyInsight] Data refresh failed:', error);
        }
      },

      generateInsight: async (questionId: DailyQuestionId) => {
        const { cache, llmStatus } = get();

        // Check for cached response
        if (cache?.responses[questionId]) {
          const cached = cache.responses[questionId];
          if (
            Date.now() - cached.generatedAt < CACHE_RESPONSE_TTL &&
            cached.date === getTodayString()
          ) {
            return cached;
          }
        }

        // Ensure we have data
        if (!cache?.data || cache.date !== getTodayString()) {
          await get().refreshData();
        }

        const data = get().cache?.data;
        if (!data) throw new Error('No data available');

        // Run the analyzer for this question
        const analyzer = questionAnalyzers[questionId];
        if (!analyzer) throw new Error(`No analyzer for question: ${questionId}`);

        const analysis = analyzer(data);

        // If LLM not available, use fallback
        if (llmStatus !== 'ready') {
          const fallbackResponse: DailyInsightResponse = {
            questionId,
            narrative: analysis.fallbackText,
            icon: 'leaf-outline',
            generatedAt: Date.now(),
            source: 'fallback',
            date: getTodayString(),
          };

          set((state) => ({
            cache: state.cache
              ? {
                  ...state.cache,
                  responses: {
                    ...state.cache.responses,
                    [questionId]: fallbackResponse,
                  },
                }
              : state.cache,
          }));

          return fallbackResponse;
        }

        // Generate with LLM
        set({
          isGenerating: true,
          activeQuestionId: questionId,
          generationError: null,
        });

        try {
          const questionDef = questionRegistry.find((q) => q.id === questionId);
          if (!questionDef) throw new Error(`Question not found: ${questionId}`);

          const systemPrompt = buildSystemPrompt();
          const userPrompt = buildQuestionPrompt(questionId, questionDef.text, analysis);

          const result = await LLMService.generate(
            `${systemPrompt}\n\n${userPrompt}`,
            DAILY_INSIGHT_LLM_CONFIG.maxTokens,
          );

          if (!result.success || !result.text) {
            throw new Error(result.error || 'LLM returned no text');
          }

          const parsed = parseInsightResponse(result.text);

          const response: DailyInsightResponse = {
            questionId,
            narrative: parsed.narrative,
            icon: parsed.icon,
            generatedAt: Date.now(),
            source: 'llm',
            date: getTodayString(),
          };

          set((state) => ({
            isGenerating: false,
            activeQuestionId: null,
            cache: state.cache
              ? {
                  ...state.cache,
                  responses: {
                    ...state.cache.responses,
                    [questionId]: response,
                  },
                }
              : state.cache,
          }));

          return response;
        } catch (error) {
          set({
            isGenerating: false,
            activeQuestionId: null,
            generationError:
              error instanceof Error ? error.message : 'Generation failed',
          });

          // Return fallback on error
          return {
            questionId,
            narrative: analysis.fallbackText,
            icon: 'leaf-outline',
            generatedAt: Date.now(),
            source: 'fallback',
            date: getTodayString(),
          };
        }
      },

      getHeadline: () => {
        const { cache } = get();
        if (cache?.date === getTodayString() && cache.headline) {
          return cache.headline;
        }
        return {
          text: "Log your first meal to unlock today's insights.",
          icon: 'leaf-outline',
          priority: 1,
          computedAt: Date.now(),
        };
      },

      getSuggestedQuestions: () => {
        const { cache } = get();
        if (!cache || cache.date !== getTodayString()) return [];

        return cache.scores
          .filter((q) => q.available)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 3);
      },

      getAvailableQuestions: () => {
        const { cache } = get();
        const grouped = new Map<DailyQuestionCategory, ScoredQuestion[]>();

        if (!cache || cache.date !== getTodayString()) return grouped;

        for (const scored of cache.scores.filter((q) => q.available)) {
          const cat = scored.definition.category;
          if (!grouped.has(cat)) grouped.set(cat, []);
          grouped.get(cat)!.push(scored);
        }

        return grouped;
      },

      invalidateCache: () => {
        set((state) => ({
          cache: state.cache
            ? {
                ...state.cache,
                lastDataUpdate: 0,
                responses: {},
              }
            : null,
        }));
      },
    }),
    {
      name: 'daily-insight-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cache: state.cache,
      }),
    },
  ),
);
