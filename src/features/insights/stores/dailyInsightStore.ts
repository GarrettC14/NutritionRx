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
        const noCache = !cache;
        const dateStale = cache ? cache.date !== getTodayString() : false;
        const ttlExpired = cache ? Date.now() - cache.lastDataUpdate > CACHE_DATA_TTL : false;
        const shouldRefresh = noCache || dateStale || ttlExpired;
        if (__DEV__) console.log(`[LLM:DailyStore] shouldRefreshData() → ${shouldRefresh} (noCache=${noCache}, dateStale=${dateStale}, ttlExpired=${ttlExpired})`);
        return shouldRefresh;
      },

      refreshData: async () => {
        if (__DEV__) console.log('[LLM:DailyStore] refreshData() — START');
        const refreshStart = Date.now();
        try {
          const data = await collectDailyInsightData();
          const today = getTodayString();

          // Score all questions
          if (__DEV__) console.log(`[LLM:DailyStore] Scoring ${questionRegistry.length} questions...`);
          const scores: ScoredQuestion[] = questionRegistry.map((def) => ({
            definition: def,
            available: def.isAvailable(data),
            relevanceScore: def.isAvailable(data) ? def.computeRelevance(data) : 0,
          }));
          const availableCount = scores.filter(s => s.available).length;
          const topScores = scores.filter(s => s.available).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
          if (__DEV__) console.log(`[LLM:DailyStore] Scored — ${availableCount}/${scores.length} available, top5: ${topScores.map(s => `${s.definition.id}(${s.relevanceScore.toFixed(2)})`).join(', ')}`);

          // Compute headline
          const headline = computeWidgetHeadline(data);
          if (__DEV__) console.log(`[LLM:DailyStore] Headline: "${headline.text}" (icon=${headline.icon}, priority=${headline.priority})`);

          // Preserve existing LLM responses if still valid for today
          const existingCache = get().cache;
          const existingResponses =
            existingCache?.date === today ? existingCache.responses : {};
          if (__DEV__) console.log(`[LLM:DailyStore] Preserving ${Object.keys(existingResponses).length} existing responses from today's cache`);

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
          if (__DEV__) console.log(`[LLM:DailyStore] refreshData() — DONE in ${Date.now() - refreshStart}ms`);
        } catch (error) {
          if (__DEV__) console.error('[LLM:DailyStore] refreshData() — ERROR:', error);
        }
      },

      generateInsight: async (questionId: DailyQuestionId) => {
        if (__DEV__) console.log(`[LLM:DailyStore] generateInsight() — questionId=${questionId}`);
        const genStart = Date.now();
        const { cache, llmStatus } = get();
        if (__DEV__) console.log(`[LLM:DailyStore] Current state — llmStatus=${llmStatus}, hasCacheData=${!!cache?.data}, cacheDate=${cache?.date}, cachedResponses=${cache ? Object.keys(cache.responses).length : 0}`);

        // Check for cached response
        if (cache?.responses[questionId]) {
          const cached = cache.responses[questionId];
          const age = Date.now() - cached.generatedAt;
          const isFresh = age < CACHE_RESPONSE_TTL && cached.date === getTodayString();
          if (__DEV__) console.log(`[LLM:DailyStore] Found cached response for ${questionId} — source=${cached.source}, age=${(age / 1000).toFixed(0)}s, fresh=${isFresh}`);
          if (isFresh) {
            if (__DEV__) console.log(`[LLM:DailyStore] generateInsight → CACHE HIT for ${questionId}`);
            return cached;
          }
        }

        // Ensure we have data
        if (!cache?.data || cache.date !== getTodayString()) {
          if (__DEV__) console.log('[LLM:DailyStore] Data stale or missing, refreshing...');
          await get().refreshData();
        }

        const data = get().cache?.data;
        if (!data) {
          if (__DEV__) console.error('[LLM:DailyStore] generateInsight → ERROR: no data after refresh');
          throw new Error('No data available');
        }

        // Run the analyzer for this question
        const analyzer = questionAnalyzers[questionId];
        if (!analyzer) {
          if (__DEV__) console.error(`[LLM:DailyStore] generateInsight → ERROR: no analyzer for ${questionId}`);
          throw new Error(`No analyzer for question: ${questionId}`);
        }

        if (__DEV__) console.log(`[LLM:DailyStore] Running analyzer for ${questionId}...`);
        const analysis = analyzer(data);
        if (__DEV__) console.log(`[LLM:DailyStore] Analyzer result — fallbackText="${analysis.fallbackText.substring(0, 100)}...", dataBlock length=${analysis.dataBlock.length}`);

        // If LLM not available, use fallback
        if (llmStatus !== 'ready') {
          if (__DEV__) console.log(`[LLM:DailyStore] LLM not ready (status=${llmStatus}), using fallback for ${questionId}`);
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

          if (__DEV__) console.log(`[LLM:DailyStore] generateInsight → FALLBACK for ${questionId} in ${Date.now() - genStart}ms`);
          return fallbackResponse;
        }

        // Guard against concurrent generation — only one LLM call at a time
        if (get().isGenerating) {
          if (__DEV__) console.log(`[LLM:DailyStore] Already generating, returning fallback for ${questionId}`);
          return {
            questionId,
            narrative: analysis.fallbackText,
            icon: 'leaf-outline',
            generatedAt: Date.now(),
            source: 'fallback' as const,
            date: getTodayString(),
          };
        }

        // Generate with LLM
        if (__DEV__) console.log(`[LLM:DailyStore] Generating with LLM for ${questionId}...`);
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
          const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
          if (__DEV__) console.log(`[LLM:DailyStore] Full prompt length: ${fullPrompt.length} chars, maxTokens=${DAILY_INSIGHT_LLM_CONFIG.maxTokens}`);

          const result = await LLMService.generate(
            fullPrompt,
            DAILY_INSIGHT_LLM_CONFIG.maxTokens,
          );

          if (__DEV__) console.log(`[LLM:DailyStore] LLM result — success=${result.success}, textLength=${result.text?.length || 0}, error=${result.error || 'none'}`);

          if (!result.success || !result.text) {
            throw new Error(result.error || 'LLM returned no text');
          }

          const parsed = parseInsightResponse(result.text);
          if (__DEV__) console.log(`[LLM:DailyStore] Parsed response — isValid=${parsed.isValid}, narrativeLength=${parsed.narrative.length}, issues=[${parsed.validationIssues.join('; ')}]`);

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

          if (__DEV__) console.log(`[LLM:DailyStore] generateInsight → LLM SUCCESS for ${questionId} in ${Date.now() - genStart}ms`);
          return response;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Generation failed';
          if (__DEV__) console.error(`[LLM:DailyStore] generateInsight → LLM ERROR for ${questionId}: ${errMsg}`, error);
          set({
            isGenerating: false,
            activeQuestionId: null,
            generationError: errMsg,
          });

          // Return fallback on error
          if (__DEV__) console.log(`[LLM:DailyStore] Falling back to template for ${questionId}`);
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
        const hasHeadline = cache?.date === getTodayString() && cache.headline;
        if (__DEV__) console.log(`[LLM:DailyStore] getHeadline() — hasCachedHeadline=${!!hasHeadline}`);
        if (hasHeadline) {
          if (__DEV__) console.log(`[LLM:DailyStore] Headline: "${cache!.headline.text}"`);
          return cache!.headline;
        }
        if (__DEV__) console.log('[LLM:DailyStore] Returning default headline (no data)');
        return {
          text: "Log your first meal to unlock today's insights.",
          icon: 'leaf-outline',
          priority: 1,
          computedAt: Date.now(),
        };
      },

      getSuggestedQuestions: () => {
        const { cache } = get();
        if (!cache || cache.date !== getTodayString()) {
          if (__DEV__) console.log('[LLM:DailyStore] getSuggestedQuestions() → [] (no cache or wrong date)');
          return [];
        }

        const suggested = cache.scores
          .filter((q) => q.available)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 3);
        if (__DEV__) console.log(`[LLM:DailyStore] getSuggestedQuestions() → [${suggested.map(s => `${s.definition.id}(${s.relevanceScore.toFixed(2)})`).join(', ')}]`);
        return suggested;
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
