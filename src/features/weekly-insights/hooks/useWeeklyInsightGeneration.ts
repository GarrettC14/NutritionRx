/**
 * useWeeklyInsightGeneration Hook
 * Handles LLM generation for a question, with caching, retry, toast, and enrichment
 */

import { useCallback } from 'react';
import type { ScoredQuestion, WeeklyInsightResponse } from '../types/weeklyInsights.types';
import { useWeeklyInsightsStore } from '../stores/weeklyInsightsStore';
import { WeeklyInsightGenerator } from '../services/WeeklyInsightGenerator';
import { KeyMetricsExtractor } from '../services/KeyMetricsExtractor';
import { SentimentDeriver } from '../services/SentimentDeriver';
import { getQuestionById } from '../constants/questionLibrary';

interface UseWeeklyInsightGenerationResult {
  generateForQuestion: (question: ScoredQuestion) => Promise<WeeklyInsightResponse>;
  retryForQuestion: (question: ScoredQuestion) => Promise<WeeklyInsightResponse>;
  isGenerating: boolean;
  error: string | null;
}

function enrichResponse(
  response: WeeklyInsightResponse,
  question: ScoredQuestion
): WeeklyInsightResponse {
  const definition = getQuestionById(question.questionId);
  return {
    ...response,
    sentiment: SentimentDeriver.derive(question.questionId, question.analysisResult),
    keyMetrics: KeyMetricsExtractor.extract(question.questionId, question.analysisResult),
    followUpIds: definition?.followUpIds ?? [],
  };
}

export function useWeeklyInsightGeneration(): UseWeeklyInsightGenerationResult {
  const isGenerating = useWeeklyInsightsStore((s) => s.isGenerating);
  const error = useWeeklyInsightsStore((s) => s.generationError);
  const getCachedResponse = useWeeklyInsightsStore((s) => s.getCachedResponse);
  const setCachedResponse = useWeeklyInsightsStore((s) => s.setCachedResponse);
  const setIsGenerating = useWeeklyInsightsStore((s) => s.setIsGenerating);
  const setGenerationError = useWeeklyInsightsStore((s) => s.setGenerationError);
  const getEffectiveWeekStart = useWeeklyInsightsStore((s) => s.getEffectiveWeekStart);
  const showToast = useWeeklyInsightsStore((s) => s.showToast);
  const setQuestionError = useWeeklyInsightsStore((s) => s.setQuestionError);
  const clearQuestionError = useWeeklyInsightsStore((s) => s.clearQuestionError);

  const generateForQuestion = useCallback(
    async (question: ScoredQuestion): Promise<WeeklyInsightResponse> => {
      const weekStart = getEffectiveWeekStart();

      // Check cache first
      const cached = getCachedResponse(question.questionId);
      if (cached && cached.weekStartDate === weekStart) {
        return cached;
      }

      // Guard against concurrent generation — only one LLM call at a time
      if (useWeeklyInsightsStore.getState().isGenerating) {
        showToast('AI is thinking about another question...');
        const templateResponse = WeeklyInsightGenerator.generateTemplateResponse(
          question.questionId,
          question.analysisResult,
          weekStart
        );
        return enrichResponse(templateResponse, question);
      }

      setIsGenerating(true);
      setGenerationError(null);
      clearQuestionError(question.questionId);

      try {
        const response = await WeeklyInsightGenerator.generateInsight(
          question.questionId,
          question.analysisResult,
          weekStart
        );

        const enriched = enrichResponse(response, question);
        setCachedResponse(question.questionId, enriched);
        return enriched;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed';
        console.error(`[LLM:useWeeklyInsightGen] Generation failed for ${question.questionId}: ${message}`, err);
        setGenerationError(message);
        setQuestionError(question.questionId, message);

        // Return template fallback
        const templateResponse = WeeklyInsightGenerator.generateTemplateResponse(
          question.questionId,
          question.analysisResult,
          weekStart
        );
        return enrichResponse(templateResponse, question);
      } finally {
        setIsGenerating(false);
      }
    },
    [getCachedResponse, setCachedResponse, setIsGenerating, setGenerationError, getEffectiveWeekStart, showToast, setQuestionError, clearQuestionError]
  );

  const retryForQuestion = useCallback(
    async (question: ScoredQuestion): Promise<WeeklyInsightResponse> => {
      clearQuestionError(question.questionId);
      return generateForQuestion(question);
    },
    [generateForQuestion, clearQuestionError]
  );

  return { generateForQuestion, retryForQuestion, isGenerating, error };
}
