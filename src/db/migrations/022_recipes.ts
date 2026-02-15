import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migration 022: Recipe System
 *
 * Creates recipes, recipe_items, and recipe_logs tables.
 * Adds recipe_log_id FK column to log_entries so individual
 * entries can be grouped under a single recipe log.
 */
export async function migration022Recipes(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      total_calories REAL NOT NULL DEFAULT 0,
      total_protein REAL NOT NULL DEFAULT 0,
      total_carbs REAL NOT NULL DEFAULT 0,
      total_fat REAL NOT NULL DEFAULT 0,
      item_count INTEGER NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      usage_count INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipe_items (
      id TEXT PRIMARY KEY NOT NULL,
      recipe_id TEXT NOT NULL,
      food_item_id TEXT NOT NULL,
      food_name TEXT NOT NULL,
      food_brand TEXT,
      servings REAL NOT NULL DEFAULT 1,
      serving_unit TEXT,
      calories REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (food_item_id) REFERENCES food_items(id)
    );

    CREATE TABLE IF NOT EXISTS recipe_logs (
      id TEXT PRIMARY KEY NOT NULL,
      recipe_id TEXT NOT NULL,
      recipe_name TEXT NOT NULL,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
    );

    ALTER TABLE log_entries ADD COLUMN recipe_log_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe_id ON recipe_items(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_logs_recipe_id ON recipe_logs(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_logs_date ON recipe_logs(date);
    CREATE INDEX IF NOT EXISTS idx_log_entries_recipe_log_id ON log_entries(recipe_log_id);
  `);

  await db.runAsync('INSERT INTO schema_version (version) VALUES (22)');
}
