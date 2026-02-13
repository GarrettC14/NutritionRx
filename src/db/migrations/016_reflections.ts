import { SQLiteDatabase } from 'expo-sqlite';

export async function migration016Reflections(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reflected_at TEXT NOT NULL,
      weight_kg REAL NOT NULL CHECK(weight_kg >= 30 AND weight_kg <= 300),
      weight_trend_kg REAL,
      sentiment TEXT CHECK(sentiment IN ('positive', 'neutral', 'negative')),
      previous_calories INTEGER,
      previous_protein_g REAL,
      previous_carbs_g REAL,
      previous_fat_g REAL,
      new_calories INTEGER,
      new_protein_g REAL,
      new_carbs_g REAL,
      new_fat_g REAL,
      weight_change_kg REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reflections_date ON reflections(reflected_at);
  `);

  await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [16]);
}
