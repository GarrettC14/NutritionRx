/**
 * Health Connect Nutrition Sync Tests
 */

import {
  syncDailyNutritionToHealthConnect,
  syncMealToHealthConnect,
  syncWaterToHealthConnect,
  syncWeightToHealthConnect,
  getHealthConnectDateKey,
  calculateAdjustedCalorieGoal,
} from '../healthConnectNutritionSync';
import { healthConnectService } from '../healthConnectService';

// Mock the health connect service
jest.mock('../healthConnectService', () => ({
  healthConnectService: {
    syncMeal: jest.fn(),
    syncWater: jest.fn(),
    syncWeight: jest.fn(),
    readWeightData: jest.fn(),
    readActiveCalories: jest.fn(),
    readWaterIntake: jest.fn(),
  },
}));

const mockHealthConnectService = healthConnectService as jest.Mocked<
  typeof healthConnectService
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getHealthConnectDateKey', () => {
  it('should format date as YYYY-MM-DD', () => {
    const date = new Date('2024-01-15T14:30:00');
    const key = getHealthConnectDateKey(date);
    expect(key).toBe('2024-01-15');
  });

  it('should handle different timezones correctly', () => {
    const date = new Date('2024-12-31T23:59:59');
    const key = getHealthConnectDateKey(date);
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('syncDailyNutritionToHealthConnect', () => {
  it('should sync daily nutrition successfully', async () => {
    mockHealthConnectService.syncMeal.mockResolvedValue({ success: true });

    const result = await syncDailyNutritionToHealthConnect({
      date: new Date(),
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 70,
    });

    expect(result.success).toBe(true);
    expect(mockHealthConnectService.syncMeal).toHaveBeenCalled();
  });

  it('should skip sync when all values are 0', async () => {
    const result = await syncDailyNutritionToHealthConnect({
      date: new Date(),
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });

    expect(result.success).toBe(true);
    expect(mockHealthConnectService.syncMeal).not.toHaveBeenCalled();
  });

  it('should return error for negative values', async () => {
    const result = await syncDailyNutritionToHealthConnect({
      date: new Date(),
      calories: -100,
      protein: 50,
      carbs: 50,
      fat: 20,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid nutrition values');
  });

  it('should pass meal type when provided', async () => {
    mockHealthConnectService.syncMeal.mockResolvedValue({ success: true });

    await syncDailyNutritionToHealthConnect({
      date: new Date(),
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 20,
      mealType: 'Lunch',
    });

    expect(mockHealthConnectService.syncMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        mealType: 'Lunch',
      })
    );
  });

  it('should handle service errors gracefully', async () => {
    mockHealthConnectService.syncMeal.mockResolvedValue({
      success: false,
      error: 'Service unavailable',
    });

    const result = await syncDailyNutritionToHealthConnect({
      date: new Date(),
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 70,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('syncMealToHealthConnect', () => {
  it('should sync a meal with all data', async () => {
    mockHealthConnectService.syncMeal.mockResolvedValue({ success: true });

    const result = await syncMealToHealthConnect({
      id: 'meal-1',
      mealType: 'Breakfast',
      timestamp: new Date(),
      calories: 400,
      protein: 20,
      carbs: 40,
      fat: 15,
      fiber: 5,
      sugar: 8,
      sodium: 300,
    });

    expect(result.success).toBe(true);
    expect(mockHealthConnectService.syncMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'meal-1',
        mealType: 'Breakfast',
        calories: 400,
        protein: 20,
        carbs: 40,
        fat: 15,
        fiber: 5,
        sugar: 8,
        sodium: 300,
      })
    );
  });

  it('should skip sync when all macros are 0', async () => {
    const result = await syncMealToHealthConnect({
      id: 'meal-1',
      mealType: 'Lunch',
      timestamp: new Date(),
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });

    expect(result.success).toBe(true);
    expect(mockHealthConnectService.syncMeal).not.toHaveBeenCalled();
  });

  it('should return error for invalid values', async () => {
    const result = await syncMealToHealthConnect({
      id: 'meal-1',
      mealType: 'Dinner',
      timestamp: new Date(),
      calories: -50,
      protein: 20,
      carbs: 30,
      fat: 10,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid meal values');
  });
});

describe('syncWaterToHealthConnect', () => {
  it('should sync water intake successfully', async () => {
    mockHealthConnectService.syncWater.mockResolvedValue({ success: true });

    const result = await syncWaterToHealthConnect({
      date: new Date(),
      milliliters: 250,
    });

    expect(result.success).toBe(true);
    expect(mockHealthConnectService.syncWater).toHaveBeenCalledWith({
      timestamp: expect.any(Date),
      volumeMl: 250,
    });
  });

  it('should return error for invalid water amount', async () => {
    const result = await syncWaterToHealthConnect({
      date: new Date(),
      milliliters: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid water amount');
  });

  it('should return error for negative water amount', async () => {
    const result = await syncWaterToHealthConnect({
      date: new Date(),
      milliliters: -100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid water amount');
  });
});

describe('syncWeightToHealthConnect', () => {
  it('should sync weight successfully', async () => {
    mockHealthConnectService.syncWeight.mockResolvedValue({ success: true });

    const result = await syncWeightToHealthConnect(70.5, new Date());

    expect(result.success).toBe(true);
    expect(mockHealthConnectService.syncWeight).toHaveBeenCalledWith({
      timestamp: expect.any(Date),
      weightKg: 70.5,
    });
  });

  it('should use current date when not provided', async () => {
    mockHealthConnectService.syncWeight.mockResolvedValue({ success: true });

    const before = new Date();
    await syncWeightToHealthConnect(70.5);
    const after = new Date();

    const call = mockHealthConnectService.syncWeight.mock.calls[0][0];
    expect(call.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(call.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should return error for invalid weight', async () => {
    const result = await syncWeightToHealthConnect(0);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid weight value');
  });

  it('should return error for negative weight', async () => {
    const result = await syncWeightToHealthConnect(-5);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid weight value');
  });
});

describe('calculateAdjustedCalorieGoal', () => {
  it('should calculate goal with default 50% multiplier', () => {
    const result = calculateAdjustedCalorieGoal(2000, 300);
    expect(result).toBe(2150); // 2000 + (300 * 0.5)
  });

  it('should use custom multiplier when provided', () => {
    const result = calculateAdjustedCalorieGoal(2000, 300, 0.75);
    expect(result).toBe(2225); // 2000 + (300 * 0.75)
  });

  it('should round to nearest integer', () => {
    const result = calculateAdjustedCalorieGoal(2000, 333, 0.5);
    expect(result).toBe(2167); // 2000 + Math.round(333 * 0.5)
  });

  it('should return base goal when active calories is 0', () => {
    const result = calculateAdjustedCalorieGoal(2000, 0);
    expect(result).toBe(2000);
  });

  it('should handle 100% multiplier', () => {
    const result = calculateAdjustedCalorieGoal(2000, 500, 1);
    expect(result).toBe(2500);
  });

  it('should handle 0% multiplier', () => {
    const result = calculateAdjustedCalorieGoal(2000, 500, 0);
    expect(result).toBe(2000);
  });
});
