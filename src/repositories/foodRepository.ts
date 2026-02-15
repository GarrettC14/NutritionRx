import { generateId } from '@/utils/generateId';
import { getDatabase } from '@/db/database';
import { FoodItemRow } from '@/types/database';
import { FoodItem, FoodItemWithServing, DataSource } from '@/types/domain';
import { mapFoodItemRowToDomain } from '@/types/mappers';
import { SEARCH_SETTINGS } from '@/constants/defaults';

export interface CreateFoodInput {
  name: string;
  brand?: string;
  barcode?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize: number;
  servingUnit: string;
  servingSizeGrams?: number;
  source: DataSource;
  sourceId?: string;
  isVerified?: boolean;
  isUserCreated?: boolean;
  usdaFdcId?: number;
  usdaNutrientCount?: number;
}

export const foodRepository = {
  async findById(id: string): Promise<FoodItem | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<FoodItemRow>(
      'SELECT * FROM food_items WHERE id = ?',
      [id]
    );
    return row ? mapFoodItemRowToDomain(row) : null;
  },

  async findByBarcode(barcode: string): Promise<FoodItem | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<FoodItemRow>(
      'SELECT * FROM food_items WHERE barcode = ?',
      [barcode]
    );
    return row ? mapFoodItemRowToDomain(row) : null;
  },

  async search(
    query: string,
    limit: number = SEARCH_SETTINGS.maxResults
  ): Promise<FoodItem[]> {
    if (query.length < SEARCH_SETTINGS.minQueryLength) {
      return [];
    }

    const db = getDatabase();

    // Use FTS5 for efficient substring search
    // Quote the query for FTS: wrap each token in double quotes for literal matching
    const ftsQuery = query.trim().split(/\s+/).map(t => `"${t}"`).join(' ');

    const rows = await db.getAllAsync<FoodItemRow>(
      `SELECT fi.* FROM food_items fi
       INNER JOIN food_items_fts fts ON fi.rowid = fts.rowid
       WHERE food_items_fts MATCH ?
       ORDER BY fi.usage_count DESC, fi.name ASC
       LIMIT ?`,
      [ftsQuery, limit]
    );

    return rows.map(mapFoodItemRowToDomain);
  },

  async getRecent(limit: number = SEARCH_SETTINGS.recentLimit): Promise<FoodItem[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<FoodItemRow>(
      `SELECT * FROM food_items
       WHERE last_used_at IS NOT NULL
       ORDER BY last_used_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows.map(mapFoodItemRowToDomain);
  },

  async getFrequent(limit: number = SEARCH_SETTINGS.frequentLimit): Promise<FoodItem[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<FoodItemRow>(
      `SELECT * FROM food_items
       WHERE usage_count > 0
       ORDER BY usage_count DESC
       LIMIT ?`,
      [limit]
    );
    return rows.map(mapFoodItemRowToDomain);
  },

  async getMealContextFoods(
    mealType: string,
    limit: number = 10
  ): Promise<FoodItemWithServing[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT
        fi.*,
        COUNT(le.id) as meal_usage_count,
        MAX(le.created_at) as last_meal_use,
        (SELECT le2.servings FROM log_entries le2
         WHERE le2.food_item_id = fi.id
         ORDER BY le2.created_at DESC LIMIT 1) as last_used_servings
       FROM food_items fi
       INNER JOIN log_entries le ON fi.id = le.food_item_id
       WHERE le.meal_type = ?
       GROUP BY fi.id
       ORDER BY meal_usage_count DESC, last_meal_use DESC
       LIMIT ?`,
      [mealType, limit]
    );

    if (rows.length === 0) {
      const frequent = await this.getFrequent(limit);
      return frequent.map((food) => ({
        ...food,
        servingHint: {
          size: food.servingSize,
          unit: food.servingUnit,
        },
      }));
    }

    return rows.map((row) => this.mapToFoodItemWithServing(row));
  },

  async getScannedHistory(limit: number = 10): Promise<FoodItem[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<FoodItemRow>(
      `SELECT * FROM food_items
       WHERE barcode IS NOT NULL
         AND barcode != ''
         AND last_used_at IS NOT NULL
       ORDER BY last_used_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows.map(mapFoodItemRowToDomain);
  },

  async getLastLogServings(foodItemId: string): Promise<number | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ servings: number }>(
      `SELECT servings FROM log_entries
       WHERE food_item_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [foodItemId]
    );

    return row?.servings ?? null;
  },

  async getBatchLastLogServings(
    foodItemIds: string[]
  ): Promise<Map<string, number>> {
    if (foodItemIds.length === 0) return new Map();

    const db = getDatabase();
    const placeholders = foodItemIds.map(() => '?').join(',');
    const rows = await db.getAllAsync<{ food_item_id: string; servings: number }>(
      `SELECT food_item_id, servings FROM (
         SELECT food_item_id, servings,
           ROW_NUMBER() OVER (PARTITION BY food_item_id ORDER BY created_at DESC) as rn
         FROM log_entries
         WHERE food_item_id IN (${placeholders})
       )
       WHERE rn = 1`,
      foodItemIds
    );

    const servingsByFood = new Map<string, number>();
    rows.forEach((row) => {
      servingsByFood.set(row.food_item_id, row.servings);
    });

    return servingsByFood;
  },

  async getUserCreated(): Promise<FoodItem[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<FoodItemRow>(
      `SELECT * FROM food_items WHERE is_user_created = 1 ORDER BY name`
    );
    return rows.map(mapFoodItemRowToDomain);
  },

  async create(input: CreateFoodInput): Promise<FoodItem> {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO food_items (
        id, name, brand, barcode, calories, protein, carbs, fat,
        fiber, sugar, sodium, serving_size, serving_unit, serving_size_grams,
        source, source_id, is_verified, is_user_created,
        last_used_at, usage_count, usda_fdc_id, usda_nutrient_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.brand ?? null,
        input.barcode ?? null,
        input.calories,
        input.protein,
        input.carbs,
        input.fat,
        input.fiber ?? null,
        input.sugar ?? null,
        input.sodium ?? null,
        input.servingSize,
        input.servingUnit,
        input.servingSizeGrams ?? null,
        input.source,
        input.sourceId ?? null,
        input.isVerified ? 1 : 0,
        input.isUserCreated ? 1 : 0,
        null,
        0,
        input.usdaFdcId ?? null,
        input.usdaNutrientCount ?? 0,
        now,
        now,
      ]
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create food item');
    return created;
  },

  async update(id: string, updates: Partial<CreateFoodInput>): Promise<FoodItem> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const setClauses: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      values.push(updates.name);
    }
    if (updates.brand !== undefined) {
      setClauses.push('brand = ?');
      values.push(updates.brand);
    }
    if (updates.barcode !== undefined) {
      setClauses.push('barcode = ?');
      values.push(updates.barcode);
    }
    if (updates.calories !== undefined) {
      setClauses.push('calories = ?');
      values.push(updates.calories);
    }
    if (updates.protein !== undefined) {
      setClauses.push('protein = ?');
      values.push(updates.protein);
    }
    if (updates.carbs !== undefined) {
      setClauses.push('carbs = ?');
      values.push(updates.carbs);
    }
    if (updates.fat !== undefined) {
      setClauses.push('fat = ?');
      values.push(updates.fat);
    }
    if (updates.servingSize !== undefined) {
      setClauses.push('serving_size = ?');
      values.push(updates.servingSize);
    }
    if (updates.servingUnit !== undefined) {
      setClauses.push('serving_unit = ?');
      values.push(updates.servingUnit);
    }

    values.push(id);

    await db.runAsync(
      `UPDATE food_items SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('Food item not found');
    return updated;
  },

  async recordUsage(id: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE food_items
       SET last_used_at = ?, usage_count = usage_count + 1, updated_at = ?
       WHERE id = ?`,
      [now, now, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM food_items WHERE id = ?', [id]);
  },

  async exists(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM food_items WHERE id = ?',
      [id]
    );
    return (result?.count ?? 0) > 0;
  },

  async existsByBarcode(barcode: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM food_items WHERE barcode = ?',
      [barcode]
    );
    return (result?.count ?? 0) > 0;
  },

  async findByFdcId(fdcId: number): Promise<FoodItem | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<FoodItemRow>(
      'SELECT * FROM food_items WHERE usda_fdc_id = ?',
      [fdcId]
    );
    return row ? mapFoodItemRowToDomain(row) : null;
  },

  async updateUsdaFields(id: string, fdcId: number, nutrientCount: number): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE food_items SET usda_fdc_id = ?, usda_nutrient_count = ?, updated_at = ? WHERE id = ?`,
      [fdcId, nutrientCount, now, id]
    );
  },

  async findByExactName(name: string, brand?: string): Promise<FoodItem | null> {
    const db = getDatabase();
    const normalizedName = name.trim().toLowerCase();
    const normalizedBrand = brand?.trim().toLowerCase() || null;

    let row: FoodItemRow | null;
    if (normalizedBrand) {
      row = await db.getFirstAsync<FoodItemRow>(
        `SELECT * FROM food_items
         WHERE LOWER(name) = ? AND LOWER(brand) = ?`,
        [normalizedName, normalizedBrand]
      );
    } else {
      row = await db.getFirstAsync<FoodItemRow>(
        `SELECT * FROM food_items
         WHERE LOWER(name) = ? AND (brand IS NULL OR brand = '')`,
        [normalizedName]
      );
    }
    return row ? mapFoodItemRowToDomain(row) : null;
  },

  mapToFoodItemWithServing(row: any): FoodItemWithServing {
    const food = mapFoodItemRowToDomain(row as FoodItemRow);
    const lastUsedServings = row.last_used_servings ?? null;
    const servingSize = row.serving_size ?? food.servingSize;
    return {
      ...food,
      lastUsedServings,
      mealUsageCount: row.meal_usage_count ?? undefined,
      servingHint: {
        size: lastUsedServings ?? servingSize,
        unit: food.servingUnit,
      },
    };
  },
};
