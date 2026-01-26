import { SQLiteDatabase } from 'expo-sqlite';

export async function migration001Initial(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- Schema version tracking
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- FOOD ITEMS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS food_items (
      id TEXT PRIMARY KEY,

      -- Basic info
      name TEXT NOT NULL,
      brand TEXT,
      barcode TEXT,

      -- Nutrition per serving
      calories REAL NOT NULL,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      fiber REAL,
      sugar REAL,
      sodium REAL,

      -- Serving info
      serving_size REAL NOT NULL,
      serving_unit TEXT NOT NULL,
      serving_size_grams REAL,

      -- Data source
      source TEXT NOT NULL,
      source_id TEXT,

      -- Flags
      is_verified INTEGER DEFAULT 0,
      is_user_created INTEGER DEFAULT 0,

      -- Usage tracking
      last_used_at TEXT,
      usage_count INTEGER DEFAULT 0,

      -- Timestamps
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Indexes for food_items
    CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(barcode);
    CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_food_items_recent ON food_items(last_used_at DESC);
    CREATE INDEX IF NOT EXISTS idx_food_items_source ON food_items(source);

    -- ============================================================
    -- LOG ENTRIES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS log_entries (
      id TEXT PRIMARY KEY,
      food_item_id TEXT NOT NULL,

      -- When/what meal
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,

      -- Amount consumed
      servings REAL NOT NULL,

      -- Calculated nutrition (denormalized for performance)
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,

      -- Optional
      notes TEXT,

      -- Timestamps
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE
    );

    -- Indexes for log_entries
    CREATE INDEX IF NOT EXISTS idx_log_entries_date ON log_entries(date);
    CREATE INDEX IF NOT EXISTS idx_log_entries_date_meal ON log_entries(date, meal_type);
    CREATE INDEX IF NOT EXISTS idx_log_entries_food ON log_entries(food_item_id);

    -- ============================================================
    -- QUICK ADD ENTRIES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS quick_add_entries (
      id TEXT PRIMARY KEY,

      -- When/what meal
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,

      -- Values (only calories required)
      calories REAL NOT NULL,
      protein REAL,
      carbs REAL,
      fat REAL,

      -- Description
      description TEXT,

      -- Timestamps
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Indexes for quick_add_entries
    CREATE INDEX IF NOT EXISTS idx_quick_add_date ON quick_add_entries(date);

    -- ============================================================
    -- WEIGHT ENTRIES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS weight_entries (
      id TEXT PRIMARY KEY,

      date TEXT NOT NULL UNIQUE,
      weight_kg REAL NOT NULL,

      -- Optional notes
      notes TEXT,

      -- Timestamps
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Indexes for weight_entries
    CREATE INDEX IF NOT EXISTS idx_weight_entries_date ON weight_entries(date DESC);

    -- ============================================================
    -- USER SETTINGS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Insert default settings
    INSERT OR IGNORE INTO user_settings (key, value, updated_at) VALUES
      ('weight_unit', 'lbs', datetime('now')),
      ('theme', 'dark', datetime('now')),
      ('daily_calorie_goal', '2000', datetime('now')),
      ('daily_protein_goal', '150', datetime('now')),
      ('daily_carbs_goal', '200', datetime('now')),
      ('daily_fat_goal', '65', datetime('now')),
      ('has_seen_onboarding', '0', datetime('now'));

    -- Record migration
    INSERT INTO schema_version (version) VALUES (1);
  `);
}
