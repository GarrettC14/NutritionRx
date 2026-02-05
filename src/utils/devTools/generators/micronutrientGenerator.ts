import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, nowISO,
  randomBetween, round, shouldSkip, batchInsert,
  gaussianRandom, clamp,
} from './helpers';

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
  /** Realistic per-food contribution range [min, max] in raw units */
  perFoodRange: [number, number];
}

const SEED_NUTRIENTS: NutrientSeedDef[] = [
  // --- Vitamins (commonly tracked) ---
  { id: 'vitamin_a',   name: 'Vitamin A',   rda: 900,  unit: 'mcg', meanPercent: 85,  stdDevPercent: 20, perFoodRange: [50, 400] },
  { id: 'vitamin_c',   name: 'Vitamin C',   rda: 90,   unit: 'mg',  meanPercent: 110, stdDevPercent: 30, perFoodRange: [5, 60] },
  { id: 'vitamin_d',   name: 'Vitamin D',   rda: 15,   unit: 'mcg', meanPercent: 45,  stdDevPercent: 20, perFoodRange: [0.5, 5] },   // Commonly deficient
  { id: 'vitamin_e',   name: 'Vitamin E',   rda: 15,   unit: 'mg',  meanPercent: 75,  stdDevPercent: 25, perFoodRange: [0.5, 5] },
  { id: 'vitamin_k',   name: 'Vitamin K',   rda: 120,  unit: 'mcg', meanPercent: 90,  stdDevPercent: 35, perFoodRange: [5, 80] },
  { id: 'thiamin',     name: 'Thiamin (B1)', rda: 1.2,  unit: 'mg',  meanPercent: 105, stdDevPercent: 20, perFoodRange: [0.05, 0.4] },
  { id: 'riboflavin',  name: 'Riboflavin (B2)', rda: 1.3, unit: 'mg', meanPercent: 110, stdDevPercent: 20, perFoodRange: [0.05, 0.5] },
  { id: 'niacin',      name: 'Niacin (B3)', rda: 16,   unit: 'mg',  meanPercent: 120, stdDevPercent: 25, perFoodRange: [1, 8] },
  { id: 'vitamin_b6',  name: 'Vitamin B6',  rda: 1.3,  unit: 'mg',  meanPercent: 100, stdDevPercent: 25, perFoodRange: [0.05, 0.5] },
  { id: 'folate',      name: 'Folate (B9)', rda: 400,  unit: 'mcg', meanPercent: 70,  stdDevPercent: 25, perFoodRange: [10, 150] },  // Often low
  { id: 'vitamin_b12', name: 'Vitamin B12', rda: 2.4,  unit: 'mcg', meanPercent: 130, stdDevPercent: 30, perFoodRange: [0.2, 2] },

  // --- Minerals ---
  { id: 'calcium',   name: 'Calcium',   rda: 1000, unit: 'mg',  meanPercent: 65,  stdDevPercent: 20, perFoodRange: [20, 300] },     // Often low
  { id: 'iron',      name: 'Iron',      rda: 8,    unit: 'mg',  meanPercent: 95,  stdDevPercent: 25, perFoodRange: [0.5, 4] },
  { id: 'magnesium', name: 'Magnesium', rda: 400,  unit: 'mg',  meanPercent: 60,  stdDevPercent: 20, perFoodRange: [10, 100] },     // Commonly deficient
  { id: 'zinc',      name: 'Zinc',      rda: 11,   unit: 'mg',  meanPercent: 90,  stdDevPercent: 20, perFoodRange: [0.5, 5] },
  { id: 'potassium', name: 'Potassium', rda: 3400, unit: 'mg',  meanPercent: 55,  stdDevPercent: 15, perFoodRange: [50, 500] },     // Almost everyone is low
  { id: 'sodium',    name: 'Sodium',    rda: 1500, unit: 'mg',  meanPercent: 160, stdDevPercent: 30, perFoodRange: [50, 600] },     // Typically over
  { id: 'selenium',  name: 'Selenium',  rda: 55,   unit: 'mcg', meanPercent: 110, stdDevPercent: 25, perFoodRange: [5, 30] },

  // --- Other tracked nutrients ---
  { id: 'fiber',       name: 'Fiber',       rda: 38,  unit: 'g',   meanPercent: 55,  stdDevPercent: 20, perFoodRange: [0.5, 8] },   // Most people are low
  { id: 'omega_3_ala', name: 'Omega-3 ALA', rda: 1.6, unit: 'g',   meanPercent: 50,  stdDevPercent: 30, perFoodRange: [0.05, 0.5] }, // Often deficient
  { id: 'choline',     name: 'Choline',     rda: 550, unit: 'mg',  meanPercent: 65,  stdDevPercent: 20, perFoodRange: [10, 120] },
];

