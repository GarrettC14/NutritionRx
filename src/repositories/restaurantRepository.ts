/**
 * Restaurant Repository
 * Data access layer for restaurant/chain database
 */

import { generateId } from '@/utils/generateId';
import { getDatabase } from '@/db/database';
import {
  Restaurant,
  RestaurantFood,
  MenuCategory,
  RestaurantRow,
  RestaurantFoodRow,
  MenuCategoryRow,
  RestaurantFoodLog,
  RestaurantFoodLogRow,
  LogRestaurantFoodInput,
  UserRestaurantUsageRow,
  FoodVariant,
  FoodVariantRow,
} from '@/types/restaurant';

// ============================================================
// Mappers
// ============================================================

function mapRestaurantRowToDomain(row: RestaurantRow, categories?: MenuCategoryRow[]): Restaurant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoAssetPath: row.logo_asset_path ?? undefined,
    categories: categories?.map(mapCategoryRowToDomain) || [],
    metadata: {
      lastUpdated: row.last_updated,
      source: row.source as 'bundled' | 'api' | 'community',
      itemCount: row.item_count,
      isVerified: Boolean(row.is_verified),
    },
  };
}

function mapCategoryRowToDomain(row: MenuCategoryRow): MenuCategory {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    displayOrder: row.display_order,
    iconName: row.icon_name ?? undefined,
  };
}

function mapFoodRowToDomain(row: RestaurantFoodRow): RestaurantFood {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    categoryId: row.category_id ?? undefined,
    categoryName: row.category_name ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    nutrition: {
      calories: row.calories,
      protein: row.protein,
      carbohydrates: row.carbohydrates,
      fat: row.fat,
      fiber: row.fiber ?? undefined,
      sugar: row.sugar ?? undefined,
      sodium: row.sodium ?? undefined,
      saturatedFat: row.saturated_fat ?? undefined,
    },
    serving: {
      size: row.serving_size,
      sizeGrams: row.serving_grams ?? undefined,
    },
    metadata: {
      source: row.source as 'nutritionix' | 'usda' | 'restaurant' | 'community',
      sourceId: row.source_id ?? undefined,
      lastVerified: row.last_verified,
      isVerified: Boolean(row.is_verified),
      popularityScore: row.popularity_score,
    },
  };
}

function mapFoodLogRowToDomain(row: RestaurantFoodLogRow): RestaurantFoodLog {
  return {
    id: row.id,
    restaurantFoodId: row.restaurant_food_id,
    restaurantName: row.restaurant_name,
    foodName: row.food_name,
    variantId: row.variant_id ?? undefined,
    loggedAt: row.logged_at,
    date: row.date,
    meal: row.meal,
    quantity: row.quantity,
    notes: row.notes ?? undefined,
    nutritionSnapshot: {
      calories: row.calories,
      protein: row.protein,
      carbohydrates: row.carbohydrates,
      fat: row.fat,
    },
    createdAt: new Date(row.created_at),
  };
}

function mapVariantRowToDomain(row: FoodVariantRow): FoodVariant {
  return {
    id: row.id,
    restaurantFoodId: row.restaurant_food_id,
    name: row.name,
    nutritionDelta: {
      calories: row.calories_delta,
      protein: row.protein_delta,
      carbohydrates: row.carbohydrates_delta,
      fat: row.fat_delta,
    },
  };
}

// ============================================================
// Repository
// ============================================================

