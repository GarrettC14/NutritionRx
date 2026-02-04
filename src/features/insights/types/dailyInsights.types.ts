/**
 * Types for Daily Insight Feature
 * Curated question-based daily nutrition insights
 */

import type { DeficiencyCheck, LLMStatus } from './insights.types';

// ============================================
// QUESTION & CATEGORY TYPES
// ============================================

export type DailyQuestionCategory =
  | 'macro_balance'
  | 'protein_focus'
  | 'meal_balance'
  | 'hydration'
  | 'trends'
  | 'nutrient_gaps';

export type DailyQuestionId =
  | 'macro_overview'
  | 'calorie_pacing'
  | 'macro_ratio'
  | 'remaining_budget'
  | 'protein_status'
  | 'protein_per_meal'
  | 'protein_remaining'
  | 'meal_distribution'
  | 'meal_timing'
  | 'meal_variety'
  | 'hydration_status'
  | 'hydration_pacing'
  | 'vs_weekly_avg'
  | 'consistency_check'
  | 'trend_direction'
  | 'nutrient_overview'
  | 'fiber_check'
  | 'micronutrient_status';

// ============================================
// CATEGORY METADATA
// ============================================

export interface DailyQuestionCategoryMeta {
  id: DailyQuestionCategory;
  label: string;
  emoji: string;
  description: string;
}

// ============================================
// QUESTION DEFINITION
// ============================================

export interface DailyQuestionDefinition {
  id: DailyQuestionId;
  category: DailyQuestionCategory;
  text: string;
  emoji: string;
  isAvailable: (data: DailyInsightData) => boolean;
  computeRelevance: (data: DailyInsightData) => number;
  fetcherKey: string;
}

// ============================================
// DATA TYPES
// ============================================

export interface MealWithTimestamp {
  mealLabel: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  firstLogTime: string;
  foods: FoodEntry[];
}

export interface FoodEntry {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeeklyDailyTotal {
  date: string;
  logged: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyInsightData {
  // Today's macros
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFat: number;
  todayFiber: number;

  // Targets
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  waterTarget: number;

  // Water
  todayWater: number;

  // Meals
  todayMealCount: number;
  todayFoods: FoodEntry[];
  mealsWithTimestamps: MealWithTimestamp[];

  // 7-day context
  avgCalories7d: number;
  avgProtein7d: number;
  loggingStreak: number;
  calorieStreak: number;
  weeklyDailyTotals: WeeklyDailyTotal[];

  // User context
  userGoal: 'lose' | 'maintain' | 'gain';
  daysUsingApp: number;

  // Computed percentages
  caloriePercent: number;
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
  waterPercent: number;

  // Time context
  currentHour: number;
  dayProgress: number;

  // Deficiency alerts
  activeAlerts: DeficiencyCheck[];
}

// ============================================
// DATA CARD TYPES
// ============================================

export interface DataCardItem {
  label: string;
  value: string;
  subValue?: string;
  percent?: number;
  status: 'on_track' | 'ahead' | 'behind' | 'neutral';
}

// ============================================
// ANALYSIS TYPES
// ============================================

export interface QuestionAnalysis {
  questionId: DailyQuestionId;
  dataBlock: string;
  fallbackText: string;
  dataCards: DataCardItem[];
  computedAt: number;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface DailyInsightResponse {
  questionId: DailyQuestionId;
  narrative: string;
  emoji: string;
  generatedAt: number;
  source: 'llm' | 'fallback';
  date: string; // YYYY-MM-DD
}

// ============================================
// WIDGET TYPES
// ============================================

export interface WidgetHeadlineData {
  text: string;
  emoji: string;
  priority: number;
  computedAt: number;
}

// ============================================
// SCORED QUESTION
// ============================================

export interface ScoredQuestion {
  definition: DailyQuestionDefinition;
  available: boolean;
  relevanceScore: number;
}

// ============================================
// CACHE TYPES
// ============================================

export interface DailyInsightCache {
  date: string;
  headline: WidgetHeadlineData;
  data: DailyInsightData;
  scores: ScoredQuestion[];
  responses: Record<string, DailyInsightResponse>;
  lastDataUpdate: number;
}

// ============================================
// STORE TYPES
// ============================================

export interface DailyInsightStoreState {
  // Cache
  cache: DailyInsightCache | null;

  // Generation state
  isGenerating: boolean;
  activeQuestionId: DailyQuestionId | null;
  generationError: string | null;

  // LLM status (inherited from insightsStore pattern)
  llmStatus: LLMStatus;
  downloadProgress: number;

  // Actions
  refreshData: () => Promise<void>;
  generateInsight: (questionId: DailyQuestionId) => Promise<DailyInsightResponse>;
  getHeadline: () => WidgetHeadlineData;
  getSuggestedQuestions: () => ScoredQuestion[];
  getAvailableQuestions: () => Map<DailyQuestionCategory, ScoredQuestion[]>;
  invalidateCache: () => void;
  shouldRefreshData: () => boolean;
}
