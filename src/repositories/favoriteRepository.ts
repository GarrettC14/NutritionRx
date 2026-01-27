import { generateId } from '@/utils/generateId';
import { getDatabase } from '@/db/database';
import { FoodItemRow } from '@/types/database';
import { FoodItem } from '@/types/domain';
import { mapFoodItemRowToDomain } from '@/types/mappers';

export interface AddFavoriteInput {
  foodId: string;
  defaultServingSize?: number;
  defaultServingUnit?: string;
}

interface FavoriteFoodRow {
  id: string;
  food_id: string;
  default_serving_size: number | null;
  default_serving_unit: string | null;
  sort_order: number;
  created_at: string;
}

export const favoriteRepository = {
  async getAll(): Promise<FoodItem[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<FoodItemRow>(
      `SELECT f.* FROM food_items f
       INNER JOIN favorite_foods ff ON f.id = ff.food_id
       ORDER BY ff.sort_order ASC, ff.created_at DESC`
    );
    return rows.map(mapFoodItemRowToDomain);
  },

  async getAllIds(): Promise<string[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<{ food_id: string }>(
      'SELECT food_id FROM favorite_foods'
    );
    return rows.map((row) => row.food_id);
  },

  async isFavorite(foodId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM favorite_foods WHERE food_id = ?',
      [foodId]
    );
    return (result?.count ?? 0) > 0;
  },

  async add(input: AddFavoriteInput): Promise<void> {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    // Get max sort_order
    const maxResult = await db.getFirstAsync<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM favorite_foods'
    );
    const nextOrder = (maxResult?.max_order ?? -1) + 1;

    await db.runAsync(
      `INSERT INTO favorite_foods (id, food_id, default_serving_size, default_serving_unit, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.foodId,
        input.defaultServingSize ?? null,
        input.defaultServingUnit ?? null,
        nextOrder,
        now,
      ]
    );
  },

  async remove(foodId: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM favorite_foods WHERE food_id = ?', [foodId]);
  },

  async toggle(foodId: string): Promise<boolean> {
    const isFav = await this.isFavorite(foodId);
    if (isFav) {
      await this.remove(foodId);
      return false;
    } else {
      await this.add({ foodId });
      return true;
    }
  },

  async updateDefaults(
    foodId: string,
    defaultServingSize: number,
    defaultServingUnit: string
  ): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE favorite_foods
       SET default_serving_size = ?, default_serving_unit = ?
       WHERE food_id = ?`,
      [defaultServingSize, defaultServingUnit, foodId]
    );
  },

  async getDefaults(
    foodId: string
  ): Promise<{ servingSize: number | null; servingUnit: string | null } | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<FavoriteFoodRow>(
      'SELECT * FROM favorite_foods WHERE food_id = ?',
      [foodId]
    );
    if (!row) return null;
    return {
      servingSize: row.default_serving_size,
      servingUnit: row.default_serving_unit,
    };
  },
};
