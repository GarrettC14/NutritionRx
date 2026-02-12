/**
 * Widget Data Service
 * Syncs app data with native widgets via App Groups
 */

import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WidgetDataContainer, WidgetNutritionData, WidgetWaterData } from './types';

// App Group identifier for shared data
const APP_GROUP_IDENTIFIER = 'group.com.nutritionrx.app';
const WIDGET_DATA_KEY = 'widget_data';

// Storage key for local backup
const LOCAL_WIDGET_DATA_KEY = '@nutritionrx/widget_data';

/**
 * Native module for App Groups (platform-specific)
 * This would be bridged from native code
 */
interface NativeWidgetModule {
  setSharedData: (groupId: string, key: string, data: string) => Promise<void>;
  getSharedData: (groupId: string, key: string) => Promise<string | null>;
  reloadWidgets: (kind?: string) => Promise<void>;
}

// Get native module if available
const getNativeModule = (): NativeWidgetModule | null => {
  if (Platform.OS === 'ios') {
    return NativeModules.WidgetModule || null;
  }
  return null;
};

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Create default nutrition data
 */
function createDefaultNutritionData(): WidgetNutritionData {
  return {
    caloriesConsumed: 0,
    caloriesGoal: 2000,
    proteinConsumed: 0,
    proteinGoal: 150,
    carbsConsumed: 0,
    carbsGoal: 250,
    fatConsumed: 0,
    fatGoal: 65,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Create default water data
 */
function createDefaultWaterData(): WidgetWaterData {
  return {
    glassesConsumed: 0,
    glassesGoal: 8,
    glassSizeMl: 250,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Create default widget data container
 */
function createDefaultContainer(): WidgetDataContainer {
  return {
    nutrition: createDefaultNutritionData(),
    water: createDefaultWaterData(),
    date: formatDate(new Date()),
  };
}

class WidgetDataService {
  private nativeModule: NativeWidgetModule | null = null;
  private cachedData: WidgetDataContainer | null = null;

  constructor() {
    this.nativeModule = getNativeModule();
  }

  /**
   * Check if native widget module is available
   */
  isNativeModuleAvailable(): boolean {
    return this.nativeModule !== null;
  }

  /**
   * Get current widget data
   */
  async getData(): Promise<WidgetDataContainer> {
    // Return cached data if available
    if (this.cachedData) {
      return this.cachedData;
    }

    // Try native module first (for iOS)
    if (this.nativeModule) {
      try {
        const data = await this.nativeModule.getSharedData(
          APP_GROUP_IDENTIFIER,
          WIDGET_DATA_KEY
        );
        if (data) {
          this.cachedData = JSON.parse(data);
          return this.cachedData;
        }
      } catch (error) {
        if (__DEV__) console.warn('Failed to get shared widget data:', error);
      }
    }

    // Fall back to AsyncStorage
    try {
      const data = await AsyncStorage.getItem(LOCAL_WIDGET_DATA_KEY);
      if (data) {
        this.cachedData = JSON.parse(data);
        return this.cachedData;
      }
    } catch (error) {
      if (__DEV__) console.warn('Failed to get local widget data:', error);
    }

    // Return default data
    return createDefaultContainer();
  }

  /**
   * Update nutrition data for widgets
   */
  async updateNutritionData(data: Partial<WidgetNutritionData>): Promise<void> {
    const currentData = await this.getData();
    const today = formatDate(new Date());

    // Reset if it's a new day
    if (currentData.date !== today) {
      currentData.nutrition = createDefaultNutritionData();
      currentData.water = createDefaultWaterData();
      currentData.date = today;
    }

    // Update nutrition data
    currentData.nutrition = {
      ...currentData.nutrition,
      ...data,
      lastUpdated: new Date().toISOString(),
    };

    await this.saveData(currentData);
  }

  /**
   * Update water data for widgets
   */
  async updateWaterData(data: Partial<WidgetWaterData>): Promise<void> {
    const currentData = await this.getData();
    const today = formatDate(new Date());

    // Reset if it's a new day
    if (currentData.date !== today) {
      currentData.nutrition = createDefaultNutritionData();
      currentData.water = createDefaultWaterData();
      currentData.date = today;
    }

    // Update water data
    currentData.water = {
      ...currentData.water,
      ...data,
      lastUpdated: new Date().toISOString(),
    };

    await this.saveData(currentData);
  }

  /**
   * Save widget data to both native App Groups and AsyncStorage
   */
  private async saveData(data: WidgetDataContainer): Promise<void> {
    this.cachedData = data;
    const jsonData = JSON.stringify(data);

    // Save to AsyncStorage as backup
    try {
      await AsyncStorage.setItem(LOCAL_WIDGET_DATA_KEY, jsonData);
    } catch (error) {
      if (__DEV__) console.warn('Failed to save local widget data:', error);
    }

    // Save to native App Groups for widgets
    if (this.nativeModule) {
      try {
        await this.nativeModule.setSharedData(
          APP_GROUP_IDENTIFIER,
          WIDGET_DATA_KEY,
          jsonData
        );
      } catch (error) {
        if (__DEV__) console.warn('Failed to save shared widget data:', error);
      }
    }
  }

  /**
   * Request widgets to reload their data
   */
  async reloadWidgets(widgetKind?: string): Promise<void> {
    if (this.nativeModule) {
      try {
        await this.nativeModule.reloadWidgets(widgetKind);
      } catch (error) {
        if (__DEV__) console.warn('Failed to reload widgets:', error);
      }
    }
  }

  /**
   * Sync all current app data to widgets
   * Call this when significant data changes occur
   */
  async syncAllData(params: {
    nutrition?: WidgetNutritionData;
    water?: WidgetWaterData;
  }): Promise<void> {
    const today = formatDate(new Date());

    const container: WidgetDataContainer = {
      nutrition: params.nutrition || createDefaultNutritionData(),
      water: params.water || createDefaultWaterData(),
      date: today,
    };

    await this.saveData(container);
    await this.reloadWidgets();
  }

  /**
   * Clear cached data (useful for testing or logout)
   */
  clearCache(): void {
    this.cachedData = null;
  }

  /**
   * Reset all widget data
   */
  async reset(): Promise<void> {
    this.clearCache();
    await this.saveData(createDefaultContainer());
    await this.reloadWidgets();
  }
}

// Export singleton instance
export const widgetDataService = new WidgetDataService();

// Export helper functions
export { formatDate, createDefaultNutritionData, createDefaultWaterData };
