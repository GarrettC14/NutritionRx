import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migration 023: Custom Meal Types
 *
 * Creates the custom_meal_types table so users can add up to 3
 * additional meal blocks alongside the 4 default types.
 */
export async function migration023CustomMealTypes(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS custom_meal_types (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      icon TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.runAsync('INSERT INTO schema_version (version) VALUES (23)');
}
