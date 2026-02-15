/**
 * Favorite Repository Tests
 * Tests for favorite foods data access
 */

import { favoriteRepository, AddFavoriteInput } from '@/repositories/favoriteRepository';

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
  generateId: jest.fn(() => 'test-uuid-fav'),
}));

jest.mock('@/types/mappers', () => ({
  mapFoodItemRowToDomain: jest.fn((row: any) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
  })),
}));

describe('favoriteRepository', () => {
  beforeEach(() => {
    mockDb.getFirstAsync.mockReset();
    mockDb.getAllAsync.mockReset();
    mockDb.runAsync.mockReset();
  });

  const mockFoodRow = {
    id: 'food-1',
    name: 'Chicken Breast',
    brand: 'Tyson',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
  };

  const mockFoodRow2 = {
    id: 'food-2',
    name: 'Brown Rice',
    brand: null,
    calories: 216,
    protein: 5,
    carbs: 45,
    fat: 1.8,
  };

  // ----------------------------------------------------------------
  // getAll
  // ----------------------------------------------------------------
  describe('getAll', () => {
    it('should return mapped food items joined from favorites', async () => {
      mockDb.getAllAsync.mockResolvedValue([mockFoodRow, mockFoodRow2]);

      const result = await favoriteRepository.getAll();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT f.* FROM food_items f')
      );
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN favorite_foods ff ON f.id = ff.food_id')
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'food-1',
        name: 'Chicken Breast',
        brand: 'Tyson',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      });
      expect(result[1]).toEqual({
        id: 'food-2',
        name: 'Brown Rice',
        brand: null,
        calories: 216,
        protein: 5,
        carbs: 45,
        fat: 1.8,
      });
    });

    it('should return empty array when no favorites exist', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await favoriteRepository.getAll();

      expect(result).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  // getAllIds
  // ----------------------------------------------------------------
  describe('getAllIds', () => {
    it('should return array of food_id strings', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { food_id: 'food-1' },
        { food_id: 'food-2' },
        { food_id: 'food-3' },
      ]);

      const result = await favoriteRepository.getAllIds();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT food_id FROM favorite_foods'
      );
      expect(result).toEqual(['food-1', 'food-2', 'food-3']);
    });

    it('should return empty array when no favorites exist', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await favoriteRepository.getAllIds();

      expect(result).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  // isFavorite
  // ----------------------------------------------------------------
  describe('isFavorite', () => {
    it('should return true when food is a favorite', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 1 });

      const result = await favoriteRepository.isFavorite('food-1');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM favorite_foods WHERE food_id = ?',
        ['food-1']
      );
      expect(result).toBe(true);
    });

    it('should return false when food is not a favorite', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      const result = await favoriteRepository.isFavorite('food-999');

      expect(result).toBe(false);
    });

    it('should return false when query returns null', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await favoriteRepository.isFavorite('food-999');

      expect(result).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // add
  // ----------------------------------------------------------------
  describe('add', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-02-15T12:00:00.000Z');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should insert a favorite with next sort_order', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ max_order: 2 });
      mockDb.runAsync.mockResolvedValue(undefined);

      await favoriteRepository.add({ foodId: 'food-1' });

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT MAX(sort_order) as max_order FROM favorite_foods'
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO favorite_foods'),
        ['test-uuid-fav', 'food-1', null, null, 3, '2026-02-15T12:00:00.000Z']
      );
    });

    it('should use sort_order 0 when no favorites exist (max_order is null)', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ max_order: null });
      mockDb.runAsync.mockResolvedValue(undefined);

      await favoriteRepository.add({ foodId: 'food-1' });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO favorite_foods'),
        ['test-uuid-fav', 'food-1', null, null, 0, '2026-02-15T12:00:00.000Z']
      );
    });

    it('should use sort_order 0 when getFirstAsync returns null', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);
      mockDb.runAsync.mockResolvedValue(undefined);

      await favoriteRepository.add({ foodId: 'food-1' });

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO favorite_foods'),
        ['test-uuid-fav', 'food-1', null, null, 0, '2026-02-15T12:00:00.000Z']
      );
    });

    it('should include default serving size and unit when provided', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ max_order: 0 });
      mockDb.runAsync.mockResolvedValue(undefined);

      const input: AddFavoriteInput = {
        foodId: 'food-1',
        defaultServingSize: 150,
        defaultServingUnit: 'g',
      };

      await favoriteRepository.add(input);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO favorite_foods'),
        ['test-uuid-fav', 'food-1', 150, 'g', 1, '2026-02-15T12:00:00.000Z']
      );
    });
  });

  // ----------------------------------------------------------------
  // remove
  // ----------------------------------------------------------------
  describe('remove', () => {
    it('should delete favorite by food_id', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await favoriteRepository.remove('food-1');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM favorite_foods WHERE food_id = ?',
        ['food-1']
      );
    });
  });

  // ----------------------------------------------------------------
  // toggle
  // ----------------------------------------------------------------
  describe('toggle', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-02-15T12:00:00.000Z');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should remove favorite and return false when already a favorite', async () => {
      // isFavorite check returns true
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 1 });
      // remove call
      mockDb.runAsync.mockResolvedValue(undefined);

      const result = await favoriteRepository.toggle('food-1');

      expect(result).toBe(false);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM favorite_foods WHERE food_id = ?',
        ['food-1']
      );
    });

    it('should add favorite and return true when not a favorite', async () => {
      // isFavorite check returns false
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 0 });
      // add: max_order query
      mockDb.getFirstAsync.mockResolvedValueOnce({ max_order: 5 });
      // add: insert
      mockDb.runAsync.mockResolvedValue(undefined);

      const result = await favoriteRepository.toggle('food-1');

      expect(result).toBe(true);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO favorite_foods'),
        ['test-uuid-fav', 'food-1', null, null, 6, '2026-02-15T12:00:00.000Z']
      );
    });
  });

  // ----------------------------------------------------------------
  // updateDefaults
  // ----------------------------------------------------------------
  describe('updateDefaults', () => {
    it('should update default serving size and unit for a food', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await favoriteRepository.updateDefaults('food-1', 200, 'ml');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE favorite_foods'),
        [200, 'ml', 'food-1']
      );
    });
  });

  // ----------------------------------------------------------------
  // getDefaults
  // ----------------------------------------------------------------
  describe('getDefaults', () => {
    it('should return serving defaults when favorite exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        id: 'fav-1',
        food_id: 'food-1',
        default_serving_size: 150,
        default_serving_unit: 'g',
        sort_order: 0,
        created_at: '2026-02-15T12:00:00.000Z',
      });

      const result = await favoriteRepository.getDefaults('food-1');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM favorite_foods WHERE food_id = ?',
        ['food-1']
      );
      expect(result).toEqual({
        servingSize: 150,
        servingUnit: 'g',
      });
    });

    it('should return null defaults when defaults are not set', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        id: 'fav-1',
        food_id: 'food-1',
        default_serving_size: null,
        default_serving_unit: null,
        sort_order: 0,
        created_at: '2026-02-15T12:00:00.000Z',
      });

      const result = await favoriteRepository.getDefaults('food-1');

      expect(result).toEqual({
        servingSize: null,
        servingUnit: null,
      });
    });

    it('should return null when favorite does not exist', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await favoriteRepository.getDefaults('food-999');

      expect(result).toBeNull();
    });
  });
});
