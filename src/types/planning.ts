// ============================================================
// Macro Cycling Types
// ============================================================

export type MacroCyclePatternType = 'training_rest' | 'high_low_carb' | 'custom';

export interface DayTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroCycleConfig {
  enabled: boolean;
  patternType: MacroCyclePatternType;
  markedDays: number[]; // 0-6 for Sun-Sat (the "special" days - training days or high carb days)
  dayTargets: {
    [dayOfWeek: number]: DayTargets;
  };
  createdAt: string;
  lastModified: string;
}

export interface MacroCycleOverride {
  id: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

// Adjustment values for setup wizard (relative to base targets)
export interface MacroAdjustment {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ============================================================
// Fasting Timer Types
// ============================================================

export type FastingProtocol = '16:8' | '18:6' | '20:4' | '14:10' | 'custom';

export type FastingSessionStatus = 'active' | 'completed' | 'ended_early' | 'skipped';

export interface FastingConfig {
  enabled: boolean;
  protocol: FastingProtocol;
  customFastHours?: number; // For custom protocol
  typicalEatStart: string; // "12:00" (24h format)
  typicalEatEnd: string; // "20:00"
  notifications: {
    windowOpens: boolean;
    windowClosesSoon: boolean;
    windowClosesReminder: number; // minutes before
    fastComplete: boolean;
  };
  createdAt: string;
  lastModified: string;
}

export interface FastingSession {
  id: string;
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp (null if ongoing)
  targetHours: number;
  actualHours?: number;
  status: FastingSessionStatus;
  createdAt: string;
}

export interface FastingStats {
  currentStreak: number;
  longestStreak: number;
  totalFastingHours: number;
  averageFastHours: number;
  totalFastsCompleted: number;
  completionRate: number;
}

// ============================================================
// Meal Planning Types
// ============================================================

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export type PlannedMealStatus = 'planned' | 'logged' | 'skipped';

export interface PlannedMeal {
  id: string;
  date: string; // YYYY-MM-DD
  mealSlot: MealSlot;
  foodId: string; // Reference to food in database
  foodName: string; // Denormalized for display
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  status: PlannedMealStatus;
  loggedAt?: string;
  createdAt: string;
}

export interface MealPlanSettings {
  enabled: boolean;
  showOnToday: boolean; // Show planned section on Today tab
  reminderTime?: string; // Optional: notify to confirm meals
  createdAt: string;
  lastModified: string;
}

export interface DayMealPlan {
  date: string;
  meals: {
    breakfast: PlannedMeal[];
    lunch: PlannedMeal[];
    dinner: PlannedMeal[];
    snacks: PlannedMeal[];
  };
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface WeeklyMealPlanSummary {
  startDate: string;
  endDate: string;
  mealsPlanned: number;
  totalMealSlots: number; // 21 for 3 meals/day x 7 days
  avgDailyCalories: number;
  avgDailyProtein: number;
}

// ============================================================
// Database Row Types (snake_case)
// ============================================================

export interface MacroCycleConfigRow {
  id: number;
  enabled: number;
  pattern_type: string;
  marked_days: string; // JSON array
  day_targets: string; // JSON object
  created_at: string;
  last_modified: string;
}

export interface MacroCycleOverrideRow {
  id: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

export interface FastingConfigRow {
  id: number;
  enabled: number;
  protocol: string;
  custom_fast_hours: number | null;
  typical_eat_start: string;
  typical_eat_end: string;
  notify_window_opens: number;
  notify_window_closes_soon: number;
  notify_closes_reminder_mins: number;
  notify_fast_complete: number;
  created_at: string;
  last_modified: string;
}

export interface FastingSessionRow {
  id: string;
  start_time: string;
  end_time: string | null;
  target_hours: number;
  actual_hours: number | null;
  status: string;
  created_at: string;
}

export interface MealPlanSettingsRow {
  id: number;
  enabled: number;
  show_on_today: number;
  reminder_time: string | null;
  created_at: string;
  last_modified: string;
}

export interface PlannedMealRow {
  id: string;
  date: string;
  meal_slot: string;
  food_id: string;
  food_name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  status: string;
  logged_at: string | null;
  created_at: string;
}
