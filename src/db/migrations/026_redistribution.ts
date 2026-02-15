import { SQLiteDatabase } from 'expo-sqlite';

export async function migration026Redistribution(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE macro_cycle_config
      ADD COLUMN locked_days TEXT NOT NULL DEFAULT '[]';
  `);
  await db.execAsync(`
    ALTER TABLE macro_cycle_config
      ADD COLUMN redistribution_start_day INTEGER NOT NULL DEFAULT 0;
  `);
}
