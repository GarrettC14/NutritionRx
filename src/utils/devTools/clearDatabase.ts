import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Clears all user data from all tables in reverse FK dependency order.
 *
 * Preserves:
 * - food_items WHERE source != 'user' (seed/bundled foods)
 * - restaurants, menu_categories, restaurant_foods, food_variants (bundled data)
 * - restaurant_foods_fts (rebuilt from bundled data)
 * - schema_version
 */
export async function clearAllData(
  db: SQLiteDatabase,
  verbose: boolean = false
): Promise<void> {
  // Delete in reverse FK dependency order to avoid constraint violations
  const deleteStatements: Array<{ table: string; sql: string }> = [
    // Micronutrient-dependent tables first
    { table: 'nutrient_contributors', sql: 'DELETE FROM nutrient_contributors' },
    { table: 'daily_nutrient_intake', sql: 'DELETE FROM daily_nutrient_intake' },
    { table: 'food_item_nutrients', sql: 'DELETE FROM food_item_nutrients' },
    { table: 'custom_nutrient_targets', sql: 'DELETE FROM custom_nutrient_targets' },
    { table: 'nutrient_settings', sql: 'DELETE FROM nutrient_settings' },

    // Photo tables
    { table: 'photo_comparisons', sql: 'DELETE FROM photo_comparisons' },
    { table: 'progress_photos', sql: 'DELETE FROM progress_photos' },

    // Planning tables
    { table: 'planned_meals', sql: 'DELETE FROM planned_meals' },
    { table: 'meal_plan_settings', sql: 'DELETE FROM meal_plan_settings' },

    // Fasting tables
    { table: 'fasting_sessions', sql: 'DELETE FROM fasting_sessions' },
    { table: 'fasting_config', sql: 'DELETE FROM fasting_config' },

    // Macro cycling
    { table: 'macro_cycle_overrides', sql: 'DELETE FROM macro_cycle_overrides' },
    { table: 'macro_cycle_config', sql: 'DELETE FROM macro_cycle_config' },

    // Restaurant user data (preserve bundled restaurant/menu/food data)
    { table: 'user_restaurant_usage', sql: 'DELETE FROM user_restaurant_usage' },
    { table: 'restaurant_food_logs', sql: 'DELETE FROM restaurant_food_logs' },

    // Water
    { table: 'water_log', sql: 'DELETE FROM water_log' },

    // Favorites
    { table: 'favorite_foods', sql: 'DELETE FROM favorite_foods' },

    // Health sync
    { table: 'health_sync_log', sql: 'DELETE FROM health_sync_log' },
    { table: 'backup_metadata', sql: 'DELETE FROM backup_metadata' },

    // Core tracking data
    { table: 'weekly_reflections', sql: 'DELETE FROM weekly_reflections' },
    { table: 'daily_metabolism', sql: 'DELETE FROM daily_metabolism' },
    { table: 'goals', sql: 'DELETE FROM goals' },
    { table: 'weight_entries', sql: 'DELETE FROM weight_entries' },
    { table: 'quick_add_entries', sql: 'DELETE FROM quick_add_entries' },
    { table: 'log_entries', sql: 'DELETE FROM log_entries' },

    // User-created food items only (preserve seed/bundled)
    { table: 'food_items (user)', sql: "DELETE FROM food_items WHERE source = 'user'" },

    // Reset food usage tracking on preserved items
    { table: 'food_items (usage)', sql: 'UPDATE food_items SET usage_count = 0, last_used_at = NULL' },

    // User profile and settings
    {
      table: 'user_settings',
      sql: `DELETE FROM user_settings WHERE key NOT IN (
        'weight_unit', 'theme', 'daily_calorie_goal', 'daily_protein_goal',
        'daily_carbs_goal', 'daily_fat_goal', 'has_seen_onboarding'
      )`,
    },
    {
      table: 'user_profile',
      sql: `UPDATE user_profile SET
        sex = NULL, date_of_birth = NULL, height_cm = NULL,
        activity_level = NULL, eating_style = 'flexible', protein_priority = 'active',
        has_completed_onboarding = 0, onboarding_skipped = 0,
        updated_at = datetime('now')
      WHERE id = 'singleton'`,
    },
  ];

  for (const stmt of deleteStatements) {
    try {
      await db.runAsync(stmt.sql);
      if (verbose) console.log(`[clear] Cleared ${stmt.table}`);
    } catch (error) {
      // Table might not exist if migration hasn't run
      if (verbose) console.warn(`[clear] Skipped ${stmt.table}: ${error}`);
    }
  }

  if (verbose) console.log('[clear] All user data cleared');
}
