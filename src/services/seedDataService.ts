/**
 * Seed Data Service
 * Populates the database with mock data for testing premium features
 */

import { getDatabase } from '@/db/database';
import { generateId } from '@/utils/generateId';
import { MealType } from '@/constants/mealTypes';
import { SEED_MICRONUTRIENTS, getSeedFoodIds } from '@/data/seedMicronutrients';

// Sample log entries for the past 7 days
const SAMPLE_LOG_ENTRIES = [
  // Today
  { foodId: 'seed-004', servings: 2, mealType: MealType.Breakfast, daysAgo: 0 }, // 2 eggs
  { foodId: 'seed-063', servings: 1.5, mealType: MealType.Breakfast, daysAgo: 0 }, // Greek yogurt
  { foodId: 'seed-024', servings: 1, mealType: MealType.Breakfast, daysAgo: 0 }, // Banana
  { foodId: 'seed-001', servings: 1.5, mealType: MealType.Lunch, daysAgo: 0 }, // Chicken breast
  { foodId: 'seed-036', servings: 1, mealType: MealType.Lunch, daysAgo: 0 }, // Broccoli
  { foodId: 'seed-055', servings: 1, mealType: MealType.Lunch, daysAgo: 0 }, // Quinoa
  { foodId: 'seed-013', servings: 1.5, mealType: MealType.Dinner, daysAgo: 0 }, // Salmon
  { foodId: 'seed-044', servings: 1, mealType: MealType.Dinner, daysAgo: 0 }, // Sweet potato
  { foodId: 'seed-038', servings: 1, mealType: MealType.Dinner, daysAgo: 0 }, // Spinach
  { foodId: 'seed-076', servings: 0.3, mealType: MealType.Snack, daysAgo: 0 }, // Almonds (30g)

  // Yesterday
  { foodId: 'seed-004', servings: 3, mealType: MealType.Breakfast, daysAgo: 1 },
  { foodId: 'seed-066', servings: 2, mealType: MealType.Breakfast, daysAgo: 1 },
  { foodId: 'seed-001', servings: 2, mealType: MealType.Lunch, daysAgo: 1 },
  { foodId: 'seed-038', servings: 1.5, mealType: MealType.Lunch, daysAgo: 1 },
  { foodId: 'seed-013', servings: 1, mealType: MealType.Dinner, daysAgo: 1 },
  { foodId: 'seed-036', servings: 1.5, mealType: MealType.Dinner, daysAgo: 1 },

  // 2 days ago
  { foodId: 'seed-063', servings: 2, mealType: MealType.Breakfast, daysAgo: 2 },
  { foodId: 'seed-024', servings: 1, mealType: MealType.Breakfast, daysAgo: 2 },
  { foodId: 'seed-001', servings: 1.5, mealType: MealType.Lunch, daysAgo: 2 },
  { foodId: 'seed-055', servings: 1.5, mealType: MealType.Lunch, daysAgo: 2 },
  { foodId: 'seed-044', servings: 1.5, mealType: MealType.Dinner, daysAgo: 2 },
  { foodId: 'seed-026', servings: 1, mealType: MealType.Snack, daysAgo: 2 },

  // 3 days ago
  { foodId: 'seed-004', servings: 2, mealType: MealType.Breakfast, daysAgo: 3 },
  { foodId: 'seed-024', servings: 1, mealType: MealType.Breakfast, daysAgo: 3 },
  { foodId: 'seed-013', servings: 1.5, mealType: MealType.Lunch, daysAgo: 3 },
  { foodId: 'seed-036', servings: 1, mealType: MealType.Lunch, daysAgo: 3 },
  { foodId: 'seed-001', servings: 1.5, mealType: MealType.Dinner, daysAgo: 3 },
  { foodId: 'seed-038', servings: 1, mealType: MealType.Dinner, daysAgo: 3 },

  // 4-6 days ago (lighter data)
  { foodId: 'seed-004', servings: 2, mealType: MealType.Breakfast, daysAgo: 4 },
  { foodId: 'seed-001', servings: 1.5, mealType: MealType.Lunch, daysAgo: 4 },
  { foodId: 'seed-044', servings: 1, mealType: MealType.Dinner, daysAgo: 4 },

  { foodId: 'seed-063', servings: 1.5, mealType: MealType.Breakfast, daysAgo: 5 },
  { foodId: 'seed-013', servings: 1, mealType: MealType.Lunch, daysAgo: 5 },
  { foodId: 'seed-036', servings: 1, mealType: MealType.Dinner, daysAgo: 5 },

  { foodId: 'seed-004', servings: 2, mealType: MealType.Breakfast, daysAgo: 6 },
  { foodId: 'seed-001', servings: 1.5, mealType: MealType.Lunch, daysAgo: 6 },
  { foodId: 'seed-038', servings: 1, mealType: MealType.Dinner, daysAgo: 6 },
];

