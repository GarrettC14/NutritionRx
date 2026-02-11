import { getDatabase } from '@/db/database';
import { generateId } from '@/utils/generateId';
import {
  PlannedMeal,
  MealPlanSettings,
  PlannedMealRow,
  MealPlanSettingsRow,
  MealSlot,
  PlannedMealStatus,
  DayMealPlan,
} from '@/types/planning';

// Default values
export const DEFAULT_MEAL_PLAN_SETTINGS: Omit<MealPlanSettings, 'createdAt' | 'lastModified'> = {
  enabled: false,
  showOnToday: true,
};

function mapSettingsRowToSettings(row: MealPlanSettingsRow): MealPlanSettings {
  return {
    enabled: Boolean(row.enabled),
    showOnToday: Boolean(row.show_on_today),
    reminderTime: row.reminder_time ?? undefined,
    createdAt: row.created_at,
    lastModified: row.last_modified,
  };
}

function mapMealRowToMeal(row: PlannedMealRow): PlannedMeal {
  return {
    id: row.id,
    date: row.date,
    mealSlot: row.meal_slot as MealSlot,
    foodId: row.food_id,
    foodName: row.food_name,
    servings: row.servings,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    status: row.status as PlannedMealStatus,
    loggedAt: row.logged_at ?? undefined,
    createdAt: row.created_at,
  };
}

export interface CreatePlannedMealInput {
  date: string;
  mealSlot: MealSlot;
  foodId: string;
  foodName: string;
  servings?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const mealPlanRepository = {
  // ============================================================
  // Settings
  // ============================================================

  async getSettings(): Promise<MealPlanSettings | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<MealPlanSettingsRow>(
      'SELECT * FROM meal_plan_settings WHERE id = 1'
    );
    return row ? mapSettingsRowToSettings(row) : null;
  },

