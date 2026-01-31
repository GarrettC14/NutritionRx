import { SQLiteDatabase } from 'expo-sqlite';
import { daysAgo, datetimeAgo, shouldSkip, randomInt, batchInsert } from './helpers';

export async function seedWaterLog(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  verbose: boolean
): Promise<number> {
  const totalDays = monthsOfHistory * 30;

  const columns = ['id', 'date', 'glasses', 'notes', 'created_at', 'updated_at'];
  const rows: unknown[][] = [];

  for (let i = totalDays; i >= 0; i--) {
    // ~10% gap rate
    if (i > 0 && shouldSkip(0.1)) continue;

    const date = daysAgo(i);
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Weekday: 6-12 glasses, Weekend: 4-9 glasses
    const glasses = isWeekend ? randomInt(4, 9) : randomInt(6, 12);
    const datetime = datetimeAgo(i);

    rows.push([
      `water-${date}`,
      date,
      glasses,
      null,
      datetime,
      datetime,
    ]);
  }

  await batchInsert(db, 'water_log', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} water log entries`);
  return rows.length;
}
