import { SQLiteDatabase } from 'expo-sqlite';

export async function migration025ExperienceLevel(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE user_profile ADD COLUMN experience_level TEXT DEFAULT NULL;
  `);

  await db.runAsync(
    `INSERT OR REPLACE INTO schema_version (version, migrated_at) VALUES (?, ?)`,
    [25, new Date().toISOString()]
  );
}
