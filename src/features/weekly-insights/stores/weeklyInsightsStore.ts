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
        set({
          selectedWeekStart: weekStart,
          selectedQuestionId: null,
        });
      },

      selectQuestion: (questionId) => {
        set({ selectedQuestionId: questionId });
      },

      setCache: (cache) => {
        set({ cache });
      },

      setCachedResponse: (questionId, response) => {
        const current = get().cache;
        if (!current) return;
        set({
          cache: {
            ...current,
            responses: { ...current.responses, [questionId]: response },
          },
        });
      },

      setIsGenerating: (generating) => {
        set({ isGenerating: generating });
      },

      setGenerationError: (error) => {
        set({ generationError: error });
      },

      setLLMStatus: (status) => {
        set({ llmStatus: status });
      },

      setDownloadProgress: (progress) => set({ downloadProgress: progress }),

      setSelectedCategory: (category) => {
        set({ selectedCategory: category });
      },

      showToast: (message) => {
        set({ toast: { message, visible: true } });
      },

      hideToast: () => {
        set({ toast: { message: '', visible: false } });
      },

      setQuestionError: (questionId, error) => {
        set((state) => ({
          perQuestionErrors: { ...state.perQuestionErrors, [questionId]: error },
        }));
      },

      clearQuestionError: (questionId) => {
        set((state) => {
          const { [questionId]: _, ...rest } = state.perQuestionErrors;
          return { perQuestionErrors: rest };
        });
      },

      shouldRecomputeQuestions: () => {
        const { cache, selectedWeekStart } = get();
        if (!cache) {
          return true;
        }
        const targetWeek = selectedWeekStart || getWeekStart();
        if (cache.weekStartDate !== targetWeek) {
          return true;
        }
        if (Date.now() > cache.validUntil) {
          return true;
        }
        return false;
      },

      getCachedResponse: (questionId) => {
        const { cache } = get();
        const cached = cache?.responses[questionId] ?? null;
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
