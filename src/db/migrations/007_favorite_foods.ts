import { SQLiteDatabase } from 'expo-sqlite';

export async function migration007FavoriteFoods(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- ============================================================
    -- FAVORITE FOODS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS favorite_foods (
      id TEXT PRIMARY KEY,
      food_id TEXT NOT NULL UNIQUE,
      default_serving_size REAL,
      default_serving_unit TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (food_id) REFERENCES food_items(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_favorite_foods_food_id ON favorite_foods(food_id);
    CREATE INDEX IF NOT EXISTS idx_favorite_foods_sort_order ON favorite_foods(sort_order);

    -- Record migration
    INSERT INTO schema_version (version) VALUES (7);
  `);
}
