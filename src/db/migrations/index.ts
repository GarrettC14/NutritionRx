import { SQLiteDatabase } from 'expo-sqlite';
import * as Sentry from '@sentry/react-native';
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
import { migration014UsdaFdcId } from './014_usda_fdc_id';
import { migration015GoalTimeline } from './015_goal_timeline';
import { migration016Reflections } from './016_reflections';
import { migration017TrendWeight } from './017_trend_weight';
import { migration018MicronutrientPipeline } from './018_micronutrient_pipeline';
import { migration019SearchFts } from './019_search_fts';
import { migration020UnifyTrendWeight } from './020_unify_trend_weight';
import { migration021LogEntriesMealFoodIndex } from './021_log_entries_meal_food_index';
import { migration022Recipes } from './022_recipes';

export const CURRENT_SCHEMA_VERSION = 22;

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
  migration014UsdaFdcId,
  migration015GoalTimeline,
  migration016Reflections,
  migration017TrendWeight,
  migration018MicronutrientPipeline,
  migration019SearchFts,
  migration020UnifyTrendWeight,
  migration021LogEntriesMealFoodIndex,
  migration022Recipes,
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

  if (__DEV__) {
    console.log(`Current schema version: ${currentVersion}`);
    console.log(`Target schema version: ${CURRENT_SCHEMA_VERSION}`);
  }

  // Run pending migrations
  for (let i = currentVersion; i < migrations.length; i++) {
    if (__DEV__) console.log(`Running migration ${i + 1}...`);
    try {
      await migrations[i](db);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: 'database', action: 'migration' },
        extra: { migrationNumber: i + 1, fromVersion: currentVersion, targetVersion: CURRENT_SCHEMA_VERSION },
      });
      throw error; // Re-throw — app cannot continue with a broken schema
    }
    if (__DEV__) console.log(`Migration ${i + 1} complete.`);
  }

  if (currentVersion === migrations.length) {
    if (__DEV__) console.log('Database is up to date.');
  }
}
