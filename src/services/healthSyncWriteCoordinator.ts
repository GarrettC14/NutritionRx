import { logHealthSync } from '@/repositories/healthSyncRepository';
import {
  getHealthSyncService,
  NutritionWriteParams,
  WaterWriteParams,
  WeightWriteParams,
} from './healthSyncService';

function safeExecute(
  prefix: string,
  fn: () => Promise<{ success: boolean; error?: string; externalId?: string }>
): Promise<{ success: boolean; error?: string; externalId?: string }> {
  return fn().catch((error) => ({
    success: false,
    error: error instanceof Error ? error.message : `${prefix} sync failed`,
  }));
}

export async function syncNutritionToHealthPlatform(params: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType?: string;
  timestamp: string;
  localRecordId: string;
  localRecordType: 'log_entry' | 'quick_add_entry';
}): Promise<void> {
  const service = getHealthSyncService();
  if (!service?.isConnected()) return;

  const payload: NutritionWriteParams = {
    calories: params.calories,
    protein: params.protein,
    carbs: params.carbs,
    fat: params.fat,
    mealType: params.mealType,
    timestamp: params.timestamp,
    localRecordId: params.localRecordId,
    localRecordType: params.localRecordType,
  };

  const result = await safeExecute('nutrition', () => service.writeNutrition(payload));

  await logHealthSync({
    platform: service.getPlatformName(),
    direction: 'write',
    data_type: 'nutrition',
    local_record_id: params.localRecordId,
    local_record_type: params.localRecordType,
    external_id: result.externalId ?? null,
    status: result.success ? 'success' : 'error',
    error_message: result.error ?? null,
  });
}

export async function syncWeightToHealthPlatform(params: {
  weightKg: number;
  timestamp: string;
  localRecordId: string;
  localRecordType: 'weight_entry';
}): Promise<void> {
  const service = getHealthSyncService();
  if (!service?.isConnected()) return;

  const payload: WeightWriteParams = {
    weightKg: params.weightKg,
    timestamp: params.timestamp,
    localRecordId: params.localRecordId,
    localRecordType: params.localRecordType,
  };

  const result = await safeExecute('weight', () => service.writeWeight(payload));

  await logHealthSync({
    platform: service.getPlatformName(),
    direction: 'write',
    data_type: 'weight',
    local_record_id: params.localRecordId,
    local_record_type: params.localRecordType,
    external_id: result.externalId ?? null,
    status: result.success ? 'success' : 'error',
    error_message: result.error ?? null,
  });
}

export async function syncWaterToHealthPlatform(params: {
  milliliters: number;
  timestamp: string;
  localRecordId: string;
  localRecordType: 'water_entry';
}): Promise<void> {
  const service = getHealthSyncService();
  if (!service?.isConnected()) return;

  const payload: WaterWriteParams = {
    milliliters: params.milliliters,
    timestamp: params.timestamp,
    localRecordId: params.localRecordId,
    localRecordType: params.localRecordType,
  };

  const result = await safeExecute('water', () => service.writeWater(payload));

  await logHealthSync({
    platform: service.getPlatformName(),
    direction: 'write',
    data_type: 'water',
    local_record_id: params.localRecordId,
    local_record_type: params.localRecordType,
    external_id: result.externalId ?? null,
    status: result.success ? 'success' : 'error',
    error_message: result.error ?? null,
  });
}
