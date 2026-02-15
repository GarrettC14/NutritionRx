import { useHealthKitStore } from '@/stores/healthKitStore';
import { getLastSyncTimestamp } from '@/repositories/healthSyncRepository';
import { healthKitService } from './healthKitService';
import {
  syncDailyNutritionToHealthKit,
  syncWeightToHealthKit,
  syncWaterToHealthKit,
  getWeightFromHealthKit,
  getActiveCaloriesFromHealthKit,
} from './healthKitNutritionSync';
import type {
  HealthSyncService,
  NutritionWriteParams,
  WeightWriteParams,
  WaterWriteParams,
  WeightSample,
  SyncResult,
} from '../healthSyncService';

function state() {
  return useHealthKitStore.getState();
}

export function createHealthKitSyncAdapter(): HealthSyncService {
  return {
    isAvailable: () => healthKitService.isAvailable(),
    getPlatformName: () => 'apple_health',

    connect: async () => {
      const result = await healthKitService.requestAuthorization();
      if (result.success) {
        state().setIsConnected(true);
        return { granted: ['read:apple_health', 'write:apple_health'], denied: [] };
      }
      return { granted: [], denied: ['read:apple_health', 'write:apple_health'] };
    },

    disconnect: async () => {
      state().setIsConnected(false);
    },

    isConnected: () => state().isConnected,

    writeNutrition: async (params: NutritionWriteParams): Promise<SyncResult> => {
      if (!state().isConnected || !state().syncNutrition) {
        return { success: true }; // Toggle off = no-op success
      }
      const result = await syncDailyNutritionToHealthKit({
        date: new Date(params.timestamp),
        calories: params.calories,
        protein: params.protein,
        carbs: params.carbs,
        fat: params.fat,
      });
      return { success: result.success, error: result.error };
    },

    writeWeight: async (params: WeightWriteParams): Promise<SyncResult> => {
      if (!state().isConnected || !state().writeWeight) return { success: true };
      const result = await syncWeightToHealthKit(params.weightKg, new Date(params.timestamp));
      return { success: result.success, error: result.error };
    },

    writeWater: async (params: WaterWriteParams): Promise<SyncResult> => {
      if (!state().isConnected || !state().syncWater) return { success: true };
      const result = await syncWaterToHealthKit({
        date: new Date(params.timestamp),
        milliliters: params.milliliters,
      });
      return { success: result.success, error: result.error };
    },

    readWeightChanges: async (since: string): Promise<WeightSample[]> => {
      // KNOWN LIMITATION: getWeightFromHealthKit() returns latest value only,
      // does not expose HKSource.bundleIdentifier.
      // Layers 2+3 (external ID + +/-5min window) provide sufficient dedup.
      const latest = await getWeightFromHealthKit();
      if (!latest) return [];
      if (latest.date.getTime() <= new Date(since).getTime()) return [];

      return [{
        valueKg: latest.kg,
        timestamp: latest.date.toISOString(),
        externalId: `apple_health:${latest.date.toISOString()}`,
        sourceBundle: undefined, // Not available from current native wrapper
      }];
    },

    readActiveCalories: async (start: string) => {
      return getActiveCaloriesFromHealthKit(new Date(start));
    },

    readSteps: async () => 0, // Not implemented in current HealthKit service

    getLastSyncTime: async () => {
      return getLastSyncTimestamp('apple_health', 'read', 'weight');
    },
  };
}
