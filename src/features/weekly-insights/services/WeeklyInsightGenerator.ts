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
    console.log(`[LLM:WeeklyGenerator] generateInsight() — questionId=${questionId}, weekStart=${weekStartDate}`);
    const genStart = Date.now();
    const definition = getQuestionById(questionId);
    const icon = definition?.icon ?? 'bulb-outline';
    console.log(`[LLM:WeeklyGenerator] Question definition — icon=${icon}, hasDefinition=${!!definition}`);

    // Try LLM generation with context pipeline
    try {
      const status = await LLMService.getStatus();
      console.log(`[LLM:WeeklyGenerator] LLM status: ${status}`);

      if (status === 'ready') {
        // Build enriched system prompt from context pipeline
        let systemPrompt = '';
        try {
          console.log(`[LLM:WeeklyGenerator] Building context pipeline for ${questionId}...`);
          const ctx = await buildUnifiedNutritionContext();
          systemPrompt = buildSystemPrompt(ctx);
          console.log(`[LLM:WeeklyGenerator] System prompt built (${systemPrompt.length} chars)`);
        } catch (ctxErr) {
          console.error(`[LLM:WeeklyGenerator] Context pipeline failed, using question prompt only:`, ctxErr);
        }

        console.log(`[LLM:WeeklyGenerator] Building question prompt for ${questionId}...`);
        const questionPrompt = WeeklyPromptBuilder.build(questionId, analysisResult);
        console.log(`[LLM:WeeklyGenerator] Question prompt built (${questionPrompt.length} chars), generating...`);

        // Use system+user separation when context is available, otherwise fall back to legacy
        const result = systemPrompt
          ? await LLMService.generateWithSystem(systemPrompt, questionPrompt, 200)
          : await LLMService.generate(questionPrompt, 200);

        console.log(`[LLM:WeeklyGenerator] LLM result — success=${result.success}, textLength=${result.text?.length || 0}`);
        if (result.success && result.text) {
          const cleanText = result.text.trim();
          console.log(`[LLM:WeeklyGenerator] Clean text (${cleanText.length} chars): "${cleanText.substring(0, 200)}${cleanText.length > 200 ? '...' : ''}"`);
          if (cleanText.length > 15) {
            console.log(`[LLM:WeeklyGenerator] → LLM SUCCESS for ${questionId} in ${Date.now() - genStart}ms`);
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
        console.log(`[LLM:WeeklyGenerator] LLM returned insufficient text for ${questionId}, falling back to template`);
      } else {
        console.log(`[LLM:WeeklyGenerator] LLM not ready (${status}), skipping to template`);
      }
    } catch (error) {
      console.error(`[LLM:WeeklyGenerator] LLM generation failed for ${questionId}:`, error);
    }

    // Fallback to template-based response
    console.log(`[LLM:WeeklyGenerator] → TEMPLATE FALLBACK for ${questionId}`);
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
    console.log(`[LLM:WeeklyGenerator] generateTemplateResponse() — questionId=${questionId}`);
    const definition = getQuestionById(questionId);
    const responseIcon = icon ?? definition?.icon ?? 'bulb-outline';
    const text = generateHeadline(questionId, analysisResult);
    console.log(`[LLM:WeeklyGenerator] Template text (${text.length} chars): "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`);

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
