import { SQLiteDatabase } from 'expo-sqlite';

export async function migration012PlanningFeatures(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- ============================================================
    -- MACRO CYCLING
    -- ============================================================

    -- Macro cycle configuration
    CREATE TABLE IF NOT EXISTS macro_cycle_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 0,
      pattern_type TEXT NOT NULL DEFAULT 'training_rest',
      marked_days TEXT NOT NULL DEFAULT '[]',
      day_targets TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_modified TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Daily target overrides (for manual overrides on specific days)
    CREATE TABLE IF NOT EXISTS macro_cycle_overrides (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      calories INTEGER NOT NULL,
      protein INTEGER NOT NULL,
      carbs INTEGER NOT NULL,
      fat INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_macro_cycle_overrides_date ON macro_cycle_overrides(date);

    -- ============================================================
    -- FASTING TIMER
    -- ============================================================

    -- Fasting configuration
    CREATE TABLE IF NOT EXISTS fasting_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 0,
      protocol TEXT NOT NULL DEFAULT '16:8',
      custom_fast_hours INTEGER,
      typical_eat_start TEXT NOT NULL DEFAULT '12:00',
      typical_eat_end TEXT NOT NULL DEFAULT '20:00',
      notify_window_opens INTEGER NOT NULL DEFAULT 1,
      notify_window_closes_soon INTEGER NOT NULL DEFAULT 1,
      notify_closes_reminder_mins INTEGER NOT NULL DEFAULT 30,
      notify_fast_complete INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_modified TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Fasting sessions (each fast is a session)
    CREATE TABLE IF NOT EXISTS fasting_sessions (
      id TEXT PRIMARY KEY,
      start_time TEXT NOT NULL,
      end_time TEXT,
      target_hours INTEGER NOT NULL,
      actual_hours REAL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_fasting_sessions_start ON fasting_sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_fasting_sessions_status ON fasting_sessions(status);

    -- ============================================================
    -- MEAL PLANNING
    -- ============================================================

    -- Meal planning settings
    CREATE TABLE IF NOT EXISTS meal_plan_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 0,
      show_on_today INTEGER NOT NULL DEFAULT 1,
      reminder_time TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_modified TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Planned meals
    CREATE TABLE IF NOT EXISTS planned_meals (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal_slot TEXT NOT NULL,
      food_id TEXT NOT NULL,
      food_name TEXT NOT NULL,
      servings REAL NOT NULL DEFAULT 1,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      logged_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_planned_meals_date ON planned_meals(date);
    CREATE INDEX IF NOT EXISTS idx_planned_meals_status ON planned_meals(status);
    CREATE INDEX IF NOT EXISTS idx_planned_meals_date_slot ON planned_meals(date, meal_slot);

    -- Record migration
    INSERT INTO schema_version (version) VALUES (12);
  `);
}
