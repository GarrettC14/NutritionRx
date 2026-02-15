import { Platform } from 'react-native';

// ═══ Parameter Types ═══

export interface NutritionWriteParams {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType?: string;
  timestamp: string;
  localRecordId: string;
  localRecordType: 'log_entry' | 'quick_add_entry';
}

export interface WeightWriteParams {
  weightKg: number;
  timestamp: string;
  localRecordId: string;
  localRecordType: 'weight_entry';
}

export interface WaterWriteParams {
  milliliters: number;
  timestamp: string;
  localRecordId: string;
  localRecordType: 'water_entry';
}

export interface WeightSample {
  valueKg: number;
  timestamp: string;
  externalId: string;
  sourceBundle?: string;
}

export interface SyncResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

// ═══ Service Interface ═══

export interface HealthSyncService {
  isAvailable(): Promise<boolean>;
  connect(): Promise<{ granted: string[]; denied: string[] }>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  writeNutrition(params: NutritionWriteParams): Promise<SyncResult>;
  writeWeight(params: WeightWriteParams): Promise<SyncResult>;
  writeWater(params: WaterWriteParams): Promise<SyncResult>;

  readWeightChanges(since: string): Promise<WeightSample[]>;
  readActiveCalories(start: string, end: string): Promise<number>;
  readSteps(start: string, end: string): Promise<number>;

  getLastSyncTime(): Promise<string | null>;
  getPlatformName(): 'apple_health' | 'health_connect';
}

// ═══ Factory (lazy singleton) ═══

let serviceInstance: HealthSyncService | null = null;

export function getHealthSyncService(): HealthSyncService | null {
  if (serviceInstance) return serviceInstance;

  if (Platform.OS === 'ios') {
    const { createHealthKitSyncAdapter } = require('./healthkit/healthSyncAdapter');
    serviceInstance = createHealthKitSyncAdapter();
  } else if (Platform.OS === 'android') {
    const { createHealthConnectSyncAdapter } = require('./healthconnect/healthSyncAdapter');
    serviceInstance = createHealthConnectSyncAdapter();
  }

  return serviceInstance;
}
