/**
 * Weekly Insight Generator
 * Orchestrates the full pipeline: analysis -> prompt -> LLM -> response
 */

import { LLMService } from '@/features/insights/services/LLMService';
import type {
  QuestionAnalysisResult,
  WeeklyInsightResponse,
} from '../types/weeklyInsights.types';
import { WeeklyPromptBuilder } from './WeeklyPromptBuilder';
import { generateHeadline } from '../constants/headlineTemplates';
import { getQuestionById } from '../constants/questionLibrary';
import { buildUnifiedNutritionContext } from '@/services/context/nutritionContextBuilder';
import { buildSystemPrompt } from '@/services/context/nutritionSystemPrompt';

export class WeeklyInsightGenerator {
  /**
   * Generate an insight for a specific question.
   * Uses LLM if available, falls back to template.
   */
  static async generateInsight(
    questionId: string,
    analysisResult: QuestionAnalysisResult,
    weekStartDate: string
  ): Promise<WeeklyInsightResponse> {
    const genStart = Date.now();
    const definition = getQuestionById(questionId);
    const icon = definition?.icon ?? 'bulb-outline';

    // Try LLM generation with context pipeline
    try {
      const status = await LLMService.getStatus();

      if (status === 'ready') {
        // Build enriched system prompt from context pipeline
        let systemPrompt = '';
        try {
          const ctx = await buildUnifiedNutritionContext();
          systemPrompt = buildSystemPrompt(ctx);
        } catch (ctxErr) {
          if (__DEV__) console.error(`[LLM:WeeklyGenerator] Context pipeline failed, using question prompt only:`, ctxErr);
        }

        const questionPrompt = WeeklyPromptBuilder.build(questionId, analysisResult);

        // Use system+user separation when context is available, otherwise fall back to legacy
        const result = systemPrompt
          ? await LLMService.generateWithSystem(systemPrompt, questionPrompt, 200)
          : await LLMService.generate(questionPrompt, 200);

        if (result.success && result.text) {
          const cleanText = result.text.trim();
          if (cleanText.length > 15) {
            return {
              questionId,
              text: cleanText,
              icon,
              generatedAt: Date.now(),
              source: 'llm',
              weekStartDate,
              sentiment: 'neutral',
              keyMetrics: [],
              followUpIds: [],
            };
          }
        }
      }
    } catch (error) {
      if (__DEV__) console.error(`[LLM:WeeklyGenerator] LLM generation failed for ${questionId}:`, error);
    }

    // Fallback to template-based response
    return WeeklyInsightGenerator.generateTemplateResponse(
      questionId,
      analysisResult,
      weekStartDate,
      icon
    );
  }

  /**
   * Generate a template-only response (no LLM).
   */
  static generateTemplateResponse(
    questionId: string,
    analysisResult: QuestionAnalysisResult,
    weekStartDate: string,
    icon?: string
  ): WeeklyInsightResponse {
    const definition = getQuestionById(questionId);
    const responseIcon = icon ?? definition?.icon ?? 'bulb-outline';
    const text = generateHeadline(questionId, analysisResult);

    return {
      questionId,
      text,
      icon: responseIcon,
      generatedAt: Date.now(),
      source: 'template',
      weekStartDate,
      sentiment: 'neutral',
      keyMetrics: [],
      followUpIds: [],
    };
  }
}
