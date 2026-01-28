/**
 * HealthKit Services
 * Re-exports all HealthKit-related functionality
 */

export { healthKitService } from './healthKitService';
export {
  syncDailyNutritionToHealthKit,
  syncWaterToHealthKit,
  syncWeightToHealthKit,
  getWeightFromHealthKit,
  getActiveCaloriesFromHealthKit,
  getHealthKitDateKey,
  calculateAdjustedCalorieGoal,
  type HealthKitDailyNutrition,
  type HealthKitWaterEntry,
  type SyncResult,
} from './healthKitNutritionSync';