export const restaurantRepository = {
  // ============================================================
  // Restaurants
  // ============================================================

  async getAll(): Promise<Restaurant[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RestaurantRow>(
      `SELECT * FROM restaurants ORDER BY name`
    );
    return rows.map((row) => mapRestaurantRowToDomain(row));
  },

  async getById(id: string): Promise<Restaurant | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<RestaurantRow>(
      `SELECT * FROM restaurants WHERE id = ?`,
      [id]
    );

    if (!row) return null;

    const categories = await db.getAllAsync<MenuCategoryRow>(
      `SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY display_order`,
      [id]
    );

    return mapRestaurantRowToDomain(row, categories);
  },

  async getBySlug(slug: string): Promise<Restaurant | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<RestaurantRow>(
      `SELECT * FROM restaurants WHERE slug = ?`,
      [slug]
    );

    if (!row) return null;

    const categories = await db.getAllAsync<MenuCategoryRow>(
      `SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY display_order`,
      [row.id]
    );

    return mapRestaurantRowToDomain(row, categories);
  },

  async getRecent(limit: number = 5): Promise<Restaurant[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RestaurantRow>(
      `SELECT r.* FROM restaurants r
       INNER JOIN user_restaurant_usage u ON r.id = u.restaurant_id
       ORDER BY u.last_used DESC
       LIMIT ?`,
      [limit]
    );
    return rows.map((row) => mapRestaurantRowToDomain(row));
  },

  async searchRestaurants(query: string, limit: number = 20): Promise<Restaurant[]> {
    if (query.length < 2) return [];

    const db = getDatabase();
    const searchPattern = `%${query}%`;

    const rows = await db.getAllAsync<RestaurantRow>(
      `SELECT * FROM restaurants
       WHERE name LIKE ? COLLATE NOCASE
       ORDER BY item_count DESC, name ASC
       LIMIT ?`,
      [searchPattern, limit]
    );

    return rows.map((row) => mapRestaurantRowToDomain(row));
  },

  // ============================================================
  // Restaurant Foods
  // ============================================================

  async getFoods(restaurantId: string, categoryId?: string): Promise<RestaurantFood[]> {
    const db = getDatabase();
    let query = `
      SELECT f.*, r.name as restaurant_name, c.name as category_name
      FROM restaurant_foods f
      INNER JOIN restaurants r ON f.restaurant_id = r.id
      LEFT JOIN menu_categories c ON f.category_id = c.id
      WHERE f.restaurant_id = ?
    `;
    const params: any[] = [restaurantId];

    if (categoryId) {
      query += ` AND f.category_id = ?`;
      params.push(categoryId);
    }

    query += ` ORDER BY f.popularity_score DESC, f.name`;

    const rows = await db.getAllAsync<RestaurantFoodRow>(query, params);
    return rows.map(mapFoodRowToDomain);
  },

  async getFoodById(id: string): Promise<RestaurantFood | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<RestaurantFoodRow>(
      `SELECT f.*, r.name as restaurant_name, c.name as category_name
       FROM restaurant_foods f
       INNER JOIN restaurants r ON f.restaurant_id = r.id
       LEFT JOIN menu_categories c ON f.category_id = c.id
       WHERE f.id = ?`,
      [id]
    );

    return row ? mapFoodRowToDomain(row) : null;
  },

  async getPopularFoods(restaurantId: string, limit: number = 5): Promise<RestaurantFood[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RestaurantFoodRow>(
      `SELECT f.*, r.name as restaurant_name, c.name as category_name
       FROM restaurant_foods f
       INNER JOIN restaurants r ON f.restaurant_id = r.id
       LEFT JOIN menu_categories c ON f.category_id = c.id
       WHERE f.restaurant_id = ?
       ORDER BY f.popularity_score DESC
       LIMIT ?`,
      [restaurantId, limit]
    );
    return rows.map(mapFoodRowToDomain);
  },

  async searchFoods(query: string, limit: number = 20): Promise<RestaurantFood[]> {
    if (query.length < 2) return [];

    const db = getDatabase();
    const searchPattern = `%${query}%`;

    // Use FTS5 for efficient full-text search
    const ftsQuery = query.trim().split(/\s+/).map(t => `"${t}"`).join(' ');

    const rows = await db.getAllAsync<RestaurantFoodRow>(
      `SELECT f.*, r.name as restaurant_name, c.name as category_name
       FROM restaurant_foods f
       INNER JOIN restaurants r ON f.restaurant_id = r.id
       LEFT JOIN menu_categories c ON f.category_id = c.id
       INNER JOIN restaurant_foods_fts fts ON f.rowid = fts.rowid
       WHERE restaurant_foods_fts MATCH ?
       ORDER BY
         CASE WHEN f.name LIKE ? COLLATE NOCASE THEN 0 ELSE 1 END,
         f.popularity_score DESC
       LIMIT ?`,
      [ftsQuery, `${query}%`, limit]
    );

    return rows.map(mapFoodRowToDomain);
  },

  async searchFoodsInRestaurant(
    restaurantId: string,
    query: string,
    limit: number = 20
  ): Promise<RestaurantFood[]> {
    if (query.length < 2) return [];

    const db = getDatabase();
    const ftsQuery = query.trim().split(/\s+/).map(t => `"${t}"`).join(' ');

    const rows = await db.getAllAsync<RestaurantFoodRow>(
      `SELECT f.*, r.name as restaurant_name, c.name as category_name
       FROM restaurant_foods f
       INNER JOIN restaurants r ON f.restaurant_id = r.id
       LEFT JOIN menu_categories c ON f.category_id = c.id
       INNER JOIN restaurant_foods_fts fts ON f.rowid = fts.rowid
       WHERE f.restaurant_id = ?
         AND restaurant_foods_fts MATCH ?
       ORDER BY f.popularity_score DESC
       LIMIT ?`,
      [restaurantId, ftsQuery, limit]
    );

    return rows.map(mapFoodRowToDomain);
  },

  async incrementPopularity(foodId: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE restaurant_foods
       SET popularity_score = popularity_score + 1,
           updated_at = ?
       WHERE id = ?`,
      [now, foodId]
    );
  },

  // ============================================================
  // Food Variants
  // ============================================================

  async getVariants(foodId: string): Promise<FoodVariant[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<FoodVariantRow>(
      `SELECT * FROM food_variants WHERE restaurant_food_id = ?`,
      [foodId]
    );
    return rows.map(mapVariantRowToDomain);
  },

  // ============================================================
  // User Restaurant Usage
  // ============================================================

  async updateUsage(restaurantId: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO user_restaurant_usage (restaurant_id, last_used, use_count)
       VALUES (?, ?, 1)
       ON CONFLICT(restaurant_id) DO UPDATE SET
         last_used = ?,
         use_count = use_count + 1`,
      [restaurantId, now, now]
    );
  },

  // ============================================================
  // Food Logging
  // ============================================================

  async logFood(input: LogRestaurantFoodInput): Promise<RestaurantFoodLog> {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    const date = now.split('T')[0];

    await db.runAsync(
      `INSERT INTO restaurant_food_logs (
        id, restaurant_food_id, restaurant_name, food_name, variant_id,
        logged_at, date, meal, quantity, notes,
        calories, protein, carbohydrates, fat, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.restaurantFoodId,
        input.restaurantName,
        input.foodName,
        input.variantId ?? null,
        now,
        date,
        input.meal,
        input.quantity ?? 1,
        input.notes ?? null,
        input.nutritionSnapshot.calories,
        input.nutritionSnapshot.protein,
        input.nutritionSnapshot.carbohydrates,
        input.nutritionSnapshot.fat,
        now,
      ]
    );

    // Update popularity and usage
    const food = await this.getFoodById(input.restaurantFoodId);
    if (food) {
      await this.incrementPopularity(input.restaurantFoodId);
      await this.updateUsage(food.restaurantId);
    }

    const row = await db.getFirstAsync<RestaurantFoodLogRow>(
      `SELECT * FROM restaurant_food_logs WHERE id = ?`,
      [id]
    );

    if (!row) throw new Error('Failed to log restaurant food');
    return mapFoodLogRowToDomain(row);
  },

  async getLogsByDate(date: string): Promise<RestaurantFoodLog[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RestaurantFoodLogRow>(
      `SELECT * FROM restaurant_food_logs WHERE date = ? ORDER BY logged_at`,
      [date]
    );
    return rows.map(mapFoodLogRowToDomain);
  },

  async getLogsByDateAndMeal(date: string, meal: string): Promise<RestaurantFoodLog[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RestaurantFoodLogRow>(
      `SELECT * FROM restaurant_food_logs WHERE date = ? AND meal = ? ORDER BY logged_at`,
      [date, meal]
    );
    return rows.map(mapFoodLogRowToDomain);
  },

  async deleteLog(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM restaurant_food_logs WHERE id = ?', [id]);
  },

  // ============================================================
  // Daily Summary Helpers
  // ============================================================

  async getDailyTotals(date: string): Promise<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{
      total_calories: number;
      total_protein: number;
      total_carbs: number;
      total_fat: number;
    }>(
      `SELECT
        COALESCE(SUM(calories * quantity), 0) as total_calories,
        COALESCE(SUM(protein * quantity), 0) as total_protein,
        COALESCE(SUM(carbohydrates * quantity), 0) as total_carbs,
        COALESCE(SUM(fat * quantity), 0) as total_fat
       FROM restaurant_food_logs
       WHERE date = ?`,
      [date]
    );

    return {
      calories: result?.total_calories ?? 0,
      protein: result?.total_protein ?? 0,
      carbs: result?.total_carbs ?? 0,
      fat: result?.total_fat ?? 0,
    };
  },

  // ============================================================
  // Data Management
  // ============================================================

  async getRestaurantCount(): Promise<number> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM restaurants'
    );
    return result?.count ?? 0;
  },

  async clearAllData(): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM restaurant_food_logs');
    await db.runAsync('DELETE FROM user_restaurant_usage');
    await db.runAsync('DELETE FROM food_variants');
    await db.runAsync('DELETE FROM restaurant_foods');
    await db.runAsync('DELETE FROM menu_categories');
    await db.runAsync('DELETE FROM restaurants');
  },
};
