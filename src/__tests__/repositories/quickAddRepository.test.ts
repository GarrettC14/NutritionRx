/**
 * Quick Add Repository Tests
 * Tests for quick add entry data access
 */

import { quickAddRepository } from '@/repositories/quickAddRepository';

// Mock the database module
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
  generateId: jest.fn(() => 'test-uuid-quick'),
}));

jest.mock('@/types/mappers', () => ({
  mapQuickAddRowToDomain: jest.fn((row: any) => ({
    id: row.id,
    date: row.date,
    mealType: row.meal_type,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })),
}));

describe('quickAddRepository', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
    mockGetAllAsync.mockResolvedValue([]);
  });

  const mockQuickAddRow = {
    id: 'qa-1',
    date: '2024-06-15',
    meal_type: 'lunch',
    calories: 500,
    protein: 30,
    carbs: 50,
    fat: 20,
    description: 'Chicken salad',
    created_at: '2024-06-15T12:00:00.000Z',
    updated_at: '2024-06-15T12:00:00.000Z',
  };

  const mockQuickAddRow2 = {
    id: 'qa-2',
    date: '2024-06-15',
    meal_type: 'snack',
    calories: 200,
    protein: 10,
    carbs: 25,
    fat: 8,
    description: 'Protein bar',
    created_at: '2024-06-15T15:00:00.000Z',
    updated_at: '2024-06-15T15:00:00.000Z',
  };

  // ─── findById ──────────────────────────────────────────────

  describe('findById', () => {
    it('returns quick add entry when found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockQuickAddRow);

      const result = await quickAddRepository.findById('qa-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('qa-1');
      expect(result!.calories).toBe(500);
      expect(result!.mealType).toBe('lunch');
      expect(result!.description).toBe('Chicken salad');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        ['qa-1']
      );
    });

    it('returns null when not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await quickAddRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ─── findByDate ────────────────────────────────────────────

  describe('findByDate', () => {
    it('returns entries for the given date', async () => {
      mockGetAllAsync.mockResolvedValue([mockQuickAddRow, mockQuickAddRow2]);

      const results = await quickAddRepository.findByDate('2024-06-15');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('qa-1');
      expect(results[1].id).toBe('qa-2');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE date = ?'),
        ['2024-06-15']
      );
    });

    it('returns empty array when no entries exist', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const results = await quickAddRepository.findByDate('2024-01-01');

      expect(results).toEqual([]);
    });

    it('orders by meal type priority then created_at', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      await quickAddRepository.findByDate('2024-06-15');

      const query = mockGetAllAsync.mock.calls[0][0] as string;
      expect(query).toContain('ORDER BY');
      expect(query).toContain("WHEN 'breakfast' THEN 1");
      expect(query).toContain("WHEN 'lunch' THEN 2");
      expect(query).toContain("WHEN 'dinner' THEN 3");
      expect(query).toContain("WHEN 'snack' THEN 4");
      expect(query).toContain('created_at');
    });
  });

  // ─── findByDateAndMeal ─────────────────────────────────────

  describe('findByDateAndMeal', () => {
    it('returns entries for the given date and meal type', async () => {
      mockGetAllAsync.mockResolvedValue([mockQuickAddRow]);

      const results = await quickAddRepository.findByDateAndMeal('2024-06-15', 'lunch');

      expect(results).toHaveLength(1);
      expect(results[0].mealType).toBe('lunch');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE date = ? AND meal_type = ?'),
        ['2024-06-15', 'lunch']
      );
    });

    it('returns empty array when no matching entries', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const results = await quickAddRepository.findByDateAndMeal('2024-06-15', 'breakfast');

      expect(results).toEqual([]);
    });
  });

  // ─── findByDateRange ───────────────────────────────────────

  describe('findByDateRange', () => {
    it('returns entries within the date range', async () => {
      mockGetAllAsync.mockResolvedValue([mockQuickAddRow, mockQuickAddRow2]);

      const results = await quickAddRepository.findByDateRange('2024-06-01', '2024-06-30');

      expect(results).toHaveLength(2);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE date BETWEEN ? AND ?'),
        ['2024-06-01', '2024-06-30']
      );
    });

    it('orders by date, meal_type, created_at', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      await quickAddRepository.findByDateRange('2024-06-01', '2024-06-30');

      const query = mockGetAllAsync.mock.calls[0][0] as string;
      expect(query).toContain('ORDER BY date, meal_type, created_at');
    });
  });

  // ─── getAll ────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns all quick add entries', async () => {
      mockGetAllAsync.mockResolvedValue([mockQuickAddRow, mockQuickAddRow2]);

      const results = await quickAddRepository.getAll();

      expect(results).toHaveLength(2);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY date DESC, meal_type, created_at')
      );
    });

    it('returns empty array when no entries exist', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const results = await quickAddRepository.getAll();

      expect(results).toEqual([]);
    });
  });

  // ─── create ────────────────────────────────────────────────

  describe('create', () => {
    it('creates entry with all fields', async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValue({
        id: 'test-uuid-quick',
        date: '2024-06-15',
        meal_type: 'lunch',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        description: 'Chicken salad',
        created_at: '2024-06-15T12:00:00.000Z',
        updated_at: '2024-06-15T12:00:00.000Z',
      });

      const result = await quickAddRepository.create({
        date: '2024-06-15',
        mealType: 'lunch',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        description: 'Chicken salad',
      });

      expect(result.id).toBe('test-uuid-quick');
      expect(result.calories).toBe(500);
      expect(result.protein).toBe(30);
      expect(result.description).toBe('Chicken salad');
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO quick_add_entries'),
        expect.arrayContaining(['test-uuid-quick', '2024-06-15', 'lunch', 500, 30, 50, 20, 'Chicken salad'])
      );
    });

    it('creates entry with optional fields as null', async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValue({
        id: 'test-uuid-quick',
        date: '2024-06-15',
        meal_type: 'breakfast',
        calories: 300,
        protein: null,
        carbs: null,
        fat: null,
        description: null,
        created_at: '2024-06-15T08:00:00.000Z',
        updated_at: '2024-06-15T08:00:00.000Z',
      });

      const result = await quickAddRepository.create({
        date: '2024-06-15',
        mealType: 'breakfast',
        calories: 300,
      });

      expect(result.id).toBe('test-uuid-quick');
      expect(result.calories).toBe(300);
      expect(result.protein).toBeNull();
      expect(result.carbs).toBeNull();
      expect(result.fat).toBeNull();
      expect(result.description).toBeNull();

      // Verify null was passed for optional fields
      const insertArgs = mockRunAsync.mock.calls[0][1] as any[];
      expect(insertArgs[4]).toBeNull(); // protein
      expect(insertArgs[5]).toBeNull(); // carbs
      expect(insertArgs[6]).toBeNull(); // fat
      expect(insertArgs[7]).toBeNull(); // description
    });

    it('throws when findById returns null after insert', async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValue(null);

      await expect(
        quickAddRepository.create({
          date: '2024-06-15',
          mealType: 'lunch',
          calories: 500,
        })
      ).rejects.toThrow('Failed to create quick add entry');
    });
  });

  // ─── update ────────────────────────────────────────────────

  describe('update', () => {
    it('updates with partial fields', async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValue({
        id: 'qa-1',
        date: '2024-06-15',
        meal_type: 'lunch',
        calories: 600,
        protein: 35,
        carbs: 50,
        fat: 20,
        description: 'Chicken salad',
        created_at: '2024-06-15T12:00:00.000Z',
        updated_at: '2024-06-15T13:00:00.000Z',
      });

      const result = await quickAddRepository.update('qa-1', {
        calories: 600,
        protein: 35,
      });

      expect(result.calories).toBe(600);
      expect(result.protein).toBe(35);

      const updateQuery = mockRunAsync.mock.calls[0][0] as string;
      expect(updateQuery).toContain('calories = ?');
      expect(updateQuery).toContain('protein = ?');
      expect(updateQuery).toContain('updated_at = ?');

      // id should be last in the values array
      const updateArgs = mockRunAsync.mock.calls[0][1] as any[];
      expect(updateArgs[updateArgs.length - 1]).toBe('qa-1');
    });

    it('updates mealType and description', async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValue({
        id: 'qa-1',
        date: '2024-06-15',
        meal_type: 'dinner',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        description: 'Updated description',
        created_at: '2024-06-15T12:00:00.000Z',
        updated_at: '2024-06-15T13:00:00.000Z',
      });

      const result = await quickAddRepository.update('qa-1', {
        mealType: 'dinner',
        description: 'Updated description',
      });

      expect(result.mealType).toBe('dinner');
      expect(result.description).toBe('Updated description');

      const updateQuery = mockRunAsync.mock.calls[0][0] as string;
      expect(updateQuery).toContain('meal_type = ?');
      expect(updateQuery).toContain('description = ?');
    });

    it('throws when entry not found after update', async () => {
      mockRunAsync.mockResolvedValue({ changes: 0 });
      mockGetFirstAsync.mockResolvedValue(null);

      await expect(
        quickAddRepository.update('non-existent', { calories: 600 })
      ).rejects.toThrow('Quick add entry not found');
    });
  });

  // ─── delete ────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes entry by id', async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await quickAddRepository.delete('qa-1');

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM quick_add_entries WHERE id = ?'),
        ['qa-1']
      );
    });
  });

  // ─── deleteByDate ──────────────────────────────────────────

  describe('deleteByDate', () => {
    it('deletes all entries for a date', async () => {
      mockRunAsync.mockResolvedValue({ changes: 3 });

      await quickAddRepository.deleteByDate('2024-06-15');

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM quick_add_entries WHERE date = ?'),
        ['2024-06-15']
      );
    });
  });

  // ─── createBatch ───────────────────────────────────────────

  describe('createBatch', () => {
    it('inserts items in a batch', async () => {
      mockRunAsync.mockResolvedValue({ changes: 2 });

      await quickAddRepository.createBatch([
        { date: '2024-06-15', mealType: 'lunch', calories: 500, protein: 30, carbs: 50, fat: 20, description: 'Item 1' },
        { date: '2024-06-15', mealType: 'snack', calories: 200, protein: 10, carbs: 25, fat: 8, description: 'Item 2' },
      ]);

      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      const query = mockRunAsync.mock.calls[0][0] as string;
      expect(query).toContain('INSERT INTO quick_add_entries');
      // Two rows of placeholders
      expect(query).toContain('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

      const values = mockRunAsync.mock.calls[0][1] as any[];
      // 2 items * 10 fields = 20 values
      expect(values).toHaveLength(20);
    });

    it('does nothing for an empty array', async () => {
      await quickAddRepository.createBatch([]);

      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('chunks large batches into groups of 50', async () => {
      const inputs = Array.from({ length: 75 }, (_, i) => ({
        date: '2024-06-15',
        mealType: 'snack',
        calories: 100 + i,
      }));

      mockRunAsync.mockResolvedValue({ changes: 50 });

      await quickAddRepository.createBatch(inputs);

      // 75 items should result in 2 chunks: 50 + 25
      expect(mockRunAsync).toHaveBeenCalledTimes(2);

      const firstCallValues = mockRunAsync.mock.calls[0][1] as any[];
      expect(firstCallValues).toHaveLength(500); // 50 * 10

      const secondCallValues = mockRunAsync.mock.calls[1][1] as any[];
      expect(secondCallValues).toHaveLength(250); // 25 * 10
    });
  });

  // ─── exists ────────────────────────────────────────────────

  describe('exists', () => {
    it('returns true when entry exists', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 1 });

      const result = await quickAddRepository.exists('qa-1');

      expect(result).toBe(true);
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count'),
        ['qa-1']
      );
    });

    it('returns false when entry does not exist', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 0 });

      const result = await quickAddRepository.exists('non-existent');

      expect(result).toBe(false);
    });

    it('returns false when query returns null', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await quickAddRepository.exists('non-existent');

      expect(result).toBe(false);
    });
  });
});
