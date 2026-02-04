/**
 * Types for Weekly Insights Feature
 * Question-driven weekly nutrition analysis
 */

import type { LLMStatus } from '@/features/insights/types/insights.types';

// ============================================
// QUESTION CATEGORIES
// ============================================

export type WeeklyQuestionCategory =
  | 'consistency'
  | 'macro_balance'
  | 'calorie_trend'
  | 'hydration'
  | 'timing'
  | 'nutrients'
  | 'comparison'
  | 'highlights';

// ============================================
// QUESTION DEFINITION
// ============================================

export interface WeeklyQuestionDefinition {
  id: string;
  displayText: string;
  shortDescription: string;
  category: WeeklyQuestionCategory;
  icon: string;
  isPinned: boolean;
  minimumLoggedDays: number;
  minimumWeeksNeeded: number;
  followUpIds: string[];
  requiresPriorWeek: boolean;
  requiresWaterData: boolean;
  requiresDeficiencyData: boolean;
  requiresFiberData: boolean;
}

// ============================================
// DAY DATA
// ============================================

export interface DayData {
  date: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  dayName: string;
  isLogged: boolean;
  isComplete: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  mealCount: number;
  foods: string[];
}

// ============================================
// COLLECTED DATA
// ============================================

export interface WeeklyCollectedData {
  weekStartDate: string;
  weekEndDate: string;
  days: DayData[];
  loggedDayCount: number;
  completeDayCount: number;

  // Averages from logged days only
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgFiber: number;
  avgWater: number;
  avgMealCount: number;
  totalMeals: number;

  // Targets
  calorieTarget: number;
  proteinTarget: number;
  waterTarget: number;

  // Prior week context
  priorWeek: WeeklyCollectedData | null;
  twoWeeksAgo: WeeklyCollectedData | null;

  // Deficiency alerts (always empty - gated)
  deficiencyAlerts: never[];

  // Data quality
  dataConfidence: number;
  loggingStreak: number;
}

// ============================================
// ANALYSIS RESULT TYPES
// ============================================

export interface ConsistencyAnalysis {
  questionId: 'Q-CON-01';
  calorieCV: number;
  proteinCV: number;
  carbCV: number;
  fatCV: number;
  mostConsistentMacro: string;
  leastConsistentMacro: string;
  overallConsistency: 'very_consistent' | 'fairly_consistent' | 'variable' | 'quite_variable';
  loggedDays: number;
  interestingnessScore: number;
}

export interface OutlierAnalysis {
  questionId: 'Q-CON-02';
  weekMean: number;
  weekStdDev: number;
  outlierDays: Array<{
    date: string;
    dayName: string;
    calories: number;
    deviationPct: number;
    direction: 'high' | 'low';
  }>;
  adjustedMean: number;
  interestingnessScore: number;
}

export interface TargetHitAnalysis {
  questionId: 'Q-CON-03';
  loggedDays: number;
  calorieHitDays: number;
  proteinHitDays: number;
  calorieHitPct: number;
  proteinHitPct: number;
  interestingnessScore: number;
}

export interface ProteinAnalysis {
  questionId: 'Q-MAC-01';
  avgProtein: number;
  proteinTarget: number;
  avgProteinPct: number;
  daysMetTarget: number;
  loggedDays: number;
  proteinCalPct: number;
  trend: string | null;
  interestingnessScore: number;
}

export interface MacroBalanceAnalysis {
  questionId: 'Q-MAC-02';
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  mostVariableMacro: string;
  skewedMacro: string | null;
  skewDirection: string | null;
  interestingnessScore: number;
}

export interface FiberAnalysis {
  questionId: 'Q-MAC-03';
  avgFiber: number;
  fiberTarget: number;
  daysMetTarget: number;
  loggedDays: number;
  interestingnessScore: number;
}

export interface SurplusDeficitAnalysis {
  questionId: 'Q-CAL-01';
  totalIntake: number;
  totalTarget: number;
  dailyAvgIntake: number;
  dailyAvgTarget: number;
  weeklyDelta: number;
  dailyDelta: number;
  deltaPct: number;
  isDeficit: boolean;
  isSurplus: boolean;
  isNeutral: boolean;
  alignsWithGoal: boolean;
  loggedDays: number;
  interestingnessScore: number;
}

export interface CalorieTrendAnalysis {
  questionId: 'Q-CAL-02';
  currentWeekAvg: number;
  priorWeekAvg: number;
  twoWeeksAgoAvg: number | null;
  trendDirection: string;
  trendMagnitude: number;
  trendStrength: string;
  interestingnessScore: number;
}

