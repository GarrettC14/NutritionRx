import { getDatabase } from '@/db/database';
import { SeedOptions, SeedProgress, SeedResult, DEFAULT_SEED_OPTIONS } from './types';
import { clearAllData } from './clearDatabase';

// Generator imports
import { seedProfile, seedUserSettings, seedGoals } from './generators/profileGenerator';
import { seedWeightEntries, seedDailyMetabolism } from './generators/weightGenerator';
import { seedLogEntries, seedQuickAddEntries } from './generators/foodLogGenerator';
import { seedWaterLog } from './generators/waterGenerator';
import { seedFastingConfig, seedFastingSessions } from './generators/fastingGenerator';
import { seedMealPlanSettings, seedPlannedMeals } from './generators/mealPlanGenerator';
import { seedMacroCycleConfig, seedMacroCycleOverrides } from './generators/macroCycleGenerator';
import { seedRestaurantFoodLogs, seedUserRestaurantUsage } from './generators/restaurantLogGenerator';
import { seedFavoriteFoods } from './generators/favoriteGenerator';
import {
  seedNutrientSettings,
  seedFoodItemNutrients,
  seedDailyNutrientIntake,
  seedNutrientContributors,
} from './generators/micronutrientGenerator';
import { seedProgressPhotos, seedPhotoComparisons } from './generators/progressPhotoGenerator';
import { seedWeeklyReflections, seedHealthSyncLog } from './generators/reflectionGenerator';

type ProgressCallback = (progress: SeedProgress) => void;

interface SeedStep {
  name: string;
  estimatedCount: (months: number) => number;
  run: (
    db: any,
    options: SeedOptions,
    context: SeedContext
  ) => Promise<number>;
}

interface SeedContext {
  activeGoalId: string;
}

function buildSeedSteps(): SeedStep[] {
  return [
    {
      name: 'User Profile',
      estimatedCount: () => 1,
      run: async (db, opts) => seedProfile(db, opts.verboseLogging),
    },
    {
      name: 'User Settings',
      estimatedCount: () => 7,
      run: async (db, opts) => seedUserSettings(db, opts.verboseLogging),
    },
    {
      name: 'Goals',
      estimatedCount: () => 2,
      run: async (db, opts, ctx) => {
        const result = await seedGoals(db, opts.verboseLogging);
        ctx.activeGoalId = result.activeGoalId;
        return result.count;
      },
    },
    {
      name: 'Weight Entries',
      estimatedCount: (months) => Math.round(months * 30 * 0.85),
      run: async (db, opts) =>
        seedWeightEntries(db, opts.monthsOfHistory, opts.includeEdgeCases, opts.verboseLogging),
    },
    {
      name: 'Daily Metabolism',
      estimatedCount: (months) => Math.round(months * 30 * 0.8),
      run: async (db, opts) => seedDailyMetabolism(db, opts.monthsOfHistory, opts.verboseLogging),
    },
    {
      name: 'Weekly Reflections',
      estimatedCount: (months) => Math.round(months * 4.3),
      run: async (db, opts, ctx) =>
        seedWeeklyReflections(db, ctx.activeGoalId, opts.monthsOfHistory, opts.verboseLogging),
    },
    {
      name: 'Food Log Entries',
      estimatedCount: (months) => Math.round(months * 30 * 0.9 * 4),
      run: async (db, opts) =>
        seedLogEntries(db, opts.monthsOfHistory, opts.includeEdgeCases, opts.verboseLogging),
    },
    {
      name: 'Quick Add Entries',
      estimatedCount: (months) => Math.round(months * 5),
      run: async (db, opts) =>
        seedQuickAddEntries(db, opts.monthsOfHistory, opts.includeEdgeCases, opts.verboseLogging),
    },
    {
      name: 'Water Log',
      estimatedCount: (months) => Math.round(months * 30 * 0.9),
      run: async (db, opts) => seedWaterLog(db, opts.monthsOfHistory, opts.verboseLogging),
    },
    {
      name: 'Favorite Foods',
      estimatedCount: () => 10,
      run: async (db, opts) => seedFavoriteFoods(db, opts.verboseLogging),
    },
    {
      name: 'Fasting Config',
      estimatedCount: () => 1,
      run: async (db, opts) => seedFastingConfig(db, opts.verboseLogging),
    },
    {
      name: 'Fasting Sessions',
      estimatedCount: (months) => Math.round(months * 4.3 * 3),
      run: async (db, opts) => seedFastingSessions(db, opts.monthsOfHistory, opts.verboseLogging),
    },
    {
      name: 'Macro Cycle Config',
      estimatedCount: () => 1,
      run: async (db, opts) => seedMacroCycleConfig(db, opts.verboseLogging),
    },
    {
      name: 'Macro Cycle Overrides',
      estimatedCount: (months) => Math.round(months * 2),
      run: async (db, opts) =>
        seedMacroCycleOverrides(db, opts.monthsOfHistory, opts.verboseLogging),
    },
    {
      name: 'Meal Plan Settings',
      estimatedCount: () => 1,
      run: async (db, opts) => seedMealPlanSettings(db, opts.verboseLogging),
    },
    {
      name: 'Planned Meals',
      estimatedCount: (months) => Math.round(months * 4.3 * 0.5 * 4 * 3),
      run: async (db, opts) => seedPlannedMeals(db, opts.monthsOfHistory, opts.verboseLogging),
    },
    {
      name: 'Restaurant Food Logs',
      estimatedCount: (months) => Math.round(months * 30 * 0.2),
      run: async (db, opts) =>
        seedRestaurantFoodLogs(db, opts.monthsOfHistory, opts.verboseLogging),
    },
    {
      name: 'Restaurant Usage',
      estimatedCount: () => 5,
      run: async (db, opts) => seedUserRestaurantUsage(db, opts.verboseLogging),
    },
    {
      name: 'Nutrient Settings',
      estimatedCount: () => 1,
      run: async (db, opts) => seedNutrientSettings(db, opts.verboseLogging),
    },
    {
      name: 'Food Item Nutrients',
      estimatedCount: () => 200,
      run: async (db, opts) => seedFoodItemNutrients(db, opts.verboseLogging),
    },
    {
      name: 'Daily Nutrient Intake',
      estimatedCount: (months) => Math.round(months * 30 * 0.4 * 6),
      run: async (db, opts) =>
        seedDailyNutrientIntake(db, opts.monthsOfHistory, opts.verboseLogging),
    },
    {
      name: 'Nutrient Contributors',
      estimatedCount: () => 100,
      run: async (db, opts) => seedNutrientContributors(db, opts.verboseLogging),
    },
    {
      name: 'Progress Photos',
      estimatedCount: (months) => months * 2,
      run: async (db, opts) =>
        seedProgressPhotos(db, opts.monthsOfHistory, opts.verboseLogging),
    },
    {
      name: 'Photo Comparisons',
      estimatedCount: () => 4,
      run: async (db, opts) => seedPhotoComparisons(db, opts.verboseLogging),
    },
    {
      name: 'Health Sync Log',
      estimatedCount: () => 11,
      run: async (db, opts) => seedHealthSyncLog(db, opts.verboseLogging),
    },
  ];
}

