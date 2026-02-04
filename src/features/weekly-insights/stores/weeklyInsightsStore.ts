/**
 * Weekly Insights Store
 * Zustand store with AsyncStorage persistence for weekly insights cache
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  WeeklyInsightsCache,
  WeeklyInsightResponse,
  WeeklyQuestionCategory,
  InsightToastData,
  LLMStatus,
} from '../types/weeklyInsights.types';
import { getWeekStart } from '../utils/weekUtils';

interface WeeklyInsightsState {
  // Cache (persisted)
  cache: WeeklyInsightsCache | null;

  // View state (not persisted)
  selectedWeekStart: string | null;
  selectedQuestionId: string | null;
  isGenerating: boolean;
  generationError: string | null;
  llmStatus: LLMStatus;
  downloadProgress: number;

  // Category filter
  selectedCategory: WeeklyQuestionCategory | null;

  // Toast
  toast: InsightToastData;

  // Per-question errors (for retry support)
  perQuestionErrors: Record<string, string>;

  // Actions
  setSelectedWeek: (weekStart: string | null) => void;
  selectQuestion: (questionId: string | null) => void;
  setCache: (cache: WeeklyInsightsCache) => void;
  setCachedResponse: (questionId: string, response: WeeklyInsightResponse) => void;
  setIsGenerating: (generating: boolean) => void;
  setGenerationError: (error: string | null) => void;
  setLLMStatus: (status: LLMStatus) => void;
  setDownloadProgress: (progress: number) => void;
  setSelectedCategory: (category: WeeklyQuestionCategory | null) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  setQuestionError: (questionId: string, error: string) => void;
  clearQuestionError: (questionId: string) => void;

  // Derived
  shouldRecomputeQuestions: () => boolean;
  getCachedResponse: (questionId: string) => WeeklyInsightResponse | null;
  getEffectiveWeekStart: () => string;
}

export const useWeeklyInsightsStore = create<WeeklyInsightsState>()(
  persist(
    (set, get) => ({
      cache: null,
      selectedWeekStart: null,
      selectedQuestionId: null,
      isGenerating: false,
      generationError: null,
      llmStatus: 'unsupported' as LLMStatus,
      downloadProgress: 0,
      selectedCategory: null,
      toast: { message: '', visible: false },
      perQuestionErrors: {},

      setSelectedWeek: (weekStart) => {
        console.log(`[LLM:WeeklyStore] setSelectedWeek(${weekStart})`);
        set({
          selectedWeekStart: weekStart,
          selectedQuestionId: null,
        });
      },

      selectQuestion: (questionId) => {
        console.log(`[LLM:WeeklyStore] selectQuestion(${questionId})`);
        set({ selectedQuestionId: questionId });
      },

      setCache: (cache) => {
        console.log(`[LLM:WeeklyStore] setCache() — week=${cache.weekStartDate}, questions=${cache.questions.length}, responses=${Object.keys(cache.responses).length}`);
        set({ cache });
      },

      setCachedResponse: (questionId, response) => {
        const current = get().cache;
        if (!current) return;
        console.log(`[LLM:WeeklyStore] setCachedResponse(${questionId}) — source=${response.source}, length=${response.text?.length || 0}`);
        set({
          cache: {
            ...current,
            responses: { ...current.responses, [questionId]: response },
          },
        });
      },

      setIsGenerating: (generating) => {
        console.log(`[LLM:WeeklyStore] setIsGenerating(${generating})`);
        set({ isGenerating: generating });
      },

      setGenerationError: (error) => {
        console.log(`[LLM:WeeklyStore] setGenerationError(${error})`);
        set({ generationError: error });
      },

      setLLMStatus: (status) => {
        console.log(`[LLM:WeeklyStore] setLLMStatus(${status})`);
        set({ llmStatus: status });
      },

      setDownloadProgress: (progress) => set({ downloadProgress: progress }),

      setSelectedCategory: (category) => {
        console.log(`[LLM:WeeklyStore] setSelectedCategory(${category})`);
        set({ selectedCategory: category });
      },

      showToast: (message) => {
        set({ toast: { message, visible: true } });
      },

      hideToast: () => {
        set({ toast: { message: '', visible: false } });
      },

      setQuestionError: (questionId, error) => {
        console.log(`[LLM:WeeklyStore] setQuestionError(${questionId}, ${error})`);
        set((state) => ({
          perQuestionErrors: { ...state.perQuestionErrors, [questionId]: error },
        }));
      },

      clearQuestionError: (questionId) => {
        console.log(`[LLM:WeeklyStore] clearQuestionError(${questionId})`);
        set((state) => {
          const { [questionId]: _, ...rest } = state.perQuestionErrors;
          return { perQuestionErrors: rest };
        });
      },

      shouldRecomputeQuestions: () => {
        const { cache, selectedWeekStart } = get();
        if (!cache) {
          console.log('[LLM:WeeklyStore] shouldRecompute → true (no cache)');
          return true;
        }
        const targetWeek = selectedWeekStart || getWeekStart();
        if (cache.weekStartDate !== targetWeek) {
          console.log(`[LLM:WeeklyStore] shouldRecompute → true (week mismatch: cached=${cache.weekStartDate}, target=${targetWeek})`);
          return true;
        }
        if (Date.now() > cache.validUntil) {
          console.log('[LLM:WeeklyStore] shouldRecompute → true (cache expired)');
          return true;
        }
        console.log(`[LLM:WeeklyStore] shouldRecompute → false (cache valid, ${cache.questions.length} questions)`);
        return false;
      },

      getCachedResponse: (questionId) => {
        const { cache } = get();
        const cached = cache?.responses[questionId] ?? null;
        console.log(`[LLM:WeeklyStore] getCachedResponse(${questionId}) → ${cached ? `hit (source=${cached.source})` : 'miss'}`);
        return cached;
      },

      getEffectiveWeekStart: () => {
        return get().selectedWeekStart || getWeekStart();
      },
    }),
    {
      name: 'weekly-insights-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ cache: state.cache }),
    }
  )
);
