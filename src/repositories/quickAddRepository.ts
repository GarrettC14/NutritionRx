import { generateId } from '@/utils/generateId';
import { getDatabase } from '@/db/database';
import { QuickAddEntryRow } from '@/types/database';
import { QuickAddEntry } from '@/types/domain';
import { mapQuickAddRowToDomain } from '@/types/mappers';
import { MealType } from '@/constants/mealTypes';

export interface CreateQuickAddInput {
  date: string;
  mealType: MealType;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  description?: string;
}

export interface UpdateQuickAddInput {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mealType?: MealType;
  description?: string;
}

export const quickAddRepository = {
  async findById(id: string): Promise<QuickAddEntry | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<QuickAddEntryRow>(
      'SELECT * FROM quick_add_entries WHERE id = ?',
      [id]
    );
    return row ? mapQuickAddRowToDomain(row) : null;
  },

  async findByDate(date: string): Promise<QuickAddEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<QuickAddEntryRow>(
      `SELECT * FROM quick_add_entries
       WHERE date = ?
       ORDER BY
         CASE meal_type
           WHEN 'breakfast' THEN 1
           WHEN 'lunch' THEN 2
           WHEN 'dinner' THEN 3
           WHEN 'snack' THEN 4
         END,
         created_at`,
      [date]
    );
    return rows.map(mapQuickAddRowToDomain);
  },

  async findByDateAndMeal(date: string, mealType: MealType): Promise<QuickAddEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<QuickAddEntryRow>(
      `SELECT * FROM quick_add_entries
       WHERE date = ? AND meal_type = ?
       ORDER BY created_at`,
      [date, mealType]
    );
    return rows.map(mapQuickAddRowToDomain);
  },

  async findByDateRange(startDate: string, endDate: string): Promise<QuickAddEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<QuickAddEntryRow>(
      `SELECT * FROM quick_add_entries
       WHERE date BETWEEN ? AND ?
       ORDER BY date, meal_type, created_at`,
      [startDate, endDate]
    );
    return rows.map(mapQuickAddRowToDomain);
  },

  async getAll(): Promise<QuickAddEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<QuickAddEntryRow>(
      `SELECT * FROM quick_add_entries ORDER BY date DESC, meal_type, created_at`
    );
    return rows.map(mapQuickAddRowToDomain);
  },

  async create(input: CreateQuickAddInput): Promise<QuickAddEntry> {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO quick_add_entries (
        id, date, meal_type, calories, protein, carbs, fat,
        description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.date,
        input.mealType,
        input.calories,
        input.protein ?? null,
        input.carbs ?? null,
        input.fat ?? null,
        input.description ?? null,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create quick add entry');
    return created;
  },

  async update(id: string, updates: UpdateQuickAddInput): Promise<QuickAddEntry> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const setClauses: string[] = ['updated_at = ?'];
    const values: any[] = [now];

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
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      values.push(updates.description);
    }

    values.push(id);

    await db.runAsync(
      `UPDATE quick_add_entries SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Quick add entry not found');
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM quick_add_entries WHERE id = ?', [id]);
  },

  async deleteByDate(date: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM quick_add_entries WHERE date = ?', [date]);
  },

  async createBatch(inputs: CreateQuickAddInput[]): Promise<void> {
    if (inputs.length === 0) return;

    const db = getDatabase();
    const now = new Date().toISOString();

    // Insert in chunks of 50 to stay within SQLite variable limits (50 * 10 fields = 500 < 999)
    const CHUNK_SIZE = 50;
    for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
      const chunk = inputs.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const values = chunk.flatMap((input) => [
        generateId(),
        input.date,
        input.mealType,
        input.calories,
        input.protein ?? null,
        input.carbs ?? null,
        input.fat ?? null,
        input.description ?? null,
        now,
        now,
      ]);

      await db.runAsync(
        `INSERT INTO quick_add_entries (
          id, date, meal_type, calories, protein, carbs, fat,
          description, created_at, updated_at
        ) VALUES ${placeholders}`,
        values
      );
    }
  },

  async exists(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM quick_add_entries WHERE id = ?',
      [id]
    );
    return (result?.count ?? 0) > 0;
  },
};
