import { SQLiteDatabase } from 'expo-sqlite';

export async function migration010WaterTracking(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- ============================================================
    -- WATER TRACKING
    -- ============================================================

    -- Water log entries table
    CREATE TABLE IF NOT EXISTS water_log (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      glasses INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date)
    );

    CREATE INDEX IF NOT EXISTS idx_water_log_date ON water_log(date);

    -- Record migration
    INSERT INTO schema_version (version) VALUES (10);
  `);
}
