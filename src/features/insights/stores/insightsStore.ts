/**
 * Insights Store
 * Manages cached insights and LLM state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Insight, CachedInsights, LLMStatus, LLMDownloadProgress } from '../types/insights.types';

interface InsightsState {
  // Cached insights
  cachedInsights: CachedInsights | null;

  // LLM state
  llmStatus: LLMStatus;
  downloadProgress: LLMDownloadProgress | null;

  // Generation state
  isGenerating: boolean;
  lastGenerationTime: number | null;
  generationError: string | null;

  // User preferences
  llmEnabled: boolean;

  // Actions
  setInsights: (insights: Insight[], source: 'llm' | 'fallback') => void;
  clearInsights: () => void;
  setLLMStatus: (status: LLMStatus) => void;
  setDownloadProgress: (progress: LLMDownloadProgress | null) => void;
  setIsGenerating: (generating: boolean) => void;
  setGenerationError: (error: string | null) => void;
  setLLMEnabled: (enabled: boolean) => void;
  shouldRegenerateInsights: () => boolean;
}

const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

export const useInsightsStore = create<InsightsState>()(
  persist(
    (set, get) => ({
      // Initial state
      cachedInsights: null,
      llmStatus: 'not_downloaded',
      downloadProgress: null,
      isGenerating: false,
      lastGenerationTime: null,
      generationError: null,
      llmEnabled: true,

      // Actions
      setInsights: (insights, source) => {
        const now = Date.now();
        const today = new Date().toISOString().split('T')[0];
        set({
          cachedInsights: {
            insights,
            generatedAt: now,
            validUntil: now + CACHE_DURATION_MS,
            source,
            date: today,
          },
          lastGenerationTime: now,
          generationError: null,
          isGenerating: false,
        });
      },

      clearInsights: () => set({ cachedInsights: null }),

      setLLMStatus: (status) => set({ llmStatus: status }),

      setDownloadProgress: (progress) => set({ downloadProgress: progress }),

      setIsGenerating: (generating) => set({ isGenerating: generating }),

      setGenerationError: (error) => set({ generationError: error, isGenerating: false }),

      setLLMEnabled: (enabled) => set({ llmEnabled: enabled }),

      shouldRegenerateInsights: () => {
        const { cachedInsights } = get();
        if (!cachedInsights) return true;

        const now = Date.now();
        const today = new Date().toISOString().split('T')[0];

        // Regenerate if cache expired or date changed
        if (now > cachedInsights.validUntil) return true;
        if (cachedInsights.date !== today) return true;

        return false;
      },
    }),
    {
      name: 'insights-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cachedInsights: state.cachedInsights,
        llmEnabled: state.llmEnabled,
      }),
    }
  )
);
