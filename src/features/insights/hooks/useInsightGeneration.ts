/**
 * useInsightGeneration Hook
 * Manages LLM-based insight generation with fallback
 */

import { useCallback, useEffect, useState } from 'react';
import { useInsightsStore } from '../stores/insightsStore';
import { LLMService } from '../services/LLMService';
import { buildInsightPrompt, parseInsightResponse } from '../services/InsightPromptBuilder';
import { generateFallbackInsights, getEmptyStateMessage } from '../services/FallbackInsights';
import type { InsightInputData, Insight, LLMStatus } from '../types/insights.types';

interface UseInsightGenerationResult {
  insights: Insight[];
  isGenerating: boolean;
  error: string | null;
  source: 'llm' | 'fallback' | null;
  llmStatus: LLMStatus;
  emptyState: { title: string; message: string } | null;
  generateInsights: (data: InsightInputData) => Promise<void>;
  downloadModel: () => Promise<void>;
  cancelDownload: () => void;
  deleteModel: () => Promise<void>;
  isDownloading: boolean;
  downloadProgress: number;
}

export function useInsightGeneration(): UseInsightGenerationResult {
  const {
    cachedInsights,
    llmStatus,
    downloadProgress,
    isGenerating,
    generationError,
    llmEnabled,
    setInsights,
    setLLMStatus,
    setDownloadProgress,
    setIsGenerating,
    setGenerationError,
    shouldRegenerateInsights,
  } = useInsightsStore();

  const [isDownloading, setIsDownloading] = useState(false);

  // Check LLM status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const status = await LLMService.getStatus();
      setLLMStatus(status);
    };
    checkStatus();
  }, [setLLMStatus]);

  const generateInsights = useCallback(
    async (data: InsightInputData) => {
      // Check if we should use cached insights
      if (!shouldRegenerateInsights() && cachedInsights) {
        return;
      }

      setIsGenerating(true);
      setGenerationError(null);

      try {
        // Check if LLM is available and enabled
        const status = await LLMService.getStatus();
        setLLMStatus(status);

        if (status === 'ready' && llmEnabled) {
          // Try LLM generation
          const prompt = buildInsightPrompt(data);
          const result = await LLMService.generate(prompt, 512);

          if (result.success && result.text) {
            const insights = parseInsightResponse(result.text);
            if (insights.length > 0) {
              setInsights(insights, 'llm');
              return;
            }
          }
          // If LLM failed, fall through to fallback
          console.log('[useInsightGeneration] LLM failed, using fallback');
        }

        // Use fallback insights
        const fallbackInsights = generateFallbackInsights(data);
        setInsights(fallbackInsights, 'fallback');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate insights';
        setGenerationError(errorMessage);
        console.error('[useInsightGeneration] Error:', errorMessage);

        // Try fallback even on error
        try {
          const fallbackInsights = generateFallbackInsights(data);
          setInsights(fallbackInsights, 'fallback');
        } catch {
          // If even fallback fails, just log error
        }
      }
    },
    [
      cachedInsights,
      llmEnabled,
      setInsights,
      setLLMStatus,
      setIsGenerating,
      setGenerationError,
      shouldRegenerateInsights,
    ]
  );

  const downloadModel = useCallback(async () => {
    setIsDownloading(true);
    setDownloadProgress({ bytesDownloaded: 0, totalBytes: 0, percentage: 0 });

    try {
      const result = await LLMService.downloadModel((progress) => {
        setDownloadProgress(progress);
      });

      if (result.success) {
        setLLMStatus('ready');
      } else {
        setGenerationError(result.error || 'Download failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setGenerationError(errorMessage);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, [setDownloadProgress, setLLMStatus, setGenerationError]);

  const cancelDownload = useCallback(() => {
    LLMService.cancelDownload();
    setIsDownloading(false);
    setDownloadProgress(null);
  }, [setDownloadProgress]);

  const deleteModel = useCallback(async () => {
    await LLMService.deleteModel();
    setLLMStatus('not_downloaded');
  }, [setLLMStatus]);

  // Compute empty state message
  const emptyState =
    !cachedInsights?.insights.length && cachedInsights
      ? null
      : cachedInsights === null
        ? getEmptyStateMessage({
            todayCalories: 0,
            todayProtein: 0,
            todayCarbs: 0,
            todayFat: 0,
            todayFiber: 0,
            todayWater: 0,
            todayMealCount: 0,
            todayFoods: [],
            calorieTarget: 2000,
            proteinTarget: 150,
            waterTarget: 2000,
            avgCalories7d: 0,
            avgProtein7d: 0,
            loggingStreak: 0,
            calorieStreak: 0,
            daysUsingApp: 1,
            userGoal: 'maintain',
          })
        : null;

  return {
    insights: cachedInsights?.insights ?? [],
    isGenerating,
    error: generationError,
    source: cachedInsights?.source ?? null,
    llmStatus,
    emptyState,
    generateInsights,
    downloadModel,
    cancelDownload,
    deleteModel,
    isDownloading,
    downloadProgress: downloadProgress?.percentage ?? 0,
  };
}
