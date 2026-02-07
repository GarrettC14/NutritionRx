/**
 * Nutrition Context Queries
 * Raw SQLite queries against the NutritionRx schema.
 * Feeds Stage 1 of the context pipeline.
 */

import { getDatabase } from '@/db/database';

// ============================================================
// Types
// ============================================================

export interface DailyNutritionLog {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealsLogged: number;
}

export interface WeeklyNutritionSummary {
  weekStart: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgFiber: number;
  daysLogged: number;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FrequentFood {
  name: string;
  timesLogged: number;
  avgCalories: number;
}

export interface MealTimingPattern {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  avgCalories: number;
  frequency: number;
}

export interface WeightEntry {
  date: string;
  weightKg: number;
}

export interface UserGoalData {
  type: 'lose' | 'maintain' | 'gain';
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export interface UserProfileData {
  activityLevel: string | null;
  eatingStyle: string;
  proteinPriority: string;
}

export interface RawNutritionData {
  dailyLogs: DailyNutritionLog[];
  weeklyAverages: WeeklyNutritionSummary[];
  macroTargets: MacroTargets;
  frequentFoods: FrequentFood[];
  mealPatterns: MealTimingPattern[];
  weightTrend: WeightEntry[];
  goal: UserGoalData | null;
  profile: UserProfileData | null;
  weightUnit: 'lbs' | 'kg';
}

// ============================================================
// Queries
// ============================================================

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDate(d);
}

/**
 * Get daily nutrition totals for the last N days.
 * UNIONs log_entries + quick_add_entries (no separate daily_totals table).
 * Fiber comes from food_items via JOIN (not on log_entries directly).
 */
async function queryDailyLogs(days: number): Promise<DailyNutritionLog[]> {
  const db = getDatabase();
  const startDate = daysAgo(days);
  const today = formatDate(new Date());

  const rows = await db.getAllAsync<{
    date: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    total_fiber: number;
    meals_logged: number;
  }>(
    `SELECT
       combined.date,
       COALESCE(SUM(combined.calories), 0) as total_calories,
       COALESCE(SUM(combined.protein), 0) as total_protein,
       COALESCE(SUM(combined.carbs), 0) as total_carbs,
       COALESCE(SUM(combined.fat), 0) as total_fat,
       COALESCE(SUM(combined.fiber), 0) as total_fiber,
       COUNT(DISTINCT combined.meal_type) as meals_logged
     FROM (
       SELECT le.date, le.calories, le.protein, le.carbs, le.fat,
              COALESCE(fi.fiber, 0) * le.servings as fiber,
              le.meal_type
       FROM log_entries le
       LEFT JOIN food_items fi ON le.food_item_id = fi.id
       WHERE le.date BETWEEN ? AND ?

       UNION ALL

       SELECT qa.date, qa.calories, COALESCE(qa.protein, 0), COALESCE(qa.carbs, 0),
              COALESCE(qa.fat, 0), 0 as fiber, qa.meal_type
       FROM quick_add_entries qa
       WHERE qa.date BETWEEN ? AND ?
     ) combined
     GROUP BY combined.date
     ORDER BY combined.date`,
    [startDate, today, startDate, today],
  );

  return rows.map((r) => ({
    date: r.date,
    calories: Math.round(r.total_calories),
    protein: Math.round(r.total_protein),
    carbs: Math.round(r.total_carbs),
    fat: Math.round(r.total_fat),
    fiber: Math.round(r.total_fiber),
    mealsLogged: r.meals_logged,
  }));
}

/**
 * 4-week rolling averages, computed per-week.
 */
async function queryWeeklyAverages(): Promise<WeeklyNutritionSummary[]> {
  const db = getDatabase();
  const startDate = daysAgo(28);
  const today = formatDate(new Date());

  // Get daily totals for the last 28 days, then aggregate by week in JS
  // (SQLite date functions are limited — strftime('%W') is unreliable across years)
  const dailyRows = await db.getAllAsync<{
    date: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    total_fiber: number;
  }>(
    `SELECT combined.date,
       COALESCE(SUM(combined.calories), 0) as total_calories,
       COALESCE(SUM(combined.protein), 0) as total_protein,
       COALESCE(SUM(combined.carbs), 0) as total_carbs,
       COALESCE(SUM(combined.fat), 0) as total_fat,
       COALESCE(SUM(combined.fiber), 0) as total_fiber
     FROM (
       SELECT le.date, le.calories, le.protein, le.carbs, le.fat,
              COALESCE(fi.fiber, 0) * le.servings as fiber
       FROM log_entries le
       LEFT JOIN food_items fi ON le.food_item_id = fi.id
       WHERE le.date BETWEEN ? AND ?

       UNION ALL

       SELECT qa.date, qa.calories, COALESCE(qa.protein, 0), COALESCE(qa.carbs, 0),
              COALESCE(qa.fat, 0), 0 as fiber
       FROM quick_add_entries qa
       WHERE qa.date BETWEEN ? AND ?
     ) combined
     GROUP BY combined.date
     ORDER BY combined.date`,
    [startDate, today, startDate, today],
  );

  // Group into 7-day windows from today backward
  const weeks: WeeklyNutritionSummary[] = [];
  for (let w = 0; w < 4; w++) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(weekEnd);

    const weekDays = dailyRows.filter(
      (r) => r.date >= weekStartStr && r.date <= weekEndStr,
    );

    if (weekDays.length === 0) continue;

    weeks.push({
      weekStart: weekStartStr,
      avgCalories: Math.round(weekDays.reduce((s, d) => s + d.total_calories, 0) / weekDays.length),
      avgProtein: Math.round(weekDays.reduce((s, d) => s + d.total_protein, 0) / weekDays.length),
      avgCarbs: Math.round(weekDays.reduce((s, d) => s + d.total_carbs, 0) / weekDays.length),
      avgFat: Math.round(weekDays.reduce((s, d) => s + d.total_fat, 0) / weekDays.length),
      avgFiber: Math.round(weekDays.reduce((s, d) => s + d.total_fiber, 0) / weekDays.length),
      daysLogged: weekDays.length,
    });
  }

