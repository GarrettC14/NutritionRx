import { SQLiteDatabase } from 'expo-sqlite';

// Import the JSON data
import restaurantData from '../../../doc/restaurant_chain_database.json';
import usdaData from '../../../doc/usda_foods_database.json';

interface RestaurantItem {
  id: string;
  name: string;
  category: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

interface RestaurantChain {
  name: string;
  items: RestaurantItem[];
}

interface USDAFood {
  id: string;
  name: string;
  category: string;
  servingSize: number;
  servingUnit: string;
  servingDescription: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export async function migration009SeedRestaurantUSDAFoods(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();
  let insertedCount = 0;

  // Process restaurant chain foods
  const restaurants = (restaurantData as { restaurants: Record<string, RestaurantChain> }).restaurants;

  for (const [, chain] of Object.entries(restaurants)) {
    for (const item of chain.items) {
      await db.runAsync(
        `INSERT OR IGNORE INTO food_items (
          id, name, brand, barcode, calories, protein, carbs, fat,
          fiber, sugar, sodium, serving_size, serving_unit, serving_size_grams,
          source, source_id, is_verified, is_user_created,
          last_used_at, usage_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `restaurant-${item.id}`,
          item.name,
          chain.name,
          null,
          item.calories,
          item.protein,
          item.carbs,
          item.fat,
          item.fiber,
          null, // sugar not provided in restaurant data
          item.sodium,
          1,
          item.servingSize,
          null, // serving_size_grams not easily determinable
          'seed',
          item.id,
          1,
          0,
          null,
          0,
          now,
          now,
        ]
      );
      insertedCount++;
    }
  }

  console.log(`Inserted ${insertedCount} restaurant food items.`);

  // Process USDA foods
  const usdaFoods = (usdaData as { foods: USDAFood[] }).foods;
  let usdaCount = 0;

  for (const food of usdaFoods) {
    await db.runAsync(
      `INSERT OR IGNORE INTO food_items (
        id, name, brand, barcode, calories, protein, carbs, fat,
        fiber, sugar, sodium, serving_size, serving_unit, serving_size_grams,
        source, source_id, is_verified, is_user_created,
        last_used_at, usage_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `usda-${food.id}`,
        food.name,
        null,
        null,
        food.calories,
        food.protein,
        food.carbs,
        food.fat,
        food.fiber,
        food.sugar,
        food.sodium,
        food.servingSize,
        food.servingUnit,
        food.servingSize, // servingSize is already in grams for USDA
        'usda',
        food.id,
        1,
        0,
        null,
        0,
        now,
        now,
      ]
    );
    usdaCount++;
  }

  console.log(`Inserted ${usdaCount} USDA food items.`);

  // Record migration
  await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [9]);
}