// Foods with realistic nutrient profiles for contributor data
const FOOD_NUTRIENT_PROFILES: Record<string, Partial<Record<string, number>>> = {
  'Chicken Breast': { vitamin_b6: 0.5, niacin: 10, vitamin_b12: 0.3, iron: 1.0, zinc: 1.0, selenium: 25, choline: 85, sodium: 75 },
  'Salmon Fillet': { vitamin_d: 12, vitamin_b12: 2.5, niacin: 8, omega_3_ala: 0.4, selenium: 35, potassium: 400, iron: 0.8 },
  'Spinach': { vitamin_a: 470, vitamin_c: 28, vitamin_k: 145, folate: 130, magnesium: 80, iron: 2.7, potassium: 560, fiber: 2.2 },
  'Eggs (2 large)': { vitamin_a: 160, vitamin_d: 2, vitamin_b12: 1.1, riboflavin: 0.5, selenium: 30, choline: 300, iron: 1.8, zinc: 1.3 },
  'Greek Yogurt': { calcium: 250, vitamin_b12: 1.3, riboflavin: 0.3, potassium: 350, zinc: 1.5, vitamin_d: 1.5 },
  'Banana': { vitamin_b6: 0.4, vitamin_c: 10, potassium: 420, magnesium: 32, fiber: 3.1 },
  'Almonds (28g)': { vitamin_e: 7.3, magnesium: 80, calcium: 75, fiber: 3.5, iron: 1.0, zinc: 0.9, omega_3_ala: 0.02 },
  'Sweet Potato': { vitamin_a: 1100, vitamin_c: 20, potassium: 540, fiber: 4, magnesium: 30, vitamin_b6: 0.3 },
  'Broccoli': { vitamin_c: 90, vitamin_k: 100, folate: 60, fiber: 5.1, potassium: 290, calcium: 45, iron: 0.7 },
  'Brown Rice': { thiamin: 0.2, niacin: 2.6, magnesium: 85, selenium: 20, fiber: 3.5, iron: 0.8, zinc: 1.2 },
  'Beef Steak': { vitamin_b12: 2.5, zinc: 5.5, iron: 3.0, niacin: 6, selenium: 28, vitamin_b6: 0.4, potassium: 320, choline: 90 },
  'Orange': { vitamin_c: 70, folate: 40, potassium: 240, thiamin: 0.1, fiber: 3.1, calcium: 50 },
  'Lentils (cooked)': { folate: 180, iron: 3.3, fiber: 7.9, potassium: 370, magnesium: 35, thiamin: 0.2, zinc: 1.3 },
  'Milk (1 cup)': { calcium: 300, vitamin_d: 3, vitamin_b12: 1.2, riboflavin: 0.4, potassium: 350, vitamin_a: 150 },
  'Avocado (half)': { vitamin_k: 14, folate: 60, potassium: 490, vitamin_c: 10, vitamin_e: 2.1, fiber: 5, magnesium: 30, omega_3_ala: 0.1 },
  'Oatmeal': { thiamin: 0.3, iron: 2.1, magnesium: 55, fiber: 4, zinc: 1.5, selenium: 13 },
  'Tuna (canned)': { vitamin_b12: 2.5, niacin: 12, selenium: 65, vitamin_d: 1.5, iron: 1.4, omega_3_ala: 0.2 },
  'Bell Pepper (red)': { vitamin_c: 150, vitamin_a: 190, vitamin_e: 1.6, folate: 50, potassium: 210, vitamin_k: 5 },
  'Cheese (cheddar, 30g)': { calcium: 200, vitamin_a: 100, vitamin_b12: 0.4, zinc: 1.0, sodium: 180 },
  'Whole Wheat Bread (2 sl)': { thiamin: 0.3, niacin: 2.5, iron: 2, folate: 50, fiber: 3.8, magnesium: 40, selenium: 18, sodium: 280 },
};