export async function seedDatabase(
  options: Partial<SeedOptions> = {},
  onProgress?: ProgressCallback
): Promise<SeedResult> {
  const opts: SeedOptions = { ...DEFAULT_SEED_OPTIONS, ...options };
  const startTime = Date.now();
  const counts: Record<string, number> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  const db = getDatabase();
  const steps = buildSeedSteps();
  const context: SeedContext = { activeGoalId: '' };

  try {
    // Phase 1: Clear existing data
    if (opts.clearExisting) {
      onProgress?.({
        currentEntity: 'Clearing data',
        currentCount: 0,
        totalCount: 0,
        phase: 'Clearing...',
        startedAt: startTime,
      });

      await clearAllData(db, opts.verboseLogging);
    }

    // Phase 2: Seed each entity group
    const totalEstimated = steps.reduce(
      (sum, step) => sum + step.estimatedCount(opts.monthsOfHistory),
      0
    );
    let runningCount = 0;

    for (const step of steps) {
      const estimated = step.estimatedCount(opts.monthsOfHistory);

      onProgress?.({
        currentEntity: step.name,
        currentCount: runningCount,
        totalCount: totalEstimated,
        phase: 'Seeding...',
        startedAt: startTime,
      });

      try {
        const count = await step.run(db, opts, context);
        counts[step.name] = count;
        runningCount += count;
      } catch (error) {
        const message = `Failed to seed ${step.name}: ${error}`;
        errors.push(message);
        console.error(message);
      }
    }

    // Phase 3: Complete
    onProgress?.({
      currentEntity: 'Complete',
      currentCount: runningCount,
      totalCount: runningCount,
      phase: 'Complete',
      startedAt: startTime,
    });

    return {
      success: errors.length === 0,
      duration: Date.now() - startTime,
      counts,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      counts,
      errors: [`Fatal error: ${error}`],
      warnings,
    };
  }
}
