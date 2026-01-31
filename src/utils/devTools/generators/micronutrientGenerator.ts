import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, nowISO,
  randomBetween, round, shouldSkip, batchInsert,
} from './helpers';

const COMMON_NUTRIENTS = [
  { id: 'vitamin_a', name: 'Vitamin A' },
  { id: 'vitamin_c', name: 'Vitamin C' },
  { id: 'vitamin_d', name: 'Vitamin D' },
  { id: 'vitamin_e', name: 'Vitamin E' },
  { id: 'vitamin_k', name: 'Vitamin K' },
  { id: 'vitamin_b6', name: 'Vitamin B6' },
  { id: 'vitamin_b12', name: 'Vitamin B12' },
  { id: 'calcium', name: 'Calcium' },
  { id: 'iron', name: 'Iron' },
  { id: 'magnesium', name: 'Magnesium' },
  { id: 'zinc', name: 'Zinc' },
  { id: 'potassium', name: 'Potassium' },
  { id: 'folate', name: 'Folate' },
];

export async function seedNutrientSettings(db: SQLiteDatabase, verbose: boolean): Promise<number> {
  await db.runAsync(
    `INSERT OR REPLACE INTO nutrient_settings (id, gender, age_group, life_stage, updated_at)
     VALUES (1, 'male', '19-30y', 'normal', datetime('now'))`
  );

  if (verbose) console.log('[seed] Inserted nutrient settings');
  return 1;
}

export async function seedFoodItemNutrients(
  db: SQLiteDatabase,
  verbose: boolean
): Promise<number> {
  // Get some seed foods to attach nutrients to
  const foods = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM food_items WHERE id LIKE 'seed-%' LIMIT 30`
  );

  if (foods.length === 0) return 0;

  const columns = ['id', 'food_item_id', 'nutrient_id', 'amount', 'created_at'];
  const rows: unknown[][] = [];
  const now = nowISO();

  for (const food of foods) {
    // Each food gets 5-10 random nutrients
    const nutrientCount = 5 + Math.floor(Math.random() * 6);
    const nutrients = [...COMMON_NUTRIENTS]
      .sort(() => Math.random() - 0.5)
      .slice(0, nutrientCount);

    for (const nutrient of nutrients) {
      rows.push([
        generateId('fn'),
        food.id,
        nutrient.id,
        round(randomBetween(0.1, 100), 2),
        now,
      ]);
    }
  }

  await batchInsert(db, 'food_item_nutrients', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} food item nutrients`);
  return rows.length;
}

export async function seedDailyNutrientIntake(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  verbose: boolean
): Promise<number> {
  const totalDays = monthsOfHistory * 30;
  const now = nowISO();

  const columns = [
    'id', 'date', 'nutrient_id', 'total_amount', 'percent_of_target',
    'status', 'foods_logged', 'has_complete_data', 'calculated_at',
  ];
  const rows: unknown[][] = [];

  // Generate daily nutrient summaries — every 2-3 days
  for (let i = totalDays; i >= 0; i--) {
    if (shouldSkip(0.6)) continue;

    const date = daysAgo(i);

    // Track 5-8 nutrients per logged day
    const nutrientCount = 5 + Math.floor(Math.random() * 4);
    const nutrients = [...COMMON_NUTRIENTS]
      .sort(() => Math.random() - 0.5)
      .slice(0, nutrientCount);

    for (const nutrient of nutrients) {
      const percentOfTarget = round(randomBetween(20, 180), 0);
      const status =
        percentOfTarget < 50 ? 'deficient' :
        percentOfTarget > 150 ? 'excess' : 'adequate';

      rows.push([
        generateId('dni'),
        date,
        nutrient.id,
        round(randomBetween(0.5, 200), 1),
        percentOfTarget,
        status,
        Math.floor(randomBetween(2, 8)),
        1,
        now,
      ]);
    }
  }

  await batchInsert(db, 'daily_nutrient_intake', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} daily nutrient intake records`);
  return rows.length;
}

export async function seedNutrientContributors(
  db: SQLiteDatabase,
  verbose: boolean
): Promise<number> {
  const now = nowISO();

  // Get recent log entries to create contributors for
  const logEntries = await db.getAllAsync<{
    id: string;
    date: string;
    food_item_id: string;
  }>(`SELECT le.id, le.date, le.food_item_id FROM log_entries le
      ORDER BY le.date DESC LIMIT 50`);

  if (logEntries.length === 0) return 0;

  // Get food names
  const foodNames = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM food_items WHERE id LIKE 'seed-%'`
  );
  const nameMap: Record<string, string> = {};
  for (const f of foodNames) {
    nameMap[f.id] = f.name;
  }

  const columns = [
    'id', 'date', 'log_entry_id', 'nutrient_id',
    'food_name', 'amount', 'percent_of_daily', 'created_at',
  ];
  const rows: unknown[][] = [];

  for (const entry of logEntries) {
    if (shouldSkip(0.5)) continue;

    // Each log entry contributes to 2-4 nutrients
    const nutrients = [...COMMON_NUTRIENTS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 3));

    for (const nutrient of nutrients) {
      rows.push([
        generateId('nc'),
        entry.date,
        entry.id,
        nutrient.id,
        nameMap[entry.food_item_id] ?? 'Unknown Food',
        round(randomBetween(0.1, 50), 1),
        round(randomBetween(5, 40), 0),
        now,
      ]);
    }
  }

  await batchInsert(db, 'nutrient_contributors', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} nutrient contributors`);
  return rows.length;
}
