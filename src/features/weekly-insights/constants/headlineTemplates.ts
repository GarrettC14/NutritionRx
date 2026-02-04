/**
 * Headline Templates
 * Template-based headline generation for the widget (no LLM needed)
 */

import type { QuestionAnalysisResult } from '../types/weeklyInsights.types';

type HeadlineGenerator = (data: any) => string;

const headlineTemplates: Record<string, HeadlineGenerator> = {
  'Q-HI-01': (d) => `${d.highlightCount} win${d.highlightCount !== 1 ? 's' : ''} this week`,

  'Q-CON-01': (d) =>
    d.overallConsistency === 'very_consistent' || d.overallConsistency === 'fairly_consistent'
      ? 'Macros were steady this week'
      : 'Macros varied quite a bit this week',

  'Q-CON-02': (d) =>
    d.outlierDays.length > 0
      ? `${d.outlierDays.length} day${d.outlierDays.length !== 1 ? 's' : ''} shifted your average`
      : 'No major outlier days this week',

  'Q-CON-03': (d) =>
    d.calorieHitDays === d.loggedDays && d.loggedDays >= 5
      ? 'Perfect target week!'
      : `Hit targets ${d.calorieHitDays} of ${d.loggedDays} days`,

  'Q-MAC-01': (d) => `Protein averaged ${d.avgProteinPct}% of target`,

  'Q-MAC-02': (d) =>
    d.skewedMacro
      ? `${d.skewedMacro} made up a large share of calories`
      : 'Macros were fairly balanced',

  'Q-CAL-01': (d) =>
    d.isNeutral
      ? 'Calories were right on target'
      : d.isDeficit
        ? `~${Math.abs(Math.round(d.dailyDelta))} cal daily deficit this week`
        : `~${Math.round(d.dailyDelta)} cal daily surplus this week`,

  'Q-CAL-02': (d) => `Calories ${d.trendDirection} over recent weeks`,

  'Q-CAL-03': (d) =>
    d.pattern ? `${d.pattern}` : 'Mixed calorie pattern this week',

  'Q-HYD-01': (d) => `Water averaged ${d.avgWaterPct}% of target`,

  'Q-TIM-01': (d) => `Averaging ${d.avgMeals.toFixed(1)} meals per day`,

  'Q-TIM-02': (d) =>
    Math.abs(d.weekendEffect) > 15
      ? `Weekends ${d.weekendEffect > 0 ? 'higher' : 'lower'} by ${Math.abs(d.weekendEffect)}%`
      : 'Weekdays and weekends were similar',

  'Q-CMP-01': (d) =>
    d.biggestImprovement
      ? `Trending better than last week`
      : 'Different pattern than last week',

  'Q-CMP-02': (d) =>
    `Protein ${d.trendDirection} over recent weeks`,

  'Q-HI-02': (d) => `Focus area: ${d.focusArea}`,
};

/**
 * Generate a headline for the widget based on the top question's analysis.
 */
export function generateHeadline(questionId: string, analysisResult: QuestionAnalysisResult): string {
  const generator = headlineTemplates[questionId];
  if (!generator) return 'Your week at a glance';
  try {
    return generator(analysisResult);
  } catch {
    return 'Your week at a glance';
  }
}

/**
 * Generate a mini-preview for a question card.
 * Same as headline but provides a short data-driven preview.
 */
export function generatePreview(questionId: string, analysisResult: QuestionAnalysisResult): string {
  return generateHeadline(questionId, analysisResult);
}

export const DEFAULT_HEADLINE = 'Your week at a glance';
