import { getDatabase } from '@/db/database';
import { MealType } from '@/constants/mealTypes';

// Mock the database module
jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(),
}));

const mockDb = {
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
};

(getDatabase as jest.Mock).mockReturnValue(mockDb);

// Import after mocking
import { foodRepository } from '@/repositories/foodRepository';
import { logEntryRepository } from '@/repositories/logEntryRepository';
import { quickAddRepository } from '@/repositories/quickAddRepository';
import { weightRepository } from '@/repositories/weightRepository';
import { settingsRepository } from '@/repositories/settingsRepository';

describe('Food Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return null when food not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await foodRepository.findById('non-existent');

      expect(result).toBeNull();
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM food_items WHERE id = ?',
        ['non-existent']
      );
    });

    it('should return mapped food item when found', async () => {
      const mockRow = {
        id: 'food-1',
        name: 'Apple',
        brand: 'Generic',
        barcode: null,
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        fiber: 4.4,
        sugar: 19,
        sodium: null,
        serving_size: 1,
        serving_unit: 'medium',
        serving_size_grams: 182,
        source: 'user',
        source_id: null,
        is_verified: 0,
        is_user_created: 1,
        last_used_at: '2024-01-15T10:00:00.000Z',
        usage_count: 5,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
      };

      mockDb.getFirstAsync.mockResolvedValue(mockRow);

      const result = await foodRepository.findById('food-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('food-1');
      expect(result?.name).toBe('Apple');
      expect(result?.calories).toBe(95);
      expect(result?.isUserCreated).toBe(true);
      expect(result?.servingSize).toBe(1);
    });
  });

  describe('search', () => {
    it('should return empty array for queries shorter than min length', async () => {
      const result = await foodRepository.search('a');

      expect(result).toEqual([]);
      expect(mockDb.getAllAsync).not.toHaveBeenCalled();
    });

    it('should search using FTS5 full-text index', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await foodRepository.search('apple');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('food_items_fts MATCH'),
        ['"apple"', 50]
      );
    });
  });

  describe('recordUsage', () => {
    it('should update last_used_at and increment usage_count', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await foodRepository.recordUsage('food-1');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('SET last_used_at = ?'),
        expect.arrayContaining(['food-1'])
      );
    });
  });
});

describe('Log Entry Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDailyTotals', () => {
    it('should return totals for a date including quick add entries', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        total_calories: 1500,
        total_protein: 100,
        total_carbs: 150,
        total_fat: 50,
      });

      const result = await logEntryRepository.getDailyTotals('2024-01-15');

      expect(result).toEqual({
        calories: 1500,
        protein: 100,
        carbs: 150,
        fat: 50,
      });
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('UNION ALL'),
        ['2024-01-15', '2024-01-15']
      );
    });

    it('should return zeros when no entries', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await logEntryRepository.getDailyTotals('2024-01-15');

      expect(result).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    });
  });

  describe('findByDate', () => {
    it('should return entries ordered by meal type', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await logEntryRepository.findByDate('2024-01-15');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        ['2024-01-15']
      );
    });
  });
});

describe('Quick Add Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a quick add entry with only calories', async () => {
      const mockRow = {
        id: 'test-uuid-1234',
        date: '2024-01-15',
        meal_type: 'lunch',
        calories: 500,
        protein: null,
        carbs: null,
        fat: null,
        description: null,
        created_at: '2024-01-15T12:00:00.000Z',
        updated_at: '2024-01-15T12:00:00.000Z',
      };

      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockRow);

      const result = await quickAddRepository.create({
        date: '2024-01-15',
        mealType: MealType.Lunch,
        calories: 500,
      });

      expect(result.calories).toBe(500);
      expect(result.mealType).toBe(MealType.Lunch);
      expect(result.protein).toBeUndefined();
    });
  });
});

describe('Weight Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getAllAsync.mockResolvedValue([]);
  });

  describe('getLatest', () => {
    it('should return the most recent weight entry', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        id: 'w1',
        date: '2024-01-15',
        weight_kg: 80.0,
        trend_weight_kg: 79.9,
        notes: null,
        created_at: '2024-01-15T08:00:00.000Z',
        updated_at: '2024-01-15T08:00:00.000Z',
      });

      const result = await weightRepository.getLatest();

      expect(result).not.toBeNull();
      expect(result!.trendWeightKg).toBe(79.9);
    });

    it('should return null when no weights', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await weightRepository.getLatest();

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should update existing entry if one exists for the date', async () => {
      const existingRow = {
        id: 'existing-id',
        date: '2024-01-15',
        weight_kg: 80.0,
        notes: null,
        created_at: '2024-01-15T08:00:00.000Z',
        updated_at: '2024-01-15T08:00:00.000Z',
      };

      // First call for findByDate returns existing
      mockDb.getFirstAsync.mockResolvedValueOnce(existingRow);
      // Second call after update
      mockDb.getFirstAsync.mockResolvedValueOnce({
        ...existingRow,
        weight_kg: 79.5,
      });
      // findById (post-update) and recompute query
      mockDb.getFirstAsync.mockResolvedValueOnce({
        ...existingRow,
        weight_kg: 79.5,
      });
      mockDb.runAsync.mockResolvedValue(undefined);

      const result = await weightRepository.create({
        date: '2024-01-15',
        weightKg: 79.5,
      });

      expect(result.weightKg).toBe(79.5);
    });
  });
});

describe('Settings Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return default value when setting not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await settingsRepository.get('test_key', 100);

      expect(result).toBe(100);
    });

    it('should parse numeric values correctly', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ key: 'test_key', value: '2500' });

      const result = await settingsRepository.get('test_key', 2000);

      expect(result).toBe(2500);
    });

    it('should parse boolean values correctly', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ key: 'test_key', value: '1' });

      const result = await settingsRepository.get('test_key', false);

      expect(result).toBe(true);
    });
  });

  describe('set', () => {
    it('should use upsert to set values', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await settingsRepository.set('test_key', 'test_value');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.arrayContaining(['test_key', 'test_value'])
      );
    });
  });
});
