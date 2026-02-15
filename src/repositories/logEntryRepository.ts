import { generateId } from '@/utils/generateId';
import { getDatabase } from '@/db/database';
import { LogEntryWithFoodRow, DailyTotalsRow } from '@/types/database';
import { LogEntry, DailyTotals } from '@/types/domain';
import { mapLogEntryRowToDomain } from '@/types/mappers';
export interface CreateLogEntryInput {
  foodItemId: string;
  date: string;
  mealType: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
}

export interface UpdateLogEntryInput {
  servings?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mealType?: string;
  notes?: string;
}

export const logEntryRepository = {
  async findById(id: string): Promise<LogEntry | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<LogEntryWithFoodRow>(
      `SELECT le.*, fi.name as food_name, fi.brand as food_brand, rl.recipe_name
       FROM log_entries le
       JOIN food_items fi ON le.food_item_id = fi.id
       LEFT JOIN recipe_logs rl ON le.recipe_log_id = rl.id
       WHERE le.id = ?`,
      [id]
    );
    return row ? mapLogEntryRowToDomain(row) : null;
  },

  async findByDate(date: string): Promise<LogEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<LogEntryWithFoodRow>(
      `SELECT le.*, fi.name as food_name, fi.brand as food_brand, rl.recipe_name
       FROM log_entries le
       JOIN food_items fi ON le.food_item_id = fi.id
       LEFT JOIN recipe_logs rl ON le.recipe_log_id = rl.id
       WHERE le.date = ?
       ORDER BY
         CASE le.meal_type
           WHEN 'breakfast' THEN 1
           WHEN 'lunch' THEN 2
           WHEN 'dinner' THEN 3
           WHEN 'snack' THEN 4
           ELSE 5
         END,
         le.created_at`,
      [date]
    );
    return rows.map(mapLogEntryRowToDomain);
  },

  async findByDateAndMeal(date: string, mealType: string): Promise<LogEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<LogEntryWithFoodRow>(
      `SELECT le.*, fi.name as food_name, fi.brand as food_brand, rl.recipe_name
       FROM log_entries le
       JOIN food_items fi ON le.food_item_id = fi.id
       LEFT JOIN recipe_logs rl ON le.recipe_log_id = rl.id
       WHERE le.date = ? AND le.meal_type = ?
       ORDER BY le.created_at`,
      [date, mealType]
    );
    return rows.map(mapLogEntryRowToDomain);
  },

  async findByDateRange(startDate: string, endDate: string): Promise<LogEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<LogEntryWithFoodRow>(
      `SELECT le.*, fi.name as food_name, fi.brand as food_brand, rl.recipe_name
       FROM log_entries le
       JOIN food_items fi ON le.food_item_id = fi.id
       LEFT JOIN recipe_logs rl ON le.recipe_log_id = rl.id
       WHERE le.date BETWEEN ? AND ?
       ORDER BY le.date, le.meal_type, le.created_at`,
      [startDate, endDate]
    );
    return rows.map(mapLogEntryRowToDomain);
  },

  async getAll(): Promise<LogEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<LogEntryWithFoodRow>(
      `SELECT le.*, fi.name as food_name, fi.brand as food_brand, rl.recipe_name
       FROM log_entries le
       JOIN food_items fi ON le.food_item_id = fi.id
       LEFT JOIN recipe_logs rl ON le.recipe_log_id = rl.id
       ORDER BY le.date DESC, le.meal_type, le.created_at`
    );
    return rows.map(mapLogEntryRowToDomain);
  },

  async getDailyTotals(date: string): Promise<DailyTotals> {
    const db = getDatabase();
    const result = await db.getFirstAsync<DailyTotalsRow>(
      `SELECT
         COALESCE(SUM(calories), 0) as total_calories,
         COALESCE(SUM(protein), 0) as total_protein,
         COALESCE(SUM(carbs), 0) as total_carbs,
         COALESCE(SUM(fat), 0) as total_fat
       FROM (
         SELECT calories, protein, carbs, fat FROM log_entries WHERE date = ?
         UNION ALL
         SELECT calories, COALESCE(protein, 0), COALESCE(carbs, 0), COALESCE(fat, 0)
         FROM quick_add_entries WHERE date = ?
       )`,
      [date, date]
    );

    return {
      calories: result?.total_calories ?? 0,
      protein: result?.total_protein ?? 0,
      carbs: result?.total_carbs ?? 0,
      fat: result?.total_fat ?? 0,
    };
  },

  async getDailyTotalsForRange(
    startDate: string,
    endDate: string
  ): Promise<Array<{ date: string; totals: DailyTotals }>> {
    const db = getDatabase();
    const results = await db.getAllAsync<{
      date: string;
      total_calories: number;
      total_protein: number;
      total_carbs: number;
      total_fat: number;
    }>(
      `SELECT date,
         COALESCE(SUM(calories), 0) as total_calories,
         COALESCE(SUM(protein), 0) as total_protein,
         COALESCE(SUM(carbs), 0) as total_carbs,
         COALESCE(SUM(fat), 0) as total_fat
       FROM (
         SELECT date, calories, protein, carbs, fat
         FROM log_entries WHERE date BETWEEN ? AND ?
         UNION ALL
         SELECT date, calories, COALESCE(protein, 0), COALESCE(carbs, 0), COALESCE(fat, 0)
         FROM quick_add_entries WHERE date BETWEEN ? AND ?
       )
       GROUP BY date
       ORDER BY date`,
      [startDate, endDate, startDate, endDate]
    );

    return results.map((r) => ({
      date: r.date,
      totals: {
        calories: r.total_calories,
        protein: r.total_protein,
        carbs: r.total_carbs,
        fat: r.total_fat,
      },
    }));
  },

  async create(input: CreateLogEntryInput): Promise<LogEntry> {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO log_entries (
        id, food_item_id, date, meal_type, servings,
        calories, protein, carbs, fat, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.foodItemId,
        input.date,
        input.mealType,
        input.servings,
        input.calories,
        input.protein,
        input.carbs,
        input.fat,
        input.notes ?? null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create log entry');
    return created;
  },

  async update(id: string, updates: UpdateLogEntryInput): Promise<LogEntry> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const setClauses: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.servings !== undefined) {
      setClauses.push('servings = ?');
      values.push(updates.servings);
    }
    if (updates.calories !== undefined) {
      setClauses.push('calories = ?');
      values.push(updates.calories);
    }
    if (updates.protein !== undefined) {
      setClauses.push('protein = ?');
      values.push(updates.protein);
    }
    if (updates.carbs !== undefined) {
      setClauses.push('carbs = ?');
      values.push(updates.carbs);
    }
    if (updates.fat !== undefined) {
      setClauses.push('fat = ?');
      values.push(updates.fat);
    }
    if (updates.mealType !== undefined) {
      setClauses.push('meal_type = ?');
      values.push(updates.mealType);
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(updates.notes);
    }

    values.push(id);

    await db.runAsync(
      `UPDATE log_entries SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Log entry not found');
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM log_entries WHERE id = ?', [id]);
  },

  async deleteByDate(date: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM log_entries WHERE date = ?', [date]);
  },

  async exists(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM log_entries WHERE id = ?',
      [id]
    );
    return (result?.count ?? 0) > 0;
  },

  async getDaysLoggedInRange(startDate: string, endDate: string): Promise<number> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ days_logged: number }>(
      `SELECT COUNT(DISTINCT date) as days_logged
       FROM (
         SELECT date FROM log_entries WHERE date BETWEEN ? AND ?
         UNION ALL
         SELECT date FROM quick_add_entries WHERE date BETWEEN ? AND ?
       )`,
      [startDate, endDate, startDate, endDate]
    );
    return result?.days_logged ?? 0;
  },

  async getDatesWithLogs(limitDays: number = 90): Promise<string[]> {
    const db = getDatabase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - limitDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const results = await db.getAllAsync<{ date: string }>(
      `SELECT DISTINCT date
       FROM (
         SELECT date FROM log_entries WHERE date >= ?
         UNION ALL
         SELECT date FROM quick_add_entries WHERE date >= ?
       )
       ORDER BY date DESC`,
      [cutoffStr, cutoffStr]
    );
    return results.map((r) => r.date);
  },

  async getLogDateRange(): Promise<{ firstDate: string | null; lastDate: string | null }> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ first_date: string | null; last_date: string | null }>(
      `SELECT MIN(date) as first_date, MAX(date) as last_date
       FROM (
         SELECT date FROM log_entries
         UNION ALL
         SELECT date FROM quick_add_entries
       )`
    );
    return {
      firstDate: result?.first_date ?? null,
      lastDate: result?.last_date ?? null,
    };
  },
};
