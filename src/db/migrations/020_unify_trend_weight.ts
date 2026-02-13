import { SQLiteDatabase } from 'expo-sqlite';
import { recomputeEWMAFromDate } from '@/utils/trendWeight';

/**
 * Migration 020: Recompute all trend_weight_kg values using the unified
 * half-life EWMA formula (HALF_LIFE_DAYS = 7).
 *
 * Previous migrations used different smoothing constants. This migration
 * overwrites all stored trend values with the canonical formula so that
 * chart, reflection, and DB all agree.
 *
 * Idempotent: safe to run multiple times — always recomputes from scratch.
 */
export async function migration020UnifyTrendWeight(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{
    id: string;
    date: string;
    weight_kg: number;
    trend_weight_kg: number | null;
  }>('SELECT id, date, weight_kg, trend_weight_kg FROM weight_entries ORDER BY date ASC');

  if (rows.length > 0) {
    const allEntries = rows.map(r => ({
      id: r.id,
      date: r.date,
      weightKg: r.weight_kg,
      trendWeightKg: r.trend_weight_kg ?? undefined,
    }));

    // Recompute from the earliest entry to cascade through all
    const updates = recomputeEWMAFromDate(allEntries, allEntries[0].date);

    await db.execAsync('BEGIN TRANSACTION');
    try {
      for (const { id, trendWeightKg } of updates) {
        await db.runAsync(
          'UPDATE weight_entries SET trend_weight_kg = ? WHERE id = ?',
          [trendWeightKg, id]
        );
      }
      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  }

  await db.runAsync('INSERT INTO schema_version (version) VALUES (20)');
}
