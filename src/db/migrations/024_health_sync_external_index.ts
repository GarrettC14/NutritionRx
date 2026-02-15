import { SQLiteDatabase } from 'expo-sqlite';

export async function migration024HealthSyncExternalIndex(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_health_sync_external
      ON health_sync_log (platform, data_type, external_id);
  `);
}
