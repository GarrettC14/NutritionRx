/**
 * Unified Health Sync Hook
 * Provides a cross-platform interface for syncing health data to
 * Apple HealthKit (iOS) or Health Connect (Android)
 *
 * DEPRECATION NOTE: Store-level health sync now uses healthSyncWriteCoordinator.ts
 * and healthSyncService.ts. This hook is retained for component-level usage but
 * should be migrated to the service layer over time.
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useHealthKitStore, getDateKey } from '@/stores/healthKitStore';
import { useHealthConnectStore } from '@/stores/healthConnectStore';
import {
  syncDailyNutritionToHealthKit,
  syncWaterToHealthKit,
  syncWeightToHealthKit,
  getWeightFromHealthKit,
  getActiveCaloriesFromHealthKit,
} from '@/services/healthkit';
import {
  syncDailyNutritionToHealthConnect,
  syncWaterToHealthConnect,
  syncWeightToHealthConnect,
  getWeightFromHealthConnect,
  getActiveCaloriesFromHealthConnect,
  MealSyncData,
} from '@/services/healthconnect';
import { MealType } from '@/constants/mealTypes';

// Meal type mapping
const MEAL_TYPE_MAP: Record<MealType, 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

interface NutritionSyncData {
  date: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType?: MealType;
  mealId?: string;
}

interface SyncResult {
  success: boolean;
  error?: string;
}

export function useHealthSync() {
  // HealthKit store (iOS)
  const healthKitStore = useHealthKitStore();

  // Health Connect store (Android)
  const healthConnectStore = useHealthConnectStore();

  /**
   * Check if health sync is enabled for the current platform
   */
  const isNutritionSyncEnabled = useCallback((): boolean => {
    if (Platform.OS === 'ios') {
      return healthKitStore.isConnected && healthKitStore.syncNutrition;
    } else if (Platform.OS === 'android') {
      return healthConnectStore.status.isInitialized && healthConnectStore.syncNutritionEnabled;
    }
    return false;
  }, [
    healthKitStore.isConnected,
    healthKitStore.syncNutrition,
    healthConnectStore.status.isInitialized,
    healthConnectStore.syncNutritionEnabled,
  ]);

  /**
   * Check if water sync is enabled
   */
  const isWaterSyncEnabled = useCallback((): boolean => {
    if (Platform.OS === 'ios') {
      return healthKitStore.isConnected && healthKitStore.syncWater;
    } else if (Platform.OS === 'android') {
      return healthConnectStore.status.isInitialized && healthConnectStore.syncWaterEnabled;
    }
    return false;
  }, [
    healthKitStore.isConnected,
    healthKitStore.syncWater,
    healthConnectStore.status.isInitialized,
    healthConnectStore.syncWaterEnabled,
  ]);

  /**
   * Check if weight reading is enabled
   */
  const isWeightReadEnabled = useCallback((): boolean => {
    if (Platform.OS === 'ios') {
      return healthKitStore.isConnected && healthKitStore.readWeight;
    } else if (Platform.OS === 'android') {
      return healthConnectStore.status.isInitialized && healthConnectStore.readWeightEnabled;
    }
    return false;
  }, [
    healthKitStore.isConnected,
    healthKitStore.readWeight,
    healthConnectStore.status.isInitialized,
    healthConnectStore.readWeightEnabled,
  ]);

  /**
   * Check if activity calories adjustment is enabled
   */
  const isActivityCaloriesEnabled = useCallback((): boolean => {
    if (Platform.OS === 'ios') {
      return healthKitStore.isConnected && healthKitStore.useActivityCalories;
    } else if (Platform.OS === 'android') {
      return healthConnectStore.status.isInitialized && healthConnectStore.adjustForActivityEnabled;
    }
    return false;
  }, [
    healthKitStore.isConnected,
    healthKitStore.useActivityCalories,
    healthConnectStore.status.isInitialized,
    healthConnectStore.adjustForActivityEnabled,
  ]);

  /**
   * Sync nutrition data to health platform
   */
  const syncNutrition = useCallback(
    async (data: NutritionSyncData): Promise<SyncResult> => {
      if (!isNutritionSyncEnabled()) {
        return { success: true }; // Silent success if not enabled
      }

      try {
        if (Platform.OS === 'ios') {
          const dateKey = getDateKey(data.date);

          // Check if already synced for this date (avoid duplicates)
          if (healthKitStore.isDateSynced(dateKey)) {
            return { success: true };
          }

          const result = await syncDailyNutritionToHealthKit({
            date: data.date,
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
          });

          if (result.success) {
            healthKitStore.markDateSynced(dateKey);
          }

          return result;
        } else if (Platform.OS === 'android') {
          // For Android, sync per meal if meal type and id provided
          if (data.mealType && data.mealId) {
            const mealData: MealSyncData = {
              id: data.mealId,
              mealType: MEAL_TYPE_MAP[data.mealType],
              timestamp: data.date,
              calories: data.calories,
              protein: data.protein,
              carbs: data.carbs,
              fat: data.fat,
            };

            const success = await healthConnectStore.syncMeal(mealData);
            return { success };
          }

          // Daily totals sync
          const result = await syncDailyNutritionToHealthConnect({
            date: data.date,
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
            mealType: data.mealType ? MEAL_TYPE_MAP[data.mealType] : undefined,
          });

          return result;
        }

        return { success: false, error: 'Platform not supported' };
      } catch (error) {
        if (__DEV__) console.error('Error syncing nutrition:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Sync failed',
        };
      }
    },
    [isNutritionSyncEnabled, healthKitStore, healthConnectStore]
  );

  /**
   * Sync water intake to health platform
   */
  const syncWater = useCallback(
    async (milliliters: number, date: Date = new Date()): Promise<SyncResult> => {
      if (!isWaterSyncEnabled()) {
        return { success: true }; // Silent success if not enabled
      }

      try {
        if (Platform.OS === 'ios') {
          const result = await syncWaterToHealthKit({
            date,
            milliliters,
          });

          if (result.success) {
            const dateKey = getDateKey(date);
            healthKitStore.markWaterSynced(dateKey, milliliters);
          }

          return result;
        } else if (Platform.OS === 'android') {
          const success = await healthConnectStore.syncWater(milliliters);
          return { success };
        }

        return { success: false, error: 'Platform not supported' };
      } catch (error) {
        if (__DEV__) console.error('Error syncing water:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Sync failed',
        };
      }
    },
    [isWaterSyncEnabled, healthKitStore, healthConnectStore]
  );

  /**
   * Sync weight to health platform
   */
  const syncWeight = useCallback(
    async (weightKg: number, date: Date = new Date()): Promise<SyncResult> => {
      try {
        if (Platform.OS === 'ios') {
          if (!healthKitStore.isConnected || !healthKitStore.writeWeight) {
            return { success: true };
          }
          return await syncWeightToHealthKit(weightKg, date);
        } else if (Platform.OS === 'android') {
          if (!healthConnectStore.status.isInitialized) {
            return { success: true };
          }
          const success = await healthConnectStore.syncWeight(weightKg);
          return { success };
        }

        return { success: false, error: 'Platform not supported' };
      } catch (error) {
        if (__DEV__) console.error('Error syncing weight:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Sync failed',
        };
      }
    },
    [healthKitStore, healthConnectStore]
  );

  /**
   * Get latest weight from health platform
   */
  const getLatestWeight = useCallback(async (): Promise<{
    kg: number;
    date: Date;
  } | null> => {
    if (!isWeightReadEnabled()) {
      return null;
    }

    try {
      if (Platform.OS === 'ios') {
        return await getWeightFromHealthKit();
      } else if (Platform.OS === 'android') {
        return await healthConnectStore.fetchLatestWeight();
      }

      return null;
    } catch (error) {
      if (__DEV__) console.error('Error getting weight:', error);
      return null;
    }
  }, [isWeightReadEnabled, healthConnectStore]);

  /**
   * Get active calories for a date
   */
  const getActiveCalories = useCallback(
    async (date: Date = new Date()): Promise<number> => {
      if (!isActivityCaloriesEnabled()) {
        return 0;
      }

      try {
        if (Platform.OS === 'ios') {
          return await getActiveCaloriesFromHealthKit(date);
        } else if (Platform.OS === 'android') {
          await healthConnectStore.fetchActivityCalories();
          return healthConnectStore.todayActivityCalories;
        }

        return 0;
      } catch (error) {
        if (__DEV__) console.error('Error getting active calories:', error);
        return 0;
      }
    },
    [isActivityCaloriesEnabled, healthConnectStore]
  );

  /**
   * Get today's activity calories (cached value for Android)
   */
  const getTodayActivityCalories = useCallback((): number => {
    if (Platform.OS === 'android') {
      return healthConnectStore.todayActivityCalories;
    }
    return 0;
  }, [healthConnectStore.todayActivityCalories]);

  /**
   * Get activity calories multiplier
   */
  const getActivityCaloriesMultiplier = useCallback((): number => {
    if (Platform.OS === 'ios') {
      return healthKitStore.activityCaloriesMultiplier;
    }
    // Android uses 50% by default (same as iOS default)
    return 0.5;
  }, [healthKitStore.activityCaloriesMultiplier]);

  return {
    // Status checks
    isNutritionSyncEnabled,
    isWaterSyncEnabled,
    isWeightReadEnabled,
    isActivityCaloriesEnabled,

    // Sync functions
    syncNutrition,
    syncWater,
    syncWeight,

    // Read functions
    getLatestWeight,
    getActiveCalories,
    getTodayActivityCalories,
    getActivityCaloriesMultiplier,
  };
}
