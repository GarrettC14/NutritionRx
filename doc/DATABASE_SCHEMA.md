# NutritionRx Database Schema

## Overview

This document defines the complete SQLite database schema for NutritionRx. All tables, indexes, and migrations are specified here for direct implementation.

**Database:** SQLite via `expo-sqlite`
**Naming Convention:** snake_case for tables and columns
**Primary Keys:** UUID strings (generated with `uuid` package)
**Timestamps:** ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`)
**Booleans:** INTEGER (0 = false, 1 = true)

---

## Migration Strategy

Migrations run sequentially on app launch. Each migration has a version number stored in a `schema_version` table.

```typescript
// db/migrations/index.ts
export const CURRENT_SCHEMA_VERSION = 3;

export const migrations = [
  migration001_initial,
  migration002_goals,
  migration003_health_sync,
];
```

---

## Migration 001: Initial Schema

**Version:** 1
**Description:** Core tables for food tracking

```sql
-- ============================================================
-- MIGRATION 001: Initial Schema
-- ============================================================

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- FOOD ITEMS
-- ============================================================
-- Stores all food items (from API, user-created, or seeded)

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
  source TEXT NOT NULL,  -- 'open_food_facts', 'usda', 'user', 'seed'
  source_id TEXT,        -- External ID from source
  
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
-- Individual food items logged to a specific meal/date

