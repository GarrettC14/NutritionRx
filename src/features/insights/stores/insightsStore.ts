/**
 * Insights Store
 * Zustand store for managing cached insights and LLM state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CachedInsights,
  LLMStatus,
  LLMDownloadProgress,
  LLMCapabilities,
} from '../types/insights.types';

interface InsightsState {
  // Cached insights
  cachedInsights: CachedInsights | null;

  // Generation state
  isGenerating: boolean;
  lastError: string | null;

  // LLM state
  llmStatus: LLMStatus;
  downloadProgress: LLMDownloadProgress | null;
  capabilities: LLMCapabilities | null;

  // Actions
  setCachedInsights: (insights: CachedInsights) => void;
  clearCachedInsights: () => void;
  setIsGenerating: (generating: boolean) => void;
  setLastError: (error: string | null) => void;
  setLLMStatus: (status: LLMStatus) => void;
  setDownloadProgress: (progress: LLMDownloadProgress | null) => void;
  setCapabilities: (capabilities: LLMCapabilities) => void;

  // Computed
  shouldRegenerate: (inputHash: string) => boolean;
  isTodaysCacheValid: () => boolean;
}

/**
 * Get today's date string
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export const useInsightsStore = create<InsightsState>()(
  persist(
    (set, get) => ({
      // Initial state
      cachedInsights: null,
      isGenerating: false,
      lastError: null,
      llmStatus: 'not_downloaded',
      downloadProgress: null,
      capabilities: null,

      // Actions
      setCachedInsights: (insights) => {
        set({ cachedInsights: insights, lastError: null });
      },

      clearCachedInsights: () => {
        set({ cachedInsights: null });
      },

      setIsGenerating: (generating) => {
        set({ isGenerating: generating });
      },

      setLastError: (error) => {
        set({ lastError: error });
      },

      setLLMStatus: (status) => {
        set({ llmStatus: status });
      },

      setDownloadProgress: (progress) => {
        set({ downloadProgress: progress });
      },

      setCapabilities: (capabilities) => {
        set({ capabilities });
      },

      // Check if we should regenerate insights
      shouldRegenerate: (inputHash) => {
        const { cachedInsights } = get();

        // No cache - need to generate
        if (!cachedInsights) return true;

        // Cache is from different day - regenerate
        if (cachedInsights.date !== getToday()) return true;

        // Input data has changed - regenerate
        if (cachedInsights.inputHash !== inputHash) return true;

        return false;
      },

      // Check if today's cache is still valid
      isTodaysCacheValid: () => {
        const { cachedInsights } = get();

        if (!cachedInsights) return false;
        if (cachedInsights.date !== getToday()) return false;

        // Cache is valid for today
        return true;
      },
    }),
    {
      name: 'nutritionrx-insights-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist cached insights and capabilities
        cachedInsights: state.cachedInsights,
        capabilities: state.capabilities,
        llmStatus: state.llmStatus,
      }),
    }
  )
);
