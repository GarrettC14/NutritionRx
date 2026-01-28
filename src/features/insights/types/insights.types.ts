/**
 * Types for Smart Insights Feature
 * On-device LLM insights and nutrient deficiency alerts
 */

// ============================================
// INSIGHT TYPES
// ============================================

export type InsightCategory =
  | 'macro_balance'
  | 'protein'
  | 'consistency'
  | 'pattern'
  | 'trend'
  | 'hydration'
  | 'timing'
  | 'rest';

export interface Insight {
  category: InsightCategory;
  text: string;
  icon?: string;
}

export interface CachedInsights {
  insights: Insight[];
  generatedAt: number;
  validUntil: number;
  source: 'llm' | 'fallback';
  date: string;
}

// ============================================
// INPUT DATA FOR INSIGHTS
// ============================================

export interface InsightInputData {
  // Today's data
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFat: number;
  todayFiber: number;
  todayWater: number;
  todayMealCount: number;
  todayFoods: string[];

  // Targets
  calorieTarget: number;
  proteinTarget: number;
  waterTarget: number;

  // Trends (last 7 days)
  avgCalories7d: number;
  avgProtein7d: number;
  loggingStreak: number;
  calorieStreak: number;

  // User context
  userGoal: 'lose' | 'maintain' | 'gain';
  daysUsingApp: number;
}

// ============================================
// NUTRIENT DATA FOR DEFICIENCY CALCULATIONS
// ============================================

export interface NutrientDailyData {
  date: string;
  hasData: boolean;
  nutrients: Record<string, number>;
}

// ============================================
// DEFICIENCY ALERT TYPES
// ============================================

export type DeficiencySeverity = 'notice' | 'warning' | 'concern';

export interface DeficiencyCheck {
  nutrientId: string;
  nutrientName: string;
  averageIntake: number;
  rdaTarget: number;
  percentOfRDA: number;
  severity: DeficiencySeverity;
  message: string;
  foodSuggestions: string[];
  tier: 1 | 2 | 3;
}

export interface AlertDismissal {
  alertId: string;
  nutrientId: string;
  dismissedAt: number;
  expiresAt: number;
}

// ============================================
// LLM SERVICE TYPES
// ============================================

export type LLMStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'ready'
  | 'loading'
  | 'generating'
  | 'error'
  | 'unsupported';

export interface LLMDownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  estimatedSecondsRemaining?: number;
}

export interface LLMCapabilities {
  canRunLocalLLM: boolean;
  reason?: string;
  deviceInfo?: {
    platform: string;
    osVersion: string;
    totalMemory?: number;
  };
}
