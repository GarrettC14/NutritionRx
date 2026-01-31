import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migration 014: Add USDA FDC ID to food_items
 *
 * Adds usda_fdc_id column to food_items table for linking foods
 * to USDA FoodData Central entries for micronutrient lookup.
 * Also adds usda_nutrient_count for quick display of available nutrients.
 */
export async function migration014UsdaFdcId(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- Add USDA FDC ID column to food_items
    ALTER TABLE food_items ADD COLUMN usda_fdc_id INTEGER;

    -- Add nutrient count for quick display (avoids counting joins)
    ALTER TABLE food_items ADD COLUMN usda_nutrient_count INTEGER DEFAULT 0;

    -- Index for USDA FDC ID lookups
    CREATE INDEX IF NOT EXISTS idx_food_items_usda_fdc_id ON food_items(usda_fdc_id);

    -- Create USDA cache table for persisting API responses
    CREATE TABLE IF NOT EXISTS usda_food_cache (
      fdc_id INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      data_type TEXT NOT NULL,
      nutrients_json TEXT NOT NULL,
      serving_size REAL,
      serving_size_unit TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    -- Record schema version
    INSERT INTO schema_version (version, applied_at) VALUES (14, datetime('now'));
  `);
}
