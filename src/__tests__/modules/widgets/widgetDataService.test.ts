/**
 * Widget Data Service Tests
 * Tests for widget data synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  NativeModules: {},
}));

// Import after mocks
import { widgetDataService, formatDate, createDefaultNutritionData, createDefaultWaterData } from '@/modules/widgets/widgetDataService';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('widgetDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    widgetDataService.clearCache();
  });

  describe('formatDate', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('handles different dates correctly', () => {
      expect(formatDate(new Date('2024-12-31T23:59:59.999Z'))).toBe('2024-12-31');
      expect(formatDate(new Date('2024-01-01T00:00:00.000Z'))).toBe('2024-01-01');
    });
  });

  describe('createDefaultNutritionData', () => {
    it('returns default nutrition values', () => {
      const data = createDefaultNutritionData();

      expect(data.caloriesConsumed).toBe(0);
      expect(data.caloriesGoal).toBe(2000);
      expect(data.proteinConsumed).toBe(0);
      expect(data.proteinGoal).toBe(150);
      expect(data.carbsConsumed).toBe(0);
      expect(data.carbsGoal).toBe(250);
      expect(data.fatConsumed).toBe(0);
      expect(data.fatGoal).toBe(65);
      expect(data.lastUpdated).toBeDefined();
    });

    it('includes valid ISO timestamp', () => {
      const data = createDefaultNutritionData();
      const parsed = new Date(data.lastUpdated);
      expect(parsed.getTime()).not.toBeNaN();
    });
  });

  describe('createDefaultWaterData', () => {
    it('returns default water values', () => {
      const data = createDefaultWaterData();

      expect(data.glassesConsumed).toBe(0);
      expect(data.glassesGoal).toBe(8);
      expect(data.glassSizeMl).toBe(250);
      expect(data.lastUpdated).toBeDefined();
    });
  });

  describe('getData', () => {
    it('returns default data when no data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const data = await widgetDataService.getData();

      expect(data.nutrition.caloriesConsumed).toBe(0);
      expect(data.water.glassesConsumed).toBe(0);
      expect(data.date).toBeDefined();
    });

    it('returns cached data on subsequent calls', async () => {
      const mockData = {
        nutrition: createDefaultNutritionData(),
        water: createDefaultWaterData(),
        date: '2024-01-15',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      await widgetDataService.getData();
      await widgetDataService.getData();

      // Should only call AsyncStorage once due to caching
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });

    it('parses stored data correctly', async () => {
      const mockData = {
        nutrition: {
          ...createDefaultNutritionData(),
          caloriesConsumed: 1500,
        },
        water: {
          ...createDefaultWaterData(),
          glassesConsumed: 6,
        },
        date: '2024-01-15',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const data = await widgetDataService.getData();

      expect(data.nutrition.caloriesConsumed).toBe(1500);
      expect(data.water.glassesConsumed).toBe(6);
      expect(data.date).toBe('2024-01-15');
    });
  });

  describe('updateNutritionData', () => {
    it('updates nutrition data and saves', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await widgetDataService.updateNutritionData({
        caloriesConsumed: 1200,
        proteinConsumed: 80,
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();

      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.nutrition.caloriesConsumed).toBe(1200);
      expect(savedData.nutrition.proteinConsumed).toBe(80);
    });

    it('preserves existing nutrition values when partially updating', async () => {
      const existingData = {
        nutrition: {
          caloriesConsumed: 1000,
          caloriesGoal: 2000,
          proteinConsumed: 50,
          proteinGoal: 150,
          carbsConsumed: 100,
          carbsGoal: 250,
          fatConsumed: 30,
          fatGoal: 65,
          lastUpdated: '2024-01-15T10:00:00.000Z',
        },
        water: createDefaultWaterData(),
        date: formatDate(new Date()),
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingData));

      await widgetDataService.updateNutritionData({
        caloriesConsumed: 1500,
      });

      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.nutrition.caloriesConsumed).toBe(1500);
      expect(savedData.nutrition.proteinConsumed).toBe(50);
      expect(savedData.nutrition.carbsConsumed).toBe(100);
    });
  });

  describe('updateWaterData', () => {
    it('updates water data and saves', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await widgetDataService.updateWaterData({
        glassesConsumed: 5,
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();

      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.water.glassesConsumed).toBe(5);
    });

    it('preserves existing water values when partially updating', async () => {
      const existingData = {
        nutrition: createDefaultNutritionData(),
        water: {
          glassesConsumed: 3,
          glassesGoal: 10,
          glassSizeMl: 300,
          lastUpdated: '2024-01-15T10:00:00.000Z',
        },
        date: formatDate(new Date()),
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingData));

      await widgetDataService.updateWaterData({
        glassesConsumed: 6,
      });

      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.water.glassesConsumed).toBe(6);
      expect(savedData.water.glassesGoal).toBe(10);
      expect(savedData.water.glassSizeMl).toBe(300);
    });
  });

  describe('clearCache', () => {
    it('clears cached data', async () => {
      const mockData = {
        nutrition: createDefaultNutritionData(),
        water: createDefaultWaterData(),
        date: '2024-01-15',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      await widgetDataService.getData();
      widgetDataService.clearCache();
      await widgetDataService.getData();

      // Should call AsyncStorage twice after cache clear
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('resets to default data', async () => {
      await widgetDataService.reset();

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();

      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.nutrition.caloriesConsumed).toBe(0);
      expect(savedData.water.glassesConsumed).toBe(0);
    });
  });

  describe('syncAllData', () => {
    it('syncs complete nutrition and water data', async () => {
      const nutrition = {
        ...createDefaultNutritionData(),
        caloriesConsumed: 1800,
        proteinConsumed: 120,
      };
      const water = {
        ...createDefaultWaterData(),
        glassesConsumed: 7,
      };

      await widgetDataService.syncAllData({ nutrition, water });

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();

      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.nutrition.caloriesConsumed).toBe(1800);
      expect(savedData.nutrition.proteinConsumed).toBe(120);
      expect(savedData.water.glassesConsumed).toBe(7);
    });
  });

  describe('isNativeModuleAvailable', () => {
    it('returns false when no native module is present', () => {
      expect(widgetDataService.isNativeModuleAvailable()).toBe(false);
    });
  });
});
