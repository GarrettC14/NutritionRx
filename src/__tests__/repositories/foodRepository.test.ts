/**
 * Food Repository Tests
 * Tests for food item data access
 */

import { foodRepository } from '@/repositories/foodRepository';
import { SEARCH_SETTINGS } from '@/constants/defaults';

// Mock the database module
const mockDb = {
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-id-123'),
}));

jest.mock('@/types/mappers', () => ({
  mapFoodItemRowToDomain: jest.fn((row) => ({
    id: row?.id,
    name: row?.name,
    brand: row?.brand ?? undefined,
    barcode: row?.barcode ?? undefined,
    calories: row?.calories,
    protein: row?.protein,
    carbs: row?.carbs,
    fat: row?.fat,
    servingSize: row?.serving_size,
    servingUnit: row?.serving_unit,
    source: row?.source,
    usageCount: row?.usage_count,
  })),
}));

describe('foodRepository', () => {
  beforeEach(() => {
    mockDb.getFirstAsync.mockReset();
    mockDb.getAllAsync.mockReset();
    mockDb.runAsync.mockReset();
  });

  const mockFoodRow = {
    id: 'food-1',
    name: 'Chicken Breast',
    brand: 'Tyson',
    barcode: '012345678901',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: null,
    sugar: null,
    sodium: 74,
    serving_size: 100,
    serving_unit: 'g',
    serving_size_grams: 100,
    source: 'usda',
    source_id: 'usda-12345',
    is_verified: 1,
    is_user_created: 0,
    last_used_at: '2024-01-15T12:00:00.000Z',
    usage_count: 10,
    usda_fdc_id: 171077,
    usda_nutrient_count: 25,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-15T12:00:00.000Z',
  };

  // ─── findById ───────────────────────────────────────────────

  describe('findById', () => {
    it('returns mapped food item when row exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      const result = await foodRepository.findById('food-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('food-1');
      expect(result!.name).toBe('Chicken Breast');
    });

    it('returns null when row does not exist', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await foodRepository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('passes id as a SQL parameter', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await foodRepository.findById('food-1');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        ['food-1']
      );
    });
  });

  // ─── findByBarcode ──────────────────────────────────────────

  describe('findByBarcode', () => {
    it('returns mapped food item when barcode matches', async () => {
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      const result = await foodRepository.findByBarcode('012345678901');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('food-1');
    });

    it('returns null when barcode not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await foodRepository.findByBarcode('999999999999');

      expect(result).toBeNull();
    });

    it('queries by barcode column', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await foodRepository.findByBarcode('012345678901');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE barcode = ?'),
        ['012345678901']
      );
    });
  });

  // ─── search ─────────────────────────────────────────────────

  describe('search', () => {
    it('returns empty array for query shorter than minQueryLength', async () => {
      const result = await foodRepository.search('a');

      expect(result).toEqual([]);
      expect(mockDb.getAllAsync).not.toHaveBeenCalled();
    });

    it('returns empty array for single-character query', async () => {
      const result = await foodRepository.search('x');

      expect(result).toEqual([]);
    });

    it('searches when query meets minimum length', async () => {
      mockDb.getAllAsync.mockResolvedValue([mockFoodRow]);

      const result = await foodRepository.search('ch');

      expect(result).toHaveLength(1);
      expect(mockDb.getAllAsync).toHaveBeenCalled();
    });

    it('uses LIKE pattern with % wildcards', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.search('chicken');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIKE ?'),
        expect.arrayContaining(['%chicken%'])
      );
    });

    it('searches both name and brand with COLLATE NOCASE', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.search('chicken');

      const sql = mockDb.getAllAsync.mock.calls[0][0] as string;
      expect(sql).toContain('name LIKE ? COLLATE NOCASE');
      expect(sql).toContain('brand LIKE ? COLLATE NOCASE');
    });

    it('uses maxResults as default limit', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.search('chicken');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        ['%chicken%', '%chicken%', SEARCH_SETTINGS.maxResults]
      );
    });

    it('accepts a custom limit parameter', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.search('chicken', 10);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['%chicken%', '%chicken%', 10]
      );
    });

    it('orders by usage_count DESC then name ASC', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.search('chicken');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY usage_count DESC, name ASC'),
        expect.any(Array)
      );
    });
  });

  // ─── getRecent ──────────────────────────────────────────────

  describe('getRecent', () => {
    it('filters for items with last_used_at IS NOT NULL', async () => {
      mockDb.getAllAsync.mockResolvedValue([mockFoodRow]);

      await foodRepository.getRecent();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE last_used_at IS NOT NULL'),
        expect.any(Array)
      );
    });

    it('orders by last_used_at DESC', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.getRecent();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY last_used_at DESC'),
        expect.any(Array)
      );
    });

    it('uses recentLimit as default', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.getRecent();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        [SEARCH_SETTINGS.recentLimit]
      );
    });

    it('accepts a custom limit', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.getRecent(5);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        [5]
      );
    });
  });

  // ─── getFrequent ────────────────────────────────────────────

  describe('getFrequent', () => {
    it('filters for items with usage_count > 0', async () => {
      mockDb.getAllAsync.mockResolvedValue([mockFoodRow]);

      await foodRepository.getFrequent();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE usage_count > 0'),
        expect.any(Array)
      );
    });

    it('uses frequentLimit as default', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.getFrequent();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        [SEARCH_SETTINGS.frequentLimit]
      );
    });

    it('accepts a custom limit', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.getFrequent(25);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        [25]
      );
    });
  });

  // ─── getUserCreated ─────────────────────────────────────────

  describe('getUserCreated', () => {
    it('filters for user-created items', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ ...mockFoodRow, is_user_created: 1 }]);

      await foodRepository.getUserCreated();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_user_created = 1')
      );
    });

    it('orders results by name', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.getUserCreated();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name')
      );
    });
  });

  // ─── create ─────────────────────────────────────────────────

  describe('create', () => {
    const createInput = {
      name: 'Chicken Breast',
      brand: 'Tyson',
      barcode: '012345678901',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
      sugar: 0,
      sodium: 74,
      servingSize: 100,
      servingUnit: 'g',
      servingSizeGrams: 100,
      source: 'usda' as const,
      sourceId: 'usda-12345',
      isVerified: true,
      isUserCreated: false,
      usdaFdcId: 171077,
      usdaNutrientCount: 25,
    };

    it('generates an id and inserts with 24 columns', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.create(createInput);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO food_items'),
        expect.arrayContaining(['test-id-123', 'Chicken Breast', 'Tyson'])
      );
      // Verify 24 placeholders
      const sql = mockDb.runAsync.mock.calls[0][0] as string;
      const placeholders = sql.match(/\?/g);
      expect(placeholders).toHaveLength(24);
    });

    it('uses generated id and sets timestamps', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.create(createInput);

      const args = mockDb.runAsync.mock.calls[0][1] as any[];
      expect(args[0]).toBe('test-id-123');
      // created_at and updated_at are the last two args
      expect(args[22]).toBe(now.toISOString());
      expect(args[23]).toBe(now.toISOString());

      jest.useRealTimers();
    });

    it('defaults optional fields to null', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      const minimalInput = {
        name: 'Apple',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        servingSize: 182,
        servingUnit: 'g',
        source: 'manual' as const,
      };

      await foodRepository.create(minimalInput);

      const args = mockDb.runAsync.mock.calls[0][1] as any[];
      // brand (index 2), barcode (index 3) should be null
      expect(args[2]).toBeNull();
      expect(args[3]).toBeNull();
    });

    it('sets isVerified and isUserCreated as 0/1 integers', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.create({ ...createInput, isVerified: true, isUserCreated: false });

      const args = mockDb.runAsync.mock.calls[0][1] as any[];
      // isVerified at index 16, isUserCreated at index 17
      expect(args[16]).toBe(1);
      expect(args[17]).toBe(0);
    });

    it('initializes last_used_at to null and usage_count to 0', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.create(createInput);

      const args = mockDb.runAsync.mock.calls[0][1] as any[];
      // last_used_at at index 18, usage_count at index 19
      expect(args[18]).toBeNull();
      expect(args[19]).toBe(0);
    });

    it('calls findById after insert and returns the result', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      const result = await foodRepository.create(createInput);

      expect(result.id).toBe('food-1');
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        ['test-id-123']
      );
    });

    it('throws error when findById returns null after insert', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(null);

      await expect(foodRepository.create(createInput)).rejects.toThrow(
        'Failed to create food item'
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────

  describe('update', () => {
    it('only includes provided fields in the SET clause', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.update('food-1', { name: 'Updated Name' });

      const sql = mockDb.runAsync.mock.calls[0][0] as string;
      expect(sql).toContain('updated_at = ?');
      expect(sql).toContain('name = ?');
      expect(sql).not.toContain('brand = ?');
      expect(sql).not.toContain('calories = ?');
    });

    it('includes multiple fields when provided', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.update('food-1', {
        name: 'New Name',
        brand: 'New Brand',
        calories: 200,
        protein: 40,
      });

      const sql = mockDb.runAsync.mock.calls[0][0] as string;
      expect(sql).toContain('name = ?');
      expect(sql).toContain('brand = ?');
      expect(sql).toContain('calories = ?');
      expect(sql).toContain('protein = ?');
    });

    it('always includes updated_at', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.update('food-1', { fat: 5 });

      const sql = mockDb.runAsync.mock.calls[0][0] as string;
      expect(sql).toContain('updated_at = ?');
    });

    it('appends id as the last parameter', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.update('food-1', { calories: 200 });

      const values = mockDb.runAsync.mock.calls[0][1] as any[];
      expect(values[values.length - 1]).toBe('food-1');
    });

    it('throws error when food item not found after update', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(null);

      await expect(
        foodRepository.update('nonexistent', { calories: 200 })
      ).rejects.toThrow('Food item not found');
    });
  });

  // ─── recordUsage ────────────────────────────────────────────

  describe('recordUsage', () => {
    it('updates last_used_at and increments usage_count', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await foodRepository.recordUsage('food-1');

      const sql = mockDb.runAsync.mock.calls[0][0] as string;
      expect(sql).toContain('last_used_at = ?');
      expect(sql).toContain('usage_count = usage_count + 1');
      expect(sql).toContain('updated_at = ?');
    });

    it('passes current timestamp and id as parameters', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      mockDb.runAsync.mockResolvedValue(undefined);

      await foodRepository.recordUsage('food-1');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        [now.toISOString(), now.toISOString(), 'food-1']
      );

      jest.useRealTimers();
    });
  });

  // ─── delete ─────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the food item by id', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await foodRepository.delete('food-1');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM food_items WHERE id = ?',
        ['food-1']
      );
    });
  });

  // ─── exists ─────────────────────────────────────────────────

  describe('exists', () => {
    it('returns true when count is greater than 0', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 3 });

      const result = await foodRepository.exists('food-1');

      expect(result).toBe(true);
    });

    it('returns false when count is 0', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      const result = await foodRepository.exists('nonexistent');

      expect(result).toBe(false);
    });

    it('returns false when result is null', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await foodRepository.exists('nonexistent');

      expect(result).toBe(false);
    });
  });

  // ─── existsByBarcode ────────────────────────────────────────

  describe('existsByBarcode', () => {
    it('returns true when barcode exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 1 });

      const result = await foodRepository.existsByBarcode('012345678901');

      expect(result).toBe(true);
    });

    it('returns false when barcode does not exist', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      const result = await foodRepository.existsByBarcode('999999999999');

      expect(result).toBe(false);
    });

    it('queries by barcode column with COUNT', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      await foodRepository.existsByBarcode('012345678901');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        ['012345678901']
      );
    });
  });

  // ─── findByFdcId ────────────────────────────────────────────

  describe('findByFdcId', () => {
    it('returns mapped food item when fdcId matches', async () => {
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      const result = await foodRepository.findByFdcId(171077);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('food-1');
    });

    it('returns null when no match', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await foodRepository.findByFdcId(999999);

      expect(result).toBeNull();
    });

    it('queries by usda_fdc_id column', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await foodRepository.findByFdcId(171077);

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE usda_fdc_id = ?'),
        [171077]
      );
    });
  });

  // ─── updateUsdaFields ───────────────────────────────────────

  describe('updateUsdaFields', () => {
    it('updates usda_fdc_id, usda_nutrient_count, and updated_at', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await foodRepository.updateUsdaFields('food-1', 171077, 25);

      const sql = mockDb.runAsync.mock.calls[0][0] as string;
      expect(sql).toContain('usda_fdc_id = ?');
      expect(sql).toContain('usda_nutrient_count = ?');
      expect(sql).toContain('updated_at = ?');
    });

    it('passes correct parameters in order', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      mockDb.runAsync.mockResolvedValue(undefined);

      await foodRepository.updateUsdaFields('food-1', 171077, 25);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        [171077, 25, now.toISOString(), 'food-1']
      );

      jest.useRealTimers();
    });
  });

  // ─── findByExactName ────────────────────────────────────────

  describe('findByExactName', () => {
    it('normalizes name to lowercase and trims whitespace', async () => {
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.findByExactName('  Chicken Breast  ');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(name) = ?'),
        expect.arrayContaining(['chicken breast'])
      );
    });

    it('queries with brand when brand is provided', async () => {
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.findByExactName('Chicken Breast', 'Tyson');

      const sql = mockDb.getFirstAsync.mock.calls[0][0] as string;
      expect(sql).toContain('LOWER(name) = ?');
      expect(sql).toContain('LOWER(brand) = ?');
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['chicken breast', 'tyson']
      );
    });

    it('queries for null/empty brand when brand is not provided', async () => {
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.findByExactName('Chicken Breast');

      const sql = mockDb.getFirstAsync.mock.calls[0][0] as string;
      expect(sql).toContain('LOWER(name) = ?');
      expect(sql).toContain("brand IS NULL OR brand = ''");
    });

    it('treats empty string brand same as no brand', async () => {
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      await foodRepository.findByExactName('Chicken Breast', '');

      const sql = mockDb.getFirstAsync.mock.calls[0][0] as string;
      expect(sql).toContain("brand IS NULL OR brand = ''");
    });

    it('returns null when no match found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await foodRepository.findByExactName('Nonexistent Food');

      expect(result).toBeNull();
    });

    it('returns mapped food item when match found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(mockFoodRow);

      const result = await foodRepository.findByExactName('Chicken Breast', 'Tyson');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('food-1');
    });
  });
});