CREATE TABLE IF NOT EXISTS log_entries (
  id TEXT PRIMARY KEY,
  food_item_id TEXT NOT NULL,
  
  -- When/what meal
  date TEXT NOT NULL,      -- YYYY-MM-DD format
  meal_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
  
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
-- For logging calories without selecting a specific food

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
-- Daily weight log

CREATE TABLE IF NOT EXISTS weight_entries (
  id TEXT PRIMARY KEY,
  
  date TEXT NOT NULL UNIQUE,  -- Only one entry per day
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
-- Key-value store for app settings

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
```

---

## Migration 002: Goals & Adaptive System

**Version:** 2
**Description:** Tables for goals, user profile, and weekly reflections

```sql
-- ============================================================
-- MIGRATION 002: Goals & Adaptive System
-- ============================================================

-- ============================================================
-- USER PROFILE
-- ============================================================
-- Singleton table for user's body stats (used for TDEE calculation)

CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  
  -- Demographics
  sex TEXT,  -- 'male', 'female'
  date_of_birth TEXT,  -- YYYY-MM-DD
  height_cm REAL,
  
  -- Activity level
  activity_level TEXT,  -- 'sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'
  
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
-- User's weight/nutrition goals

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  
  -- Goal type
  type TEXT NOT NULL,  -- 'lose', 'maintain', 'gain'
  
  -- Targets
  target_weight_kg REAL,           -- Optional goal weight
  target_rate_percent REAL,        -- % of bodyweight per week (0.25, 0.5, 0.75, 1.0)
  
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
  is_active INTEGER DEFAULT 1,  -- Only one active goal at a time
  completed_at TEXT,            -- When goal was achieved or abandoned
  
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
-- Weekly summary and target adjustments

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
  was_accepted INTEGER,  -- Did user accept the new targets?
  user_notes TEXT,
  
  -- Data quality
  data_quality TEXT,  -- 'good', 'partial', 'insufficient'
  
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
-- Daily computed values for metabolism tracking

CREATE TABLE IF NOT EXISTS daily_metabolism (
  id TEXT PRIMARY KEY,
  
  date TEXT NOT NULL UNIQUE,
  
  -- Data points
  trend_weight_kg REAL,     -- Smoothed weight
  calorie_intake REAL,      -- Total logged calories
  
  -- Calculation
  estimated_daily_burn REAL,
  
  -- Quality indicator
  data_quality TEXT,  -- 'good', 'partial', 'insufficient'
  
  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for daily_metabolism
CREATE INDEX IF NOT EXISTS idx_metabolism_date ON daily_metabolism(date DESC);

-- Record migration
INSERT INTO schema_version (version) VALUES (2);
```

---

## Migration 003: Health Sync & Backup

**Version:** 3
**Description:** Tables for Apple Health / Health Connect sync and backup metadata

```sql
-- ============================================================
-- MIGRATION 003: Health Sync & Backup
-- ============================================================

-- ============================================================
-- HEALTH SYNC LOG
-- ============================================================
-- Track what's been synced to/from Apple Health / Health Connect

CREATE TABLE IF NOT EXISTS health_sync_log (
  id TEXT PRIMARY KEY,
  
  -- Sync info
  platform TEXT NOT NULL,      -- 'apple_health', 'health_connect'
  direction TEXT NOT NULL,     -- 'read', 'write'
  data_type TEXT NOT NULL,     -- 'weight', 'nutrition', 'water'
  
  -- Reference to local data
  local_record_id TEXT,
  local_record_type TEXT,      -- 'weight_entries', 'log_entries', etc.
  
  -- External reference
  external_id TEXT,            -- ID from health platform
  
  -- Status
  status TEXT NOT NULL,        -- 'pending', 'success', 'failed'
  error_message TEXT,
  
  -- Timestamps
  synced_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Indexes for health_sync_log
CREATE INDEX IF NOT EXISTS idx_sync_status ON health_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_local ON health_sync_log(local_record_id, local_record_type);

-- ============================================================
-- BACKUP METADATA
-- ============================================================
-- Track local backups

CREATE TABLE IF NOT EXISTS backup_metadata (
  id TEXT PRIMARY KEY,
  
  -- Backup info
  filename TEXT NOT NULL,
  file_size_bytes INTEGER,
  
  -- Content
  records_count INTEGER,
  date_range_start TEXT,
  date_range_end TEXT,
  
  -- Timestamps
  created_at TEXT NOT NULL
);

-- Record migration
INSERT INTO schema_version (version) VALUES (3);
```

---

## TypeScript Types (Domain → Database Mapping)

```typescript
// types/database.ts

// ============================================================
// Database Row Types (match SQLite columns exactly)
// ============================================================

export interface FoodItemRow {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  serving_size: number;
  serving_unit: string;
  serving_size_grams: number | null;
  source: 'open_food_facts' | 'usda' | 'user' | 'seed';
  source_id: string | null;
  is_verified: number; // 0 or 1
  is_user_created: number; // 0 or 1
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface LogEntryRow {
  id: string;
  food_item_id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuickAddEntryRow {
  id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeightEntryRow {
  id: string;
  date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileRow {
  id: string;
  sex: 'male' | 'female' | null;
  date_of_birth: string | null;
  height_cm: number | null;
  activity_level: string | null;
  has_completed_onboarding: number;
  onboarding_skipped: number;
  created_at: string;
  updated_at: string;
}

export interface GoalRow {
  id: string;
  type: 'lose' | 'maintain' | 'gain';
  target_weight_kg: number | null;
  target_rate_percent: number;
  start_date: string;
  start_weight_kg: number;
  initial_tdee_estimate: number;
  initial_target_calories: number;
  initial_protein_g: number;
  initial_carbs_g: number;
  initial_fat_g: number;
  current_tdee_estimate: number;
  current_target_calories: number;
  current_protein_g: number;
  current_carbs_g: number;
  current_fat_g: number;
  is_active: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReflectionRow {
  id: string;
  goal_id: string;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  avg_calorie_intake: number | null;
  days_logged: number | null;
  days_weighed: number | null;
  start_trend_weight_kg: number | null;
  end_trend_weight_kg: number | null;
  weight_change_kg: number | null;
  calculated_daily_burn: number | null;
  previous_tdee_estimate: number | null;
  previous_target_calories: number | null;
  new_tdee_estimate: number | null;
  new_target_calories: number | null;
  new_protein_g: number | null;
  new_carbs_g: number | null;
  new_fat_g: number | null;
  was_accepted: number | null;
  user_notes: string | null;
  data_quality: 'good' | 'partial' | 'insufficient' | null;
  created_at: string;
}

export interface DailyMetabolismRow {
  id: string;
  date: string;
  trend_weight_kg: number | null;
  calorie_intake: number | null;
  estimated_daily_burn: number | null;
  data_quality: 'good' | 'partial' | 'insufficient' | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Row → Domain Mappers
// ============================================================

export function mapFoodItemRowToDomain(row: FoodItemRow): FoodItem {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? undefined,
    barcode: row.barcode ?? undefined,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber ?? undefined,
    sugar: row.sugar ?? undefined,
    sodium: row.sodium ?? undefined,
    servingSize: row.serving_size,
    servingUnit: row.serving_unit,
    servingSizeGrams: row.serving_size_grams ?? undefined,
    source: row.source,
    sourceId: row.source_id ?? undefined,
    isVerified: row.is_verified === 1,
    isUserCreated: row.is_user_created === 1,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
    usageCount: row.usage_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Add similar mappers for other entities...
```

---

## Common Queries

```typescript
// repositories/queries.ts

export const QUERIES = {
  // ============================================================
  // Food Items
  // ============================================================
  
  SEARCH_FOODS: `
    SELECT * FROM food_items 
    WHERE name LIKE ? COLLATE NOCASE 
       OR brand LIKE ? COLLATE NOCASE
    ORDER BY usage_count DESC, name ASC
    LIMIT ?
  `,
  
  GET_FOOD_BY_BARCODE: `
    SELECT * FROM food_items WHERE barcode = ?
  `,
  
  GET_RECENT_FOODS: `
    SELECT * FROM food_items 
    WHERE last_used_at IS NOT NULL
    ORDER BY last_used_at DESC
    LIMIT ?
  `,
  
  UPDATE_FOOD_USAGE: `
    UPDATE food_items 
    SET last_used_at = ?, usage_count = usage_count + 1, updated_at = ?
    WHERE id = ?
  `,
  
  // ============================================================
  // Log Entries
  // ============================================================
  
  GET_ENTRIES_FOR_DATE: `
    SELECT le.*, fi.name as food_name, fi.brand as food_brand
    FROM log_entries le
    JOIN food_items fi ON le.food_item_id = fi.id
    WHERE le.date = ?
    ORDER BY le.meal_type, le.created_at
  `,
  
  GET_DAILY_TOTALS: `
    SELECT 
      COALESCE(SUM(calories), 0) as total_calories,
      COALESCE(SUM(protein), 0) as total_protein,
      COALESCE(SUM(carbs), 0) as total_carbs,
      COALESCE(SUM(fat), 0) as total_fat
    FROM (
      SELECT calories, protein, carbs, fat FROM log_entries WHERE date = ?
      UNION ALL
      SELECT calories, protein, carbs, fat FROM quick_add_entries WHERE date = ?
    )
  `,
  
  GET_ENTRIES_FOR_DATE_RANGE: `
    SELECT date, SUM(calories) as total_calories
    FROM (
      SELECT date, calories FROM log_entries WHERE date BETWEEN ? AND ?
      UNION ALL
      SELECT date, calories FROM quick_add_entries WHERE date BETWEEN ? AND ?
    )
    GROUP BY date
    ORDER BY date
  `,
  
  // ============================================================
  // Weight Entries
  // ============================================================
  
  GET_WEIGHT_FOR_DATE: `
    SELECT * FROM weight_entries WHERE date = ?
  `,
  
  GET_WEIGHT_HISTORY: `
    SELECT * FROM weight_entries 
    ORDER BY date DESC
    LIMIT ?
  `,
  
  GET_WEIGHT_FOR_DATE_RANGE: `
    SELECT * FROM weight_entries 
    WHERE date BETWEEN ? AND ?
    ORDER BY date ASC
  `,
  
  // ============================================================
  // Goals & Profile
  // ============================================================
  
  GET_ACTIVE_GOAL: `
    SELECT * FROM goals WHERE is_active = 1 LIMIT 1
  `,
  
  GET_USER_PROFILE: `
    SELECT * FROM user_profile WHERE id = 'singleton'
  `,
  
  GET_WEEKLY_REFLECTIONS: `
    SELECT * FROM weekly_reflections 
    WHERE goal_id = ?
    ORDER BY week_number DESC
    LIMIT ?
  `,
  
  // ============================================================
  // Daily Summary (for weekly calculations)
  // ============================================================
  
  GET_DAILY_CALORIES_FOR_RANGE: `
    SELECT date, SUM(calories) as total_calories, COUNT(*) as entry_count
    FROM (
      SELECT date, calories FROM log_entries WHERE date BETWEEN ? AND ?
      UNION ALL
      SELECT date, calories FROM quick_add_entries WHERE date BETWEEN ? AND ?
    )
    GROUP BY date
  `,
  
  GET_DAYS_LOGGED_IN_RANGE: `
    SELECT COUNT(DISTINCT date) as days_logged
    FROM (
      SELECT date FROM log_entries WHERE date BETWEEN ? AND ?
      UNION ALL
      SELECT date FROM quick_add_entries WHERE date BETWEEN ? AND ?
    )
  `,
  
  GET_DAYS_WEIGHED_IN_RANGE: `
    SELECT COUNT(*) as days_weighed
    FROM weight_entries
    WHERE date BETWEEN ? AND ?
  `,
};
```

---

## Database Initialization

```typescript
// db/database.ts

import * as SQLite from 'expo-sqlite';
import { migrations, CURRENT_SCHEMA_VERSION } from './migrations';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync('nutritionrx.db');
  
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  // Run migrations
  await runMigrations(db);
  
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Get current schema version
  let currentVersion = 0;
  
  try {
    const result = await database.getFirstAsync<{ version: number }>(
      'SELECT MAX(version) as version FROM schema_version'
    );
    currentVersion = result?.version ?? 0;
  } catch {
    // Table doesn't exist yet, that's fine
    currentVersion = 0;
  }
  
  // Run pending migrations
  for (let i = currentVersion; i < migrations.length; i++) {
    console.log(`Running migration ${i + 1}...`);
    await migrations[i](database);
    console.log(`Migration ${i + 1} complete.`);
  }
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial schema specification |