const FOOD_NAMES = Object.keys(FOOD_NUTRIENT_PROFILES);

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
  const foods = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM food_items WHERE id LIKE 'seed-%' LIMIT 60`
  );

  if (foods.length === 0) return 0;

  const columns = ['id', 'food_item_id', 'nutrient_id', 'amount', 'created_at'];
  const rows: unknown[][] = [];
  const now = nowISO();

  for (const food of foods) {
    // Assign each seed food a realistic nutrient profile based on its name or a random template
    const profileKey = FOOD_NAMES.find((name) =>
      food.name.toLowerCase().includes(name.toLowerCase().split(' ')[0].toLowerCase())
    ) || FOOD_NAMES[Math.floor(Math.random() * FOOD_NAMES.length)];

    const profile = FOOD_NUTRIENT_PROFILES[profileKey];

    // Add all nutrients from the profile with slight variance
    for (const [nutrientId, baseAmount] of Object.entries(profile)) {
      if (baseAmount == null) continue;
      const variance = 0.8 + Math.random() * 0.4; // 80-120% of base
      rows.push([
        generateId('fn'),
        food.id,
        nutrientId,
        round(baseAmount * variance, 2),
        now,
      ]);
    }

    // Also add a few random nutrients the profile doesn't cover
    const profileNutrients = new Set(Object.keys(profile));
    const extraNutrients = SEED_NUTRIENTS
      .filter((n) => !profileNutrients.has(n.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    for (const nutrient of extraNutrients) {
      const [min, max] = nutrient.perFoodRange;
      rows.push([
        generateId('fn'),
        food.id,
        nutrient.id,
        round(randomBetween(min * 0.3, max * 0.5), 2),
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

export async function seedNutrientContributors(
  db: SQLiteDatabase,
  verbose: boolean
): Promise<number> {
  const now = nowISO();

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
    // Skip only ~10% (most entries have contributor data)
    if (shouldSkip(0.1)) continue;

    const foodName = nameMap[entry.food_item_id] ?? 'Unknown Food';

    // Find a matching food profile or pick a random one
    const profileKey = FOOD_NAMES.find((name) =>
      foodName.toLowerCase().includes(name.toLowerCase().split(' ')[0].toLowerCase())
    ) || FOOD_NAMES[Math.floor(Math.random() * FOOD_NAMES.length)];

    const profile = FOOD_NUTRIENT_PROFILES[profileKey];

    // Each food contributes to the nutrients in its profile
    for (const [nutrientId, baseAmount] of Object.entries(profile)) {
      if (baseAmount == null) continue;

      const nutrientDef = SEED_NUTRIENTS.find((n) => n.id === nutrientId);
      if (!nutrientDef) continue;

      const variance = 0.7 + Math.random() * 0.6; // 70-130% variance
      const amount = round(baseAmount * variance, 2);
      const percentOfDaily = round((amount / nutrientDef.rda) * 100, 1);

      rows.push([
        generateId('nc'),
        entry.date,
        entry.id,
        nutrientId,
        foodName,
        amount,
        clamp(percentOfDaily, 1, 60), // No single food should be >60% of daily
        now,
      ]);
    }
  }

  await batchInsert(db, 'nutrient_contributors', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} nutrient contributors`);
  return rows.length;
}
