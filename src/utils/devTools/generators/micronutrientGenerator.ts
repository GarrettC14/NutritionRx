import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, nowISO,
  round, shouldSkip, batchInsert,
  gaussianRandom, clamp,
} from './helpers';
import { SEED_MICRONUTRIENTS, getSeedNutrientLookup } from '@/data/seedMicronutrients';

// ============================================================
// Nutrient definitions with realistic RDA values (male 19-30y)
// and a "persona" for each nutrient so seed data shows patterns:
//   - Some nutrients the user consistently gets enough of
//   - Some are chronically low (common real-world deficiencies)
//   - Some fluctuate day to day
// ============================================================

interface NutrientSeedDef {
  id: string;
  name: string;
  rda: number;          // Target amount (mg, mcg, or g depending on nutrient)
  unit: string;
  /** Mean percentage of RDA the user typically hits */
  meanPercent: number;
  /** Standard deviation of daily percent variance */
  stdDevPercent: number;
}

const SEED_NUTRIENTS: NutrientSeedDef[] = [
  // --- Vitamins (commonly tracked) ---
  { id: 'vitamin_a',   name: 'Vitamin A',   rda: 900,  unit: 'mcg', meanPercent: 85,  stdDevPercent: 20 },
  { id: 'vitamin_c',   name: 'Vitamin C',   rda: 90,   unit: 'mg',  meanPercent: 110, stdDevPercent: 30 },
  { id: 'vitamin_d',   name: 'Vitamin D',   rda: 15,   unit: 'mcg', meanPercent: 45,  stdDevPercent: 20 },
  { id: 'vitamin_e',   name: 'Vitamin E',   rda: 15,   unit: 'mg',  meanPercent: 75,  stdDevPercent: 25 },
  { id: 'vitamin_k',   name: 'Vitamin K',   rda: 120,  unit: 'mcg', meanPercent: 90,  stdDevPercent: 35 },
  { id: 'thiamin',     name: 'Thiamin (B1)', rda: 1.2,  unit: 'mg',  meanPercent: 105, stdDevPercent: 20 },
  { id: 'riboflavin',  name: 'Riboflavin (B2)', rda: 1.3, unit: 'mg', meanPercent: 110, stdDevPercent: 20 },
  { id: 'niacin',      name: 'Niacin (B3)', rda: 16,   unit: 'mg',  meanPercent: 120, stdDevPercent: 25 },
  { id: 'vitamin_b6',  name: 'Vitamin B6',  rda: 1.3,  unit: 'mg',  meanPercent: 100, stdDevPercent: 25 },
  { id: 'folate',      name: 'Folate (B9)', rda: 400,  unit: 'mcg', meanPercent: 70,  stdDevPercent: 25 },
  { id: 'vitamin_b12', name: 'Vitamin B12', rda: 2.4,  unit: 'mcg', meanPercent: 130, stdDevPercent: 30 },

  // --- Minerals ---
  { id: 'calcium',   name: 'Calcium',   rda: 1000, unit: 'mg',  meanPercent: 65,  stdDevPercent: 20 },
  { id: 'iron',      name: 'Iron',      rda: 8,    unit: 'mg',  meanPercent: 95,  stdDevPercent: 25 },
  { id: 'magnesium', name: 'Magnesium', rda: 400,  unit: 'mg',  meanPercent: 60,  stdDevPercent: 20 },
  { id: 'zinc',      name: 'Zinc',      rda: 11,   unit: 'mg',  meanPercent: 90,  stdDevPercent: 20 },
  { id: 'potassium', name: 'Potassium', rda: 3400, unit: 'mg',  meanPercent: 55,  stdDevPercent: 15 },
  { id: 'sodium',    name: 'Sodium',    rda: 1500, unit: 'mg',  meanPercent: 160, stdDevPercent: 30 },
  { id: 'selenium',  name: 'Selenium',  rda: 55,   unit: 'mcg', meanPercent: 110, stdDevPercent: 25 },

  // --- Other tracked nutrients ---
  { id: 'fiber',       name: 'Fiber',       rda: 38,  unit: 'g',   meanPercent: 55,  stdDevPercent: 20 },
  { id: 'omega_3_ala', name: 'Omega-3 ALA', rda: 1.6, unit: 'g',   meanPercent: 50,  stdDevPercent: 30 },
  { id: 'choline',     name: 'Choline',     rda: 550, unit: 'mg',  meanPercent: 65,  stdDevPercent: 20 },
];

