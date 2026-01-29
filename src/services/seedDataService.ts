/**
 * Seed Data Service
 * Populates the database with mock data for testing premium features
 */

import { getDatabase } from '@/db/database';
import { generateId } from '@/utils/generateId';
import { MealType } from '@/constants/mealTypes';

// Micronutrient data for seed foods (per 100g serving)
// Based on USDA data
const FOOD_MICRONUTRIENTS: Record<string, Record<string, number>> = {
  'seed-001': { // Chicken Breast
    vitamin_b6: 0.6,
    niacin: 13.7,
    riboflavin: 0.11,
    thiamin: 0.07,
    vitamin_b12: 0.34,
    phosphorus: 228,
    selenium: 27.6,
    zinc: 0.9,
    potassium: 256,
    magnesium: 29,
    iron: 0.4,
  },
  'seed-004': { // Egg, Whole
    vitamin_a: 160,
    vitamin_d: 2.0,
    vitamin_b12: 0.89,
    riboflavin: 0.46,
    folate: 47,
    phosphorus: 198,
    selenium: 30.7,
    zinc: 1.29,
    iron: 1.75,
    choline: 293,
  },
  'seed-013': { // Salmon, Wild
    vitamin_d: 11.0,
    vitamin_b12: 3.18,
    niacin: 8.67,
    vitamin_b6: 0.64,
    riboflavin: 0.38,
    thiamin: 0.23,
    phosphorus: 252,
    selenium: 36.5,
    potassium: 490,
    magnesium: 30,
    omega_3_dha: 1.43,
    omega_3_epa: 0.86,
  },
  'seed-024': { // Banana
    vitamin_c: 8.7,
    vitamin_b6: 0.37,
    folate: 20,
    potassium: 358,
    magnesium: 27,
    manganese: 0.27,
  },
  'seed-026': { // Orange
    vitamin_c: 53.2,
    folate: 30,
    thiamin: 0.09,
    potassium: 181,
    calcium: 40,
  },
  'seed-036': { // Broccoli
    vitamin_c: 89.2,
    vitamin_k: 101.6,
    folate: 63,
    vitamin_a: 31,
    potassium: 316,
    phosphorus: 66,
    magnesium: 21,
    calcium: 47,
    iron: 0.73,
    fiber: 2.6,
  },
  'seed-038': { // Spinach
    vitamin_k: 482.9,
    vitamin_a: 469,
    folate: 194,
    vitamin_c: 28.1,
    iron: 2.71,
    magnesium: 79,
    potassium: 558,
    calcium: 99,
    manganese: 0.9,
  },
  'seed-044': { // Sweet Potato
    vitamin_a: 709,
    vitamin_c: 2.4,
    vitamin_b6: 0.21,
    potassium: 337,
    manganese: 0.26,
    fiber: 3.0,
  },
  'seed-063': { // Greek Yogurt, Nonfat
    vitamin_b12: 0.75,
    riboflavin: 0.28,
    calcium: 110,
    phosphorus: 135,
    potassium: 141,
    zinc: 0.52,
  },
  'seed-066': { // Milk, Whole
    vitamin_d: 1.3,
    vitamin_b12: 0.45,
    riboflavin: 0.18,
    calcium: 113,
    phosphorus: 84,
    potassium: 132,
  },
  'seed-076': { // Almonds
    vitamin_e: 25.6,
    riboflavin: 1.01,
    magnesium: 270,
    phosphorus: 481,
    manganese: 2.18,
    copper: 1.03,
    zinc: 3.12,
    calcium: 269,
    iron: 3.71,
  },
  'seed-055': { // Quinoa
    folate: 42,
    vitamin_b6: 0.12,
    thiamin: 0.11,
    riboflavin: 0.11,
    iron: 1.49,
    magnesium: 64,
    phosphorus: 152,
    zinc: 1.09,
    manganese: 0.63,
    copper: 0.19,
  },
};

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

    // 1. Insert micronutrient data for seed foods
    for (const [foodId, nutrients] of Object.entries(FOOD_MICRONUTRIENTS)) {
      for (const [nutrientId, amount] of Object.entries(nutrients)) {
        await db.runAsync(
          `INSERT OR REPLACE INTO food_item_nutrients
           (food_item_id, nutrient_id, amount, source, updated_at)
           VALUES (?, ?, ?, 'seed', datetime('now'))`,
          [foodId, nutrientId, amount]
        );
      }
    }

    console.log('[SeedData] Micronutrient data inserted for seed foods');

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

    // Delete seeded micronutrient data
    await db.runAsync("DELETE FROM food_item_nutrients WHERE source = 'seed'");

    // Delete log entries from the past 7 days that reference seed foods
    const seedFoodIds = Object.keys(FOOD_MICRONUTRIENTS);
    const placeholders = seedFoodIds.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM log_entries WHERE food_item_id IN (${placeholders})`,
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
