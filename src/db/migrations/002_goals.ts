import { SQLiteDatabase } from 'expo-sqlite';

export async function migration002Goals(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- ============================================================
    -- USER PROFILE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY DEFAULT 'singleton',

      -- Demographics
      sex TEXT,
      date_of_birth TEXT,
      height_cm REAL,

      -- Activity level
      activity_level TEXT,

      -- Onboarding state
      has_completed_onboarding INTEGER DEFAULT 0,
      onboarding_skipped INTEGER DEFAULT 0,

      -- Timestamps
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Ensure only one profile exists
    INSERT OR IGNORE INTO user_profile (id, created_at, updated_at)
    VALUES ('singleton', datetime('now'), datetime('now'));

    -- ============================================================
    -- GOALS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,

      -- Goal type
      type TEXT NOT NULL,

      -- Targets
      target_weight_kg REAL,
      target_rate_percent REAL,

      -- Starting point
      start_date TEXT NOT NULL,
      start_weight_kg REAL NOT NULL,

      -- Initial calculations (from onboarding)
      initial_tdee_estimate REAL NOT NULL,
      initial_target_calories REAL NOT NULL,
      initial_protein_g REAL NOT NULL,
      initial_carbs_g REAL NOT NULL,
      initial_fat_g REAL NOT NULL,

      -- Current targets (updated by weekly reflections)
      current_tdee_estimate REAL NOT NULL,
      current_target_calories REAL NOT NULL,
      current_protein_g REAL NOT NULL,
      current_carbs_g REAL NOT NULL,
      current_fat_g REAL NOT NULL,

      -- Status
      is_active INTEGER DEFAULT 1,
      completed_at TEXT,

      -- Timestamps
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Indexes for goals
    CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(is_active);
    CREATE INDEX IF NOT EXISTS idx_goals_start_date ON goals(start_date);

    -- ============================================================
    -- WEEKLY REFLECTIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS weekly_reflections (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,

      -- Week info
      week_number INTEGER NOT NULL,
      week_start_date TEXT NOT NULL,
      week_end_date TEXT NOT NULL,

      -- Data collected
      avg_calorie_intake REAL,
      days_logged INTEGER,
      days_weighed INTEGER,

      -- Weight trend
      start_trend_weight_kg REAL,
      end_trend_weight_kg REAL,
      weight_change_kg REAL,

      -- Metabolism calculation
      calculated_daily_burn REAL,

      -- Previous targets (for comparison)
      previous_tdee_estimate REAL,
      previous_target_calories REAL,

      -- New targets
      new_tdee_estimate REAL,
      new_target_calories REAL,
      new_protein_g REAL,
      new_carbs_g REAL,
      new_fat_g REAL,

      -- User response
      was_accepted INTEGER,
      user_notes TEXT,

      -- Data quality
      data_quality TEXT,

      -- Timestamps
      created_at TEXT NOT NULL,

      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    -- Indexes for weekly_reflections
    CREATE INDEX IF NOT EXISTS idx_reflections_goal ON weekly_reflections(goal_id);
    CREATE INDEX IF NOT EXISTS idx_reflections_week ON weekly_reflections(week_start_date);

    -- ============================================================
    -- DAILY METABOLISM
    -- ============================================================
    CREATE TABLE IF NOT EXISTS daily_metabolism (
      id TEXT PRIMARY KEY,

      date TEXT NOT NULL UNIQUE,

      -- Data points
      trend_weight_kg REAL,
      calorie_intake REAL,

      -- Calculation
      estimated_daily_burn REAL,

      -- Quality indicator
      data_quality TEXT,

      -- Timestamps
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Indexes for daily_metabolism
    CREATE INDEX IF NOT EXISTS idx_metabolism_date ON daily_metabolism(date DESC);

    -- Record migration
    INSERT INTO schema_version (version) VALUES (2);
  `);
}