export interface DayByDayAnalysis {
  questionId: 'Q-CAL-03';
  days: Array<{
    dayName: string;
    calories: number;
    classification: 'on_target' | 'slightly_over' | 'significantly_over' | 'slightly_under' | 'significantly_under' | 'no_data';
    percent: number;
  }>;
  calorieTarget: number;
  pattern: string | null;
  interestingnessScore: number;
}

export interface HydrationAnalysis {
  questionId: 'Q-HYD-01';
  avgWater: number;
  waterTarget: number;
  avgWaterPct: number;
  daysMetTarget: number;
  loggedDays: number;
  bestDay: string;
  bestDayAmount: number;
  worstDay: string;
  worstDayAmount: number;
  consistency: number;
  interestingnessScore: number;
}

export interface MealCountAnalysis {
  questionId: 'Q-TIM-01';
  avgMeals: number;
  minMeals: number;
  maxMeals: number;
  totalMeals: number;
  mealCalCorrelation: string | null;
  interestingnessScore: number;
}

export interface WeekdayWeekendAnalysis {
  questionId: 'Q-TIM-02';
  weekdayAvgCal: number;
  weekendAvgCal: number;
  weekendEffect: number;
  weekdayAvgProtein: number;
  weekendAvgProtein: number;
  weekdayAvgMeals: number;
  weekendAvgMeals: number;
  interestingnessScore: number;
}

export interface NutrientAlertAnalysis {
  questionId: 'Q-NUT-01';
  alerts: Array<{
    nutrient: string;
    severity: string;
    percentRDA: number;
    foodSources: string[];
  }>;
  interestingnessScore: number;
}

export interface WeekComparisonAnalysis {
  questionId: 'Q-CMP-01';
  comparisons: Array<{
    metric: string;
    thisWeek: number;
    lastWeek: number;
    changePct: number;
    direction: 'up' | 'down' | 'same';
  }>;
  biggestImprovement: string;
  biggestChange: string;
  interestingnessScore: number;
}

export interface ProteinTrendAnalysis {
  questionId: 'Q-CMP-02';
  weeklyAverages: Array<{
    weekLabel: string;
    avgProtein: number;
  }>;
  trendDirection: string;
  trendMagnitude: number;
  proteinTarget: number;
  interestingnessScore: number;
}

export interface HighlightsAnalysis {
  questionId: 'Q-HI-01';
  highlights: string[];
  highlightCount: number;
  interestingnessScore: number;
}

export interface FocusSuggestionAnalysis {
  questionId: 'Q-HI-02';
  focusArea: string;
  currentLevel: string;
  suggestion: string;
  rationale: string;
  interestingnessScore: number;
}

// ============================================
// DISCRIMINATED UNION
// ============================================

export type QuestionAnalysisResult =
  | ConsistencyAnalysis
  | OutlierAnalysis
  | TargetHitAnalysis
  | ProteinAnalysis
  | MacroBalanceAnalysis
  | FiberAnalysis
  | SurplusDeficitAnalysis
  | CalorieTrendAnalysis
  | DayByDayAnalysis
  | HydrationAnalysis
  | MealCountAnalysis
  | WeekdayWeekendAnalysis
  | NutrientAlertAnalysis
  | WeekComparisonAnalysis
  | ProteinTrendAnalysis
  | HighlightsAnalysis
  | FocusSuggestionAnalysis;

// ============================================
// SCORED QUESTION
// ============================================

export interface ScoredQuestion {
  questionId: string;
  definition: WeeklyQuestionDefinition;
  score: number;
  isAvailable: boolean;
  isPinned: boolean;
  analysisResult: QuestionAnalysisResult;
}

// ============================================
// RESPONSE TYPES
// ============================================

export type InsightSentiment = 'positive' | 'neutral' | 'negative';

export interface KeyMetric {
  label: string;
  value: string;
}

export interface WeeklyInsightResponse {
  questionId: string;
  text: string;
  icon: string;
  generatedAt: number;
  source: 'llm' | 'template';
  weekStartDate: string;
  sentiment: InsightSentiment;
  keyMetrics: KeyMetric[];
  followUpIds: string[];
}

// ============================================
// TOAST
// ============================================

export interface InsightToastData {
  message: string;
  visible: boolean;
}

// ============================================
// CACHE
// ============================================

export interface WeeklyInsightsCache {
  weekStartDate: string;
  questions: ScoredQuestion[];
  headline: string;
  responses: Record<string, WeeklyInsightResponse>;
  generatedAt: number;
  validUntil: number;
}

// ============================================
// DAY STATUS (mini calendar)
// ============================================

export type DayStatus =
  | 'on_target'
  | 'no_data'
  | 'over_high'
  | 'over_moderate'
  | 'under_moderate'
  | 'under_low';

// Re-export LLMStatus for convenience
export type { LLMStatus };
