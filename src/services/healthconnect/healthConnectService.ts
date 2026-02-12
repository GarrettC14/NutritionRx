/**
 * Health Connect Service
 * Core service for interacting with Android Health Connect
 * Only works on Android - returns safe defaults on other platforms
 */

import { Platform, Linking } from 'react-native';

// Types for Health Connect records
export interface HealthConnectStatus {
  isAvailable: boolean;
  needsInstall: boolean;
  isInitialized: boolean;
  permissionsGranted: string[];
}

export interface MealSyncData {
  id: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  timestamp: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface WaterSyncData {
  timestamp: Date;
  volumeMl: number;
}

export interface WeightData {
  timestamp: Date;
  weightKg: number;
}

// Health Connect module types - using any to avoid type conflicts with the library
interface HealthConnectModule {
  initialize: () => Promise<boolean>;
  getSdkStatus: (providerPackageName?: string) => Promise<number>;
  requestPermission: (permissions: any[]) => Promise<any[]>;
  getGrantedPermissions: () => Promise<any[]>;
  insertRecords: (records: any[]) => Promise<string[]>;
  readRecords: (recordType: string, options: any) => Promise<{ records: any[] }>;
  openHealthConnectSettings: () => Promise<void>;
}

// SDK availability status constants
const SdkAvailabilityStatus = {
  SDK_AVAILABLE: 3,
  SDK_UNAVAILABLE: 1,
  SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
};

// Meal type mapping for Health Connect
const MEAL_TYPE_MAP: Record<string, number> = {
  Breakfast: 1,
  Lunch: 2,
  Dinner: 3,
  Snack: 4,
};

// Required permissions for NutritionRx
const NUTRITIONRX_PERMISSIONS = [
  { accessType: 'read', recordType: 'Nutrition' },
  { accessType: 'write', recordType: 'Nutrition' },
  { accessType: 'read', recordType: 'Hydration' },
  { accessType: 'write', recordType: 'Hydration' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'write', recordType: 'Weight' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
];

// Lazy load Health Connect module to prevent crashes on iOS
let HealthConnect: HealthConnectModule | null = null;

const loadHealthConnect = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (HealthConnect === null) {
    try {
      const healthConnectModule = await import('react-native-health-connect');
      HealthConnect = healthConnectModule as unknown as HealthConnectModule;
      return true;
    } catch (error) {
      if (__DEV__) console.error('Failed to load Health Connect module:', error);
      return false;
    }
  }

  return true;
};

class HealthConnectService {
  private initialized = false;
  private permissionDenialCount = 0;

  /**
   * Check if Health Connect is available on this device
   */
  async checkAvailability(): Promise<HealthConnectStatus> {
    if (Platform.OS !== 'android') {
      return {
        isAvailable: false,
        needsInstall: false,
        isInitialized: false,
        permissionsGranted: [],
      };
    }

    try {
      const loaded = await loadHealthConnect();
      if (!loaded || !HealthConnect) {
        return {
          isAvailable: false,
          needsInstall: false,
          isInitialized: false,
          permissionsGranted: [],
        };
      }

      const status = await HealthConnect.getSdkStatus();

      return {
        isAvailable: status === SdkAvailabilityStatus.SDK_AVAILABLE,
        needsInstall:
          status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED,
        isInitialized: this.initialized,
        permissionsGranted: [],
      };
    } catch (error) {
      if (__DEV__) console.error('Health Connect availability check failed:', error);
      return {
        isAvailable: false,
        needsInstall: false,
        isInitialized: false,
        permissionsGranted: [],
      };
    }
  }

  /**
   * Initialize Health Connect SDK
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      const loaded = await loadHealthConnect();
      if (!loaded || !HealthConnect) {
        return false;
      }

      const available = await this.checkAvailability();
      if (!available.isAvailable) {
        return false;
      }

      await HealthConnect.initialize();
      this.initialized = true;
      return true;
    } catch (error) {
      if (__DEV__) console.error('Health Connect initialization failed:', error);
      return false;
    }
  }

  /**
   * Request permissions from user
   */
  async requestPermissions(): Promise<{
    granted: boolean;
    permissions: string[];
  }> {
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        return { granted: false, permissions: [] };
      }
    }

