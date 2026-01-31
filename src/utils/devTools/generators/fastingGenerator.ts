import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, nowISO,
  shouldSkip, randomInt, randomBetween, round, batchInsert,
} from './helpers';

export async function seedFastingConfig(db: SQLiteDatabase, verbose: boolean): Promise<number> {
  const now = nowISO();

  await db.runAsync(
    `INSERT OR REPLACE INTO fasting_config (
      id, enabled, protocol, custom_fast_hours,
      typical_eat_start, typical_eat_end,
      notify_window_opens, notify_window_closes_soon,
      notify_closes_reminder_mins, notify_fast_complete,
      created_at, last_modified
    ) VALUES (1, 1, '16:8', NULL, '12:00', '20:00', 1, 1, 30, 1, ?, ?)`,
    [now, now]
  );

  if (verbose) console.log('[seed] Inserted fasting config');
  return 1;
}

export async function seedFastingSessions(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  verbose: boolean
): Promise<number> {
  const totalDays = monthsOfHistory * 30;

  const columns = [
    'id', 'start_time', 'end_time', 'target_hours',
    'actual_hours', 'status', 'created_at',
  ];
  const rows: unknown[][] = [];

  // ~3 fasts per week
  for (let i = totalDays; i >= 0; i--) {
    // Skip ~57% of days to get ~3/week
    if (shouldSkip(0.57)) continue;

    const date = daysAgo(i);
    const targetHours = 16;

    // Start fasting at 8pm previous day
    const startHour = randomInt(19, 21);
    const startTime = `${daysAgo(i + 1)}T${startHour.toString().padStart(2, '0')}:${randomInt(0, 59).toString().padStart(2, '0')}:00.000Z`;

    // End fasting next day between 11am-1pm
    const endHour = randomInt(11, 13);
    const endTime = `${date}T${endHour.toString().padStart(2, '0')}:${randomInt(0, 59).toString().padStart(2, '0')}:00.000Z`;

    const actualHours = round(randomBetween(14, 18), 1);
    const status = shouldSkip(0.9) ? 'cancelled' : 'completed';

    rows.push([
      generateId('fast'),
      startTime,
      status === 'cancelled' ? null : endTime,
      targetHours,
      status === 'cancelled' ? null : actualHours,
      status,
      startTime,
    ]);
  }

  await batchInsert(db, 'fasting_sessions', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} fasting sessions`);
  return rows.length;
}
