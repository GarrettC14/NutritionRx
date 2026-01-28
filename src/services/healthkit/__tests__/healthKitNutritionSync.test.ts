/**
 * HealthKit Nutrition Sync Service Tests
 */

import {
  syncDailyNutritionToHealthKit,
  syncWaterToHealthKit,
  syncWeightToHealthKit,
  getWeightFromHealthKit,
  getActiveCaloriesFromHealthKit,
  getHealthKitDateKey,
  calculateAdjustedCalorieGoal,
} from '../healthKitNutritionSync';
import { healthKitService } from '../healthKitService';

// Mock the healthKitService
jest.mock('../healthKitService', () => ({
  healthKitService: {
    saveDailyNutrition: jest.fn(),
    saveWaterIntake: jest.fn(),
    saveWeight: jest.fn(),
    getLatestWeight: jest.fn(),
    getActiveCaloriesForDay: jest.fn(),
  },
}));

const mockHealthKitService = healthKitService as jest.Mocked<typeof healthKitService>;

describe('healthKitNutritionSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealthKitDateKey', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const date = new Date('2025-01-28T15:30:00.000Z');
      const result = getHealthKitDateKey(date);
      expect(result).toBe('2025-01-28');
    });

    it('handles different timezones correctly', () => {
      const date = new Date('2025-12-31T23:59:59.000Z');
      const result = getHealthKitDateKey(date);
      expect(result).toBe('2025-12-31');
    });
  });

  describe('syncDailyNutritionToHealthKit', () => {
    it('successfully syncs valid nutrition data', async () => {
      mockHealthKitService.saveDailyNutrition.mockResolvedValue(true);

      const result = await syncDailyNutritionToHealthKit({
        date: new Date('2025-01-28'),
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 80,
      });

      expect(result.success).toBe(true);
      expect(mockHealthKitService.saveDailyNutrition).toHaveBeenCalledWith(
        expect.any(Date),
        2000,
        150,
        200,
        80
      );
    });

    it('returns success for empty nutrition (nothing to sync)', async () => {
      const result = await syncDailyNutritionToHealthKit({
        date: new Date(),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });

      expect(result.success).toBe(true);
      expect(mockHealthKitService.saveDailyNutrition).not.toHaveBeenCalled();
    });

    it('returns error for negative values', async () => {
      const result = await syncDailyNutritionToHealthKit({
        date: new Date(),
        calories: -100,
        protein: 50,
        carbs: 50,
        fat: 20,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid nutrition values');
    });

    it('returns error when service fails', async () => {
      mockHealthKitService.saveDailyNutrition.mockResolvedValue(false);

      const result = await syncDailyNutritionToHealthKit({
        date: new Date(),
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 80,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sync nutrition to HealthKit');
    });

    it('handles high calorie values correctly', async () => {
      mockHealthKitService.saveDailyNutrition.mockResolvedValue(true);

      const result = await syncDailyNutritionToHealthKit({
        date: new Date(),
        calories: 5000,
        protein: 300,
        carbs: 400,
        fat: 200,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('syncWaterToHealthKit', () => {
    it('successfully syncs water intake', async () => {
      mockHealthKitService.saveWaterIntake.mockResolvedValue(true);

      const result = await syncWaterToHealthKit({
        date: new Date(),
        milliliters: 250,
      });

      expect(result.success).toBe(true);
      expect(mockHealthKitService.saveWaterIntake).toHaveBeenCalledWith(
        250,
        expect.any(Date)
      );
    });

    it('returns error for zero or negative milliliters', async () => {
      const result = await syncWaterToHealthKit({
        date: new Date(),
        milliliters: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid water amount');
    });

    it('returns error when service fails', async () => {
      mockHealthKitService.saveWaterIntake.mockResolvedValue(false);

      const result = await syncWaterToHealthKit({
        date: new Date(),
        milliliters: 250,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sync water to HealthKit');
    });
  });

  describe('syncWeightToHealthKit', () => {
    it('successfully syncs weight', async () => {
      mockHealthKitService.saveWeight.mockResolvedValue(true);

      const date = new Date();
      const result = await syncWeightToHealthKit(75.5, date);

      expect(result.success).toBe(true);
      expect(mockHealthKitService.saveWeight).toHaveBeenCalledWith(75.5, date);
    });

    it('returns error for invalid weight', async () => {
      const result = await syncWeightToHealthKit(0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid weight value');
    });

    it('returns error for negative weight', async () => {
      const result = await syncWeightToHealthKit(-50);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid weight value');
    });

    it('uses current date when not provided', async () => {
      mockHealthKitService.saveWeight.mockResolvedValue(true);

      await syncWeightToHealthKit(75.5);

      expect(mockHealthKitService.saveWeight).toHaveBeenCalledWith(
        75.5,
        expect.any(Date)
      );
    });
  });

  describe('getWeightFromHealthKit', () => {
    it('returns weight data when available', async () => {
      const mockWeight = { kg: 75.5, date: new Date('2025-01-28') };
      mockHealthKitService.getLatestWeight.mockResolvedValue(mockWeight);

      const result = await getWeightFromHealthKit();

      expect(result).toEqual(mockWeight);
    });

    it('returns null when no weight available', async () => {
      mockHealthKitService.getLatestWeight.mockResolvedValue(null);

      const result = await getWeightFromHealthKit();

      expect(result).toBeNull();
    });

    it('returns null when service throws', async () => {
      mockHealthKitService.getLatestWeight.mockRejectedValue(new Error('Error'));

      const result = await getWeightFromHealthKit();

      expect(result).toBeNull();
    });
  });

  describe('getActiveCaloriesFromHealthKit', () => {
    it('returns active calories for the day', async () => {
      mockHealthKitService.getActiveCaloriesForDay.mockResolvedValue(450);

      const result = await getActiveCaloriesFromHealthKit(new Date());

      expect(result).toBe(450);
    });

    it('returns 0 when service throws', async () => {
      mockHealthKitService.getActiveCaloriesForDay.mockRejectedValue(new Error('Error'));

      const result = await getActiveCaloriesFromHealthKit(new Date());

      expect(result).toBe(0);
    });
  });

  describe('calculateAdjustedCalorieGoal', () => {
    it('adds 50% of active calories by default', () => {
      const result = calculateAdjustedCalorieGoal(2000, 400);
      expect(result).toBe(2200); // 2000 + (400 * 0.5)
    });

    it('uses custom multiplier', () => {
      const result = calculateAdjustedCalorieGoal(2000, 400, 0.75);
      expect(result).toBe(2300); // 2000 + (400 * 0.75)
    });

    it('rounds the adjustment', () => {
      const result = calculateAdjustedCalorieGoal(2000, 333);
      expect(result).toBe(2167); // 2000 + Math.round(333 * 0.5) = 2000 + 167
    });

    it('handles zero active calories', () => {
      const result = calculateAdjustedCalorieGoal(2000, 0);
      expect(result).toBe(2000);
    });

    it('handles high activity levels', () => {
      const result = calculateAdjustedCalorieGoal(2000, 1000);
      expect(result).toBe(2500); // 2000 + (1000 * 0.5)
    });
  });
});
