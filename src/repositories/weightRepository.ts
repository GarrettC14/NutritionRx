import { generateId } from '@/utils/generateId';
import { getDatabase } from '@/db/database';
import { WeightEntryRow } from '@/types/database';
import { WeightEntry } from '@/types/domain';
import { mapWeightEntryRowToDomain } from '@/types/mappers';
import { recomputeEWMAFromDate } from '@/utils/trendWeight';

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

  async getEarliestDate(): Promise<string | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ date: string }>(
      'SELECT date FROM weight_entries ORDER BY date ASC LIMIT 1'
    );
    return row?.date ?? null;
  },

  async recomputeTrendWeights(fromDate: string): Promise<void> {
    const db = getDatabase();

    // Fetch all entries sorted ASC
    const rows = await db.getAllAsync<WeightEntryRow>(
      'SELECT * FROM weight_entries ORDER BY date ASC'
    );

    const allEntries = rows.map((r) => ({
      id: r.id,
      date: r.date,
      weightKg: r.weight_kg,
      trendWeightKg: r.trend_weight_kg ?? undefined,
    }));

    const updates = recomputeEWMAFromDate(allEntries, fromDate);

    if (updates.length === 0) return;

    // Batch update in a single transaction using CASE expression
    const batchSize = 100;
    await db.withTransactionAsync(async () => {
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const ids = batch.map(u => u.id);
        const placeholders = ids.map(() => '?').join(', ');
        const whenClauses = batch.map(() => 'WHEN id = ? THEN ?').join(' ');
        const whenValues: (string | number)[] = [];
        for (const { id, trendWeightKg } of batch) {
          whenValues.push(id, trendWeightKg);
        }

        await db.runAsync(
          `UPDATE weight_entries SET trend_weight_kg = CASE ${whenClauses} END WHERE id IN (${placeholders})`,
          [...whenValues, ...ids]
        );
      }
    });
  },

  async create(input: CreateWeightInput): Promise<WeightEntry> {
    const db = getDatabase();
    const id = generateId();
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

    // Recompute trend weights from this date forward
    await this.recomputeTrendWeights(input.date);

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

    // Get the entry's date for trend recompute
    const entry = await this.findById(id);
    if (!entry) throw new Error('Weight entry not found');

    // Recompute trend weights from this entry's date forward
    await this.recomputeTrendWeights(entry.date);

    // Re-fetch with updated trend
    const updated = await this.findById(id);
    if (!updated) throw new Error('Weight entry not found');
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();

    // Capture date before deleting
    const entry = await this.findById(id);
    const date = entry?.date;

    await db.runAsync('DELETE FROM weight_entries WHERE id = ?', [id]);

    // Recompute trend weights from the deleted entry's date forward
    if (date) {
      await this.recomputeTrendWeights(date);
    }
  },

  async deleteByDate(date: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM weight_entries WHERE date = ?', [date]);

    // Recompute trend weights from the deleted date forward
    await this.recomputeTrendWeights(date);
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
