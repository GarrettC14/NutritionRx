import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, nowISO,
  shouldSkip, randomInt, batchInsert,
} from './helpers';

export async function seedMacroCycleConfig(db: SQLiteDatabase, verbose: boolean): Promise<number> {
  const now = nowISO();

  // Training days: Mon, Tue, Thu, Fri (indices 1,2,4,5)
  const markedDays = JSON.stringify([1, 2, 4, 5]);

  // Training day targets vs rest day targets
  const dayTargets = JSON.stringify({
    training: { calories: 2300, protein: 150, carbs: 240, fat: 75 },
    rest: { calories: 1900, protein: 135, carbs: 160, fat: 80 },
  });

  await db.runAsync(
    `INSERT OR REPLACE INTO macro_cycle_config (
      id, enabled, pattern_type, marked_days, day_targets, created_at, last_modified
    ) VALUES (1, 1, 'training_rest', ?, ?, ?, ?)`,
    [markedDays, dayTargets, now, now]
  );

  if (verbose) console.log('[seed] Inserted macro cycle config');
  return 1;
}

export async function seedMacroCycleOverrides(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  verbose: boolean
): Promise<number> {
  const columns = ['id', 'date', 'calories', 'protein', 'carbs', 'fat', 'created_at'];
  const rows: unknown[][] = [];

  const totalDays = monthsOfHistory * 30;
  const now = nowISO();

  // Sparse overrides — ~2 per month
  for (let i = totalDays; i >= 0; i--) {
    if (shouldSkip(0.93)) continue;

    const date = daysAgo(i);

    rows.push([
      generateId('mco'),
      date,
      randomInt(1800, 2800),
      randomInt(120, 180),
      randomInt(150, 280),
      randomInt(60, 100),
      now,
    ]);
  }

  await batchInsert(db, 'macro_cycle_overrides', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} macro cycle overrides`);
  return rows.length;
}
