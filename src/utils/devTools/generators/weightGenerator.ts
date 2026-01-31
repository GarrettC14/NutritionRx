import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, datetimeAgo, datesBetween,
  shouldSkip, gaussianRandom, round, clamp, batchInsert,
} from './helpers';
import { EDGE_CASE_WEIGHTS_KG } from '../mockData/edgeCases';

export async function seedWeightEntries(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  includeEdgeCases: boolean,
  verbose: boolean
): Promise<number> {
  const totalDays = monthsOfHistory * 30;
  const startWeight = 88;
  const weightLossPerDay = 0.11;

  const columns = ['id', 'date', 'weight_kg', 'notes', 'created_at', 'updated_at'];
  const rows: unknown[][] = [];

  for (let i = totalDays; i >= 0; i--) {
    // ~15% gap rate
    if (i > 0 && shouldSkip(0.15)) continue;

    const date = daysAgo(i);
    const baseWeight = startWeight - (totalDays - i) * weightLossPerDay;
    const fluctuation = gaussianRandom(0, 0.3);
    const weight = round(clamp(baseWeight + fluctuation, 45, 200), 1);
    const datetime = datetimeAgo(i);

    rows.push([
      `weight-${date}`,
      date,
      weight,
      null,
      datetime,
      datetime,
    ]);
  }

  // Inject edge case weights
  if (includeEdgeCases) {
    for (let i = 0; i < Math.min(3, EDGE_CASE_WEIGHTS_KG.length); i++) {
      const date = daysAgo(totalDays + 10 + i);
      const datetime = datetimeAgo(totalDays + 10 + i);
      rows.push([
        `weight-edge-${i}`,
        date,
        EDGE_CASE_WEIGHTS_KG[i],
        'Edge case weight entry',
        datetime,
        datetime,
      ]);
    }
  }

  await batchInsert(db, 'weight_entries', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} weight entries`);
  return rows.length;
}

export async function seedDailyMetabolism(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  verbose: boolean
): Promise<number> {
  const totalDays = monthsOfHistory * 30;
  const startWeight = 88;

  const columns = [
    'id', 'date', 'trend_weight_kg', 'calorie_intake',
    'estimated_daily_burn', 'data_quality', 'created_at', 'updated_at',
  ];
  const rows: unknown[][] = [];

  for (let i = totalDays; i >= 0; i--) {
    if (i > 0 && shouldSkip(0.2)) continue;

    const date = daysAgo(i);
    const trendWeight = round(startWeight - (totalDays - i) * 0.12 + gaussianRandom(0, 0.15), 1);
    const calorieIntake = Math.round(1950 + gaussianRandom(0, 150));
    const estimatedBurn = Math.round(2500 + gaussianRandom(0, 100));
    const datetime = datetimeAgo(i);

    rows.push([
      `metab-${date}`,
      date,
      trendWeight,
      calorieIntake,
      estimatedBurn,
      calorieIntake > 0 ? 'moderate' : 'low',
      datetime,
      datetime,
    ]);
  }

  await batchInsert(db, 'daily_metabolism', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} daily metabolism entries`);
  return rows.length;
}
