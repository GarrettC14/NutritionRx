import { SQLiteDatabase } from 'expo-sqlite';

export async function migration011Restaurants(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- ============================================================
    -- RESTAURANT/CHAIN DATABASE
    -- ============================================================

    -- Restaurants table
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo_asset_path TEXT,
      last_updated TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('bundled', 'api', 'community')),
      item_count INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
    CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants(name);

    -- Menu categories
    CREATE TABLE IF NOT EXISTS menu_categories (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      icon_name TEXT,
      UNIQUE(restaurant_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON menu_categories(restaurant_id);

    -- Restaurant food items
    CREATE TABLE IF NOT EXISTS restaurant_foods (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES menu_categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,

      -- Nutrition
      calories INTEGER NOT NULL,
      protein REAL NOT NULL,
      carbohydrates REAL NOT NULL,
      fat REAL NOT NULL,
      fiber REAL,
      sugar REAL,
      sodium REAL,
      saturated_fat REAL,

      -- Serving
      serving_size TEXT NOT NULL,
      serving_grams REAL,

      -- Metadata
      source TEXT NOT NULL,
      source_id TEXT,
      last_verified TEXT,
      is_verified INTEGER DEFAULT 0,
      popularity_score INTEGER DEFAULT 0,

      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_foods_restaurant ON restaurant_foods(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_foods_category ON restaurant_foods(category_id);
    CREATE INDEX IF NOT EXISTS idx_foods_name ON restaurant_foods(name);
    CREATE INDEX IF NOT EXISTS idx_foods_popularity ON restaurant_foods(popularity_score DESC);

    -- Full-text search for restaurant foods
    CREATE VIRTUAL TABLE IF NOT EXISTS restaurant_foods_fts USING fts5(
      name,
      restaurant_name,
      content='',
      content_rowid='rowid'
    );

    -- Food variants
    CREATE TABLE IF NOT EXISTS food_variants (
      id TEXT PRIMARY KEY,
      restaurant_food_id TEXT NOT NULL REFERENCES restaurant_foods(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      calories_delta INTEGER DEFAULT 0,
      protein_delta REAL DEFAULT 0,
      carbohydrates_delta REAL DEFAULT 0,
      fat_delta REAL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_variants_food ON food_variants(restaurant_food_id);

    -- User's restaurant food logs
    CREATE TABLE IF NOT EXISTS restaurant_food_logs (
      id TEXT PRIMARY KEY,
      restaurant_food_id TEXT NOT NULL REFERENCES restaurant_foods(id),
      restaurant_name TEXT NOT NULL,
      food_name TEXT NOT NULL,
      variant_id TEXT REFERENCES food_variants(id),
      logged_at TEXT NOT NULL,
      date TEXT NOT NULL,
      meal TEXT NOT NULL CHECK(meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
      quantity REAL DEFAULT 1,
      notes TEXT,

      -- Nutrition snapshot
      calories INTEGER NOT NULL,
      protein REAL NOT NULL,
      carbohydrates REAL NOT NULL,
      fat REAL NOT NULL,

      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_restaurant_logs_date ON restaurant_food_logs(date);
    CREATE INDEX IF NOT EXISTS idx_restaurant_logs_restaurant ON restaurant_food_logs(restaurant_food_id);

    -- Track user's frequently used restaurants
    CREATE TABLE IF NOT EXISTS user_restaurant_usage (
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      last_used TEXT NOT NULL,
      use_count INTEGER DEFAULT 1,
      PRIMARY KEY(restaurant_id)
    );

    -- Record migration
    INSERT INTO schema_version (version) VALUES (11);
  `);
}