function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

export async function seedMicronutrientData(): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDatabase();

    console.log('[SeedData] Starting micronutrient data seeding...');

    // 1. Insert micronutrient data for all 150 seed foods (3,551 rows)
    const now = new Date().toISOString();
    const BATCH_SIZE = 50;
    for (let i = 0; i < SEED_MICRONUTRIENTS.length; i += BATCH_SIZE) {
      const batch = SEED_MICRONUTRIENTS.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const params = batch.flatMap((row) => [
        generateId(),
        row.food_item_id,
        row.nutrient_id,
        row.amount,
        now,
      ]);
      await db.runAsync(
        `INSERT OR REPLACE INTO food_item_nutrients
         (id, food_item_id, nutrient_id, amount, created_at)
         VALUES ${placeholders}`,
        params
      );
    }

    console.log(`[SeedData] Micronutrient data inserted — ${SEED_MICRONUTRIENTS.length} rows across 150 foods`);

    // 2. Get existing food item data for creating log entries
    const foodData: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};

    for (const entry of SAMPLE_LOG_ENTRIES) {
      if (!foodData[entry.foodId]) {
        const food = await db.getFirstAsync<{
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }>(
          'SELECT calories, protein, carbs, fat FROM food_items WHERE id = ?',
          [entry.foodId]
        );
        if (food) {
          foodData[entry.foodId] = food;
        }
      }
    }

    // 3. Insert log entries for the past week
    for (const entry of SAMPLE_LOG_ENTRIES) {
      const food = foodData[entry.foodId];
      if (!food) continue;

      const date = getDateString(entry.daysAgo);
      const id = generateId();

      await db.runAsync(
        `INSERT INTO log_entries
         (id, food_item_id, date, meal_type, servings, calories, protein, carbs, fat, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          id,
          entry.foodId,
          date,
          entry.mealType,
          entry.servings,
          Math.round(food.calories * entry.servings),
          Math.round(food.protein * entry.servings * 10) / 10,
          Math.round(food.carbs * entry.servings * 10) / 10,
          Math.round(food.fat * entry.servings * 10) / 10,
        ]
      );
    }

    console.log('[SeedData] Log entries inserted for past 7 days');
    console.log('[SeedData] Seeding complete!');

    return { success: true };
  } catch (error) {
    console.error('[SeedData] Error seeding data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during seeding',
    };
  }
}

export async function clearSeedData(): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDatabase();

    // Delete seeded micronutrient data for all seed foods
    const seedFoodIds = getSeedFoodIds();
    const fnPlaceholders = seedFoodIds.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM food_item_nutrients WHERE food_item_id IN (${fnPlaceholders})`,
      seedFoodIds
    );

    // Delete log entries that reference seed foods
    await db.runAsync(
      `DELETE FROM log_entries WHERE food_item_id IN (${fnPlaceholders})`,
      seedFoodIds
    );

    console.log('[SeedData] Seed data cleared');
    return { success: true };
  } catch (error) {
    console.error('[SeedData] Error clearing seed data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error clearing seed data',
    };
  }
}
