/**
 * Meal Plan Repository Tests
 * Tests for meal planning data access: settings, CRUD, queries, copy, clear, stats
 */

import {
  mealPlanRepository,
  DEFAULT_MEAL_PLAN_SETTINGS,
  CreatePlannedMealInput,
} from '@/repositories/mealPlanRepository';
import { generateId } from '@/utils/generateId';

// ─── Mocks ──────────────────────────────────────────────────

const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();
const mockWithTransactionAsync = jest.fn();

const mockDb = {
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
  runAsync: mockRunAsync,
  withTransactionAsync: mockWithTransactionAsync,
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-uuid-meal'),
}));

// ─── Fixtures ───────────────────────────────────────────────

const mockSettingsRow = {
  id: 1,
  enabled: 1,
  show_on_today: 1,
  reminder_time: null,
  created_at: '2024-01-01T00:00:00.000Z',
  last_modified: '2024-01-01T00:00:00.000Z',
};

const mockMealRow = {
  id: 'meal-1',
  date: '2024-01-15',
  meal_slot: 'breakfast',
  food_id: 'food-1',
  food_name: 'Oatmeal',
  servings: 1,
  calories: 300,
  protein: 10,
  carbs: 50,
  fat: 8,
  status: 'planned',
  logged_at: null,
  created_at: '2024-01-15T08:00:00.000Z',
};

const makeMealRow = (overrides: Record<string, unknown> = {}) => ({
  ...mockMealRow,
  ...overrides,
});

// ─── Test Suite ─────────────────────────────────────────────

