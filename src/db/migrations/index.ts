import { SQLiteDatabase } from 'expo-sqlite';
import { migration001Initial } from './001_initial';
import { migration002Goals } from './002_goals';
import { migration003HealthSync } from './003_health_sync';
import { migration004SeedFoods } from './004_seed_foods';
import { migration005MacroTemplates } from './005_macro_templates';
import { migration006SeedMockData } from './006_seed_mock_data';
import { migration007FavoriteFoods } from './007_favorite_foods';
import { migration008LegalAcknowledgment } from './008_legal_acknowledgment';
import { migration009SeedRestaurantUSDAFoods } from './009_seed_restaurant_usda_foods';
import { migration010WaterTracking } from './010_water_tracking';
import { migration011Restaurants } from './011_restaurants';
import { migration012PlanningFeatures } from './012_planning_features';
import { migration013MicronutrientsAndPhotos } from './013_micronutrients_and_photos';

export const CURRENT_SCHEMA_VERSION = 13;

export const migrations: Array<(db: SQLiteDatabase) => Promise<void>> = [
  migration001Initial,
  migration002Goals,
  migration003HealthSync,
  migration004SeedFoods,
  migration005MacroTemplates,
  migration006SeedMockData,
  migration007FavoriteFoods,
  migration008LegalAcknowledgment,
  migration009SeedRestaurantUSDAFoods,
  migration010WaterTracking,
  migration011Restaurants,
  migration012PlanningFeatures,
  migration013MicronutrientsAndPhotos,
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
