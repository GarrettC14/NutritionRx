/**
 * Micronutrient Repository Tests
 * Tests for food-level micronutrient storage and USDA cache
 */

import { micronutrientRepository } from '@/repositories/micronutrientRepository';

const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();

const mockDb = {
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
  runAsync: mockRunAsync,
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-uuid-micro'),
}));

describe('micronutrientRepository', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
  });

  // ── storeFoodNutrients ─────────────────────────────────────

  describe('storeFoodNutrients', () => {
    it('should store nutrients and return the count of stored entries', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      const nutrients = {
        calcium: 200,
        iron: 8,
        vitaminC: 45,
      };

      const count = await micronutrientRepository.storeFoodNutrients('food-1', nutrients);

      expect(count).toBe(3);
      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO food_item_nutrients'),
        expect.arrayContaining(['test-uuid-micro', 'food-1', 'calcium', 200, 'mg', 'usda'])
      );
    });

    it('should default source to "usda"', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await micronutrientRepository.storeFoodNutrients('food-1', { calcium: 100 });

      const args = mockRunAsync.mock.calls[0][1] as (string | number)[];
      // source is the 6th value in each group: id, foodItemId, nutrientId, amount, unit, source, created_at
      expect(args[5]).toBe('usda');
    });

    it('should use a custom source when provided', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await micronutrientRepository.storeFoodNutrients('food-1', { iron: 5 }, 'barcode');

      const args = mockRunAsync.mock.calls[0][1] as (string | number)[];
      expect(args[5]).toBe('barcode');
    });

    it('should filter out nutrients with zero amount', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      const nutrients = {
        calcium: 200,
        iron: 0,
        vitaminC: 45,
      };

      const count = await micronutrientRepository.storeFoodNutrients('food-1', nutrients);

      expect(count).toBe(2);
      // Verify iron is not in the values
      const args = mockRunAsync.mock.calls[0][1] as (string | number)[];
      expect(args).not.toContain('iron');
    });

    it('should filter out nutrients with negative amount', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      const nutrients = {
        calcium: 200,
        iron: -5,
      };

      const count = await micronutrientRepository.storeFoodNutrients('food-1', nutrients);

      expect(count).toBe(1);
      const args = mockRunAsync.mock.calls[0][1] as (string | number)[];
      expect(args).not.toContain('iron');
    });

    it('should return 0 and not call db when all nutrients are zero or negative', async () => {
      const nutrients = {
        calcium: 0,
        iron: -5,
        vitaminC: 0,
      };

      const count = await micronutrientRepository.storeFoodNutrients('food-1', nutrients);

      expect(count).toBe(0);
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('should return 0 for empty nutrients object', async () => {
      const count = await micronutrientRepository.storeFoodNutrients('food-1', {});

      expect(count).toBe(0);
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('should batch inserts in groups of 50', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      // Create 75 nutrients (should result in 2 batches: 50 + 25)
      const nutrients: Record<string, number> = {};
      for (let i = 1; i <= 75; i++) {
        nutrients[`nutrient_${i}`] = i;
      }

      const count = await micronutrientRepository.storeFoodNutrients('food-1', nutrients);

      expect(count).toBe(75);
      expect(mockRunAsync).toHaveBeenCalledTimes(2);

      // First batch should have 50 placeholders
      const firstCall = mockRunAsync.mock.calls[0][0] as string;
      const firstPlaceholders = (firstCall.match(/\([\s]*\?[\s]*,[\s]*\?[\s]*,[\s]*\?[\s]*,[\s]*\?[\s]*,[\s]*\?[\s]*,[\s]*\?[\s]*,[\s]*\?[\s]*\)/g) || []).length;
      expect(firstPlaceholders).toBe(50);

      // Second batch should have 25 placeholders
      const secondCall = mockRunAsync.mock.calls[1][0] as string;
      const secondPlaceholders = (secondCall.match(/\([\s]*\?[\s]*,[\s]*\?[\s]*,[\s]*\?[\s]*,[\s]*\?[\s]*,[\s]*\?[\s]*,[\s]*\?[\s]*,[\s]*\?[\s]*\)/g) || []).length;
      expect(secondPlaceholders).toBe(25);
    });
  });

  // ── storeFoodNutrientsWithMeta ─────────────────────────────

  describe('storeFoodNutrientsWithMeta', () => {
    it('should store nutrients with explicit units and source', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      const nutrients = [
        { nutrientId: 'calcium', amount: 200, unit: 'mg' },
        { nutrientId: 'vitaminD', amount: 15, unit: 'mcg' },
        { nutrientId: 'vitaminA', amount: 900, unit: 'IU' },
      ];

      const count = await micronutrientRepository.storeFoodNutrientsWithMeta('food-2', nutrients, 'ai_photo');

      expect(count).toBe(3);
      expect(mockRunAsync).toHaveBeenCalledTimes(1);

      const args = mockRunAsync.mock.calls[0][1] as (string | number)[];
      // First nutrient group: id, foodItemId, nutrientId, amount, unit, source, created_at
      expect(args[0]).toBe('test-uuid-micro');
      expect(args[1]).toBe('food-2');
      expect(args[2]).toBe('calcium');
      expect(args[3]).toBe(200);
      expect(args[4]).toBe('mg');
      expect(args[5]).toBe('ai_photo');
    });

    it('should return 0 for empty nutrients array', async () => {
      const count = await micronutrientRepository.storeFoodNutrientsWithMeta('food-2', [], 'barcode');

      expect(count).toBe(0);
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('should batch in groups of 50', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      const nutrients = Array.from({ length: 60 }, (_, i) => ({
        nutrientId: `nutrient_${i}`,
        amount: i + 1,
        unit: 'mg',
      }));

      const count = await micronutrientRepository.storeFoodNutrientsWithMeta('food-2', nutrients, 'barcode');

      expect(count).toBe(60);
      expect(mockRunAsync).toHaveBeenCalledTimes(2);
    });
  });

  // ── getFoodNutrients ───────────────────────────────────────

  describe('getFoodNutrients', () => {
    it('should return nutrient data as key-value object', async () => {
      mockGetAllAsync.mockResolvedValue([
        { nutrient_id: 'calcium', amount: 200 },
        { nutrient_id: 'iron', amount: 8 },
        { nutrient_id: 'vitaminC', amount: 45 },
      ]);

      const data = await micronutrientRepository.getFoodNutrients('food-1');

      expect(data).toEqual({
        calcium: 200,
        iron: 8,
        vitaminC: 45,
      });
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT nutrient_id, amount FROM food_item_nutrients'),
        ['food-1']
      );
    });

    it('should return empty object when no nutrients exist', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const data = await micronutrientRepository.getFoodNutrients('food-999');

      expect(data).toEqual({});
    });
  });

  // ── hasFoodNutrients ───────────────────────────────────────

  describe('hasFoodNutrients', () => {
    it('should return true when nutrients exist', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 5 });

      const result = await micronutrientRepository.hasFoodNutrients('food-1');

      expect(result).toBe(true);
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        ['food-1']
      );
    });

    it('should return false when no nutrients exist', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 0 });

      const result = await micronutrientRepository.hasFoodNutrients('food-1');

      expect(result).toBe(false);
    });

    it('should return false when query returns null', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await micronutrientRepository.hasFoodNutrients('food-1');

      expect(result).toBe(false);
    });
  });

  // ── getFoodNutrientCount ───────────────────────────────────

  describe('getFoodNutrientCount', () => {
    it('should return the nutrient count', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 12 });

      const count = await micronutrientRepository.getFoodNutrientCount('food-1');

      expect(count).toBe(12);
    });

    it('should return 0 when query returns null', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const count = await micronutrientRepository.getFoodNutrientCount('food-1');

      expect(count).toBe(0);
    });
  });

  // ── deleteFoodNutrients ────────────────────────────────────

  describe('deleteFoodNutrients', () => {
    it('should delete all nutrients for a food item', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await micronutrientRepository.deleteFoodNutrients('food-1');

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM food_item_nutrients WHERE food_item_id = ?'),
        ['food-1']
      );
    });
  });

  // ── cacheUSDAFood ──────────────────────────────────────────

  describe('cacheUSDAFood', () => {
    it('should cache a USDA food with all parameters', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await micronutrientRepository.cacheUSDAFood(
        123456,
        'Chicken Breast',
        'SR Legacy',
        '{"calcium":10}',
        100,
        'g',
        60
      );

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO usda_food_cache'),
        expect.arrayContaining([123456, 'Chicken Breast', 'SR Legacy', '{"calcium":10}', 100, 'g'])
      );
    });

    it('should use null for optional serving size params when not provided', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await micronutrientRepository.cacheUSDAFood(
        789,
        'Broccoli',
        'Foundation',
        '{"vitaminC":89}'
      );

      const args = mockRunAsync.mock.calls[0][1] as (string | number | null)[];
      // servingSize and servingSizeUnit should be null
      expect(args[4]).toBeNull();
      expect(args[5]).toBeNull();
    });

    it('should default ttlDays to 30', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await micronutrientRepository.cacheUSDAFood(
        789,
        'Broccoli',
        'Foundation',
        '{"vitaminC":89}'
      );

      const args = mockRunAsync.mock.calls[0][1] as (string | number | null)[];
      // The expires_at is the last argument
      const expiresAt = args[args.length - 1] as string;
      const expectedExpiry = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(expiresAt).toBe(expectedExpiry);

      jest.restoreAllMocks();
    });

    it('should use custom ttlDays when provided', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await micronutrientRepository.cacheUSDAFood(
        789,
        'Broccoli',
        'Foundation',
        '{"vitaminC":89}',
        undefined,
        undefined,
        7
      );

      const args = mockRunAsync.mock.calls[0][1] as (string | number | null)[];
      const expiresAt = args[args.length - 1] as string;
      const expectedExpiry = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(expiresAt).toBe(expectedExpiry);

      jest.restoreAllMocks();
    });
  });

  // ── getCachedUSDAFood ──────────────────────────────────────

  describe('getCachedUSDAFood', () => {
    it('should return cached food data when found and not expired', async () => {
      mockGetFirstAsync.mockResolvedValue({
        description: 'Chicken Breast',
        data_type: 'SR Legacy',
        nutrients_json: '{"calcium":10}',
        serving_size: 100,
        serving_size_unit: 'g',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await micronutrientRepository.getCachedUSDAFood(123456);

      expect(result).toEqual({
        description: 'Chicken Breast',
        dataType: 'SR Legacy',
        nutrientsJson: '{"calcium":10}',
        servingSize: 100,
        servingSizeUnit: 'g',
      });
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM usda_food_cache WHERE fdc_id = ?'),
        [123456, expect.any(String)]
      );
    });

    it('should return null when food is not found or expired', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await micronutrientRepository.getCachedUSDAFood(999);

      expect(result).toBeNull();
    });

    it('should map null serving fields to undefined', async () => {
      mockGetFirstAsync.mockResolvedValue({
        description: 'Broccoli',
        data_type: 'Foundation',
        nutrients_json: '{"vitaminC":89}',
        serving_size: null,
        serving_size_unit: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await micronutrientRepository.getCachedUSDAFood(789);

      expect(result).not.toBeNull();
      expect(result!.servingSize).toBeUndefined();
      expect(result!.servingSizeUnit).toBeUndefined();
    });
  });
});
