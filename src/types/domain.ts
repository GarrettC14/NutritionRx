import { MealType } from '@/constants/mealTypes';

// ============================================================
// Domain Models (camelCase, proper types)
// ============================================================

export type DataSource = 'open_food_facts' | 'usda' | 'user' | 'seed';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type DataQuality = 'good' | 'partial' | 'insufficient';
export type Sex = 'male' | 'female';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize: number;
  servingUnit: string;
  servingSizeGrams?: number;
  source: DataSource;
  sourceId?: string;
  isVerified: boolean;
  isUserCreated: boolean;
  lastUsedAt?: Date;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogEntry {
  id: string;
  foodItemId: string;
  foodName: string;
  foodBrand?: string;
  date: string;
  mealType: MealType;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuickAddEntry {
  id: string;
  date: string;
  mealType: MealType;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  sex?: Sex;
  dateOfBirth?: Date;
  heightCm?: number;
  activityLevel?: ActivityLevel;
  hasCompletedOnboarding: boolean;
  onboardingSkipped: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  type: GoalType;
  targetWeightKg?: number;
  targetRatePercent: number;
  startDate: string;
  startWeightKg: number;
  initialTdeeEstimate: number;
  initialTargetCalories: number;
  initialProteinG: number;
  initialCarbsG: number;
  initialFatG: number;
  currentTdeeEstimate: number;
  currentTargetCalories: number;
  currentProteinG: number;
  currentCarbsG: number;
  currentFatG: number;
  isActive: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyReflection {
  id: string;
  goalId: string;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  avgCalorieIntake?: number;
  daysLogged?: number;
  daysWeighed?: number;
  startTrendWeightKg?: number;
  endTrendWeightKg?: number;
  weightChangeKg?: number;
  calculatedDailyBurn?: number;
  previousTdeeEstimate?: number;
  previousTargetCalories?: number;
  newTdeeEstimate?: number;
  newTargetCalories?: number;
  newProteinG?: number;
  newCarbsG?: number;
  newFatG?: number;
  wasAccepted?: boolean;
  userNotes?: string;
  dataQuality?: DataQuality;
  createdAt: Date;
}

export interface DailyMetabolism {
  id: string;
  date: string;
  trendWeightKg?: number;
  calorieIntake?: number;
  estimatedDailyBurn?: number;
  dataQuality?: DataQuality;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Computed Types
// ============================================================

export interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailySummary {
  date: string;
  totals: DailyTotals;
  goals: DailyTotals;
  entries: LogEntry[];
  quickAdds: QuickAddEntry[];
  entriesByMeal: Record<MealType, LogEntry[]>;
  quickAddsByMeal: Record<MealType, QuickAddEntry[]>;
}

export interface WeightTrend {
  date: string;
  rawWeight: number;
  smoothedWeight: number;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
