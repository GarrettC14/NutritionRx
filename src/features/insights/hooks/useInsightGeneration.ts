/**
 * useInsightGeneration Hook
 * Orchestrates insight generation using LLM or fallback
 */

import { useCallback, useEffect, useState } from 'react';
import { useInsightsData, calculateInputHash } from './useInsightsData';
import { useInsightsStore } from '../stores/insightsStore';
import { LLMService } from '../services/LLMService';
import { buildInsightPrompt, parseInsightResponse } from '../services/InsightPromptBuilder';
import { generateFallbackInsights, getEmptyStateMessage } from '../services/FallbackInsights';
import type { Insight, CachedInsights, LLMDownloadProgress } from '../types/insights.types';

/**
 * Get today's date string
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function useInsightGeneration() {
  const { gatherInsightData, hasEnoughData } = useInsightsData();

  const {
    cachedInsights,
    isGenerating,
    lastError,
    llmStatus,
    downloadProgress,
    capabilities,
    setCachedInsights,
    clearCachedInsights,
    setIsGenerating,
    setLastError,
    setLLMStatus,
    setDownloadProgress,
    setCapabilities,
    shouldRegenerate,
    isTodaysCacheValid,
  } = useInsightsStore();

  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize LLM capabilities check
   */
  const initialize = useCallback(async () => {
    if (isInitialized) return;

    try {
      // Check device capabilities
      const caps = await LLMService.checkCapabilities();
      setCapabilities(caps);

      // Check model status
      const status = await LLMService.getStatus();
      setLLMStatus(status);

      setIsInitialized(true);
    } catch (error) {
      console.error('[useInsightGeneration] Initialization error:', error);
      setLLMStatus('unsupported');
      setIsInitialized(true);
    }
  }, [isInitialized, setCapabilities, setLLMStatus]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  /**
   * Download the LLM model
   */
  const downloadModel = useCallback(async () => {
    if (!capabilities?.canRunLocalLLM) {
      setLastError("Device can't run local LLM");
      return false;
    }

    try {
      setLLMStatus('downloading');
      setLastError(null);

      const result = await LLMService.downloadModel((progress: LLMDownloadProgress) => {
        setDownloadProgress(progress);
      });

      if (result.success) {
        setLLMStatus('ready');
        setDownloadProgress(null);
        return true;
      } else {
        setLLMStatus('error');
        setLastError(result.error || 'Download failed');
        setDownloadProgress(null);
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      setLLMStatus('error');
      setLastError(message);
      setDownloadProgress(null);
      return false;
    }
  }, [capabilities, setLLMStatus, setLastError, setDownloadProgress]);

  /**
   * Cancel model download
   */
  const cancelDownload = useCallback(() => {
    LLMService.cancelDownload();
    setLLMStatus('not_downloaded');
    setDownloadProgress(null);
  }, [setLLMStatus, setDownloadProgress]);

  /**
   * Generate insights using LLM
   */
  const generateWithLLM = useCallback(
    async (data: ReturnType<typeof gatherInsightData> extends Promise<infer T> ? T : never) => {
      try {
        setLLMStatus('loading');

        // Initialize LLM if needed
        const initResult = await LLMService.initialize();
        if (!initResult.success) {
          throw new Error(initResult.error || 'Failed to initialize LLM');
        }

        setLLMStatus('generating');

        // Build prompt
        const prompt = buildInsightPrompt(data);

        // Generate response
        const result = await LLMService.generate(prompt, 512);
        if (!result.success || !result.text) {
          throw new Error(result.error || 'No response generated');
        }

        // Parse response
        const insights = parseInsightResponse(result.text);
        if (insights.length === 0) {
          throw new Error('Failed to parse insights');
        }

        setLLMStatus('ready');
        return insights;
      } catch (error) {
        console.error('[useInsightGeneration] LLM generation error:', error);
        setLLMStatus('ready');
        throw error;
      }
    },
    [setLLMStatus]
  );

  /**
   * Generate insights (LLM or fallback)
   */
  const generateInsights = useCallback(
    async (forceRegenerate: boolean = false) => {
      if (isGenerating) return;

      try {
        setIsGenerating(true);
        setLastError(null);

        // Gather input data
        const data = await gatherInsightData();
        const inputHash = calculateInputHash(data);

        // Check if we need to regenerate
        if (!forceRegenerate && !shouldRegenerate(inputHash)) {
          setIsGenerating(false);
          return;
        }

        // Check if we have enough data
        if (!hasEnoughData) {
          const emptyState = getEmptyStateMessage(data);
          const cached: CachedInsights = {
            date: getToday(),
            insights: [
              {
                category: 'pattern',
                text: emptyState.message,
                icon: '📝',
              },
            ],
            generatedAt: new Date().toISOString(),
            inputHash,
            source: 'fallback',
          };
          setCachedInsights(cached);
          setIsGenerating(false);
          return;
        }

        let insights: Insight[];
        let source: 'llm' | 'fallback' = 'fallback';

        // Try LLM if available
        if (llmStatus === 'ready' && capabilities?.canRunLocalLLM) {
          try {
            insights = await generateWithLLM(data);
            source = 'llm';
          } catch {
            // Fall back to rule-based
            console.log('[useInsightGeneration] Falling back to rule-based insights');
            insights = generateFallbackInsights(data);
          }
        } else {
          // Use fallback
          insights = generateFallbackInsights(data);
        }

        // If no insights generated, use empty state
        if (insights.length === 0) {
          const emptyState = getEmptyStateMessage(data);
          insights = [
            {
              category: 'pattern',
              text: emptyState.message,
              icon: '📝',
            },
          ];
        }

        // Cache insights
        const cached: CachedInsights = {
          date: getToday(),
          insights,
          generatedAt: new Date().toISOString(),
          inputHash,
          source,
        };
        setCachedInsights(cached);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate insights';
        console.error('[useInsightGeneration] Error:', message);
        setLastError(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [
      isGenerating,
      gatherInsightData,
      hasEnoughData,
      llmStatus,
      capabilities,
      shouldRegenerate,
      setIsGenerating,
      setLastError,
      setCachedInsights,
      generateWithLLM,
    ]
  );

  /**
   * Refresh insights (force regenerate)
   */
  const refreshInsights = useCallback(() => {
    return generateInsights(true);
  }, [generateInsights]);

  /**
   * Auto-generate insights if cache is stale
   */
  useEffect(() => {
    if (!isInitialized) return;
    if (isGenerating) return;

    // Auto-generate if no valid cache
    if (!isTodaysCacheValid() && hasEnoughData) {
      generateInsights();
    }
  }, [isInitialized, isGenerating, isTodaysCacheValid, hasEnoughData, generateInsights]);

  return {
    // State
    insights: cachedInsights?.insights || [],
    isGenerating,
    lastError,
    llmStatus,
    downloadProgress,
    capabilities,
    hasEnoughData,
    source: cachedInsights?.source || 'fallback',
    lastUpdated: cachedInsights?.generatedAt,

    // Actions
    generateInsights,
    refreshInsights,
    downloadModel,
    cancelDownload,
    clearInsights: clearCachedInsights,
  };
}
