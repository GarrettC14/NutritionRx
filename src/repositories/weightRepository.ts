import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@/db/database';
import { WeightEntryRow } from '@/types/database';
import { WeightEntry } from '@/types/domain';
import { mapWeightEntryRowToDomain } from '@/types/mappers';

export interface CreateWeightInput {
  date: string;
  weightKg: number;
  notes?: string;
}

export interface UpdateWeightInput {
  weightKg?: number;
  notes?: string;
}

export const weightRepository = {
  async findById(id: string): Promise<WeightEntry | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<WeightEntryRow>(
      'SELECT * FROM weight_entries WHERE id = ?',
      [id]
    );
    return row ? mapWeightEntryRowToDomain(row) : null;
  },

  async findByDate(date: string): Promise<WeightEntry | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<WeightEntryRow>(
      'SELECT * FROM weight_entries WHERE date = ? ORDER BY created_at DESC LIMIT 1',
      [date]
    );
    return row ? mapWeightEntryRowToDomain(row) : null;
  },

  async findByDateRange(startDate: string, endDate: string): Promise<WeightEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<WeightEntryRow>(
      `SELECT * FROM weight_entries
       WHERE date BETWEEN ? AND ?
       ORDER BY date ASC`,
      [startDate, endDate]
    );
    return rows.map(mapWeightEntryRowToDomain);
  },

  async getAll(): Promise<WeightEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<WeightEntryRow>(
      'SELECT * FROM weight_entries ORDER BY date DESC'
    );
    return rows.map(mapWeightEntryRowToDomain);
  },

  async getRecent(limit: number = 30): Promise<WeightEntry[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<WeightEntryRow>(
      'SELECT * FROM weight_entries ORDER BY date DESC LIMIT ?',
      [limit]
    );
    return rows.map(mapWeightEntryRowToDomain);
  },

  async getLatest(): Promise<WeightEntry | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<WeightEntryRow>(
      'SELECT * FROM weight_entries ORDER BY date DESC LIMIT 1'
    );
    return row ? mapWeightEntryRowToDomain(row) : null;
  },

  async getTrendWeight(date: string, smoothingDays: number = 7): Promise<number | null> {
    const db = getDatabase();
    // Get recent weights for exponential moving average calculation
    const rows = await db.getAllAsync<{ weight_kg: number }>(
      `SELECT weight_kg FROM weight_entries
       WHERE date <= ?
       ORDER BY date DESC
       LIMIT ?`,
      [date, smoothingDays]
    );

    if (rows.length === 0) return null;

    // Calculate exponential moving average
    // Weight recent entries more heavily
    const alpha = 2 / (smoothingDays + 1);
    let ema = rows[0].weight_kg;

    for (let i = 1; i < rows.length; i++) {
      ema = alpha * rows[i].weight_kg + (1 - alpha) * ema;
    }

    return Math.round(ema * 100) / 100;
  },

  async getDaysWeighedInRange(startDate: string, endDate: string): Promise<number> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ days_weighed: number }>(
      `SELECT COUNT(DISTINCT date) as days_weighed
       FROM weight_entries
       WHERE date BETWEEN ? AND ?`,
      [startDate, endDate]
    );
    return result?.days_weighed ?? 0;
  },

  async create(input: CreateWeightInput): Promise<WeightEntry> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Check if entry already exists for this date
    const existing = await this.findByDate(input.date);
    if (existing) {
      // Update existing entry instead
      return this.update(existing.id, {
        weightKg: input.weightKg,
        notes: input.notes,
      });
    }

    await db.runAsync(
      `INSERT INTO weight_entries (
        id, date, weight_kg, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.date, input.weightKg, input.notes ?? null, now, now]
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create weight entry');
    return created;
  },

  async update(id: string, updates: UpdateWeightInput): Promise<WeightEntry> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const setClauses: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.weightKg !== undefined) {
      setClauses.push('weight_kg = ?');
      values.push(updates.weightKg);
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(updates.notes);
    }

    values.push(id);

    await db.runAsync(
      `UPDATE weight_entries SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Weight entry not found');
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM weight_entries WHERE id = ?', [id]);
  },

  async deleteByDate(date: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM weight_entries WHERE date = ?', [date]);
  },

  async exists(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM weight_entries WHERE id = ?',
      [id]
    );
    return (result?.count ?? 0) > 0;
  },

  async existsByDate(date: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM weight_entries WHERE date = ?',
      [date]
    );
    return (result?.count ?? 0) > 0;
  },
};
