import { SQLiteDatabase } from 'expo-sqlite';

export async function migration003HealthSync(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- ============================================================
    -- HEALTH SYNC LOG
    -- ============================================================
    CREATE TABLE IF NOT EXISTS health_sync_log (
      id TEXT PRIMARY KEY,

      -- Sync info
      platform TEXT NOT NULL,
      direction TEXT NOT NULL,
      data_type TEXT NOT NULL,

      -- Reference to local data
      local_record_id TEXT,
      local_record_type TEXT,

      -- External reference
      external_id TEXT,

      -- Status
      status TEXT NOT NULL,
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
  `);
}
