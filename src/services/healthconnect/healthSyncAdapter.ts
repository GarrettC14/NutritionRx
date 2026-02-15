import { useHealthConnectStore } from '@/stores/healthConnectStore';
import { healthConnectService } from './healthConnectService';
import { getLastSyncTimestamp } from '@/repositories/healthSyncRepository';
import {
  syncMealToHealthConnect,
  syncWaterToHealthConnect,
  syncWeightToHealthConnect,
  getActiveCaloriesFromHealthConnect,
} from './healthConnectNutritionSync';
import type {
  HealthSyncService,
  NutritionWriteParams,
  WeightWriteParams,
  WaterWriteParams,
  WeightSample,
  SyncResult,
} from '../healthSyncService';

function state() {
  return useHealthConnectStore.getState();
}

const MEAL_TYPE_MAP: Record<string, 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function createHealthConnectSyncAdapter(): HealthSyncService {
  return {
    isAvailable: async () => {
      const status = await healthConnectService.checkAvailability();
      return status.isAvailable;
    },

    getPlatformName: () => 'health_connect',

    connect: async () => {
      const granted = await state().initializeAndRequestPermissions();
      return granted
        ? { granted: ['read:HealthConnect', 'write:HealthConnect'], denied: [] }
        : { granted: [], denied: ['read:HealthConnect', 'write:HealthConnect'] };
    },

    disconnect: async () => {
      state().reset();
    },

    isConnected: () => state().status.isInitialized,

    writeNutrition: async (params: NutritionWriteParams): Promise<SyncResult> => {
      if (!state().status.isInitialized || !state().syncNutritionEnabled) {
        return { success: true };
      }
      const result = await syncMealToHealthConnect({
        id: params.localRecordId,
        mealType: MEAL_TYPE_MAP[params.mealType ?? 'snack'] || 'Snack',
        timestamp: new Date(params.timestamp),
        calories: params.calories,
        protein: params.protein,
        carbs: params.carbs,
        fat: params.fat,
      });
      return {
        success: result.success,
        externalId: `${params.localRecordId}:${params.timestamp}`,
        error: result.error,
      };
    },

    writeWeight: async (params: WeightWriteParams): Promise<SyncResult> => {
      if (!state().status.isInitialized) return { success: true };
      const result = await syncWeightToHealthConnect(params.weightKg, new Date(params.timestamp));
      return { success: result.success, error: result.error };
    },

    writeWater: async (params: WaterWriteParams): Promise<SyncResult> => {
      if (!state().status.isInitialized || !state().syncWaterEnabled) return { success: true };
      const result = await syncWaterToHealthConnect({
        date: new Date(params.timestamp),
        milliliters: params.milliliters,
      });
      return { success: result.success, error: result.error };
    },

    readWeightChanges: async (since: string): Promise<WeightSample[]> => {
      // readWeightData returns { timestamp, weightKg } only — no external ID or source
      const startDate = new Date(since);
      const endDate = new Date();
      const records = await healthConnectService.readWeightData(startDate, endDate);

      return records.map((record: { timestamp: string | Date; weightKg: number }) => ({
        valueKg: Number(record.weightKg),
        timestamp: new Date(record.timestamp).toISOString(),
        externalId: `healthconnect:${new Date(record.timestamp).toISOString()}`,
        sourceBundle: undefined, // Not available from readWeightData
      }));
    },

    readActiveCalories: async (start: string) => {
      return getActiveCaloriesFromHealthConnect(new Date(start));
    },

    readSteps: async () => 0, // Not implemented in current HC service

    getLastSyncTime: async () => {
      return getLastSyncTimestamp('health_connect', 'read', 'weight');
    },
  };
}
