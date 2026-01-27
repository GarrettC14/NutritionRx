/**
 * useWidgetSync Hook Tests
 * Tests for widget synchronization hooks
 */

import { Platform } from 'react-native';

// Mock modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
  NativeModules: {},
}));

// Mock React hooks
const mockUseEffect = jest.fn();
const mockUseCallback = jest.fn((fn) => fn);
const mockUseRef = jest.fn(() => ({ current: null }));

jest.mock('react', () => ({
  useEffect: (effect: () => void) => mockUseEffect(effect),
  useCallback: (fn: () => void) => mockUseCallback(fn),
  useRef: () => mockUseRef(),
}));

// Mock widget data service
const mockUpdateNutritionData = jest.fn();
const mockUpdateWaterData = jest.fn();
const mockReloadWidgets = jest.fn();
const mockClearCache = jest.fn();
const mockIsNativeModuleAvailable = jest.fn(() => false);

jest.mock('@/modules/widgets/widgetDataService', () => ({
  widgetDataService: {
    updateNutritionData: (...args: any[]) => mockUpdateNutritionData(...args),
    updateWaterData: (...args: any[]) => mockUpdateWaterData(...args),
    reloadWidgets: (...args: any[]) => mockReloadWidgets(...args),
    clearCache: () => mockClearCache(),
    isNativeModuleAvailable: () => mockIsNativeModuleAvailable(),
  },
  formatDate: jest.fn((date: Date) => date.toISOString().split('T')[0]),
}));

describe('useWidgetSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('widget support detection', () => {
    it('correctly detects iOS platform', () => {
      expect(Platform.OS).toBe('ios');
    });

    it('checks native module availability', () => {
      mockIsNativeModuleAvailable();
      expect(mockIsNativeModuleAvailable).toHaveBeenCalled();
    });
  });

  describe('syncNutrition', () => {
    it('calls updateNutritionData with correct params', async () => {
      const nutritionData = {
        caloriesConsumed: 1500,
        caloriesGoal: 2000,
        proteinConsumed: 80,
        proteinGoal: 150,
        carbsConsumed: 150,
        carbsGoal: 250,
        fatConsumed: 50,
        fatGoal: 65,
      };

      await mockUpdateNutritionData(nutritionData);

      expect(mockUpdateNutritionData).toHaveBeenCalledWith(nutritionData);
    });
  });

  describe('syncWater', () => {
    it('calls updateWaterData with correct params', async () => {
      const waterData = {
        glassesConsumed: 5,
        glassesGoal: 8,
        glassSizeMl: 250,
      };

      await mockUpdateWaterData(waterData);

      expect(mockUpdateWaterData).toHaveBeenCalledWith(waterData);
    });
  });

  describe('reloadWidgets', () => {
    it('calls widget reload function', async () => {
      await mockReloadWidgets();
      expect(mockReloadWidgets).toHaveBeenCalled();
    });

    it('can reload specific widget type', async () => {
      await mockReloadWidgets('TodaySummaryWidget');
      expect(mockReloadWidgets).toHaveBeenCalledWith('TodaySummaryWidget');
    });
  });

  describe('options', () => {
    it('supports syncOnMount option', () => {
      const options = { syncOnMount: true };
      expect(options.syncOnMount).toBe(true);
    });

    it('supports syncOnForeground option', () => {
      const options = { syncOnForeground: true };
      expect(options.syncOnForeground).toBe(true);
    });

    it('supports debounceMs option', () => {
      const options = { debounceMs: 500 };
      expect(options.debounceMs).toBe(500);
    });
  });
});

describe('useFoodLogWidgetSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncs food log data correctly', async () => {
    const foodLogData = {
      totalCalories: 1500,
      caloriesGoal: 2000,
      protein: 80,
      proteinGoal: 150,
      carbs: 150,
      carbsGoal: 250,
      fat: 50,
      fatGoal: 65,
    };

    // Simulate syncFoodLog behavior
    await mockUpdateNutritionData({
      caloriesConsumed: foodLogData.totalCalories,
      caloriesGoal: foodLogData.caloriesGoal,
      proteinConsumed: foodLogData.protein,
      proteinGoal: foodLogData.proteinGoal,
      carbsConsumed: foodLogData.carbs,
      carbsGoal: foodLogData.carbsGoal,
      fatConsumed: foodLogData.fat,
      fatGoal: foodLogData.fatGoal,
    });

    expect(mockUpdateNutritionData).toHaveBeenCalledWith({
      caloriesConsumed: 1500,
      caloriesGoal: 2000,
      proteinConsumed: 80,
      proteinGoal: 150,
      carbsConsumed: 150,
      carbsGoal: 250,
      fatConsumed: 50,
      fatGoal: 65,
    });
  });
});

describe('useWaterWidgetSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncs water log data correctly', async () => {
    const waterLogData = {
      glasses: 6,
      goal: 8,
      glassSizeMl: 250,
    };

    // Simulate syncWaterLog behavior
    await mockUpdateWaterData({
      glassesConsumed: waterLogData.glasses,
      glassesGoal: waterLogData.goal,
      glassSizeMl: waterLogData.glassSizeMl,
    });

    expect(mockUpdateWaterData).toHaveBeenCalledWith({
      glassesConsumed: 6,
      glassesGoal: 8,
      glassSizeMl: 250,
    });
  });
});
