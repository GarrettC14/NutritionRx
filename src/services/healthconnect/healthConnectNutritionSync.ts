/**
 * Health Connect Nutrition Sync
 * High-level sync functions for nutrition data on Android
 */

import {
  healthConnectService,
  MealSyncData,
  WaterSyncData,
  WeightData,
} from './healthConnectService';

// Types
export interface HealthConnectDailyNutrition {
  date: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
}

export interface HealthConnectWaterEntry {
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
export function getHealthConnectDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate a unique ID for a meal sync
 */
function generateMealSyncId(date: Date, mealType: string): string {
  const dateKey = getHealthConnectDateKey(date);
  return `nutritionrx-${dateKey}-${mealType.toLowerCase()}-${Date.now()}`;
}

/**
 * Sync daily nutrition totals to Health Connect
 * This syncs as a meal entry with aggregated values
 */
export async function syncDailyNutritionToHealthConnect(
  nutrition: HealthConnectDailyNutrition
): Promise<SyncResult> {
  try {
    const { date, calories, protein, carbs, fat, mealType } = nutrition;

    // Validate values
    if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) {
      return { success: false, error: 'Invalid nutrition values' };
    }

    // Skip if all values are 0
    if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
      return { success: true };
    }

    const mealData: MealSyncData = {
      id: generateMealSyncId(date, mealType || 'daily'),
      mealType: mealType || 'Snack', // Default to Snack if not specified
      timestamp: date,
      calories,
      protein,
      carbs,
      fat,
    };

    const result = await healthConnectService.syncMeal(mealData);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Couldn\'t sync nutrition right now',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing nutrition to Health Connect:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

/**
 * Sync a meal with full data to Health Connect
 */
export async function syncMealToHealthConnect(
  meal: MealSyncData
): Promise<SyncResult> {
  try {
    // Validate values
    if (
      meal.calories < 0 ||
      meal.protein < 0 ||
      meal.carbs < 0 ||
      meal.fat < 0
    ) {
      return { success: false, error: 'Invalid meal values' };
    }

    // Skip if all values are 0
    if (
      meal.calories === 0 &&
      meal.protein === 0 &&
      meal.carbs === 0 &&
      meal.fat === 0
    ) {
      return { success: true };
    }

    const result = await healthConnectService.syncMeal(meal);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Couldn\'t sync meal right now',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing meal to Health Connect:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

/**
 * Sync water intake to Health Connect
 */
export async function syncWaterToHealthConnect(
  entry: HealthConnectWaterEntry
): Promise<SyncResult> {
  try {
    const { date, milliliters } = entry;

    // Validate
    if (milliliters <= 0) {
      return { success: false, error: 'Invalid water amount' };
    }

    const waterData: WaterSyncData = {
      timestamp: date,
      volumeMl: milliliters,
    };

    const result = await healthConnectService.syncWater(waterData);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Couldn\'t sync water right now',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing water to Health Connect:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

/**
 * Sync weight to Health Connect
 */
export async function syncWeightToHealthConnect(
  weightKg: number,
  date: Date = new Date()
): Promise<SyncResult> {
  try {
    // Validate
    if (weightKg <= 0) {
      return { success: false, error: 'Invalid weight value' };
    }

    const weightData: WeightData = {
      timestamp: date,
      weightKg,
    };

    const result = await healthConnectService.syncWeight(weightData);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Couldn\'t sync weight right now',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing weight to Health Connect:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

/**
 * Get the latest weight from Health Connect
 */
export async function getWeightFromHealthConnect(): Promise<{
  kg: number;
  date: Date;
} | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    const weights = await healthConnectService.readWeightData(
      startDate,
      endDate
    );

    if (weights.length > 0) {
      // Return most recent weight
      const sorted = weights.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
      return {
        kg: sorted[0].weightKg,
        date: sorted[0].timestamp,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get weight from Health Connect:', error);
    return null;
  }
}

/**
 * Get active calories burned for a date
 */
export async function getActiveCaloriesFromHealthConnect(
  date: Date
): Promise<number> {
  try {
    return await healthConnectService.readActiveCalories(date);
  } catch (error) {
    console.error('Failed to get active calories from Health Connect:', error);
    return 0;
  }
}

/**
 * Get water intake for a date (in milliliters)
 */
export async function getWaterIntakeFromHealthConnect(
  date: Date
): Promise<number> {
  try {
    return await healthConnectService.readWaterIntake(date);
  } catch (error) {
    console.error('Failed to get water intake from Health Connect:', error);
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
