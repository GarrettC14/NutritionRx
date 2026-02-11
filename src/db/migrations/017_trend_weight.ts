import { SQLiteDatabase } from 'expo-sqlite';

const HALF_LIFE_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function migration017TrendWeight(db: SQLiteDatabase): Promise<void> {
  // Add trend_weight_kg column (idempotent — skip if already exists)
  const cols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(weight_entries)`
  );
  const hasColumn = cols.some((c) => c.name === 'trend_weight_kg');
  if (!hasColumn) {
    await db.execAsync(`ALTER TABLE weight_entries ADD COLUMN trend_weight_kg REAL;`);
  }

  // Backfill existing entries with EWMA chain
  const rows = await db.getAllAsync<{
    id: string;
    date: string;
    weight_kg: number;
  }>('SELECT id, date, weight_kg FROM weight_entries ORDER BY date ASC');

  if (rows.length > 0) {
    let prevTrend = rows[0].weight_kg;
    let prevDate = new Date(rows[0].date + 'T12:00:00').getTime();

    await db.runAsync(
      'UPDATE weight_entries SET trend_weight_kg = ? WHERE id = ?',
      [prevTrend, rows[0].id]
    );

    for (let i = 1; i < rows.length; i++) {
      const currDate = new Date(rows[i].date + 'T12:00:00').getTime();
      const dayGap = Math.max((currDate - prevDate) / MS_PER_DAY, 0.01);
      const effectiveAlpha = 1 - Math.pow(2, -dayGap / HALF_LIFE_DAYS);
      const trend = effectiveAlpha * rows[i].weight_kg + (1 - effectiveAlpha) * prevTrend;

      await db.runAsync(
        'UPDATE weight_entries SET trend_weight_kg = ? WHERE id = ?',
        [trend, rows[i].id]
      );

      prevTrend = trend;
      prevDate = currDate;
    }
  }
}
