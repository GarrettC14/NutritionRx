import { SQLiteDatabase } from 'expo-sqlite';

export async function migration021LogEntriesMealFoodIndex(
  db: SQLiteDatabase
): Promise<void> {
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_log_entries_meal_food
      ON log_entries(meal_type, food_item_id);
  `);

  await db.runAsync('INSERT INTO schema_version (version) VALUES (21)');
}
