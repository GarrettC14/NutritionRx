import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, datetimeAgo, nowISO,
  randomInt, gaussianRandom, round, batchInsert,
} from './helpers';

export async function seedWeeklyReflections(
  db: SQLiteDatabase,
  activeGoalId: string,
  monthsOfHistory: number,
  verbose: boolean
): Promise<number> {
  const startWeight = 88;
  const initialTdee = 2650;
  const targetCalories = 2150;

  const columns = [
    'id', 'goal_id', 'week_number', 'week_start_date', 'week_end_date',
    'avg_calorie_intake', 'days_logged', 'days_weighed',
    'start_trend_weight_kg', 'end_trend_weight_kg', 'weight_change_kg',
    'calculated_daily_burn',
    'previous_tdee_estimate', 'previous_target_calories',
    'new_tdee_estimate', 'new_target_calories',
    'new_protein_g', 'new_carbs_g', 'new_fat_g',
    'was_accepted', 'user_notes', 'data_quality', 'created_at',
  ];
  const rows: unknown[][] = [];

  const totalWeeks = Math.floor(monthsOfHistory * 4.3);

  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    const weekStartOffset = 7 + (totalWeeks - weekNum) * 7;
    const weekStart = daysAgo(weekStartOffset);
    const weekEnd = daysAgo(weekStartOffset - 6);

    const weeklyWeightChange = round(-0.4 + gaussianRandom(0, 0.15), 2);
    const avgCalories = Math.round(2050 + gaussianRandom(0, 100));
    const daysLogged = randomInt(4, 7);
    const daysWeighed = randomInt(3, 7);

    const startTrendWeight = round(startWeight - (weekNum - 1) * 0.5, 1);
    const endTrendWeight = round(startWeight - weekNum * 0.5, 1);

    const notes = weekNum === 3
      ? 'Feeling good, energy levels stable'
      : weekNum === 7
      ? 'Busy week, missed some meals'
      : null;

    rows.push([
      generateId('refl'),
      activeGoalId,
      weekNum,
      weekStart,
      weekEnd,
      avgCalories,
      daysLogged,
      daysWeighed,
      startTrendWeight,
      endTrendWeight,
      weeklyWeightChange,
      2550 + randomInt(-50, 50),
      initialTdee - (weekNum - 1) * 10,
      targetCalories - (weekNum - 1) * 10,
      initialTdee - weekNum * 10,
      targetCalories - weekNum * 10,
      135,
      195 - weekNum,
      87,
      1,
      notes,
      daysLogged >= 5 ? 'high' : 'moderate',
      datetimeAgo(weekStartOffset - 7),
    ]);
  }

  await batchInsert(db, 'weekly_reflections', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} weekly reflections`);
  return rows.length;
}

export async function seedHealthSyncLog(
  db: SQLiteDatabase,
  verbose: boolean
): Promise<number> {
  const now = nowISO();

  const columns = [
    'id', 'platform', 'direction', 'data_type',
    'local_record_id', 'local_record_type', 'external_id',
    'status', 'error_message', 'synced_at', 'created_at',
  ];
  const rows: unknown[][] = [];

  // A handful of sync records
  const platforms = ['healthkit', 'health_connect'] as const;
  const dataTypes = ['weight', 'calories', 'nutrition'] as const;

  for (let i = 10; i >= 0; i--) {
    const date = daysAgo(i * 3);
    const datetime = `${date}T08:00:00.000Z`;

    rows.push([
      generateId('sync'),
      platforms[i % 2],
      'import',
      dataTypes[i % 3],
      null,
      null,
      `ext-${i}`,
      i === 5 ? 'error' : 'success',
      i === 5 ? 'Network timeout' : null,
      datetime,
      datetime,
    ]);
  }

  await batchInsert(db, 'health_sync_log', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} health sync log records`);
  return rows.length;
}
