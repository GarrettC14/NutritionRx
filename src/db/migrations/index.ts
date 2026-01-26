import { SQLiteDatabase } from 'expo-sqlite';
import { migration001Initial } from './001_initial';
import { migration002Goals } from './002_goals';
import { migration003HealthSync } from './003_health_sync';

export const CURRENT_SCHEMA_VERSION = 3;

export const migrations: Array<(db: SQLiteDatabase) => Promise<void>> = [
  migration001Initial,
  migration002Goals,
  migration003HealthSync,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Get current schema version
  let currentVersion = 0;

  try {
    const result = await db.getFirstAsync<{ version: number }>(
      'SELECT MAX(version) as version FROM schema_version'
    );
    currentVersion = result?.version ?? 0;
  } catch {
    // Table doesn't exist yet, that's fine
    currentVersion = 0;
  }

  console.log(`Current schema version: ${currentVersion}`);
  console.log(`Target schema version: ${CURRENT_SCHEMA_VERSION}`);

  // Run pending migrations
  for (let i = currentVersion; i < migrations.length; i++) {
    console.log(`Running migration ${i + 1}...`);
    await migrations[i](db);
    console.log(`Migration ${i + 1} complete.`);
  }

  if (currentVersion === migrations.length) {
    console.log('Database is up to date.');
  }
}
