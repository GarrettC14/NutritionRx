// ============================================================
// Database Row Types (match SQLite columns exactly)
// ============================================================

export type DataSource = 'open_food_facts' | 'usda' | 'user' | 'seed';
export type MealTypeValue = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type DataQuality = 'good' | 'partial' | 'insufficient';
export type Sex = 'male' | 'female';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export interface FoodItemRow {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  serving_size: number;
  serving_unit: string;
  serving_size_grams: number | null;
  source: DataSource;
  source_id: string | null;
  is_verified: number;
  is_user_created: number;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface LogEntryRow {
  id: string;
  food_item_id: string;
  date: string;
  meal_type: MealTypeValue;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogEntryWithFoodRow extends LogEntryRow {
  food_name: string;
  food_brand: string | null;
}

export interface QuickAddEntryRow {
  id: string;
  date: string;
  meal_type: MealTypeValue;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeightEntryRow {
  id: string;
  date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsRow {
  key: string;
  value: string;
  updated_at: string;
}

export interface UserProfileRow {
  id: string;
  sex: Sex | null;
  date_of_birth: string | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  has_completed_onboarding: number;
  onboarding_skipped: number;
  created_at: string;
  updated_at: string;
}

export interface GoalRow {
  id: string;
  type: GoalType;
  target_weight_kg: number | null;
  target_rate_percent: number;
  start_date: string;
  start_weight_kg: number;
  initial_tdee_estimate: number;
  initial_target_calories: number;
  initial_protein_g: number;
  initial_carbs_g: number;
  initial_fat_g: number;
  current_tdee_estimate: number;
  current_target_calories: number;
  current_protein_g: number;
  current_carbs_g: number;
  current_fat_g: number;
  is_active: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReflectionRow {
  id: string;
  goal_id: string;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  avg_calorie_intake: number | null;
  days_logged: number | null;
  days_weighed: number | null;
  start_trend_weight_kg: number | null;
  end_trend_weight_kg: number | null;
  weight_change_kg: number | null;
  calculated_daily_burn: number | null;
  previous_tdee_estimate: number | null;
  previous_target_calories: number | null;
  new_tdee_estimate: number | null;
  new_target_calories: number | null;
  new_protein_g: number | null;
  new_carbs_g: number | null;
  new_fat_g: number | null;
  was_accepted: number | null;
  user_notes: string | null;
  data_quality: DataQuality | null;
  created_at: string;
}

export interface DailyMetabolismRow {
  id: string;
  date: string;
  trend_weight_kg: number | null;
  calorie_intake: number | null;
  estimated_daily_burn: number | null;
  data_quality: DataQuality | null;
  created_at: string;
  updated_at: string;
}

export interface DailyTotalsRow {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}
