import { SQLiteDatabase } from 'expo-sqlite';
import { generateId, nowISO, shuffleArray, batchInsert } from './helpers';
import { FAVORITE_FOOD_IDS } from '../mockData/foodTemplates';

export async function seedFavoriteFoods(
  db: SQLiteDatabase,
  verbose: boolean
): Promise<number> {
  const now = nowISO();

  // Pick 8-12 favorites from the predefined list
  const shuffled = shuffleArray([...FAVORITE_FOOD_IDS]);
  const count = Math.min(shuffled.length, 8 + Math.floor(Math.random() * 5));
  const favorites = shuffled.slice(0, count);

  // Verify these food IDs exist
  const existing = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM food_items WHERE id IN (${favorites.map(() => '?').join(',')})`,
    favorites
  );
  const existingIds = new Set(existing.map((e) => e.id));

  const columns = ['id', 'food_id', 'default_serving_size', 'default_serving_unit', 'sort_order', 'created_at'];
  const rows: unknown[][] = [];

  let sortOrder = 0;
  for (const foodId of favorites) {
    if (!existingIds.has(foodId)) continue;

    rows.push([
      generateId('fav'),
      foodId,
      null,
      null,
      sortOrder++,
      now,
    ]);
  }

  await batchInsert(db, 'favorite_foods', columns, rows);
  if (verbose) console.log(`[seed] Inserted ${rows.length} favorite foods`);
  return rows.length;
}
