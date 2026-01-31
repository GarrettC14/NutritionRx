import { SQLiteDatabase } from 'expo-sqlite';
import {
  generateId, daysAgo, mealTimeOfDay, nowISO,
  randomPick, shouldSkip, randomInt, batchInsert,
} from './helpers';

export async function seedRestaurantFoodLogs(
  db: SQLiteDatabase,
  monthsOfHistory: number,
  verbose: boolean
): Promise<number> {
  // Check if there are any restaurant foods seeded
  const restaurantFoods = await db.getAllAsync<{
    id: string;
    restaurant_id: string;
    name: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  }>(`SELECT id, restaurant_id, name, calories, protein, carbohydrates, fat
      FROM restaurant_foods LIMIT 100`);

  if (restaurantFoods.length === 0) {
    if (verbose) console.log('[seed] No restaurant foods found, skipping restaurant logs');
    return 0;
  }

  // Get restaurant names
  const restaurants = await db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name FROM restaurants`
  );
  const restaurantMap: Record<string, string> = {};
  for (const r of restaurants) {
    restaurantMap[r.id] = r.name;
  }

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
  const columns = [
    'id', 'restaurant_food_id', 'restaurant_name', 'food_name',
    'variant_id', 'logged_at', 'date', 'meal', 'quantity', 'notes',
    'calories', 'protein', 'carbohydrates', 'fat', 'created_at',
  ];
  const rows: unknown[][] = [];

  const totalDays = monthsOfHistory * 30;

  // ~1-2 restaurant meals per week
  for (let i = totalDays; i >= 0; i--) {
    if (shouldSkip(0.8)) continue;

    const date = daysAgo(i);
    const food = randomPick(restaurantFoods);
    const mealType = randomPick(mealTypes);
    const datetime = mealTimeOfDay(date, mealType);
    const restaurantName = restaurantMap[food.restaurant_id] ?? 'Unknown';
    const quantity = shouldSkip(0.85) ? 2 : 1;

    rows.push([
      generateId('rlog'),
      food.id,
      restaurantName,
      food.name,
      null,
      datetime,
      date,
      mealType,
      quantity,
      null,
      food.calories * quantity,
      food.protein * quantity,
      food.carbohydrates * quantity,
      food.fat * quantity,
      datetime,
    ]);
  }

  await batchInsert(db, 'restaurant_food_logs', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} restaurant food logs`);
  return rows.length;
}

export async function seedUserRestaurantUsage(
  db: SQLiteDatabase,
  verbose: boolean
): Promise<number> {
  const now = nowISO();

  // Derive usage from restaurant_food_logs
  const usage = await db.getAllAsync<{
    restaurant_food_id: string;
    cnt: number;
    last: string;
  }>(`SELECT restaurant_food_id, COUNT(*) as cnt, MAX(logged_at) as last
      FROM restaurant_food_logs GROUP BY restaurant_food_id`);

  if (usage.length === 0) return 0;

  // Get restaurant_id from restaurant_foods
  const foodToRestaurant = await db.getAllAsync<{
    id: string;
    restaurant_id: string;
  }>(`SELECT id, restaurant_id FROM restaurant_foods`);

  const foodRestMap: Record<string, string> = {};
  for (const fr of foodToRestaurant) {
    foodRestMap[fr.id] = fr.restaurant_id;
  }

  // Aggregate by restaurant
  const restUsage: Record<string, { count: number; last: string }> = {};
  for (const u of usage) {
    const restId = foodRestMap[u.restaurant_food_id];
    if (!restId) continue;
    if (!restUsage[restId]) {
      restUsage[restId] = { count: 0, last: u.last };
    }
    restUsage[restId].count += u.cnt;
    if (u.last > restUsage[restId].last) {
      restUsage[restId].last = u.last;
    }
  }

  const columns = ['restaurant_id', 'last_used', 'use_count'];
  const rows: unknown[][] = [];

  for (const [restId, data] of Object.entries(restUsage)) {
    rows.push([restId, data.last, data.count]);
  }

  await batchInsert(db, 'user_restaurant_usage', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} restaurant usage records`);
  return rows.length;
}
