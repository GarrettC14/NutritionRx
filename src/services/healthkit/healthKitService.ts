/**
 * HealthKit Service
 * Core service for interacting with Apple HealthKit
 * Only works on iOS - returns safe defaults on other platforms
 */
// TODO [POST_LAUNCH_HEALTH]: Enable after HealthKit package installed and Health Connect verified

import { Platform } from 'react-native';

// HealthKit types for type checking
interface HKQuantitySample {
  quantity: number;
  startDate: string;
  endDate: string;
}

interface HealthKitModule {
  isHealthDataAvailable: () => Promise<boolean>;
  requestAuthorization: (permissions: {
    toShare: string[];
    read: string[];
  }) => Promise<void>;
  getRequestStatusForAuthorization: (permissions: {
    toShare: string[];
    read: string[];
  }) => Promise<number>;
  getMostRecentQuantitySample: (
    typeIdentifier: string
  ) => Promise<HKQuantitySample | null>;
  saveQuantitySample: (
    typeIdentifier: string,
    unit: string,
    value: number,
    options: { start: Date; end: Date }
  ) => Promise<void>;
  queryQuantitySamples: (
    typeIdentifier: string,
    options: { from: Date; to: Date }
  ) => Promise<HKQuantitySample[]>;
}

interface HKQuantityTypeIdentifiers {
  bodyMass: string;
  activeEnergyBurned: string;
  dietaryEnergyConsumed: string;
  dietaryProtein: string;
  dietaryCarbohydrates: string;
  dietaryFatTotal: string;
  dietaryWater: string;
}

// Lazy load HealthKit module to prevent crashes on Android
let HealthKit: HealthKitModule | null = null;
let HKQuantityTypeIdentifier: HKQuantityTypeIdentifiers | null = null;

const loadHealthKit = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  if (HealthKit === null) {
    try {
      // TODO [POST_LAUNCH_HEALTH]: @kingstinct/react-native-healthkit is not installed.
      // Install the package before enabling HealthKit integration in production.
      const healthKitModule = await import('@kingstinct/react-native-healthkit');
      HealthKit = healthKitModule.default;
      HKQuantityTypeIdentifier = healthKitModule.HKQuantityTypeIdentifier;
      return true;
    } catch (error) {
      if (__DEV__) console.error('Failed to load HealthKit module:', error);
      return false;
    }
  }

  return true;
};

