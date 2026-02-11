import { SQLiteDatabase } from 'expo-sqlite';

export async function migration018MicronutrientPipeline(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE food_item_nutrients ADD COLUMN unit TEXT NOT NULL DEFAULT 'mg';
    ALTER TABLE food_item_nutrients ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown';

    INSERT INTO schema_version (version) VALUES (18);
  `);
}
