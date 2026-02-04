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
      console.log('[LLM:useInsightGeneration] Checking LLM status on mount...');
      const status = await LLMService.getStatus();
      console.log(`[LLM:useInsightGeneration] LLM status on mount: ${status}`);
      setLLMStatus(status);
    };
    checkStatus();
  }, [setLLMStatus]);

  const generateInsights = useCallback(
    async (data: InsightInputData) => {
      console.log(`[LLM:useInsightGeneration] generateInsights() called — llmEnabled=${llmEnabled}, hasCachedInsights=${!!cachedInsights}`);
      console.log(`[LLM:useInsightGeneration] Input data — cal=${data.todayCalories}, prot=${data.todayProtein}g, meals=${data.todayMealCount}, water=${data.todayWater}ml`);

      // Check if we should use cached insights
      const shouldRegen = shouldRegenerateInsights();
      console.log(`[LLM:useInsightGeneration] shouldRegenerateInsights=${shouldRegen}`);
      if (!shouldRegen && cachedInsights) {
        console.log(`[LLM:useInsightGeneration] Using cached insights (${cachedInsights.insights.length} insights, source=${cachedInsights.source})`);
        return;
      }

      setIsGenerating(true);
      setGenerationError(null);

      try {
        // Check if LLM is available and enabled
        const status = await LLMService.getStatus();
        console.log(`[LLM:useInsightGeneration] LLM status=${status}, llmEnabled=${llmEnabled}`);
        setLLMStatus(status);

        if (status === 'ready' && llmEnabled) {
          // Try LLM generation
          console.log('[LLM:useInsightGeneration] Building prompt for LLM...');
          const prompt = buildInsightPrompt(data);
          console.log(`[LLM:useInsightGeneration] Prompt built (${prompt.length} chars), generating...`);
          const result = await LLMService.generate(prompt, 512);

          console.log(`[LLM:useInsightGeneration] LLM result — success=${result.success}, textLength=${result.text?.length || 0}`);
          if (result.success && result.text) {
            const insights = parseInsightResponse(result.text);
            console.log(`[LLM:useInsightGeneration] Parsed ${insights.length} insights from LLM response`);
            if (insights.length > 0) {
              console.log(`[LLM:useInsightGeneration] Setting ${insights.length} LLM insights: [${insights.map(i => i.category).join(', ')}]`);
              setInsights(insights, 'llm');
              return;
            }
          }
          // If LLM failed, fall through to fallback
          console.log('[LLM:useInsightGeneration] LLM returned no usable insights, falling back');
        }

        // Use fallback insights
        console.log('[LLM:useInsightGeneration] Generating fallback insights...');
        const fallbackInsights = generateFallbackInsights(data);
        console.log(`[LLM:useInsightGeneration] Generated ${fallbackInsights.length} fallback insights: [${fallbackInsights.map(i => i.category).join(', ')}]`);
        setInsights(fallbackInsights, 'fallback');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate insights';
        setGenerationError(errorMessage);
        console.error('[LLM:useInsightGeneration] generateInsights ERROR:', errorMessage, err);

        // Try fallback even on error
        try {
          console.log('[LLM:useInsightGeneration] Attempting fallback after error...');
          const fallbackInsights = generateFallbackInsights(data);
          setInsights(fallbackInsights, 'fallback');
        } catch (fallbackErr) {
          console.error('[LLM:useInsightGeneration] Even fallback failed:', fallbackErr);
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
    console.log('[LLM:useInsightGeneration] downloadModel() called');
    setIsDownloading(true);
    setDownloadProgress({ bytesDownloaded: 0, totalBytes: 0, percentage: 0 });

    try {
      const result = await LLMService.downloadModel((progress) => {
        if (progress.percentage % 10 === 0) {
          console.log(`[LLM:useInsightGeneration] Download progress: ${progress.percentage}% (${(progress.bytesDownloaded / 1_000_000).toFixed(0)}MB / ${(progress.totalBytes / 1_000_000).toFixed(0)}MB)`);
        }
        setDownloadProgress(progress);
      });

      if (result.success) {
        console.log('[LLM:useInsightGeneration] Download completed successfully');
        setLLMStatus('ready');
      } else {
        console.log(`[LLM:useInsightGeneration] Download failed: ${result.error}`);
        setGenerationError(result.error || 'Download failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      console.error('[LLM:useInsightGeneration] Download error:', errorMessage, err);
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
