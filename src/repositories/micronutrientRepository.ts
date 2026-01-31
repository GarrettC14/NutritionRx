/**
 * Micronutrient Repository
 *
 * Handles storage and retrieval of food-level micronutrient data
 * in the food_item_nutrients table.
 */

import { generateId } from '@/utils/generateId';
import { getDatabase } from '@/db/database';
import { MicronutrientData } from '@/services/usda/types';

export interface FoodNutrientRow {
  id: string;
  food_item_id: string;
  nutrient_id: string;
  amount: number;
  created_at: string;
}

export const micronutrientRepository = {
  /**
   * Store micronutrient data for a food item.
   * Uses INSERT OR REPLACE to update existing entries.
   */
  async storeFoodNutrients(foodItemId: string, nutrients: MicronutrientData): Promise<number> {
    const db = getDatabase();
    const now = new Date().toISOString();
    let count = 0;

    const entries = Object.entries(nutrients).filter(([, amount]) => amount > 0);

    // Batch insert in groups
    const batchSize = 50;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const values: (string | number)[] = [];

      for (const [nutrientId, amount] of batch) {
        values.push(generateId(), foodItemId, nutrientId, amount, now);
      }

      await db.runAsync(
        `INSERT OR REPLACE INTO food_item_nutrients (id, food_item_id, nutrient_id, amount, created_at)
         VALUES ${placeholders}`,
        values
      );
      count += batch.length;
    }

    return count;
  },

  /**
   * Get all micronutrient data for a food item
   */
  async getFoodNutrients(foodItemId: string): Promise<MicronutrientData> {
    const db = getDatabase();
    const rows = await db.getAllAsync<{ nutrient_id: string; amount: number }>(
      'SELECT nutrient_id, amount FROM food_item_nutrients WHERE food_item_id = ?',
      [foodItemId]
    );

    const data: MicronutrientData = {};
    for (const row of rows) {
      data[row.nutrient_id] = row.amount;
    }
    return data;
  },

  /**
   * Check if a food item has micronutrient data stored
   */
  async hasFoodNutrients(foodItemId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM food_item_nutrients WHERE food_item_id = ?',
      [foodItemId]
    );
    return (result?.count ?? 0) > 0;
  },

  /**
   * Get the count of nutrients stored for a food item
   */
  async getFoodNutrientCount(foodItemId: string): Promise<number> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM food_item_nutrients WHERE food_item_id = ?',
      [foodItemId]
    );
    return result?.count ?? 0;
  },

  /**
   * Delete all micronutrient data for a food item
   */
  async deleteFoodNutrients(foodItemId: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      'DELETE FROM food_item_nutrients WHERE food_item_id = ?',
      [foodItemId]
    );
  },

  /**
   * Cache USDA food detail response for offline access
   */
  async cacheUSDAFood(
    fdcId: number,
    description: string,
    dataType: string,
    nutrientsJson: string,
    servingSize?: number,
    servingSizeUnit?: string,
    ttlDays: number = 30
  ): Promise<void> {
    const db = getDatabase();
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    await db.runAsync(
      `INSERT OR REPLACE INTO usda_food_cache
       (fdc_id, description, data_type, nutrients_json, serving_size, serving_size_unit, fetched_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      [fdcId, description, dataType, nutrientsJson, servingSize ?? null, servingSizeUnit ?? null, expiresAt]
    );
  },

  /**
   * Get cached USDA food detail
   */
  async getCachedUSDAFood(fdcId: number): Promise<{
    description: string;
    dataType: string;
    nutrientsJson: string;
    servingSize?: number;
    servingSizeUnit?: string;
  } | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{
      description: string;
      data_type: string;
      nutrients_json: string;
      serving_size: number | null;
      serving_size_unit: string | null;
      expires_at: string;
    }>(
      'SELECT * FROM usda_food_cache WHERE fdc_id = ? AND expires_at > datetime(?)',
      [fdcId, new Date().toISOString()]
    );

    if (!row) return null;

    return {
      description: row.description,
      dataType: row.data_type,
      nutrientsJson: row.nutrients_json,
      servingSize: row.serving_size ?? undefined,
      servingSizeUnit: row.serving_size_unit ?? undefined,
    };
  },
};
