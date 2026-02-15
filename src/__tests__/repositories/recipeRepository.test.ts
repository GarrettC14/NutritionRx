/**
 * Recipe Repository Tests
 * Tests for recipe data access and logging
 */

import { recipeRepository } from '@/repositories/recipeRepository';
import { MealType } from '@/constants/mealTypes';

// ─── Mock setup ───────────────────────────────────────────────

const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();
const mockWithExclusiveTransactionAsync = jest.fn();

// Transaction mock - the callback receives a tx object with runAsync
const mockTxRunAsync = jest.fn();
mockWithExclusiveTransactionAsync.mockImplementation(async (cb: any) => {
  await cb({ runAsync: mockTxRunAsync });
});

const mockDb = {
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
  runAsync: mockRunAsync,
  withExclusiveTransactionAsync: mockWithExclusiveTransactionAsync,
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

let generateIdCounter = 0;
jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => {
    generateIdCounter++;
    return `test-uuid-${generateIdCounter}`;
  }),
}));

// ─── Test data ────────────────────────────────────────────────

const mockRecipeRow = {
  id: 'recipe-1',
  name: 'Protein Bowl',
  description: 'Healthy bowl',
  total_calories: 500,
  total_protein: 40,
  total_carbs: 50,
  total_fat: 15,
  item_count: 2,
  is_favorite: 0,
  usage_count: 3,
  last_used_at: '2024-01-15T12:00:00.000Z',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-15T00:00:00.000Z',
};

const mockRecipeItemRow = {
  id: 'item-1',
  recipe_id: 'recipe-1',
  food_item_id: 'food-1',
  food_name: 'Chicken',
  food_brand: null,
  servings: 1,
  serving_unit: 'serving',
  calories: 250,
  protein: 30,
  carbs: 0,
  fat: 10,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00.000Z',
};

const mockRecipeItemRow2 = {
  id: 'item-2',
  recipe_id: 'recipe-1',
  food_item_id: 'food-2',
  food_name: 'Rice',
  food_brand: 'Uncle Bens',
  servings: 2,
  serving_unit: 'cup',
  calories: 250,
  protein: 10,
  carbs: 50,
  fat: 5,
  sort_order: 1,
  created_at: '2024-01-01T00:00:00.000Z',
};

// ─── Tests ────────────────────────────────────────────────────

