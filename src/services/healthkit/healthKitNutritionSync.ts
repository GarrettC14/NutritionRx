/**
 * HealthKit Nutrition Sync
 * High-level sync functions for nutrition data
 */

import { healthKitService } from './healthKitService';

// Types
export interface HealthKitDailyNutrition {
  date: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface HealthKitWaterEntry {
  date: Date;
  milliliters: number;
}

export interface SyncResult {
  success: boolean;
  error?: string;
}

/**
 * Get a date key in YYYY-MM-DD format for tracking synced dates
 */
export function getHealthKitDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Sync daily nutrition totals to HealthKit
 * This syncs the total for the day, not individual food entries
 */
export async function syncDailyNutritionToHealthKit(
  nutrition: HealthKitDailyNutrition
): Promise<SyncResult> {
  try {
    const { date, calories, protein, carbs, fat } = nutrition;

    // Validate values
    if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) {
      return { success: false, error: 'Invalid nutrition values' };
    }

    // Skip if all values are 0
    if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
      return { success: true };
    }

    const result = await healthKitService.saveDailyNutrition(
      date,
      calories,
      protein,
      carbs,
      fat
    );

    if (!result) {
      return { success: false, error: 'Failed to sync nutrition to HealthKit' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing nutrition to HealthKit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

/**
 * Sync water intake to HealthKit
 */
export async function syncWaterToHealthKit(
  entry: HealthKitWaterEntry
): Promise<SyncResult> {
  try {
    const { date, milliliters } = entry;

    // Validate
    if (milliliters <= 0) {
      return { success: false, error: 'Invalid water amount' };
    }

    const result = await healthKitService.saveWaterIntake(milliliters, date);

    if (!result) {
      return { success: false, error: 'Failed to sync water to HealthKit' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing water to HealthKit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

/**
 * Sync weight to HealthKit
 */
export async function syncWeightToHealthKit(
  weightKg: number,
  date: Date = new Date()
): Promise<SyncResult> {
  try {
    // Validate
    if (weightKg <= 0) {
      return { success: false, error: 'Invalid weight value' };
    }

    const result = await healthKitService.saveWeight(weightKg, date);

    if (!result) {
      return { success: false, error: 'Failed to sync weight to HealthKit' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing weight to HealthKit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

/**
 * Get the latest weight from HealthKit
 */
export async function getWeightFromHealthKit(): Promise<{
  kg: number;
  date: Date;
} | null> {
  try {
    return await healthKitService.getLatestWeight();
  } catch (error) {
    console.error('Failed to get weight from HealthKit:', error);
    return null;
  }
}

/**
 * Get active calories burned for a date
 */
export async function getActiveCaloriesFromHealthKit(date: Date): Promise<number> {
  try {
    return await healthKitService.getActiveCaloriesForDay(date);
  } catch (error) {
    console.error('Failed to get active calories from HealthKit:', error);
    return 0;
  }
}

/**
 * Calculate adjusted calorie goal based on activity
 * Adds a percentage of active calories to the base goal
 */
export function calculateAdjustedCalorieGoal(
  baseGoal: number,
  activeCalories: number,
  multiplier: number = 0.5
): number {
  return baseGoal + Math.round(activeCalories * multiplier);
}