describe('mealPlanRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // DEFAULT_MEAL_PLAN_SETTINGS
  // =========================================================

  describe('DEFAULT_MEAL_PLAN_SETTINGS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_MEAL_PLAN_SETTINGS).toEqual({
        enabled: false,
        showOnToday: true,
      });
    });

    it('does not include createdAt or lastModified', () => {
      expect(DEFAULT_MEAL_PLAN_SETTINGS).not.toHaveProperty('createdAt');
      expect(DEFAULT_MEAL_PLAN_SETTINGS).not.toHaveProperty('lastModified');
    });
  });

  // =========================================================
  // Settings
  // =========================================================

  describe('getSettings', () => {
    it('returns mapped settings when row exists', async () => {
      mockGetFirstAsync.mockResolvedValue(mockSettingsRow);

      const result = await mealPlanRepository.getSettings();

      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM meal_plan_settings WHERE id = 1'
      );
      expect(result).toEqual({
        enabled: true,
        showOnToday: true,
        reminderTime: undefined,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-01T00:00:00.000Z',
      });
    });

    it('returns null when no settings exist', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await mealPlanRepository.getSettings();

      expect(result).toBeNull();
    });

    it('maps reminderTime from row when present', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockSettingsRow,
        reminder_time: '08:00',
      });

      const result = await mealPlanRepository.getSettings();

      expect(result?.reminderTime).toBe('08:00');
    });

    it('maps enabled=0 to false', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockSettingsRow,
        enabled: 0,
        show_on_today: 0,
      });

      const result = await mealPlanRepository.getSettings();

      expect(result?.enabled).toBe(false);
      expect(result?.showOnToday).toBe(false);
    });
  });

  describe('getOrCreateSettings', () => {
    it('returns existing settings when found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockSettingsRow);

      const result = await mealPlanRepository.getOrCreateSettings();

      expect(result).toEqual(expect.objectContaining({ enabled: true }));
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('creates settings when none exist, then returns them', async () => {
      // First call: getSettings -> null (no existing)
      // After INSERT, getSettings is called again -> returns new row
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // first getSettings
        .mockResolvedValueOnce({
          ...mockSettingsRow,
          enabled: 0,
          show_on_today: 1,
        }); // second getSettings (after insert)

      const result = await mealPlanRepository.getOrCreateSettings();

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO meal_plan_settings'),
        expect.arrayContaining([expect.any(String), expect.any(String)])
      );
      expect(result).toEqual(
        expect.objectContaining({
          enabled: false,
          showOnToday: true,
        })
      );
    });
  });

  describe('updateSettings', () => {
    it('updates enabled flag', async () => {
      // getOrCreateSettings -> getSettings finds existing
      // Then updateSettings runs UPDATE
      // Then final getSettings returns updated row
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSettingsRow) // getOrCreateSettings -> getSettings
        .mockResolvedValueOnce({ ...mockSettingsRow, enabled: 0 }); // final getSettings

      const result = await mealPlanRepository.updateSettings({ enabled: false });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE meal_plan_settings SET'),
        expect.arrayContaining([expect.any(String), 0])
      );
      expect(result.enabled).toBe(false);
    });

    it('updates showOnToday flag', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSettingsRow)
        .mockResolvedValueOnce({ ...mockSettingsRow, show_on_today: 0 });

      await mealPlanRepository.updateSettings({ showOnToday: false });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('show_on_today = ?'),
        expect.arrayContaining([0])
      );
    });

    it('updates reminderTime', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSettingsRow)
        .mockResolvedValueOnce({ ...mockSettingsRow, reminder_time: '09:00' });

      const result = await mealPlanRepository.updateSettings({
        reminderTime: '09:00',
      });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('reminder_time = ?'),
        expect.arrayContaining(['09:00'])
      );
      expect(result.reminderTime).toBe('09:00');
    });

    it('sets reminderTime to null when empty string', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSettingsRow)
        .mockResolvedValueOnce({ ...mockSettingsRow, reminder_time: null });

      await mealPlanRepository.updateSettings({ reminderTime: '' });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('reminder_time = ?'),
        expect.arrayContaining([null])
      );
    });

    it('always includes last_modified in update', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockSettingsRow)
        .mockResolvedValueOnce(mockSettingsRow);

      await mealPlanRepository.updateSettings({ enabled: true });

      const [sql] = mockRunAsync.mock.calls[0];
      expect(sql).toContain('last_modified = ?');
    });
  });

  // =========================================================
  // Planned Meals CRUD
  // =========================================================

  describe('getMealById', () => {
    it('returns mapped meal when found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockMealRow);

      const result = await mealPlanRepository.getMealById('meal-1');

      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM planned_meals WHERE id = ?',
        ['meal-1']
      );
      expect(result).toEqual({
        id: 'meal-1',
        date: '2024-01-15',
        mealSlot: 'breakfast',
        foodId: 'food-1',
        foodName: 'Oatmeal',
        servings: 1,
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 8,
        status: 'planned',
        loggedAt: undefined,
        createdAt: '2024-01-15T08:00:00.000Z',
      });
    });

    it('returns null when meal not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await mealPlanRepository.getMealById('nonexistent');

      expect(result).toBeNull();
    });

    it('maps loggedAt when present', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockMealRow,
        status: 'logged',
        logged_at: '2024-01-15T12:30:00.000Z',
      });

      const result = await mealPlanRepository.getMealById('meal-1');

      expect(result?.loggedAt).toBe('2024-01-15T12:30:00.000Z');
      expect(result?.status).toBe('logged');
    });
  });

  describe('createMeal', () => {
    const input: CreatePlannedMealInput = {
      date: '2024-01-15',
      mealSlot: 'breakfast',
      foodId: 'food-1',
      foodName: 'Oatmeal',
      servings: 1.5,
      calories: 300,
      protein: 10,
      carbs: 50,
      fat: 8,
    };

    it('inserts meal and returns it', async () => {
      mockGetFirstAsync.mockResolvedValue(
        makeMealRow({ id: 'test-uuid-meal', servings: 1.5 })
      );

      const result = await mealPlanRepository.createMeal(input);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO planned_meals'),
        expect.arrayContaining([
          'test-uuid-meal',
          '2024-01-15',
          'breakfast',
          'food-1',
          'Oatmeal',
          1.5,
          300,
          10,
          50,
          8,
        ])
      );
      expect(generateId).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('defaults servings to 1 when not provided', async () => {
      const { servings, ...inputNoServings } = input;
      mockGetFirstAsync.mockResolvedValue(makeMealRow({ id: 'test-uuid-meal' }));

      await mealPlanRepository.createMeal(inputNoServings);

      const [, params] = mockRunAsync.mock.calls[0];
      // servings is the 6th parameter (index 5)
      expect(params[5]).toBe(1);
    });
  });

  describe('updateMealStatus', () => {
    it('updates status and loggedAt', async () => {
      mockGetFirstAsync.mockResolvedValue(
        makeMealRow({ status: 'logged', logged_at: '2024-01-15T12:00:00Z' })
      );

      const result = await mealPlanRepository.updateMealStatus(
        'meal-1',
        'logged',
        '2024-01-15T12:00:00Z'
      );

      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE planned_meals SET status = ?, logged_at = ? WHERE id = ?',
        ['logged', '2024-01-15T12:00:00Z', 'meal-1']
      );
      expect(result.status).toBe('logged');
    });

    it('sets logged_at to null when not provided', async () => {
      mockGetFirstAsync.mockResolvedValue(
        makeMealRow({ status: 'skipped', logged_at: null })
      );

      await mealPlanRepository.updateMealStatus('meal-1', 'skipped');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE planned_meals SET status = ?, logged_at = ? WHERE id = ?',
        ['skipped', null, 'meal-1']
      );
    });
  });

  describe('deleteMeal', () => {
    it('deletes meal by id', async () => {
      await mealPlanRepository.deleteMeal('meal-1');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM planned_meals WHERE id = ?',
        ['meal-1']
      );
    });
  });

  // =========================================================
  // Queries
  // =========================================================

  describe('getMealsForDate', () => {
    it('returns mapped meals for a date', async () => {
      mockGetAllAsync.mockResolvedValue([
        mockMealRow,
        makeMealRow({
          id: 'meal-2',
          meal_slot: 'lunch',
          food_name: 'Chicken Salad',
          calories: 450,
        }),
      ]);

      const result = await mealPlanRepository.getMealsForDate('2024-01-15');

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM planned_meals WHERE date = ? ORDER BY meal_slot, created_at',
        ['2024-01-15']
      );
      expect(result).toHaveLength(2);
      expect(result[0].foodName).toBe('Oatmeal');
      expect(result[1].foodName).toBe('Chicken Salad');
    });

    it('returns empty array when no meals for date', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await mealPlanRepository.getMealsForDate('2024-01-20');

      expect(result).toEqual([]);
    });
  });

  describe('getMealsForDateRange', () => {
    it('returns meals within the range', async () => {
      mockGetAllAsync.mockResolvedValue([
        makeMealRow({ date: '2024-01-15' }),
        makeMealRow({ id: 'meal-2', date: '2024-01-16' }),
        makeMealRow({ id: 'meal-3', date: '2024-01-17' }),
      ]);

      const result = await mealPlanRepository.getMealsForDateRange(
        '2024-01-15',
        '2024-01-17'
      );

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE date >= ? AND date <= ?'),
        ['2024-01-15', '2024-01-17']
      );
      expect(result).toHaveLength(3);
    });
  });

  describe('getPlannedMealsForToday', () => {
    it('calls getMealsForDate with today\'s date', async () => {
      mockGetAllAsync.mockResolvedValue([mockMealRow]);

      const result = await mealPlanRepository.getPlannedMealsForToday();

      // Verify the date arg is today in YYYY-MM-DD format
      const [, params] = mockGetAllAsync.mock.calls[0];
      expect(params[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toHaveLength(1);
    });
  });

  describe('getPendingMealsForToday', () => {
    it('returns only planned-status meals for today', async () => {
      mockGetAllAsync.mockResolvedValue([mockMealRow]);

      const result = await mealPlanRepository.getPendingMealsForToday();

      const [sql] = mockGetAllAsync.mock.calls[0];
      expect(sql).toContain("status = 'planned'");
      expect(result).toHaveLength(1);
    });
  });

  describe('getDayMealPlan', () => {
    it('organizes meals into slots and computes totals', async () => {
      mockGetAllAsync.mockResolvedValue([
        makeMealRow({
          id: 'meal-1',
          meal_slot: 'breakfast',
          servings: 2,
          calories: 300,
          protein: 10,
          carbs: 50,
          fat: 8,
        }),
        makeMealRow({
          id: 'meal-2',
          meal_slot: 'lunch',
          servings: 1,
          calories: 500,
          protein: 35,
          carbs: 40,
          fat: 20,
        }),
        makeMealRow({
          id: 'meal-3',
          meal_slot: 'dinner',
          servings: 1,
          calories: 600,
          protein: 40,
          carbs: 60,
          fat: 15,
        }),
        makeMealRow({
          id: 'meal-4',
          meal_slot: 'snacks',
          servings: 1,
          calories: 200,
          protein: 5,
          carbs: 30,
          fat: 10,
        }),
      ]);

      const result = await mealPlanRepository.getDayMealPlan('2024-01-15');

      expect(result.date).toBe('2024-01-15');
      expect(result.meals.breakfast).toHaveLength(1);
      expect(result.meals.lunch).toHaveLength(1);
      expect(result.meals.dinner).toHaveLength(1);
      expect(result.meals.snacks).toHaveLength(1);

      // Totals should multiply by servings:
      // breakfast: 300*2=600, lunch: 500*1=500, dinner: 600*1=600, snacks: 200*1=200
      expect(result.totalCalories).toBe(600 + 500 + 600 + 200); // 1900
      expect(result.totalProtein).toBe(10 * 2 + 35 + 40 + 5);  // 100
      expect(result.totalCarbs).toBe(50 * 2 + 40 + 60 + 30);   // 230
      expect(result.totalFat).toBe(8 * 2 + 20 + 15 + 10);      // 61
    });

    it('returns empty slots and zero totals when no meals', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await mealPlanRepository.getDayMealPlan('2024-01-20');

      expect(result.date).toBe('2024-01-20');
      expect(result.meals.breakfast).toEqual([]);
      expect(result.meals.lunch).toEqual([]);
      expect(result.meals.dinner).toEqual([]);
      expect(result.meals.snacks).toEqual([]);
      expect(result.totalCalories).toBe(0);
      expect(result.totalProtein).toBe(0);
      expect(result.totalCarbs).toBe(0);
      expect(result.totalFat).toBe(0);
    });

    it('groups multiple meals in the same slot', async () => {
      mockGetAllAsync.mockResolvedValue([
        makeMealRow({ id: 'meal-1', meal_slot: 'breakfast', calories: 200, servings: 1 }),
        makeMealRow({ id: 'meal-2', meal_slot: 'breakfast', calories: 150, servings: 1 }),
      ]);

      const result = await mealPlanRepository.getDayMealPlan('2024-01-15');

      expect(result.meals.breakfast).toHaveLength(2);
      expect(result.totalCalories).toBe(350);
    });
  });

  // =========================================================
  // Copy Operations
  // =========================================================

  describe('copyMealToDate', () => {
    it('copies a meal to a target date', async () => {
      // getMealById returns source meal
      mockGetFirstAsync
        .mockResolvedValueOnce(mockMealRow) // getMealById for source
        .mockResolvedValueOnce(makeMealRow({ id: 'test-uuid-meal', date: '2024-01-20' })); // getMealById for created meal

      const result = await mealPlanRepository.copyMealToDate('meal-1', '2024-01-20');

      // createMeal should be called via runAsync with INSERT
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO planned_meals'),
        expect.arrayContaining(['test-uuid-meal', '2024-01-20', 'breakfast'])
      );
      expect(result).toBeDefined();
    });

    it('throws when source meal not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      await expect(
        mealPlanRepository.copyMealToDate('nonexistent', '2024-01-20')
      ).rejects.toThrow('Meal not found');
    });
  });

  describe('copySlotToDate', () => {
    it('copies only meals from the specified slot', async () => {
      mockWithTransactionAsync.mockImplementation(async (cb: () => Promise<void>) => cb());

      const breakfastMeal = makeMealRow({ id: 'meal-1', meal_slot: 'breakfast' });
      const lunchMeal = makeMealRow({ id: 'meal-2', meal_slot: 'lunch' });

      // getMealsForDate returns meals from multiple slots
      mockGetAllAsync
        .mockResolvedValueOnce([breakfastMeal, lunchMeal]) // getMealsForDate for source
        .mockResolvedValueOnce([makeMealRow({ id: 'test-uuid-meal', date: '2024-01-20' })]); // fetch after bulk copy

      await mealPlanRepository.copySlotToDate('2024-01-15', 'breakfast', '2024-01-20');

      // Should only insert 1 meal (breakfast), not lunch
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO planned_meals'),
        expect.arrayContaining(['test-uuid-meal', '2024-01-20', 'breakfast'])
      );
    });
  });

  describe('copyDayToDate', () => {
    it('copies all meals from source date to target date', async () => {
      mockWithTransactionAsync.mockImplementation(async (cb: () => Promise<void>) => cb());

      const meals = [
        makeMealRow({ id: 'meal-1', meal_slot: 'breakfast' }),
        makeMealRow({ id: 'meal-2', meal_slot: 'lunch' }),
      ];

      mockGetAllAsync
        .mockResolvedValueOnce(meals) // getMealsForDate for source
        .mockResolvedValueOnce([]); // fetch after bulk copy

      await mealPlanRepository.copyDayToDate('2024-01-15', '2024-01-20');

      expect(mockWithTransactionAsync).toHaveBeenCalled();
      // The bulk insert should have 2 sets of placeholders
      const [sql] = mockRunAsync.mock.calls[0];
      expect(sql).toContain('VALUES');
    });
  });

  describe('copyDayToMultipleDates', () => {
    it('copies meals to each target date', async () => {
      mockWithTransactionAsync.mockImplementation(async (cb: () => Promise<void>) => cb());

      const meals = [makeMealRow({ id: 'meal-1' })];

      mockGetAllAsync
        .mockResolvedValueOnce(meals) // getMealsForDate for source
        .mockResolvedValueOnce([]) // fetch after first bulk copy
        .mockResolvedValueOnce([]); // fetch after second bulk copy

      await mealPlanRepository.copyDayToMultipleDates('2024-01-15', [
        '2024-01-20',
        '2024-01-21',
      ]);

      // withTransactionAsync called once per target date
      expect(mockWithTransactionAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('_bulkCopyMeals', () => {
    it('returns empty array when no meals to copy', async () => {
      const result = await mealPlanRepository._bulkCopyMeals([], '2024-01-20');

      expect(result).toEqual([]);
      expect(mockWithTransactionAsync).not.toHaveBeenCalled();
    });

    it('inserts meals in a transaction and returns them', async () => {
      mockWithTransactionAsync.mockImplementation(async (cb: () => Promise<void>) => cb());

      const sourceMeals = [
        {
          id: 'meal-1',
          date: '2024-01-15',
          mealSlot: 'breakfast' as const,
          foodId: 'food-1',
          foodName: 'Oatmeal',
          servings: 1,
          calories: 300,
          protein: 10,
          carbs: 50,
          fat: 8,
          status: 'planned' as const,
          loggedAt: undefined,
          createdAt: '2024-01-15T08:00:00.000Z',
        },
      ];

      mockGetAllAsync.mockResolvedValueOnce([
        makeMealRow({ id: 'test-uuid-meal', date: '2024-01-20' }),
      ]);

      const result = await mealPlanRepository._bulkCopyMeals(sourceMeals, '2024-01-20');

      expect(mockWithTransactionAsync).toHaveBeenCalled();
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO planned_meals'),
        expect.arrayContaining(['test-uuid-meal', '2024-01-20'])
      );
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM planned_meals WHERE id IN'),
        ['test-uuid-meal']
      );
      expect(result).toHaveLength(1);
    });
  });

  // =========================================================
  // Clear Operations
  // =========================================================

  describe('clearDay', () => {
    it('deletes all meals for a date', async () => {
      await mealPlanRepository.clearDay('2024-01-15');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM planned_meals WHERE date = ?',
        ['2024-01-15']
      );
    });
  });

  describe('clearSlot', () => {
    it('deletes meals for a specific date and slot', async () => {
      await mealPlanRepository.clearSlot('2024-01-15', 'breakfast');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM planned_meals WHERE date = ? AND meal_slot = ?',
        ['2024-01-15', 'breakfast']
      );
    });
  });

  // =========================================================
  // Statistics
  // =========================================================

  describe('getWeeklyStats', () => {
    it('returns computed weekly statistics', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce({ planned: 5, logged: 10, skipped: 2 })
        .mockResolvedValueOnce({ avg_cal: 1850.5 });

      const result = await mealPlanRepository.getWeeklyStats(
        '2024-01-15',
        '2024-01-21'
      );

      expect(result).toEqual({
        mealsPlanned: 15, // planned (5) + logged (10)
        mealsLogged: 10,
        mealsSkipped: 2,
        avgDailyCalories: 1851, // Math.round(1850.5)
      });
    });

    it('handles null results gracefully', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await mealPlanRepository.getWeeklyStats(
        '2024-01-15',
        '2024-01-21'
      );

      expect(result).toEqual({
        mealsPlanned: 0,
        mealsLogged: 0,
        mealsSkipped: 0,
        avgDailyCalories: 0,
      });
    });

    it('handles zero counts', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce({ planned: 0, logged: 0, skipped: 0 })
        .mockResolvedValueOnce({ avg_cal: 0 });

      const result = await mealPlanRepository.getWeeklyStats(
        '2024-01-15',
        '2024-01-21'
      );

      expect(result).toEqual({
        mealsPlanned: 0,
        mealsLogged: 0,
        mealsSkipped: 0,
        avgDailyCalories: 0,
      });
    });

    it('queries correct date range', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce({ planned: 0, logged: 0, skipped: 0 })
        .mockResolvedValueOnce({ avg_cal: 0 });

      await mealPlanRepository.getWeeklyStats('2024-01-15', '2024-01-21');

      expect(mockGetFirstAsync).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM planned_meals'),
        ['2024-01-15', '2024-01-21']
      );
      expect(mockGetFirstAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('AVG(daily_cal)'),
        ['2024-01-15', '2024-01-21']
      );
    });
  });
});