    try {
      if (!HealthConnect) {
        return { granted: false, permissions: [] };
      }

      const grantedPermissions =
        await HealthConnect.requestPermission(NUTRITIONRX_PERMISSIONS);

      // Check if core permissions were granted (nutrition at minimum)
      const hasNutritionWrite = grantedPermissions.some(
        (p) => p.accessType === 'write' && p.recordType === 'Nutrition'
      );

      if (!hasNutritionWrite) {
        this.permissionDenialCount++;
      } else {
        this.permissionDenialCount = 0;
      }

      return {
        granted: hasNutritionWrite,
        permissions: grantedPermissions.map(
          (p) => `${p.accessType}:${p.recordType}`
        ),
      };
    } catch (error) {
      if (__DEV__) console.error('Permission request failed:', error);
      this.permissionDenialCount++;
      return { granted: false, permissions: [] };
    }
  }

  /**
   * Check if user has denied permissions multiple times
   */
  hasUserDeniedMultipleTimes(): boolean {
    return this.permissionDenialCount >= 2;
  }

  /**
   * Get currently granted permissions
   */
  async getGrantedPermissions(): Promise<string[]> {
    if (!this.initialized || !HealthConnect) return [];

    try {
      const granted = await HealthConnect.getGrantedPermissions();
      return granted.map((p) => `${p.accessType}:${p.recordType}`);
    } catch (error) {
      if (__DEV__) console.error('Failed to get granted permissions:', error);
      return [];
    }
  }

  /**
   * Check if a specific permission is granted
   */
  async hasPermission(
    accessType: 'read' | 'write',
    recordType: string
  ): Promise<boolean> {
    const permissions = await this.getGrantedPermissions();
    return permissions.includes(`${accessType}:${recordType}`);
  }

  /**
   * Open Health Connect settings
   */
  async openSettings(): Promise<void> {
    try {
      if (!HealthConnect) {
        await loadHealthConnect();
      }
      if (HealthConnect) {
        await HealthConnect.openHealthConnectSettings();
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to open Health Connect settings:', error);
    }
  }

  /**
   * Redirect to Play Store to install Health Connect
   */
  async openPlayStoreForInstall(): Promise<void> {
    const playStoreUrl =
      'market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding';
    const webUrl =
      'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

    try {
      const canOpen = await Linking.canOpenURL(playStoreUrl);
      if (canOpen) {
        await Linking.openURL(playStoreUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to open Play Store:', error);
      await Linking.openURL(webUrl);
    }
  }

  /**
   * Sync a meal to Health Connect
   */
  async syncMeal(
    meal: MealSyncData
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized || !HealthConnect) {
      return { success: false, error: 'Health Connect not initialized' };
    }

    try {
      // Create a time range for the meal (1 minute duration)
      const startTime = meal.timestamp;
      const endTime = new Date(startTime.getTime() + 60000); // +1 minute

      const nutritionRecord = {
        recordType: 'Nutrition',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        mealType: MEAL_TYPE_MAP[meal.mealType] || 0,
        name: meal.mealType,
        energy: {
          value: meal.calories,
          unit: 'kilocalories',
        },
        protein: {
          value: meal.protein,
          unit: 'grams',
        },
        totalCarbohydrate: {
          value: meal.carbs,
          unit: 'grams',
        },
        totalFat: {
          value: meal.fat,
          unit: 'grams',
        },
        ...(meal.fiber !== undefined && {
          dietaryFiber: { value: meal.fiber, unit: 'grams' },
        }),
        ...(meal.sugar !== undefined && {
          sugar: { value: meal.sugar, unit: 'grams' },
        }),
        ...(meal.sodium !== undefined && {
          sodium: { value: meal.sodium / 1000, unit: 'grams' }, // Convert mg to g
        }),
        metadata: {
          clientRecordId: meal.id,
        },
      };

      await HealthConnect.insertRecords([nutritionRecord]);
      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('Failed to sync meal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync water intake to Health Connect
   */
  async syncWater(
    data: WaterSyncData
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized || !HealthConnect) {
      return { success: false, error: 'Health Connect not initialized' };
    }

    try {
      const startTime = data.timestamp;
      const endTime = new Date(startTime.getTime() + 60000);

      const hydrationRecord = {
        recordType: 'Hydration',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        volume: {
          value: data.volumeMl / 1000, // Convert ml to liters
          unit: 'liters',
        },
      };

      await HealthConnect.insertRecords([hydrationRecord]);
      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('Failed to sync water:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync weight to Health Connect
   */
  async syncWeight(
    data: WeightData
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized || !HealthConnect) {
      return { success: false, error: 'Health Connect not initialized' };
    }

    try {
      const weightRecord = {
        recordType: 'Weight',
        time: data.timestamp.toISOString(),
        weight: {
          value: data.weightKg,
          unit: 'kilograms',
        },
      };

      await HealthConnect.insertRecords([weightRecord]);
      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('Failed to sync weight:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Read weight data from Health Connect
   */
  async readWeightData(startDate: Date, endDate: Date): Promise<WeightData[]> {
    if (!this.initialized || !HealthConnect) return [];

    try {
      const result = await HealthConnect.readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      return result.records.map((record: any) => ({
        timestamp: new Date(record.time),
        weightKg: record.weight?.inKilograms || record.weight?.value || 0,
      }));
    } catch (error) {
      if (__DEV__) console.error('Failed to read weight data:', error);
      return [];
    }
  }

  /**
   * Read active calories burned from Health Connect
   */
  async readActiveCalories(date: Date): Promise<number> {
    if (!this.initialized || !HealthConnect) return 0;

    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await HealthConnect.readRecords('ActiveCaloriesBurned', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: endOfDay.toISOString(),
        },
      });

      // Sum all active calories for the day
      const totalCalories = result.records.reduce(
        (sum: number, record: any) => {
          return (
            sum + (record.energy?.inKilocalories || record.energy?.value || 0)
          );
        },
        0
      );

      return Math.round(totalCalories);
    } catch (error) {
      if (__DEV__) console.error('Failed to read active calories:', error);
      return 0;
    }
  }

  /**
   * Read water intake from Health Connect for a specific date
   */
  async readWaterIntake(date: Date): Promise<number> {
    if (!this.initialized || !HealthConnect) return 0;

    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await HealthConnect.readRecords('Hydration', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: endOfDay.toISOString(),
        },
      });

      // Sum all water intake for the day (convert liters to ml)
      const totalMl = result.records.reduce((sum: number, record: any) => {
        return sum + (record.volume?.inLiters || record.volume?.value || 0) * 1000;
      }, 0);

      return Math.round(totalMl);
    } catch (error) {
      if (__DEV__) console.error('Failed to read water intake:', error);
      return 0;
    }
  }

  /**
   * Check if Health Connect is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const healthConnectService = new HealthConnectService();