describe('recipeRepository', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
    mockTxRunAsync.mockReset();
    mockWithExclusiveTransactionAsync.mockReset();
    mockWithExclusiveTransactionAsync.mockImplementation(async (cb: any) => {
      await cb({ runAsync: mockTxRunAsync });
    });
    generateIdCounter = 0;
  });

  // ─── getAll ───────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped recipes when rows exist', async () => {
      mockGetAllAsync.mockResolvedValue([mockRecipeRow]);

      const result = await recipeRepository.getAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'recipe-1',
        name: 'Protein Bowl',
        description: 'Healthy bowl',
        totalCalories: 500,
        totalProtein: 40,
        totalCarbs: 50,
        totalFat: 15,
        itemCount: 2,
        isFavorite: false,
        usageCount: 3,
        lastUsedAt: '2024-01-15T12:00:00.000Z',
        items: [],
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-15T00:00:00.000Z'),
      });
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM recipes ORDER BY')
      );
    });

    it('returns empty array when no recipes', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await recipeRepository.getAll();

      expect(result).toEqual([]);
    });
  });

  // ─── getById ──────────────────────────────────────────────

  describe('getById', () => {
    it('returns recipe with items when found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockRecipeRow);
      mockGetAllAsync.mockResolvedValue([mockRecipeItemRow, mockRecipeItemRow2]);

      const result = await recipeRepository.getById('recipe-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('recipe-1');
      expect(result!.name).toBe('Protein Bowl');
      expect(result!.isFavorite).toBe(false);
      expect(result!.items).toHaveLength(2);
      expect(result!.items[0]).toEqual({
        id: 'item-1',
        recipeId: 'recipe-1',
        foodItemId: 'food-1',
        foodName: 'Chicken',
        foodBrand: undefined,
        servings: 1,
        servingUnit: 'serving',
        calories: 250,
        protein: 30,
        carbs: 0,
        fat: 10,
        sortOrder: 0,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      expect(result!.items[1].foodName).toBe('Rice');
      expect(result!.items[1].foodBrand).toBe('Uncle Bens');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM recipes WHERE id = ?'),
        ['recipe-1']
      );
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM recipe_items WHERE recipe_id = ?'),
        ['recipe-1']
      );
    });

    it('returns null when recipe not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await recipeRepository.getById('nonexistent');

      expect(result).toBeNull();
      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });
  });

  // ─── getItems ─────────────────────────────────────────────

  describe('getItems', () => {
    it('returns mapped recipe items', async () => {
      mockGetAllAsync.mockResolvedValue([mockRecipeItemRow, mockRecipeItemRow2]);

      const result = await recipeRepository.getItems('recipe-1');

      expect(result).toHaveLength(2);
      expect(result[0].foodName).toBe('Chicken');
      expect(result[0].foodBrand).toBeUndefined();
      expect(result[1].foodName).toBe('Rice');
      expect(result[1].foodBrand).toBe('Uncle Bens');
      expect(result[1].servings).toBe(2);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM recipe_items WHERE recipe_id = ?'),
        ['recipe-1']
      );
    });

    it('returns empty array when no items', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await recipeRepository.getItems('recipe-1');

      expect(result).toEqual([]);
    });
  });

  // ─── create ───────────────────────────────────────────────

  describe('create', () => {
    const draftItems = [
      {
        foodItemId: 'food-1',
        foodName: 'Chicken',
        foodBrand: undefined,
        servings: 1,
        servingUnit: 'serving',
        calories: 250,
        protein: 30,
        carbs: 0,
        fat: 10,
      },
      {
        foodItemId: 'food-2',
        foodName: 'Rice',
        foodBrand: 'Uncle Bens',
        servings: 2,
        servingUnit: 'cup',
        calories: 200,
        protein: 5,
        carbs: 40,
        fat: 2,
      },
    ];

    it('creates recipe with items in a transaction and returns result', async () => {
      // generateId call 1: recipeId = 'test-uuid-1'
      // generateId call 2: item-1 id = 'test-uuid-2'
      // generateId call 3: item-2 id = 'test-uuid-3'
      // After create, getById is called:
      mockGetFirstAsync.mockResolvedValue({
        ...mockRecipeRow,
        id: 'test-uuid-1',
        total_calories: 450,
        total_protein: 35,
        total_carbs: 40,
        total_fat: 12,
        item_count: 2,
      });
      mockGetAllAsync.mockResolvedValue([
        { ...mockRecipeItemRow, recipe_id: 'test-uuid-1' },
        { ...mockRecipeItemRow2, recipe_id: 'test-uuid-1' },
      ]);

      const result = await recipeRepository.create('Protein Bowl', 'Healthy bowl', draftItems);

      // Verify transaction was used
      expect(mockWithExclusiveTransactionAsync).toHaveBeenCalledTimes(1);

      // Verify recipe insert (first tx.runAsync call)
      expect(mockTxRunAsync).toHaveBeenCalledTimes(3); // 1 recipe + 2 items
      const recipeInsertCall = mockTxRunAsync.mock.calls[0];
      expect(recipeInsertCall[0]).toContain('INSERT INTO recipes');
      expect(recipeInsertCall[1]).toEqual(
        expect.arrayContaining(['test-uuid-1', 'Protein Bowl', 'Healthy bowl', 450, 35, 40, 12, 2])
      );

      // Verify item inserts
      const item1InsertCall = mockTxRunAsync.mock.calls[1];
      expect(item1InsertCall[0]).toContain('INSERT INTO recipe_items');
      expect(item1InsertCall[1]).toEqual(
        expect.arrayContaining(['test-uuid-2', 'test-uuid-1', 'food-1', 'Chicken'])
      );

      const item2InsertCall = mockTxRunAsync.mock.calls[2];
      expect(item2InsertCall[0]).toContain('INSERT INTO recipe_items');
      expect(item2InsertCall[1]).toEqual(
        expect.arrayContaining(['test-uuid-3', 'test-uuid-1', 'food-2', 'Rice'])
      );

      // Verify result
      expect(result.id).toBe('test-uuid-1');
      expect(result.items).toHaveLength(2);
    });

    it('calculates totals correctly from items', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockRecipeRow,
        id: 'test-uuid-1',
      });
      mockGetAllAsync.mockResolvedValue([]);

      await recipeRepository.create('Test', undefined, draftItems);

      const recipeInsertCall = mockTxRunAsync.mock.calls[0];
      const params = recipeInsertCall[1];
      // totalCalories = 250 + 200 = 450
      expect(params[3]).toBe(450);
      // totalProtein = 30 + 5 = 35
      expect(params[4]).toBe(35);
      // totalCarbs = 0 + 40 = 40
      expect(params[5]).toBe(40);
      // totalFat = 10 + 2 = 12
      expect(params[6]).toBe(12);
      // item_count = 2
      expect(params[7]).toBe(2);
      // description should be null when undefined
      expect(params[2]).toBeNull();
    });

    it('throws when getById returns null after creation', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      await expect(
        recipeRepository.create('Bad Recipe', undefined, draftItems)
      ).rejects.toThrow('Failed to create recipe');
    });
  });

  // ─── update ───────────────────────────────────────────────

  describe('update', () => {
    it('updates recipe name and description', async () => {
      await recipeRepository.update('recipe-1', 'New Name', 'New Desc');

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE recipes SET name = ?'),
        expect.arrayContaining(['New Name', 'New Desc', 'recipe-1'])
      );
    });

    it('sets description to null when not provided', async () => {
      await recipeRepository.update('recipe-1', 'New Name');

      const params = mockRunAsync.mock.calls[0][1];
      expect(params[0]).toBe('New Name');
      expect(params[1]).toBeNull();
      expect(params[3]).toBe('recipe-1');
    });
  });

  // ─── delete ───────────────────────────────────────────────

  describe('delete', () => {
    it('deletes items then recipe in a transaction', async () => {
      await recipeRepository.delete('recipe-1');

      expect(mockWithExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
      expect(mockTxRunAsync).toHaveBeenCalledTimes(2);

      // First call: delete items
      expect(mockTxRunAsync.mock.calls[0][0]).toContain('DELETE FROM recipe_items WHERE recipe_id = ?');
      expect(mockTxRunAsync.mock.calls[0][1]).toEqual(['recipe-1']);

      // Second call: delete recipe
      expect(mockTxRunAsync.mock.calls[1][0]).toContain('DELETE FROM recipes WHERE id = ?');
      expect(mockTxRunAsync.mock.calls[1][1]).toEqual(['recipe-1']);
    });
  });

  // ─── toggleFavorite ───────────────────────────────────────

  describe('toggleFavorite', () => {
    it('sets is_favorite to 1 when toggling on', async () => {
      await recipeRepository.toggleFavorite('recipe-1', true);

      const params = mockRunAsync.mock.calls[0][1];
      expect(params[0]).toBe(1);
      expect(params[2]).toBe('recipe-1');
      expect(mockRunAsync.mock.calls[0][0]).toContain('UPDATE recipes SET is_favorite = ?');
    });

    it('sets is_favorite to 0 when toggling off', async () => {
      await recipeRepository.toggleFavorite('recipe-1', false);

      const params = mockRunAsync.mock.calls[0][1];
      expect(params[0]).toBe(0);
      expect(params[2]).toBe('recipe-1');
    });
  });

  // ─── search ───────────────────────────────────────────────

  describe('search', () => {
    it('returns matching recipes with LIKE query', async () => {
      mockGetAllAsync.mockResolvedValue([mockRecipeRow]);

      const result = await recipeRepository.search('Protein');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Protein Bowl');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name LIKE ?'),
        ['%Protein%']
      );
    });

    it('returns empty array when no matches', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await recipeRepository.search('Nonexistent');

      expect(result).toEqual([]);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name LIKE ?'),
        ['%Nonexistent%']
      );
    });
  });

  // ─── logRecipe ────────────────────────────────────────────

  describe('logRecipe', () => {
    const overrideItems = [
      {
        foodItemId: 'food-1',
        servings: 1.5,
        servingUnit: 'serving',
        calories: 375,
        protein: 45,
        carbs: 0,
        fat: 15,
      },
      {
        foodItemId: 'food-2',
        servings: 1,
        servingUnit: 'cup',
        calories: 200,
        protein: 5,
        carbs: 40,
        fat: 2,
      },
    ];

    it('creates recipe_log, log_entries, and updates usage in a transaction', async () => {
      const result = await recipeRepository.logRecipe(
        'recipe-1',
        'Protein Bowl',
        '2024-01-20',
        MealType.Lunch,
        overrideItems
      );

      // Returns the generated recipe log id
      // generateId call 1: recipeLogId = 'test-uuid-1'
      expect(result).toBe('test-uuid-1');

      // Verify transaction
      expect(mockWithExclusiveTransactionAsync).toHaveBeenCalledTimes(1);

      // 1 recipe_log + 2 log_entries + 1 usage update = 4 calls
      expect(mockTxRunAsync).toHaveBeenCalledTimes(4);

      // First call: INSERT recipe_log
      expect(mockTxRunAsync.mock.calls[0][0]).toContain('INSERT INTO recipe_logs');
      expect(mockTxRunAsync.mock.calls[0][1]).toEqual(
        expect.arrayContaining(['test-uuid-1', 'recipe-1', 'Protein Bowl', '2024-01-20', MealType.Lunch])
      );

      // Second call: INSERT log_entry for item 1
      // generateId call 2: entry id = 'test-uuid-2'
      expect(mockTxRunAsync.mock.calls[1][0]).toContain('INSERT INTO log_entries');
      expect(mockTxRunAsync.mock.calls[1][1]).toEqual(
        expect.arrayContaining(['test-uuid-2', 'food-1', '2024-01-20', MealType.Lunch, 1.5, 375, 45, 0, 15, 'test-uuid-1'])
      );

      // Third call: INSERT log_entry for item 2
      // generateId call 3: entry id = 'test-uuid-3'
      expect(mockTxRunAsync.mock.calls[2][0]).toContain('INSERT INTO log_entries');
      expect(mockTxRunAsync.mock.calls[2][1]).toEqual(
        expect.arrayContaining(['test-uuid-3', 'food-2', '2024-01-20', MealType.Lunch, 1, 200, 5, 40, 2, 'test-uuid-1'])
      );

      // Fourth call: UPDATE usage_count
      expect(mockTxRunAsync.mock.calls[3][0]).toContain('UPDATE recipes SET usage_count = usage_count + 1');
      expect(mockTxRunAsync.mock.calls[3][1]).toEqual(
        expect.arrayContaining(['recipe-1'])
      );
    });
  });

  // ─── deleteRecipeLog ──────────────────────────────────────

  describe('deleteRecipeLog', () => {
    it('deletes log entries then recipe_log in a transaction', async () => {
      await recipeRepository.deleteRecipeLog('log-1');

      expect(mockWithExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
      expect(mockTxRunAsync).toHaveBeenCalledTimes(2);

      // First call: delete log entries
      expect(mockTxRunAsync.mock.calls[0][0]).toContain('DELETE FROM log_entries WHERE recipe_log_id = ?');
      expect(mockTxRunAsync.mock.calls[0][1]).toEqual(['log-1']);

      // Second call: delete recipe_log
      expect(mockTxRunAsync.mock.calls[1][0]).toContain('DELETE FROM recipe_logs WHERE id = ?');
      expect(mockTxRunAsync.mock.calls[1][1]).toEqual(['log-1']);
    });
  });
});
