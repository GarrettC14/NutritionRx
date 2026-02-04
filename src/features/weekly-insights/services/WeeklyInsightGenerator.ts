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
    const definition = getQuestionById(questionId);
    const icon = definition?.icon ?? '\u{1F4A1}';

    // Try LLM generation
    try {
      const status = await LLMService.getStatus();

      if (status === 'ready') {
        const prompt = WeeklyPromptBuilder.build(questionId, analysisResult);
        const result = await LLMService.generate(prompt, 200);

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
            };
          }
        }
        console.log(`[WeeklyInsightGenerator] LLM returned insufficient text for ${questionId}`);
      }
    } catch (error) {
      console.log(`[WeeklyInsightGenerator] LLM generation failed for ${questionId}:`, error);
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
    const responseIcon = icon ?? definition?.icon ?? '\u{1F4A1}';
    const text = generateHeadline(questionId, analysisResult);

    return {
      questionId,
      text,
      icon: responseIcon,
      generatedAt: Date.now(),
      source: 'template',
      weekStartDate,
    };
  }
}