  return weeks;
}

/**
 * Get macro targets from the active goal, or fall back to user_settings.
 */
async function queryMacroTargets(): Promise<{ targets: MacroTargets; goal: UserGoalData | null }> {
  const db = getDatabase();

  // Try active goal first
  const goalRow = await db.getFirstAsync<{
    type: string;
    current_target_calories: number;
    current_protein_g: number;
    current_carbs_g: number;
    current_fat_g: number;
  }>('SELECT type, current_target_calories, current_protein_g, current_carbs_g, current_fat_g FROM goals WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');

  if (goalRow) {
    const targets = {
      calories: Math.round(goalRow.current_target_calories),
      protein: Math.round(goalRow.current_protein_g),
      carbs: Math.round(goalRow.current_carbs_g),
      fat: Math.round(goalRow.current_fat_g),
    };
    const goal: UserGoalData = {
      type: goalRow.type as 'lose' | 'maintain' | 'gain',
      targetCalories: targets.calories,
      targetProtein: targets.protein,
      targetCarbs: targets.carbs,
      targetFat: targets.fat,
    };
    return { targets, goal };
  }

  // Fall back to user_settings
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM user_settings WHERE key IN ('daily_calorie_goal', 'daily_protein_goal', 'daily_carbs_goal', 'daily_fat_goal')`,
  );
  const settingsMap: Record<string, number> = {};
  for (const r of rows) {
    settingsMap[r.key] = parseFloat(r.value) || 0;
  }

  return {
    targets: {
      calories: settingsMap['daily_calorie_goal'] || 2000,
      protein: settingsMap['daily_protein_goal'] || 150,
      carbs: settingsMap['daily_carbs_goal'] || 200,
      fat: settingsMap['daily_fat_goal'] || 65,
    },
    goal: null,
  };
}

/**
 * Top 20 most frequently logged foods.
 */
async function queryFrequentFoods(): Promise<FrequentFood[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{
    food_name: string;
    times_logged: number;
    avg_calories: number;
  }>(
    `SELECT fi.name as food_name,
            COUNT(*) as times_logged,
            ROUND(AVG(le.calories), 0) as avg_calories
     FROM log_entries le
     JOIN food_items fi ON le.food_item_id = fi.id
     GROUP BY fi.id
     ORDER BY times_logged DESC
     LIMIT 20`,
  );

  return rows.map((r) => ({
    name: r.food_name,
    timesLogged: r.times_logged,
    avgCalories: r.avg_calories,
  }));
}

/**
 * Meal timing patterns: frequency and avg calories per meal type.
 * Uses last 14 days of data.
 */
async function queryMealPatterns(): Promise<MealTimingPattern[]> {
  const db = getDatabase();
  const startDate = daysAgo(14);
  const today = formatDate(new Date());

  const rows = await db.getAllAsync<{
    meal_type: string;
    avg_calories: number;
    distinct_days: number;
  }>(
    `SELECT meal_type,
            ROUND(AVG(day_calories), 0) as avg_calories,
            COUNT(*) as distinct_days
     FROM (
       SELECT meal_type, date, SUM(calories) as day_calories
       FROM (
         SELECT meal_type, date, calories FROM log_entries WHERE date BETWEEN ? AND ?
         UNION ALL
         SELECT meal_type, date, calories FROM quick_add_entries WHERE date BETWEEN ? AND ?
       )
       GROUP BY meal_type, date
     )
     GROUP BY meal_type`,
    [startDate, today, startDate, today],
  );

  // Convert distinct_days to a per-week frequency (14 days → divide by 2)
  return rows.map((r) => ({
    mealType: r.meal_type as MealTimingPattern['mealType'],
    avgCalories: r.avg_calories,
    frequency: Math.round((r.distinct_days / 2) * 10) / 10,
  }));
}

/**
 * Weight entries for the last 30 days.
 */
async function queryWeightTrend(): Promise<WeightEntry[]> {
  const db = getDatabase();
  const startDate = daysAgo(30);

  const rows = await db.getAllAsync<{ date: string; weight_kg: number }>(
    `SELECT date, weight_kg FROM weight_entries WHERE date >= ? ORDER BY date ASC`,
    [startDate],
  );

  return rows.map((r) => ({ date: r.date, weightKg: r.weight_kg }));
}

/**
 * User profile data.
 */
async function queryProfile(): Promise<UserProfileData | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{
    activity_level: string | null;
    eating_style: string;
    protein_priority: string;
  }>(`SELECT activity_level, eating_style, protein_priority FROM user_profile WHERE id = 'default-profile'`);

  if (!row) return null;
  return {
    activityLevel: row.activity_level,
    eatingStyle: row.eating_style,
    proteinPriority: row.protein_priority,
  };
}

/**
 * Weight unit from settings.
 */
async function queryWeightUnit(): Promise<'lbs' | 'kg'> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM user_settings WHERE key = 'weight_unit'`,
  );
  return (row?.value as 'lbs' | 'kg') || 'lbs';
}

// ============================================================
// Main Query Function
// ============================================================

export async function getRawNutritionData(): Promise<RawNutritionData> {
  const [
    dailyLogs,
    weeklyAverages,
    { targets: macroTargets, goal },
    frequentFoods,
    mealPatterns,
    weightTrend,
    profile,
    weightUnit,
  ] = await Promise.all([
    queryDailyLogs(30),
    queryWeeklyAverages(),
    queryMacroTargets(),
    queryFrequentFoods(),
    queryMealPatterns(),
    queryWeightTrend(),
    queryProfile(),
    queryWeightUnit(),
  ]);

  return {
    dailyLogs,
    weeklyAverages,
    macroTargets,
    frequentFoods,
    mealPatterns,
    weightTrend,
    goal,
    profile,
    weightUnit,
  };
}
