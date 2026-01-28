import { SQLiteDatabase } from 'expo-sqlite';

export async function migration013MicronutrientsAndPhotos(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- ============================================================
    -- NUTRIENT SETTINGS (user's demographic info for RDA calculation)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS nutrient_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      gender TEXT NOT NULL DEFAULT 'male',
      age_group TEXT NOT NULL DEFAULT '19-30y',
      life_stage TEXT NOT NULL DEFAULT 'normal',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Insert default settings
    INSERT OR IGNORE INTO nutrient_settings (id, gender, age_group, life_stage, updated_at)
    VALUES (1, 'male', '19-30y', 'normal', datetime('now'));

    -- ============================================================
    -- CUSTOM NUTRIENT TARGETS (user-overridden RDA values)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS custom_nutrient_targets (
      nutrient_id TEXT PRIMARY KEY,
      target_amount REAL NOT NULL,
      upper_limit REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- FOOD ITEM NUTRIENTS (extended nutrition for food items)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS food_item_nutrients (
      id TEXT PRIMARY KEY,
      food_item_id TEXT NOT NULL,
      nutrient_id TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE,
      UNIQUE (food_item_id, nutrient_id)
    );

    -- Indexes for food_item_nutrients
    CREATE INDEX IF NOT EXISTS idx_food_nutrients_food ON food_item_nutrients(food_item_id);
    CREATE INDEX IF NOT EXISTS idx_food_nutrients_nutrient ON food_item_nutrients(nutrient_id);

    -- ============================================================
    -- DAILY NUTRIENT INTAKE (aggregated daily totals)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS daily_nutrient_intake (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      nutrient_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      percent_of_target REAL NOT NULL,
      status TEXT NOT NULL,
      foods_logged INTEGER NOT NULL DEFAULT 0,
      has_complete_data INTEGER NOT NULL DEFAULT 1,
      calculated_at TEXT NOT NULL DEFAULT (datetime('now')),

      UNIQUE (date, nutrient_id)
    );

    -- Indexes for daily_nutrient_intake
    CREATE INDEX IF NOT EXISTS idx_daily_nutrients_date ON daily_nutrient_intake(date);
    CREATE INDEX IF NOT EXISTS idx_daily_nutrients_nutrient ON daily_nutrient_intake(nutrient_id);
    CREATE INDEX IF NOT EXISTS idx_daily_nutrients_status ON daily_nutrient_intake(status);

    -- ============================================================
    -- NUTRIENT CONTRIBUTORS (which foods contributed what)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS nutrient_contributors (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      log_entry_id TEXT NOT NULL,
      nutrient_id TEXT NOT NULL,
      food_name TEXT NOT NULL,
      amount REAL NOT NULL,
      percent_of_daily REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (log_entry_id) REFERENCES log_entries(id) ON DELETE CASCADE
    );

    -- Indexes for nutrient_contributors
    CREATE INDEX IF NOT EXISTS idx_contributors_date ON nutrient_contributors(date);
    CREATE INDEX IF NOT EXISTS idx_contributors_nutrient ON nutrient_contributors(nutrient_id);
    CREATE INDEX IF NOT EXISTS idx_contributors_entry ON nutrient_contributors(log_entry_id);

    -- ============================================================
    -- PROGRESS PHOTOS (privacy-first local storage)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS progress_photos (
      id TEXT PRIMARY KEY,
      local_uri TEXT NOT NULL,
      thumbnail_uri TEXT,
      date TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'front',
      notes TEXT,
      weight_kg REAL,
      is_private INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for progress_photos
    CREATE INDEX IF NOT EXISTS idx_photos_date ON progress_photos(date);
    CREATE INDEX IF NOT EXISTS idx_photos_category ON progress_photos(category);
    CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON progress_photos(timestamp DESC);

    -- ============================================================
    -- PHOTO COMPARISONS (saved comparison pairs)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS photo_comparisons (
      id TEXT PRIMARY KEY,
      photo1_id TEXT NOT NULL,
      photo2_id TEXT NOT NULL,
      comparison_type TEXT NOT NULL DEFAULT 'side_by_side',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (photo1_id) REFERENCES progress_photos(id) ON DELETE CASCADE,
      FOREIGN KEY (photo2_id) REFERENCES progress_photos(id) ON DELETE CASCADE
    );

    -- Record migration
    INSERT INTO schema_version (version) VALUES (13);
  `);
}
