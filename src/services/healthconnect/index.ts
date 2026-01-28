/**
 * Health Connect Services
 * Re-exports all Health Connect-related functionality for Android
 */

export {
  healthConnectService,
  type HealthConnectStatus,
  type MealSyncData,
  type WaterSyncData,
  type WeightData,
} from './healthConnectService';

export {
  syncDailyNutritionToHealthConnect,
  syncMealToHealthConnect,
  syncWaterToHealthConnect,
  syncWeightToHealthConnect,
  getWeightFromHealthConnect,
  getActiveCaloriesFromHealthConnect,
  getWaterIntakeFromHealthConnect,
  getHealthConnectDateKey,
  calculateAdjustedCalorieGoal,
  type HealthConnectDailyNutrition,
  type HealthConnectWaterEntry,
  type SyncResult,
} from './healthConnectNutritionSync';
