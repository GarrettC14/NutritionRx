/**
 * Restaurant Data Service
 * Handles loading bundled restaurant data into the database
 */

import { getDatabase } from '@/db/database';
import { generateId } from '@/utils/generateId';
import {
  BundledRestaurantData,
  BundledMenuData,
  BundledMenuItem,
  BundledCategory,
} from '@/types/restaurant';
import { BUNDLED_RESTAURANTS } from './restaurantData';

// Module-scoped promise to prevent concurrent initialization (TOCTOU guard)
let initPromise: Promise<void> | null = null;

export const restaurantDataService = {
  /**
   * Initialize restaurant database with bundled data
   * Only loads if no restaurants exist yet.
   * Uses an in-flight promise so concurrent callers share the same work.
   */
  async initializeData(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = this._doInitialize();
    try {
      await initPromise;
    } finally {
      initPromise = null;
    }
  },

  /**
   * Internal initialization — checks DB count and loads bundled data if needed.
   */
  async _doInitialize(): Promise<void> {
    const db = getDatabase();

    // Check if data already loaded
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM restaurants'
    );

    if (result && result.count > 0) {
      if (__DEV__) console.log('Restaurant data already loaded');
      return;
    }

    if (__DEV__) console.log('Loading bundled restaurant data...');
    await this.loadBundledData();
    if (__DEV__) console.log('Restaurant data loaded successfully');
  },

  /**
   * Load all bundled restaurant data
   */
  async loadBundledData(): Promise<void> {
    const db = getDatabase();

    try {
      await db.execAsync('BEGIN TRANSACTION');

      for (const restaurantData of BUNDLED_RESTAURANTS) {
        await this.loadRestaurant(restaurantData.restaurant, restaurantData.menu);
      }

      // Rebuild FTS index
      await this.rebuildSearchIndex();

      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  },

  /**
   * Load a single restaurant with its menu
   */
  async loadRestaurant(
    restaurant: BundledRestaurantData,
    menu: BundledMenuData
  ): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Insert restaurant
    await db.runAsync(
      `INSERT INTO restaurants (id, name, slug, logo_asset_path, last_updated, source, is_verified, item_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        restaurant.id,
        restaurant.name,
        restaurant.slug,
        restaurant.logoAsset ?? null,
        restaurant.metadata.lastUpdated,
        restaurant.metadata.source,
        restaurant.metadata.isVerified ? 1 : 0,
        menu.items.length,
        now,
      ]
    );

    // Insert categories
    for (const category of restaurant.categories) {
      await db.runAsync(
        `INSERT INTO menu_categories (id, restaurant_id, name, display_order, icon_name)
         VALUES (?, ?, ?, ?, ?)`,
        [
          `${restaurant.id}-${category.id}`,
          restaurant.id,
          category.name,
          category.displayOrder,
          category.icon ?? null,
        ]
      );
    }

    // Insert food items
    for (const item of menu.items) {
      await db.runAsync(
        `INSERT INTO restaurant_foods (
          id, restaurant_id, category_id, name, description,
          calories, protein, carbohydrates, fat, fiber, sugar, sodium, saturated_fat,
          serving_size, serving_grams,
          source, last_verified, is_verified, popularity_score,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          restaurant.id,
          `${restaurant.id}-${item.categoryId}`,
          item.name,
          item.description ?? null,
          item.nutrition.calories,
          item.nutrition.protein,
          item.nutrition.carbohydrates,
          item.nutrition.fat,
          item.nutrition.fiber ?? null,
          item.nutrition.sugar ?? null,
          item.nutrition.sodium ?? null,
          item.nutrition.saturatedFat ?? null,
          item.serving.size,
          item.serving.sizeGrams ?? null,
          item.metadata.source,
          item.metadata.lastVerified,
          item.metadata.isVerified ? 1 : 0,
          0,
          now,
          now,
        ]
      );
    }
  },

  /**
   * Rebuild the FTS search index
   */
  async rebuildSearchIndex(): Promise<void> {
    const db = getDatabase();

    // Clear existing FTS data
    await db.runAsync('DELETE FROM restaurant_foods_fts');

    // Rebuild from restaurant_foods
    await db.runAsync(`
      INSERT INTO restaurant_foods_fts (rowid, name, restaurant_name)
      SELECT f.rowid, f.name, r.name
      FROM restaurant_foods f
      INNER JOIN restaurants r ON f.restaurant_id = r.id
    `);
  },

  /**
   * Check if an update to restaurant data is available
   * (For future API integration)
   */
  async checkForUpdates(): Promise<boolean> {
    // In future: check server for data updates
    return false;
  },

  /**
   * Apply any available updates
   * (For future API integration)
   */
  async applyUpdates(): Promise<void> {
    // In future: download and apply incremental updates
  },

  /**
   * Get data version info
   */
  async getDataVersion(): Promise<{
    restaurantCount: number;
    foodCount: number;
    lastUpdated: string | null;
  }> {
    const db = getDatabase();

    const restaurantCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM restaurants'
    );

    const foodCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM restaurant_foods'
    );

    const lastUpdated = await db.getFirstAsync<{ last_updated: string }>(
      'SELECT MAX(last_updated) as last_updated FROM restaurants'
    );

    return {
      restaurantCount: restaurantCount?.count ?? 0,
      foodCount: foodCount?.count ?? 0,
      lastUpdated: lastUpdated?.last_updated ?? null,
    };
  },
};
