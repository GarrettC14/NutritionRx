/**
 * useWeeklyInsightGeneration Hook
 * Handles LLM generation for a question, with caching
 */

import { useCallback } from 'react';
import type { ScoredQuestion, WeeklyInsightResponse } from '../types/weeklyInsights.types';
import { useWeeklyInsightsStore } from '../stores/weeklyInsightsStore';
import { WeeklyInsightGenerator } from '../services/WeeklyInsightGenerator';

interface UseWeeklyInsightGenerationResult {
  generateForQuestion: (question: ScoredQuestion) => Promise<WeeklyInsightResponse>;
  isGenerating: boolean;
  error: string | null;
}

export function useWeeklyInsightGeneration(): UseWeeklyInsightGenerationResult {
  const isGenerating = useWeeklyInsightsStore((s) => s.isGenerating);
  const error = useWeeklyInsightsStore((s) => s.generationError);
  const getCachedResponse = useWeeklyInsightsStore((s) => s.getCachedResponse);
  const setCachedResponse = useWeeklyInsightsStore((s) => s.setCachedResponse);
  const setIsGenerating = useWeeklyInsightsStore((s) => s.setIsGenerating);
  const setGenerationError = useWeeklyInsightsStore((s) => s.setGenerationError);
  const getEffectiveWeekStart = useWeeklyInsightsStore((s) => s.getEffectiveWeekStart);

  const generateForQuestion = useCallback(
    async (question: ScoredQuestion): Promise<WeeklyInsightResponse> => {
      const weekStart = getEffectiveWeekStart();

      // Check cache first
      const cached = getCachedResponse(question.questionId);
      if (cached && cached.weekStartDate === weekStart) {
        return cached;
      }

      setIsGenerating(true);
      setGenerationError(null);

      try {
        const response = await WeeklyInsightGenerator.generateInsight(
          question.questionId,
          question.analysisResult,
          weekStart
        );

        setCachedResponse(question.questionId, response);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed';
        setGenerationError(message);

        // Return template fallback
        return WeeklyInsightGenerator.generateTemplateResponse(
          question.questionId,
          question.analysisResult,
          weekStart
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [getCachedResponse, setCachedResponse, setIsGenerating, setGenerationError, getEffectiveWeekStart]
  );

  return { generateForQuestion, isGenerating, error };
}
