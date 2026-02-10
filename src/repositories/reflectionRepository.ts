import { getDatabase } from '@/db/database';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface Reflection {
  id: number;
  reflectedAt: string;
  weightKg: number;
  weightTrendKg: number | null;
  sentiment: Sentiment | null;
  previousCalories: number;
  previousProteinG: number;
  previousCarbsG: number;
  previousFatG: number;
  newCalories: number;
  newProteinG: number;
  newCarbsG: number;
  newFatG: number;
  weightChangeKg: number | null;
  createdAt: string;
}

interface ReflectionRow {
  id: number;
  reflected_at: string;
  weight_kg: number;
  weight_trend_kg: number | null;
  sentiment: string | null;
  previous_calories: number;
  previous_protein_g: number;
  previous_carbs_g: number;
  previous_fat_g: number;
  new_calories: number;
  new_protein_g: number;
  new_carbs_g: number;
  new_fat_g: number;
  weight_change_kg: number | null;
  created_at: string;
}

function mapRowToDomain(row: ReflectionRow): Reflection {
  return {
    id: row.id,
    reflectedAt: row.reflected_at,
    weightKg: row.weight_kg,
    weightTrendKg: row.weight_trend_kg,
    sentiment: row.sentiment as Sentiment | null,
    previousCalories: row.previous_calories,
    previousProteinG: row.previous_protein_g,
    previousCarbsG: row.previous_carbs_g,
    previousFatG: row.previous_fat_g,
    newCalories: row.new_calories,
    newProteinG: row.new_protein_g,
    newCarbsG: row.new_carbs_g,
    newFatG: row.new_fat_g,
    weightChangeKg: row.weight_change_kg,
    createdAt: row.created_at,
  };
}

export interface CreateReflectionInput {
  reflectedAt: string;
  weightKg: number;
  weightTrendKg: number | null;
  sentiment: Sentiment | null;
  previousCalories: number;
  previousProteinG: number;
  previousCarbsG: number;
  previousFatG: number;
  newCalories: number;
  newProteinG: number;
  newCarbsG: number;
  newFatG: number;
  weightChangeKg: number | null;
}

export const reflectionRepository = {
  async create(input: CreateReflectionInput): Promise<number> {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO reflections (
        reflected_at, weight_kg, weight_trend_kg, sentiment,
        previous_calories, previous_protein_g, previous_carbs_g, previous_fat_g,
        new_calories, new_protein_g, new_carbs_g, new_fat_g,
        weight_change_kg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.reflectedAt,
        input.weightKg,
        input.weightTrendKg,
        input.sentiment,
        input.previousCalories,
        input.previousProteinG,
        input.previousCarbsG,
        input.previousFatG,
        input.newCalories,
        input.newProteinG,
        input.newCarbsG,
        input.newFatG,
        input.weightChangeKg,
      ]
    );
    return result.lastInsertRowId;
  },

  async getLatest(): Promise<Reflection | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<ReflectionRow>(
      'SELECT * FROM reflections ORDER BY reflected_at DESC LIMIT 1'
    );
    return row ? mapRowToDomain(row) : null;
  },

  async getAll(limit?: number): Promise<Reflection[]> {
    const db = getDatabase();
    const sql = limit
      ? 'SELECT * FROM reflections ORDER BY reflected_at DESC LIMIT ?'
      : 'SELECT * FROM reflections ORDER BY reflected_at DESC';
    const rows = await db.getAllAsync<ReflectionRow>(
      sql,
      limit ? [limit] : []
    );
    return rows.map(mapRowToDomain);
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Reflection[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<ReflectionRow>(
      `SELECT * FROM reflections
       WHERE reflected_at BETWEEN ? AND ?
       ORDER BY reflected_at ASC`,
      [startDate, endDate]
    );
    return rows.map(mapRowToDomain);
  },

  async getRecentSentiments(
    count: number
  ): Promise<Array<{ sentiment: string | null; reflectedAt: string }>> {
    const db = getDatabase();
    const rows = await db.getAllAsync<{ sentiment: string | null; reflected_at: string }>(
      'SELECT sentiment, reflected_at FROM reflections ORDER BY reflected_at DESC LIMIT ?',
      [count]
    );
    return rows.map(r => ({ sentiment: r.sentiment, reflectedAt: r.reflected_at }));
  },

  async getCount(): Promise<number> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM reflections'
    );
    return result?.count ?? 0;
  },

  async getLastReflectionDate(): Promise<string | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ reflected_at: string }>(
      'SELECT reflected_at FROM reflections ORDER BY reflected_at DESC LIMIT 1'
    );
    return result?.reflected_at ?? null;
  },
};
