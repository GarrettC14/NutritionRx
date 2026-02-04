/**
 * Analyzer Registry
 * Maps question IDs to their analyzer functions
 */

import type { DailyQuestionId, DailyInsightData, QuestionAnalysis } from '../../../types/dailyInsights.types';
import { analyzeMacroOverview, analyzeCaloriePacing, analyzeMacroRatio, analyzeRemainingBudget } from './macroAnalyzers';
import { analyzeProteinStatus, analyzeProteinPerMeal, analyzeProteinRemaining } from './proteinAnalyzers';
import { analyzeMealDistribution, analyzeMealTiming, analyzeMealVariety } from './mealAnalyzers';
import { analyzeHydrationStatus, analyzeHydrationPacing } from './hydrationAnalyzers';
import { analyzeVsWeeklyAvg, analyzeConsistencyCheck, analyzeTrendDirection } from './trendAnalyzers';
import { analyzeNutrientOverview, analyzeFiberCheck, analyzeMicronutrientStatus } from './nutrientAnalyzers';

export const questionAnalyzers: Record<DailyQuestionId, (data: DailyInsightData) => QuestionAnalysis> = {
  macro_overview: analyzeMacroOverview,
  calorie_pacing: analyzeCaloriePacing,
  macro_ratio: analyzeMacroRatio,
  remaining_budget: analyzeRemainingBudget,
  protein_status: analyzeProteinStatus,
  protein_per_meal: analyzeProteinPerMeal,
  protein_remaining: analyzeProteinRemaining,
  meal_distribution: analyzeMealDistribution,
  meal_timing: analyzeMealTiming,
  meal_variety: analyzeMealVariety,
  hydration_status: analyzeHydrationStatus,
  hydration_pacing: analyzeHydrationPacing,
  vs_weekly_avg: analyzeVsWeeklyAvg,
  consistency_check: analyzeConsistencyCheck,
  trend_direction: analyzeTrendDirection,
  nutrient_overview: analyzeNutrientOverview,
  fiber_check: analyzeFiberCheck,
  micronutrient_status: analyzeMicronutrientStatus,
};
