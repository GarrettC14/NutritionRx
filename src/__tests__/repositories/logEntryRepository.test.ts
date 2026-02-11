/**
 * Log Entry Repository Tests
 * Tests for food log entry data access
 */

import { logEntryRepository } from '@/repositories/logEntryRepository';
import { MealType } from '@/constants/mealTypes';

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
  mapLogEntryRowToDomain: jest.fn((row) => ({
    id: row?.id,
    foodItemId: row?.food_item_id,
    foodName: row?.food_name,
    foodBrand: row?.food_brand ?? undefined,
    date: row?.date,
    mealType: row?.meal_type,
    servings: row?.servings,
    calories: row?.calories,
    protein: row?.protein,
    carbs: row?.carbs,
    fat: row?.fat,
    notes: row?.notes ?? undefined,
  })),
}));

describe('logEntryRepository', () => {
  beforeEach(() => {
    mockDb.getFirstAsync.mockReset();
    mockDb.getAllAsync.mockReset();
    mockDb.runAsync.mockReset();
  });

  const mockLogEntryRow = {
    id: 'entry-1',
    food_item_id: 'food-1',
    date: '2024-01-15',
    meal_type: 'breakfast',
    servings: 1.5,
    calories: 350,
    protein: 25,
    carbs: 40,
    fat: 10,
    notes: 'Tasty meal',
    food_name: 'Oatmeal',
    food_brand: 'Quaker',
    created_at: '2024-01-15T08:00:00.000Z',
    updated_at: '2024-01-15T08:00:00.000Z',
  };

  // ─── findById ───────────────────────────────────────────────

  describe('findById', () => {
    it('returns mapped log entry when row exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(mockLogEntryRow);

      const result = await logEntryRepository.findById('entry-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('entry-1');
      expect(result!.foodName).toBe('Oatmeal');
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('JOIN food_items fi ON le.food_item_id = fi.id'),
        ['entry-1']
      );
    });

    it('returns null when row does not exist', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await logEntryRepository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('passes the id as a SQL parameter', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      await logEntryRepository.findById('my-id');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE le.id = ?'),
        ['my-id']
      );
    });
  });

  // ─── findByDate ─────────────────────────────────────────────

  describe('findByDate', () => {
    it('returns mapped entries for the given date', async () => {
      mockDb.getAllAsync.mockResolvedValue([mockLogEntryRow]);

      const result = await logEntryRepository.findByDate('2024-01-15');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entry-1');
    });

    it('orders by meal_type priority then created_at', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await logEntryRepository.findByDate('2024-01-15');

      const sql = mockDb.getAllAsync.mock.calls[0][0] as string;
      expect(sql).toContain("WHEN 'breakfast' THEN 1");
      expect(sql).toContain("WHEN 'lunch' THEN 2");
      expect(sql).toContain("WHEN 'dinner' THEN 3");
      expect(sql).toContain("WHEN 'snack' THEN 4");
      expect(sql).toContain('le.created_at');
    });

    it('returns empty array when no entries exist', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await logEntryRepository.findByDate('2024-12-31');

      expect(result).toEqual([]);
    });

    it('passes date as SQL parameter', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await logEntryRepository.findByDate('2024-01-15');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE le.date = ?'),
        ['2024-01-15']
      );
    });
  });

  // ─── findByDateAndMeal ──────────────────────────────────────

  describe('findByDateAndMeal', () => {
    it('filters by both date and meal type', async () => {
      mockDb.getAllAsync.mockResolvedValue([mockLogEntryRow]);

      const result = await logEntryRepository.findByDateAndMeal('2024-01-15', MealType.Breakfast);

      expect(result).toHaveLength(1);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE le.date = ? AND le.meal_type = ?'),
        ['2024-01-15', 'breakfast']
      );
    });

    it('orders results by created_at', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await logEntryRepository.findByDateAndMeal('2024-01-15', MealType.Lunch);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY le.created_at'),
        expect.any(Array)
      );
    });

    it('returns empty array when no entries match', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await logEntryRepository.findByDateAndMeal('2024-01-15', MealType.Snack);

      expect(result).toEqual([]);
    });
  });

  // ─── findByDateRange ────────────────────────────────────────

  describe('findByDateRange', () => {
    it('uses BETWEEN for the date range', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await logEntryRepository.findByDateRange('2024-01-01', '2024-01-31');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE le.date BETWEEN ? AND ?'),
        ['2024-01-01', '2024-01-31']
      );
    });

    it('returns mapped entries within the range', async () => {
      const rows = [
        { ...mockLogEntryRow, id: 'e1', date: '2024-01-10' },
        { ...mockLogEntryRow, id: 'e2', date: '2024-01-20' },
      ];
      mockDb.getAllAsync.mockResolvedValue(rows);

      const result = await logEntryRepository.findByDateRange('2024-01-01', '2024-01-31');

      expect(result).toHaveLength(2);
    });
  });

  // ─── getAll ─────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns all entries ordered by date DESC', async () => {
      mockDb.getAllAsync.mockResolvedValue([mockLogEntryRow]);

      const result = await logEntryRepository.getAll();

      expect(result).toHaveLength(1);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY le.date DESC')
      );
    });

    it('returns empty array when no entries exist', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await logEntryRepository.getAll();

      expect(result).toEqual([]);
    });
  });

  // ─── getDailyTotals ────────────────────────────────────────

  describe('getDailyTotals', () => {
    it('returns totals from the UNION ALL query', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        total_calories: 2100,
        total_protein: 140,
        total_carbs: 230,
        total_fat: 70,
      });

      const result = await logEntryRepository.getDailyTotals('2024-01-15');

      expect(result).toEqual({
        calories: 2100,
        protein: 140,
        carbs: 230,
        fat: 70,
      });
    });

    it('returns zeros when result is null', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await logEntryRepository.getDailyTotals('2024-01-15');

      expect(result).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    });

    it('returns zeros when individual fields are null', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        total_calories: null,
        total_protein: null,
        total_carbs: null,
        total_fat: null,
      });

      const result = await logEntryRepository.getDailyTotals('2024-01-15');

      expect(result).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    });

    it('queries both log_entries and quick_add_entries via UNION ALL', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
      });

      await logEntryRepository.getDailyTotals('2024-01-15');

      const sql = mockDb.getFirstAsync.mock.calls[0][0] as string;
      expect(sql).toContain('UNION ALL');
      expect(sql).toContain('log_entries');
      expect(sql).toContain('quick_add_entries');
    });

    it('passes the date twice for both sub-queries', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
      });

      await logEntryRepository.getDailyTotals('2024-01-15');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['2024-01-15', '2024-01-15']
      );
    });
  });

  // ─── getDailyTotalsForRange ─────────────────────────────────

  describe('getDailyTotalsForRange', () => {
    it('returns array of date + totals objects', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { date: '2024-01-14', total_calories: 1800, total_protein: 120, total_carbs: 200, total_fat: 60 },
        { date: '2024-01-15', total_calories: 2100, total_protein: 140, total_carbs: 230, total_fat: 70 },
      ]);

      const result = await logEntryRepository.getDailyTotalsForRange('2024-01-14', '2024-01-15');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01-14',
        totals: { calories: 1800, protein: 120, carbs: 200, fat: 60 },
      });
      expect(result[1]).toEqual({
        date: '2024-01-15',
        totals: { calories: 2100, protein: 140, carbs: 230, fat: 70 },
      });
    });

    it('passes start/end dates four times for both sub-queries', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await logEntryRepository.getDailyTotalsForRange('2024-01-01', '2024-01-31');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['2024-01-01', '2024-01-31', '2024-01-01', '2024-01-31']
      );
    });

    it('returns empty array when no data in range', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await logEntryRepository.getDailyTotalsForRange('2024-06-01', '2024-06-30');

      expect(result).toEqual([]);
    });
  });

  // ─── create ─────────────────────────────────────────────────

  describe('create', () => {
    const createInput = {
      foodItemId: 'food-1',
      date: '2024-01-15',
      mealType: MealType.Breakfast,
      servings: 1.5,
      calories: 350,
      protein: 25,
      carbs: 40,
      fat: 10,
      notes: 'Morning oatmeal',
    };

    it('generates an id and timestamp, then inserts', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockLogEntryRow);

      await logEntryRepository.create(createInput);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO log_entries'),
        expect.arrayContaining(['test-id-123', 'food-1', '2024-01-15', 'breakfast', 1.5, 350, 25, 40, 10, 'Morning oatmeal'])
      );
    });

    it('uses generated id test-id-123', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockLogEntryRow);

      await logEntryRepository.create(createInput);

      const insertArgs = mockDb.runAsync.mock.calls[0][1] as any[];
      expect(insertArgs[0]).toBe('test-id-123');
    });

    it('includes created_at and updated_at timestamps', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockLogEntryRow);

      await logEntryRepository.create(createInput);

      const insertArgs = mockDb.runAsync.mock.calls[0][1] as any[];
      // created_at and updated_at are the last two args
      expect(insertArgs[10]).toBe(now.toISOString());
      expect(insertArgs[11]).toBe(now.toISOString());

      jest.useRealTimers();
    });

    it('defaults notes to null when not provided', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockLogEntryRow);

      const inputWithoutNotes = { ...createInput };
      delete (inputWithoutNotes as any).notes;

      await logEntryRepository.create(inputWithoutNotes);

      const insertArgs = mockDb.runAsync.mock.calls[0][1] as any[];
      // notes is at index 9
      expect(insertArgs[9]).toBeNull();
    });

    it('calls findById after insert and returns the result', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockLogEntryRow);

      const result = await logEntryRepository.create(createInput);

      expect(result.id).toBe('entry-1');
      // getFirstAsync called once for findById
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE le.id = ?'),
        ['test-id-123']
      );
    });

    it('throws error when findById returns null after insert', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(null);

      await expect(logEntryRepository.create(createInput)).rejects.toThrow(
        'Failed to create log entry'
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────

  describe('update', () => {
    it('only includes provided fields in the SET clause', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockLogEntryRow);

      await logEntryRepository.update('entry-1', { calories: 400 });

      const sql = mockDb.runAsync.mock.calls[0][0] as string;
      expect(sql).toContain('updated_at = ?');
      expect(sql).toContain('calories = ?');
      expect(sql).not.toContain('servings = ?');
      expect(sql).not.toContain('protein = ?');
      expect(sql).not.toContain('carbs = ?');
      expect(sql).not.toContain('fat = ?');
      expect(sql).not.toContain('meal_type = ?');
      expect(sql).not.toContain('notes = ?');
    });

    it('includes multiple fields when provided', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockLogEntryRow);

      await logEntryRepository.update('entry-1', {
        servings: 2,
        calories: 500,
        protein: 30,
        mealType: MealType.Lunch,
      });

      const sql = mockDb.runAsync.mock.calls[0][0] as string;
      expect(sql).toContain('servings = ?');
      expect(sql).toContain('calories = ?');
      expect(sql).toContain('protein = ?');
      expect(sql).toContain('meal_type = ?');
    });

    it('always includes updated_at in the SET clause', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockLogEntryRow);

      await logEntryRepository.update('entry-1', { fat: 15 });

      const sql = mockDb.runAsync.mock.calls[0][0] as string;
      expect(sql).toContain('updated_at = ?');
    });

    it('appends the id as the last parameter', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(mockLogEntryRow);

      await logEntryRepository.update('entry-1', { calories: 400 });

      const values = mockDb.runAsync.mock.calls[0][1] as any[];
      expect(values[values.length - 1]).toBe('entry-1');
    });

    it('throws error when entry not found after update', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);
      mockDb.getFirstAsync.mockResolvedValue(null);

      await expect(
        logEntryRepository.update('nonexistent', { calories: 400 })
      ).rejects.toThrow('Log entry not found');
    });
  });

  // ─── delete ─────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the entry by id', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await logEntryRepository.delete('entry-1');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM log_entries WHERE id = ?',
        ['entry-1']
      );
    });
  });

  // ─── deleteByDate ───────────────────────────────────────────

  describe('deleteByDate', () => {
    it('deletes all entries for the given date', async () => {
      mockDb.runAsync.mockResolvedValue(undefined);

      await logEntryRepository.deleteByDate('2024-01-15');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM log_entries WHERE date = ?',
        ['2024-01-15']
      );
    });
  });

  // ─── exists ─────────────────────────────────────────────────

  describe('exists', () => {
    it('returns true when count is greater than 0', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 1 });

      const result = await logEntryRepository.exists('entry-1');

      expect(result).toBe(true);
    });

    it('returns false when count is 0', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      const result = await logEntryRepository.exists('nonexistent');

      expect(result).toBe(false);
    });

    it('returns false when result is null', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await logEntryRepository.exists('nonexistent');

      expect(result).toBe(false);
    });

    it('queries with COUNT(*)', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      await logEntryRepository.exists('entry-1');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        ['entry-1']
      );
    });
  });

  // ─── getDaysLoggedInRange ───────────────────────────────────

  describe('getDaysLoggedInRange', () => {
    it('returns distinct day count from union query', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ days_logged: 15 });

      const result = await logEntryRepository.getDaysLoggedInRange('2024-01-01', '2024-01-31');

      expect(result).toBe(15);
    });

    it('returns 0 when result is null', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await logEntryRepository.getDaysLoggedInRange('2024-01-01', '2024-01-31');

      expect(result).toBe(0);
    });

    it('passes dates four times for both sub-queries', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ days_logged: 0 });

      await logEntryRepository.getDaysLoggedInRange('2024-01-01', '2024-01-31');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['2024-01-01', '2024-01-31', '2024-01-01', '2024-01-31']
      );
    });

    it('uses COUNT(DISTINCT date) in the query', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ days_logged: 0 });

      await logEntryRepository.getDaysLoggedInRange('2024-01-01', '2024-01-31');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT date)'),
        expect.any(Array)
      );
    });
  });

  // ─── getDatesWithLogs ───────────────────────────────────────

  describe('getDatesWithLogs', () => {
    it('returns array of date strings', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { date: '2024-01-15' },
        { date: '2024-01-14' },
        { date: '2024-01-13' },
      ]);

      const result = await logEntryRepository.getDatesWithLogs();

      expect(result).toEqual(['2024-01-15', '2024-01-14', '2024-01-13']);
    });

    it('returns empty array when no logs exist', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await logEntryRepository.getDatesWithLogs();

      expect(result).toEqual([]);
    });

    it('uses DISTINCT and UNION ALL from both tables', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await logEntryRepository.getDatesWithLogs();

      const sql = mockDb.getAllAsync.mock.calls[0][0] as string;
      expect(sql).toContain('DISTINCT date');
      expect(sql).toContain('UNION ALL');
      expect(sql).toContain('log_entries');
      expect(sql).toContain('quick_add_entries');
    });

    it('orders results by date DESC', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await logEntryRepository.getDatesWithLogs();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY date DESC'),
        expect.any(Array)
      );
    });
  });
});
