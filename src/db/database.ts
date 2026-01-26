import * as SQLite from 'expo-sqlite';
import { runMigrations, CURRENT_SCHEMA_VERSION } from './migrations';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  console.log('Initializing database...');
  db = await SQLite.openDatabaseAsync('nutritionrx.db');

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Run migrations
  await runMigrations(db);

  console.log('Database initialized successfully.');
  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('Database closed.');
  }
}

export async function resetDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
  await SQLite.deleteDatabaseAsync('nutritionrx.db');
  console.log('Database deleted.');
  await initDatabase();
}

// Helper function to run queries within a transaction
export async function withTransaction<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const database = getDatabase();
  let result: T;
  await database.withTransactionAsync(async () => {
    result = await fn(database);
  });
  return result!;
}
