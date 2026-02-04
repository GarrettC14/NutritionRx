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

  // Actions
  setSelectedWeek: (weekStart: string | null) => void;
  selectQuestion: (questionId: string | null) => void;
  setCache: (cache: WeeklyInsightsCache) => void;
  setCachedResponse: (questionId: string, response: WeeklyInsightResponse) => void;
  setIsGenerating: (generating: boolean) => void;
  setGenerationError: (error: string | null) => void;
  setLLMStatus: (status: LLMStatus) => void;
  setDownloadProgress: (progress: number) => void;

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

      setSelectedWeek: (weekStart) =>
        set({
          selectedWeekStart: weekStart,
          selectedQuestionId: null,
        }),

      selectQuestion: (questionId) =>
        set({ selectedQuestionId: questionId }),

      setCache: (cache) => set({ cache }),

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

      setIsGenerating: (generating) => set({ isGenerating: generating }),

      setGenerationError: (error) => set({ generationError: error }),

      setLLMStatus: (status) => set({ llmStatus: status }),

      setDownloadProgress: (progress) => set({ downloadProgress: progress }),

      shouldRecomputeQuestions: () => {
        const { cache, selectedWeekStart } = get();
        if (!cache) return true;
        const targetWeek = selectedWeekStart || getWeekStart();
        if (cache.weekStartDate !== targetWeek) return true;
        if (Date.now() > cache.validUntil) return true;
        return false;
      },

      getCachedResponse: (questionId) => {
        const { cache } = get();
        return cache?.responses[questionId] ?? null;
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
