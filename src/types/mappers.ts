import { MealType } from '@/constants/mealTypes';
import {
  FoodItemRow,
  LogEntryRow,
  LogEntryWithFoodRow,
  QuickAddEntryRow,
  WeightEntryRow,
  UserProfileRow,
  GoalRow,
  WeeklyReflectionRow,
  DailyMetabolismRow,
} from './database';
import {
  FoodItem,
  LogEntry,
  QuickAddEntry,
  WeightEntry,
  UserProfile,
  Goal,
  PlanningMode,
  WeeklyReflection,
  DailyMetabolism,
} from './domain';

// ============================================================
// Row → Domain Mappers
// ============================================================

export function mapFoodItemRowToDomain(row: FoodItemRow): FoodItem {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? undefined,
    barcode: row.barcode ?? undefined,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber ?? undefined,
    sugar: row.sugar ?? undefined,
    sodium: row.sodium ?? undefined,
    servingSize: row.serving_size,
    servingUnit: row.serving_unit,
    servingSizeGrams: row.serving_size_grams ?? undefined,
    source: row.source,
    sourceId: row.source_id ?? undefined,
    isVerified: row.is_verified === 1,
    isUserCreated: row.is_user_created === 1,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
    usageCount: row.usage_count,
    usdaFdcId: row.usda_fdc_id ?? undefined,
    usdaNutrientCount: row.usda_nutrient_count ?? 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapLogEntryRowToDomain(row: LogEntryWithFoodRow): LogEntry {
  return {
    id: row.id,
    foodItemId: row.food_item_id,
    foodName: row.food_name,
    foodBrand: row.food_brand ?? undefined,
    date: row.date,
    mealType: row.meal_type as MealType,
    servings: row.servings,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    notes: row.notes ?? undefined,
    recipeLogId: row.recipe_log_id ?? null,
    recipeName: row.recipe_name ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapQuickAddRowToDomain(row: QuickAddEntryRow): QuickAddEntry {
  return {
    id: row.id,
    date: row.date,
    mealType: row.meal_type as MealType,
    calories: row.calories,
    protein: row.protein ?? undefined,
    carbs: row.carbs ?? undefined,
    fat: row.fat ?? undefined,
    description: row.description ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapWeightEntryRowToDomain(row: WeightEntryRow): WeightEntry {
  return {
    id: row.id,
    date: row.date,
    weightKg: row.weight_kg,
    trendWeightKg: row.trend_weight_kg ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapUserProfileRowToDomain(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    sex: row.sex ?? undefined,
    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth) : undefined,
    heightCm: row.height_cm ?? undefined,
    activityLevel: row.activity_level
      ? (row.activity_level as UserProfile['activityLevel'])
      : undefined,
    eatingStyle: (row.eating_style as UserProfile['eatingStyle']) ?? 'flexible',
    proteinPriority: (row.protein_priority as UserProfile['proteinPriority']) ?? 'active',
    hasCompletedOnboarding: row.has_completed_onboarding === 1,
    onboardingSkipped: row.onboarding_skipped === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapGoalRowToDomain(row: GoalRow): Goal {
  return {
    id: row.id,
    type: row.type,
    targetWeightKg: row.target_weight_kg ?? undefined,
    targetRatePercent: row.target_rate_percent,
    startDate: row.start_date,
    startWeightKg: row.start_weight_kg,
    initialTdeeEstimate: row.initial_tdee_estimate,
    initialTargetCalories: row.initial_target_calories,
    initialProteinG: row.initial_protein_g,
    initialCarbsG: row.initial_carbs_g,
    initialFatG: row.initial_fat_g,
    currentTdeeEstimate: row.current_tdee_estimate,
    currentTargetCalories: row.current_target_calories,
    currentProteinG: row.current_protein_g,
    currentCarbsG: row.current_carbs_g,
    currentFatG: row.current_fat_g,
    planningMode: (row.planning_mode as PlanningMode) ?? 'rate',
    targetDate: row.target_date ?? undefined,
    eatingStyle: (row.eating_style as Goal['eatingStyle']) ?? 'flexible',
    proteinPriority: (row.protein_priority as Goal['proteinPriority']) ?? 'active',
    isActive: row.is_active === 1,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapWeeklyReflectionRowToDomain(
  row: WeeklyReflectionRow
): WeeklyReflection {
  return {
    id: row.id,
    goalId: row.goal_id,
    weekNumber: row.week_number,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    avgCalorieIntake: row.avg_calorie_intake ?? undefined,
    daysLogged: row.days_logged ?? undefined,
    daysWeighed: row.days_weighed ?? undefined,
    startTrendWeightKg: row.start_trend_weight_kg ?? undefined,
    endTrendWeightKg: row.end_trend_weight_kg ?? undefined,
    weightChangeKg: row.weight_change_kg ?? undefined,
    calculatedDailyBurn: row.calculated_daily_burn ?? undefined,
    previousTdeeEstimate: row.previous_tdee_estimate ?? undefined,
    previousTargetCalories: row.previous_target_calories ?? undefined,
    newTdeeEstimate: row.new_tdee_estimate ?? undefined,
    newTargetCalories: row.new_target_calories ?? undefined,
    newProteinG: row.new_protein_g ?? undefined,
    newCarbsG: row.new_carbs_g ?? undefined,
    newFatG: row.new_fat_g ?? undefined,
    wasAccepted: row.was_accepted === null ? undefined : row.was_accepted === 1,
    userNotes: row.user_notes ?? undefined,
    dataQuality: row.data_quality ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

export function mapDailyMetabolismRowToDomain(
  row: DailyMetabolismRow
): DailyMetabolism {
  return {
    id: row.id,
    date: row.date,
    trendWeightKg: row.trend_weight_kg ?? undefined,
    calorieIntake: row.calorie_intake ?? undefined,
    estimatedDailyBurn: row.estimated_daily_burn ?? undefined,
    dataQuality: row.data_quality ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