export async function seedNutrientSettings(db: SQLiteDatabase, verbose: boolean): Promise<number> {
  await db.runAsync(
    `INSERT OR REPLACE INTO nutrient_settings (id, gender, age_group, life_stage, updated_at)
     VALUES (1, 'male', '19-30y', 'normal', datetime('now'))`
  );

  if (verbose) console.log('[seed] Inserted nutrient settings');
  return 1;
}

/**
 * Insert USDA-sourced micronutrient data for all 150 seed foods.
 * Uses exact values from the shared SEED_MICRONUTRIENTS constant.
 */
export async function seedFoodItemNutrients(
  db: SQLiteDatabase,
  verbose: boolean
): Promise<number> {
  const now = nowISO();
  const columns = ['id', 'food_item_id', 'nutrient_id', 'amount', 'created_at'];
  const rows: unknown[][] = [];

  for (const row of SEED_MICRONUTRIENTS) {
    rows.push([
      generateId('fn'),
      row.food_item_id,
      row.nutrient_id,
      row.amount,
      now,
    ]);
  }

  await batchInsert(db, 'food_item_nutrients', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} food item nutrients (USDA data, 150 foods)`);
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

  // Generate daily nutrient summaries — 85-90% of days have data
  for (let i = totalDays; i >= 0; i--) {
    // Skip ~12% of days (rest days, missed logging)
    if (shouldSkip(0.12)) continue;

    const date = daysAgo(i);
    const foodsLogged = 3 + Math.floor(Math.random() * 6); // 3-8 foods per day

    // Track ALL nutrients every logged day
    for (const nutrient of SEED_NUTRIENTS) {
      // Generate a realistic daily amount using gaussian distribution around the nutrient's persona
      const dailyPercent = clamp(
        gaussianRandom(nutrient.meanPercent, nutrient.stdDevPercent),
        10, // Nobody hits literally 0
        250  // Cap at 250% to avoid absurd values
      );

      const totalAmount = round((dailyPercent / 100) * nutrient.rda, 2);
      const percentOfTarget = round(dailyPercent, 0);

      // Status thresholds matching the store's calculateStatus()
      let status: string;
      if (percentOfTarget < 50) status = 'deficient';
      else if (percentOfTarget < 75) status = 'low';
      else if (percentOfTarget < 100) status = 'adequate';
      else if (percentOfTarget <= 150) status = 'optimal';
      else if (percentOfTarget <= 200) status = 'high';
      else status = 'excessive';

      rows.push([
        generateId('dni'),
        date,
        nutrient.id,
        totalAmount,
        percentOfTarget,
        status,
        foodsLogged,
        1,
        now,
      ]);
    }
  }

  await batchInsert(db, 'daily_nutrient_intake', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} daily nutrient intake records`);
  return rows.length;
}

/**
 * Generate nutrient contributor records using real USDA per-food data.
 * For each log entry, looks up the food's actual nutrient profile from the
 * shared seed data instead of using approximate profiles with random variance.
 */
export async function seedNutrientContributors(
  db: SQLiteDatabase,
  verbose: boolean
): Promise<number> {
  const now = nowISO();
  const nutrientLookup = getSeedNutrientLookup();

  // Get recent log entries (last 90 days for richer data)
  const logEntries = await db.getAllAsync<{
    id: string;
    date: string;
    food_item_id: string;
  }>(`SELECT le.id, le.date, le.food_item_id FROM log_entries le
      ORDER BY le.date DESC LIMIT 300`);

  if (logEntries.length === 0) return 0;

  // Get food names
  const foodItems = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM food_items`
  );
  const nameMap: Record<string, string> = {};
  for (const f of foodItems) {
    nameMap[f.id] = f.name;
  }

  const columns = [
    'id', 'date', 'log_entry_id', 'nutrient_id',
    'food_name', 'amount', 'percent_of_daily', 'created_at',
  ];
  const rows: unknown[][] = [];

  for (const entry of logEntries) {
    if (shouldSkip(0.1)) continue;

    const foodName = nameMap[entry.food_item_id] ?? 'Unknown Food';
    const profile = nutrientLookup[entry.food_item_id];
    if (!profile) continue;

    for (const [nutrientId, amount] of Object.entries(profile)) {
      const nutrientDef = SEED_NUTRIENTS.find((n) => n.id === nutrientId);
      if (!nutrientDef) continue;

      const percentOfDaily = round((amount / nutrientDef.rda) * 100, 1);

      rows.push([
        generateId('nc'),
        entry.date,
        entry.id,
        nutrientId,
        foodName,
        amount,
        clamp(percentOfDaily, 1, 60),
        now,
      ]);
    }
  }

  await batchInsert(db, 'nutrient_contributors', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} nutrient contributors`);
  return rows.length;
}
