import { getDatabase } from '@/db/database';
import { generateId } from '@/utils/generateId';

export interface WaterLog {
  id: string;
  date: string;
  glasses: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WaterLogRow {
  id: string;
  date: string;
  glasses: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToWaterLog(row: WaterLogRow): WaterLog {
  return {
    id: row.id,
    date: row.date,
    glasses: row.glasses,
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export interface CreateWaterLogInput {
  date: string;
  glasses?: number;
  notes?: string;
}

export interface UpdateWaterLogInput {
  glasses?: number;
  notes?: string;
}

// Default water settings
export const DEFAULT_WATER_GOAL = 8; // glasses per day
export const DEFAULT_GLASS_SIZE_ML = 250; // ml per glass

export const waterRepository = {
  async getByDate(date: string): Promise<WaterLog | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<WaterLogRow>(
      'SELECT * FROM water_log WHERE date = ?',
      [date]
    );
    return row ? mapRowToWaterLog(row) : null;
  },

  async getOrCreateByDate(date: string): Promise<WaterLog> {
    const existing = await this.getByDate(date);
    if (existing) return existing;

    return this.create({ date, glasses: 0 });
  },

  async create(input: CreateWaterLogInput): Promise<WaterLog> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = generateId();

    await db.runAsync(
      `INSERT INTO water_log (id, date, glasses, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.date, input.glasses ?? 0, input.notes ?? null, now, now]
    );

    const created = await this.getByDate(input.date);
    if (!created) throw new Error('Failed to create water log');
    return created;
  },

  async update(date: string, updates: UpdateWaterLogInput): Promise<WaterLog> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Ensure log exists for this date
    await this.getOrCreateByDate(date);

    const setClauses: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.glasses !== undefined) {
      setClauses.push('glasses = ?');
      values.push(updates.glasses);
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(updates.notes);
    }

    values.push(date);

    await db.runAsync(
      `UPDATE water_log SET ${setClauses.join(', ')} WHERE date = ?`,
      values
    );

    const updated = await this.getByDate(date);
    if (!updated) throw new Error('Water log not found');
    return updated;
  },

  async addGlass(date: string): Promise<WaterLog> {
    const current = await this.getOrCreateByDate(date);
    return this.update(date, { glasses: current.glasses + 1 });
  },

  async removeGlass(date: string): Promise<WaterLog> {
    const current = await this.getOrCreateByDate(date);
    const newGlasses = Math.max(0, current.glasses - 1);
    return this.update(date, { glasses: newGlasses });
  },

  async setGlasses(date: string, glasses: number): Promise<WaterLog> {
    return this.update(date, { glasses: Math.max(0, glasses) });
  },

  async getAll(): Promise<WaterLog[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<WaterLogRow>(
      'SELECT * FROM water_log ORDER BY date ASC'
    );
    return rows.map(mapRowToWaterLog);
  },

  async getRecentLogs(limit: number = 7): Promise<WaterLog[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<WaterLogRow>(
      'SELECT * FROM water_log ORDER BY date DESC LIMIT ?',
      [limit]
    );
    return rows.map(mapRowToWaterLog);
  },

  async getLogsByDateRange(startDate: string, endDate: string): Promise<WaterLog[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<WaterLogRow>(
      'SELECT * FROM water_log WHERE date >= ? AND date <= ? ORDER BY date ASC',
      [startDate, endDate]
    );
    return rows.map(mapRowToWaterLog);
  },

  async deleteByDate(date: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM water_log WHERE date = ?', [date]);
  },

  async getStats(days: number = 30): Promise<{
    averageGlasses: number;
    totalDaysTracked: number;
    daysMetGoal: number;
    currentStreak: number;
  }> {
    const db = getDatabase();

    // Get recent logs
    const rows = await db.getAllAsync<{ date: string; glasses: number }>(
      `SELECT date, glasses FROM water_log
       WHERE date >= date('now', '-' || ? || ' days')
       ORDER BY date DESC`,
      [days]
    );

    const goalGlasses = DEFAULT_WATER_GOAL;

    if (rows.length === 0) {
      return {
        averageGlasses: 0,
        totalDaysTracked: 0,
        daysMetGoal: 0,
        currentStreak: 0,
      };
    }

    const totalGlasses = rows.reduce((sum, row) => sum + row.glasses, 0);
    const daysMetGoal = rows.filter(row => row.glasses >= goalGlasses).length;

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const row of rows) {
      if (row.glasses >= goalGlasses) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      averageGlasses: Math.round((totalGlasses / rows.length) * 10) / 10,
      totalDaysTracked: rows.length,
      daysMetGoal,
      currentStreak,
    };
  },
};