class HealthKitService {
  /**
   * Check if HealthKit is available on this device
   */
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      const loaded = await loadHealthKit();
      if (!loaded || !HealthKit) {
        return false;
      }
      return await HealthKit.isHealthDataAvailable();
    } catch (error) {
      if (__DEV__) console.error('Error checking HealthKit availability:', error);
      return false;
    }
  }

  /**
   * Request authorization to read/write health data
   */
  async requestAuthorization(): Promise<{ success: boolean; error?: string }> {
    try {
      const loaded = await loadHealthKit();
      if (!loaded || !HealthKit || !HKQuantityTypeIdentifier) {
        return { success: false, error: 'HealthKit is not available' };
      }

      const available = await HealthKit.isHealthDataAvailable();
      if (!available) {
        return { success: false, error: 'HealthKit is not available' };
      }

      const permissions = {
        toShare: [
          HKQuantityTypeIdentifier.dietaryEnergyConsumed,
          HKQuantityTypeIdentifier.dietaryProtein,
          HKQuantityTypeIdentifier.dietaryCarbohydrates,
          HKQuantityTypeIdentifier.dietaryFatTotal,
          HKQuantityTypeIdentifier.dietaryWater,
          HKQuantityTypeIdentifier.bodyMass,
        ],
        read: [
          HKQuantityTypeIdentifier.bodyMass,
          HKQuantityTypeIdentifier.activeEnergyBurned,
        ],
      };

      await HealthKit.requestAuthorization(permissions);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authorization failed',
      };
    }
  }

  /**
   * Check if we can write nutrition data (used to determine if already connected)
   */
  async canWriteNutrition(): Promise<boolean> {
    try {
      const loaded = await loadHealthKit();
      if (!loaded || !HealthKit || !HKQuantityTypeIdentifier) {
        return false;
      }

      // Try to get authorization status
      // If we can request, we may have permission
      const permissions = {
        toShare: [HKQuantityTypeIdentifier.dietaryEnergyConsumed],
        read: [],
      };

      const status = await HealthKit.getRequestStatusForAuthorization(permissions);
      // Status 2 = unnecessary (already authorized)
      return status === 2;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the latest weight reading from HealthKit
   */
  async getLatestWeight(): Promise<{ kg: number; date: Date } | null> {
    try {
      const loaded = await loadHealthKit();
      if (!loaded || !HealthKit || !HKQuantityTypeIdentifier) {
        return null;
      }

      const available = await HealthKit.isHealthDataAvailable();
      if (!available) {
        return null;
      }

      const sample = await HealthKit.getMostRecentQuantitySample(
        HKQuantityTypeIdentifier.bodyMass
      );

      if (!sample) {
        return null;
      }

      return {
        kg: sample.quantity,
        date: new Date(sample.startDate),
      };
    } catch (error) {
      if (__DEV__) console.error('Error getting weight from HealthKit:', error);
      return null;
    }
  }

  /**
   * Save weight to HealthKit
   */
  async saveWeight(weightKg: number, date: Date = new Date()): Promise<boolean> {
    try {
      const loaded = await loadHealthKit();
      if (!loaded || !HealthKit || !HKQuantityTypeIdentifier) {
        return false;
      }

      const available = await HealthKit.isHealthDataAvailable();
      if (!available) {
        return false;
      }

      await HealthKit.saveQuantitySample(
        HKQuantityTypeIdentifier.bodyMass,
        'kg',
        weightKg,
        { start: date, end: date }
      );

      return true;
    } catch (error) {
      if (__DEV__) console.error('Error saving weight to HealthKit:', error);
      return false;
    }
  }

  /**
   * Get active calories burned for a specific day
   */
  async getActiveCaloriesForDay(date: Date): Promise<number> {
    try {
      const loaded = await loadHealthKit();
      if (!loaded || !HealthKit || !HKQuantityTypeIdentifier) {
        return 0;
      }

      const available = await HealthKit.isHealthDataAvailable();
      if (!available) {
        return 0;
      }

      // Get start and end of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const samples = await HealthKit.queryQuantitySamples(
        HKQuantityTypeIdentifier.activeEnergyBurned,
        { from: startOfDay, to: endOfDay }
      );

      // Sum all active calories for the day
      return samples.reduce((total, sample) => total + sample.quantity, 0);
    } catch (error) {
      if (__DEV__) console.error('Error getting active calories from HealthKit:', error);
      return 0;
    }
  }

  /**
   * Save daily nutrition totals to HealthKit
   */
  async saveDailyNutrition(
    date: Date,
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ): Promise<boolean> {
    try {
      const loaded = await loadHealthKit();
      if (!loaded || !HealthKit || !HKQuantityTypeIdentifier) {
        return false;
      }

      const available = await HealthKit.isHealthDataAvailable();
      if (!available) {
        return false;
      }

      const options = { start: date, end: date };

      // Save all nutrition values
      await Promise.all([
        HealthKit.saveQuantitySample(
          HKQuantityTypeIdentifier.dietaryEnergyConsumed,
          'kcal',
          calories,
          options
        ),
        HealthKit.saveQuantitySample(
          HKQuantityTypeIdentifier.dietaryProtein,
          'g',
          protein,
          options
        ),
        HealthKit.saveQuantitySample(
          HKQuantityTypeIdentifier.dietaryCarbohydrates,
          'g',
          carbs,
          options
        ),
        HealthKit.saveQuantitySample(
          HKQuantityTypeIdentifier.dietaryFatTotal,
          'g',
          fat,
          options
        ),
      ]);

      return true;
    } catch (error) {
      if (__DEV__) console.error('Error saving nutrition to HealthKit:', error);
      return false;
    }
  }

  /**
   * Save water intake to HealthKit
   */
  async saveWaterIntake(milliliters: number, date: Date = new Date()): Promise<boolean> {
    try {
      const loaded = await loadHealthKit();
      if (!loaded || !HealthKit || !HKQuantityTypeIdentifier) {
        return false;
      }

      const available = await HealthKit.isHealthDataAvailable();
      if (!available) {
        return false;
      }

      await HealthKit.saveQuantitySample(
        HKQuantityTypeIdentifier.dietaryWater,
        'mL',
        milliliters,
        { start: date, end: date }
      );

      return true;
    } catch (error) {
      if (__DEV__) console.error('Error saving water intake to HealthKit:', error);
      return false;
    }
  }
}

// Export singleton instance
export const healthKitService = new HealthKitService();