  async getOrCreateSettings(): Promise<MealPlanSettings> {
    const existing = await this.getSettings();
    if (existing) return existing;

    const db = getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO meal_plan_settings (id, enabled, show_on_today, created_at, last_modified)
       VALUES (1, 0, 1, ?, ?)`,
      [now, now]
    );

    return this.getSettings() as Promise<MealPlanSettings>;
  },

  async updateSettings(updates: Partial<MealPlanSettings>): Promise<MealPlanSettings> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Ensure settings exist
    await this.getOrCreateSettings();

    const setClauses: string[] = ['last_modified = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.enabled !== undefined) {
      setClauses.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.showOnToday !== undefined) {
      setClauses.push('show_on_today = ?');
      values.push(updates.showOnToday ? 1 : 0);
    }
    if (updates.reminderTime !== undefined) {
      setClauses.push('reminder_time = ?');
      values.push(updates.reminderTime || null);
    }

    await db.runAsync(
      `UPDATE meal_plan_settings SET ${setClauses.join(', ')} WHERE id = 1`,
      values
    );

    return this.getSettings() as Promise<MealPlanSettings>;
  },

  // ============================================================
  // Planned Meals CRUD
  // ============================================================

  async getMealById(id: string): Promise<PlannedMeal | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<PlannedMealRow>(
      'SELECT * FROM planned_meals WHERE id = ?',
      [id]
    );
    return row ? mapMealRowToMeal(row) : null;
  },

  async createMeal(input: CreatePlannedMealInput): Promise<PlannedMeal> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();

    await db.runAsync(
      `INSERT INTO planned_meals (
        id, date, meal_slot, food_id, food_name, servings,
        calories, protein, carbs, fat, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?)`,
      [
        id,
        input.date,
        input.mealSlot,
        input.foodId,
        input.foodName,
        input.servings ?? 1,
        input.calories,
        input.protein,
        input.carbs,
        input.fat,
        now,
      ]
    );

    return this.getMealById(id) as Promise<PlannedMeal>;
  },

  async updateMealStatus(
    id: string,
    status: PlannedMealStatus,
    loggedAt?: string
  ): Promise<PlannedMeal> {
    const db = getDatabase();

    await db.runAsync(
      `UPDATE planned_meals SET status = ?, logged_at = ? WHERE id = ?`,
      [status, loggedAt || null, id]
    );

    return this.getMealById(id) as Promise<PlannedMeal>;
  },

  async deleteMeal(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM planned_meals WHERE id = ?', [id]);
  },

  // ============================================================
  // Queries
  // ============================================================

  async getMealsForDate(date: string): Promise<PlannedMeal[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<PlannedMealRow>(
      'SELECT * FROM planned_meals WHERE date = ? ORDER BY meal_slot, created_at',
      [date]
    );
    return rows.map(mapMealRowToMeal);
  },

  async getMealsForDateRange(startDate: string, endDate: string): Promise<PlannedMeal[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<PlannedMealRow>(
      `SELECT * FROM planned_meals
       WHERE date >= ? AND date <= ?
       ORDER BY date, meal_slot, created_at`,
      [startDate, endDate]
    );
    return rows.map(mapMealRowToMeal);
  },

  async getPlannedMealsForToday(): Promise<PlannedMeal[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getMealsForDate(today);
  },

  async getPendingMealsForToday(): Promise<PlannedMeal[]> {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const rows = await db.getAllAsync<PlannedMealRow>(
      `SELECT * FROM planned_meals
       WHERE date = ? AND status = 'planned'
       ORDER BY meal_slot, created_at`,
      [today]
    );
    return rows.map(mapMealRowToMeal);
  },

  async getDayMealPlan(date: string): Promise<DayMealPlan> {
    const meals = await this.getMealsForDate(date);

    const dayPlan: DayMealPlan = {
      date,
      meals: {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      },
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    };

    for (const meal of meals) {
      dayPlan.meals[meal.mealSlot].push(meal);
      dayPlan.totalCalories += meal.calories * meal.servings;
      dayPlan.totalProtein += meal.protein * meal.servings;
      dayPlan.totalCarbs += meal.carbs * meal.servings;
      dayPlan.totalFat += meal.fat * meal.servings;
    }

    return dayPlan;
  },

  // ============================================================
  // Copy Operations
  // ============================================================

  async copyMealToDate(mealId: string, targetDate: string): Promise<PlannedMeal> {
    const sourceMeal = await this.getMealById(mealId);
    if (!sourceMeal) throw new Error('Meal not found');

    return this.createMeal({
      date: targetDate,
      mealSlot: sourceMeal.mealSlot,
      foodId: sourceMeal.foodId,
      foodName: sourceMeal.foodName,
      servings: sourceMeal.servings,
      calories: sourceMeal.calories,
      protein: sourceMeal.protein,
      carbs: sourceMeal.carbs,
      fat: sourceMeal.fat,
    });
  },

  async copySlotToDate(
    sourceDate: string,
    mealSlot: MealSlot,
    targetDate: string
  ): Promise<PlannedMeal[]> {
    const sourceMeals = await this.getMealsForDate(sourceDate);
    const slotMeals = sourceMeals.filter(m => m.mealSlot === mealSlot);

    return this._bulkCopyMeals(slotMeals, targetDate);
  },

  async copyDayToDate(sourceDate: string, targetDate: string): Promise<PlannedMeal[]> {
    const sourceMeals = await this.getMealsForDate(sourceDate);

    return this._bulkCopyMeals(sourceMeals, targetDate);
  },

  async copyDayToMultipleDates(sourceDate: string, targetDates: string[]): Promise<void> {
    const sourceMeals = await this.getMealsForDate(sourceDate);

    for (const targetDate of targetDates) {
      await this._bulkCopyMeals(sourceMeals, targetDate);
    }
  },

  async _bulkCopyMeals(meals: PlannedMeal[], targetDate: string): Promise<PlannedMeal[]> {
    if (meals.length === 0) return [];

    const db = getDatabase();
    const now = new Date().toISOString();
    const ids: string[] = [];

    await db.withTransactionAsync(async () => {
      const placeholders = meals.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values: (string | number | null)[] = [];

      for (const meal of meals) {
        const id = generateId();
        ids.push(id);
        values.push(
          id, targetDate, meal.mealSlot, meal.foodId, meal.foodName, meal.servings ?? 1,
          meal.calories, meal.protein, meal.carbs, meal.fat, 'planned', now
        );
      }

      await db.runAsync(
        `INSERT INTO planned_meals (id, date, meal_slot, food_id, food_name, servings, calories, protein, carbs, fat, status, created_at)
         VALUES ${placeholders}`,
        values
      );
    });

    // Fetch the created meals
    const idPlaceholders = ids.map(() => '?').join(', ');
    const rows = await db.getAllAsync<PlannedMealRow>(
      `SELECT * FROM planned_meals WHERE id IN (${idPlaceholders})`,
      ids
    );
    return rows.map(mapMealRowToMeal);
  },

  // ============================================================
  // Clear Operations
  // ============================================================

  async clearDay(date: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM planned_meals WHERE date = ?', [date]);
  },

  async clearSlot(date: string, mealSlot: MealSlot): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM planned_meals WHERE date = ? AND meal_slot = ?', [
      date,
      mealSlot,
    ]);
  },

  // ============================================================
  // Statistics
  // ============================================================

  async getWeeklyStats(
    startDate: string,
    endDate: string
  ): Promise<{
    mealsPlanned: number;
    mealsLogged: number;
    mealsSkipped: number;
    avgDailyCalories: number;
  }> {
    const db = getDatabase();

    const countResult = await db.getFirstAsync<{
      planned: number;
      logged: number;
      skipped: number;
    }>(
      `SELECT
        SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned,
        SUM(CASE WHEN status = 'logged' THEN 1 ELSE 0 END) as logged,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
       FROM planned_meals
       WHERE date >= ? AND date <= ?`,
      [startDate, endDate]
    );

    const calorieResult = await db.getFirstAsync<{ avg_cal: number }>(
      `SELECT AVG(daily_cal) as avg_cal FROM (
        SELECT SUM(calories * servings) as daily_cal
        FROM planned_meals
        WHERE date >= ? AND date <= ?
        GROUP BY date
      )`,
      [startDate, endDate]
    );

    return {
      mealsPlanned: (countResult?.planned || 0) + (countResult?.logged || 0),
      mealsLogged: countResult?.logged || 0,
      mealsSkipped: countResult?.skipped || 0,
      avgDailyCalories: Math.round(calorieResult?.avg_cal || 0),
    };
  },
};
