/**
 * Meal Plan Store Tests
 * Tests for meal planning state management
 */

// Mock repositories
jest.mock('@/repositories', () => ({
  mealPlanRepository: {
    getOrCreateSettings: jest.fn(),
    updateSettings: jest.fn(),
    getPlannedMealsForToday: jest.fn(() => Promise.resolve([])),
    getMealsForDateRange: jest.fn(() => Promise.resolve([])),
    createMeal: jest.fn(),
    deleteMeal: jest.fn(),
    updateMealStatus: jest.fn(),
    copyMealToDate: jest.fn(),
    copySlotToDate: jest.fn(),
    copyDayToDate: jest.fn(),
    copyDayToMultipleDates: jest.fn(),
    clearDay: jest.fn(),
    clearSlot: jest.fn(),
    getDayMealPlan: jest.fn(),
  },
}));

import { useMealPlanStore } from '@/stores/mealPlanStore';
import { mealPlanRepository } from '@/repositories';
import { PlannedMeal, MealPlanSettings } from '@/types/planning';

const mockRepo = mealPlanRepository as jest.Mocked<typeof mealPlanRepository>;

const makeMeal = (overrides: Partial<PlannedMeal> = {}): PlannedMeal => ({
  id: 'meal-1',
  date: '2024-06-10',
  mealSlot: 'breakfast',
  foodId: 'food-1',
  foodName: 'Oatmeal',
  servings: 1,
  calories: 300,
  protein: 10,
  carbs: 50,
  fat: 5,
  status: 'planned',
  createdAt: '2024-06-10T08:00:00.000Z',
  ...overrides,
});

const makeSettings = (overrides: Partial<MealPlanSettings> = {}): MealPlanSettings => ({
  enabled: true,
  showOnToday: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  lastModified: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('mealPlanStore', () => {
  beforeEach(() => {
    useMealPlanStore.setState({
      settings: null,
      todayMeals: [],
      weekMeals: [],
      isLoading: false,
      isLoaded: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  // ============================================================
  // Initial State
  // ============================================================

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useMealPlanStore.getState();

      expect(state.settings).toBeNull();
      expect(state.todayMeals).toEqual([]);
      expect(state.weekMeals).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(false);
      expect(state.error).toBeNull();
    });

    it('selectedWeekStart is a valid Monday date string', () => {
      const state = useMealPlanStore.getState();
      // selectedWeekStart should be a YYYY-MM-DD string
      expect(state.selectedWeekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // It should be a Monday (day 1)
      const d = new Date(state.selectedWeekStart + 'T12:00:00');
      expect(d.getDay()).toBe(1);
    });
  });

  // ============================================================
  // Settings Actions
  // ============================================================

  describe('loadSettings', () => {
    it('loads settings from repository', async () => {
      const settings = makeSettings();
      mockRepo.getOrCreateSettings.mockResolvedValueOnce(settings);

      await useMealPlanStore.getState().loadSettings();

      const state = useMealPlanStore.getState();
      expect(state.settings).toEqual(settings);
      expect(state.isLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('sets isLoading true during load', async () => {
      let capturedLoading = false;
      mockRepo.getOrCreateSettings.mockImplementationOnce(async () => {
        capturedLoading = useMealPlanStore.getState().isLoading;
        return makeSettings();
      });

      await useMealPlanStore.getState().loadSettings();
      expect(capturedLoading).toBe(true);
    });

    it('sets error on failure', async () => {
      mockRepo.getOrCreateSettings.mockRejectedValueOnce(new Error('DB failure'));

      await useMealPlanStore.getState().loadSettings();

      const state = useMealPlanStore.getState();
      expect(state.error).toBe('DB failure');
      expect(state.isLoaded).toBe(true);
    });
  });

  describe('updateSettings', () => {
    it('updates settings via repository', async () => {
      const updated = makeSettings({ enabled: false });
      mockRepo.updateSettings.mockResolvedValueOnce(updated);

      await useMealPlanStore.getState().updateSettings({ enabled: false });

      expect(mockRepo.updateSettings).toHaveBeenCalledWith({ enabled: false });
      expect(useMealPlanStore.getState().settings).toEqual(updated);
    });

    it('sets error on failure', async () => {
      mockRepo.updateSettings.mockRejectedValueOnce(new Error('Update failed'));

      await useMealPlanStore.getState().updateSettings({ enabled: true });

      expect(useMealPlanStore.getState().error).toBe('Update failed');
    });
  });

  describe('enableMealPlanning / disableMealPlanning', () => {
    it('enableMealPlanning calls updateSettings with enabled: true', async () => {
      mockRepo.updateSettings.mockResolvedValueOnce(makeSettings({ enabled: true }));

      await useMealPlanStore.getState().enableMealPlanning();

      expect(mockRepo.updateSettings).toHaveBeenCalledWith({ enabled: true });
    });

    it('disableMealPlanning calls updateSettings with enabled: false', async () => {
      mockRepo.updateSettings.mockResolvedValueOnce(makeSettings({ enabled: false }));

      await useMealPlanStore.getState().disableMealPlanning();

      expect(mockRepo.updateSettings).toHaveBeenCalledWith({ enabled: false });
    });
  });

  // ============================================================
  // Load Actions
  // ============================================================

  describe('loadTodayMeals', () => {
    it('loads meals for today', async () => {
      const meals = [makeMeal(), makeMeal({ id: 'meal-2', mealSlot: 'lunch' })];
      mockRepo.getPlannedMealsForToday.mockResolvedValueOnce(meals);

      await useMealPlanStore.getState().loadTodayMeals();

      expect(useMealPlanStore.getState().todayMeals).toEqual(meals);
    });

    it('handles error gracefully without setting error state', async () => {
      mockRepo.getPlannedMealsForToday.mockRejectedValueOnce(new Error('fail'));

      await useMealPlanStore.getState().loadTodayMeals();

      // loadTodayMeals only logs to console, does not set error
      expect(useMealPlanStore.getState().todayMeals).toEqual([]);
    });
  });

  describe('loadWeekMeals', () => {
    it('loads meals for the selected week range', async () => {
      const meals = [makeMeal()];
      mockRepo.getMealsForDateRange.mockResolvedValueOnce(meals);

      useMealPlanStore.setState({ selectedWeekStart: '2024-06-10' });
      await useMealPlanStore.getState().loadWeekMeals();

      // Should call with Monday to Sunday range
      expect(mockRepo.getMealsForDateRange).toHaveBeenCalledWith('2024-06-10', '2024-06-16');
      expect(useMealPlanStore.getState().weekMeals).toEqual(meals);
    });

    it('accepts explicit weekStart parameter', async () => {
      mockRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().loadWeekMeals('2024-07-01');

      expect(mockRepo.getMealsForDateRange).toHaveBeenCalledWith('2024-07-01', '2024-07-07');
      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2024-07-01');
    });
  });

  describe('navigateWeek', () => {
    it('advances selectedWeekStart by 7 days when direction is next', () => {
      useMealPlanStore.setState({ selectedWeekStart: '2024-06-10' });
      mockRepo.getMealsForDateRange.mockResolvedValue([]);

      useMealPlanStore.getState().navigateWeek('next');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2024-06-17');
    });

    it('moves selectedWeekStart back by 7 days when direction is prev', () => {
      useMealPlanStore.setState({ selectedWeekStart: '2024-06-10' });
      mockRepo.getMealsForDateRange.mockResolvedValue([]);

      useMealPlanStore.getState().navigateWeek('prev');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2024-06-03');
    });

    it('navigating multiple times accumulates correctly', () => {
      useMealPlanStore.setState({ selectedWeekStart: '2024-06-10' });
      mockRepo.getMealsForDateRange.mockResolvedValue([]);

      useMealPlanStore.getState().navigateWeek('next');
      useMealPlanStore.getState().navigateWeek('next');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2024-06-24');
    });
  });

  describe('setSelectedWeek', () => {
    it('sets selectedWeekStart and triggers loadWeekMeals', () => {
      mockRepo.getMealsForDateRange.mockResolvedValue([]);

      useMealPlanStore.getState().setSelectedWeek('2024-08-05');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2024-08-05');
      expect(mockRepo.getMealsForDateRange).toHaveBeenCalled();
    });
  });

  // ============================================================
  // CRUD Actions
  // ============================================================

  describe('addPlannedMeal', () => {
    it('creates a meal and reloads week meals', async () => {
      const meal = makeMeal();
      mockRepo.createMeal.mockResolvedValueOnce(meal);
      mockRepo.getMealsForDateRange.mockResolvedValue([]);

      const result = await useMealPlanStore.getState().addPlannedMeal({
        date: '2024-06-10',
        mealSlot: 'breakfast',
        foodId: 'food-1',
        foodName: 'Oatmeal',
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      });

      expect(result).toEqual(meal);
      expect(mockRepo.createMeal).toHaveBeenCalled();
      expect(mockRepo.getMealsForDateRange).toHaveBeenCalled();
    });

    it('sets error on failure and re-throws', async () => {
      mockRepo.createMeal.mockRejectedValueOnce(new Error('Create failed'));

      await expect(
        useMealPlanStore.getState().addPlannedMeal({
          date: '2024-06-10',
          mealSlot: 'breakfast',
          foodId: 'food-1',
          foodName: 'Oatmeal',
          calories: 300,
          protein: 10,
          carbs: 50,
          fat: 5,
        })
      ).rejects.toThrow('Create failed');

      expect(useMealPlanStore.getState().error).toBe('Create failed');
    });
  });

  describe('deletePlannedMeal', () => {
    it('deletes meal and reloads today and week meals', async () => {
      mockRepo.deleteMeal.mockResolvedValueOnce(undefined);
      mockRepo.getPlannedMealsForToday.mockResolvedValueOnce([]);
      mockRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().deletePlannedMeal('meal-1');

      expect(mockRepo.deleteMeal).toHaveBeenCalledWith('meal-1');
      expect(mockRepo.getPlannedMealsForToday).toHaveBeenCalled();
      expect(mockRepo.getMealsForDateRange).toHaveBeenCalled();
    });
  });

  describe('markMealAsLogged', () => {
    it('updates meal status to logged with timestamp', async () => {
      mockRepo.updateMealStatus.mockResolvedValueOnce(undefined);
      mockRepo.getPlannedMealsForToday.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().markMealAsLogged('meal-1');

      expect(mockRepo.updateMealStatus).toHaveBeenCalledWith(
        'meal-1',
        'logged',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      );
    });
  });

  describe('markMealAsSkipped', () => {
    it('updates meal status to skipped without timestamp', async () => {
      mockRepo.updateMealStatus.mockResolvedValueOnce(undefined);
      mockRepo.getPlannedMealsForToday.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().markMealAsSkipped('meal-1');

      expect(mockRepo.updateMealStatus).toHaveBeenCalledWith('meal-1', 'skipped');
    });
  });

  // ============================================================
  // Copy Actions
  // ============================================================

  describe('copyMealToDate', () => {
    it('copies meal and reloads week', async () => {
      mockRepo.copyMealToDate.mockResolvedValueOnce(makeMeal() as any);
      mockRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().copyMealToDate('meal-1', '2024-06-12');

      expect(mockRepo.copyMealToDate).toHaveBeenCalledWith('meal-1', '2024-06-12');
      expect(mockRepo.getMealsForDateRange).toHaveBeenCalled();
    });
  });

  describe('copyDayToMultipleDates', () => {
    it('copies day to multiple dates and reloads week', async () => {
      mockRepo.copyDayToMultipleDates.mockResolvedValueOnce(undefined);
      mockRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().copyDayToMultipleDates('2024-06-10', [
        '2024-06-11',
        '2024-06-12',
      ]);

      expect(mockRepo.copyDayToMultipleDates).toHaveBeenCalledWith('2024-06-10', [
        '2024-06-11',
        '2024-06-12',
      ]);
    });
  });

  // ============================================================
  // Clear Actions
  // ============================================================

  describe('clearDay', () => {
    it('clears day and reloads today + week meals', async () => {
      mockRepo.clearDay.mockResolvedValueOnce(undefined);
      mockRepo.getPlannedMealsForToday.mockResolvedValueOnce([]);
      mockRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().clearDay('2024-06-10');

      expect(mockRepo.clearDay).toHaveBeenCalledWith('2024-06-10');
      expect(mockRepo.getPlannedMealsForToday).toHaveBeenCalled();
      expect(mockRepo.getMealsForDateRange).toHaveBeenCalled();
    });
  });

  describe('clearSlot', () => {
    it('clears slot and reloads today + week meals', async () => {
      mockRepo.clearSlot.mockResolvedValueOnce(undefined);
      mockRepo.getPlannedMealsForToday.mockResolvedValueOnce([]);
      mockRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().clearSlot('2024-06-10', 'breakfast');

      expect(mockRepo.clearSlot).toHaveBeenCalledWith('2024-06-10', 'breakfast');
    });
  });

  // ============================================================
  // Computed / Getters
  // ============================================================

  describe('getPendingMealsForToday', () => {
    it('returns only meals with status "planned"', () => {
      useMealPlanStore.setState({
        todayMeals: [
          makeMeal({ id: 'm1', status: 'planned' }),
          makeMeal({ id: 'm2', status: 'logged' }),
          makeMeal({ id: 'm3', status: 'planned' }),
          makeMeal({ id: 'm4', status: 'skipped' }),
        ],
      });

      const pending = useMealPlanStore.getState().getPendingMealsForToday();

      expect(pending).toHaveLength(2);
      expect(pending.map(m => m.id)).toEqual(['m1', 'm3']);
    });

    it('returns empty array when no meals are planned', () => {
      useMealPlanStore.setState({
        todayMeals: [
          makeMeal({ status: 'logged' }),
          makeMeal({ id: 'm2', status: 'skipped' }),
        ],
      });

      const pending = useMealPlanStore.getState().getPendingMealsForToday();
      expect(pending).toEqual([]);
    });

    it('returns empty array when todayMeals is empty', () => {
      useMealPlanStore.setState({ todayMeals: [] });

      const pending = useMealPlanStore.getState().getPendingMealsForToday();
      expect(pending).toEqual([]);
    });
  });

  describe('getMealsGroupedBySlot', () => {
    it('groups meals by slot for a given date', () => {
      const date = '2024-06-10';
      useMealPlanStore.setState({
        weekMeals: [
          makeMeal({ id: 'm1', date, mealSlot: 'breakfast' }),
          makeMeal({ id: 'm2', date, mealSlot: 'lunch' }),
          makeMeal({ id: 'm3', date, mealSlot: 'dinner' }),
          makeMeal({ id: 'm4', date, mealSlot: 'snacks' }),
          makeMeal({ id: 'm5', date, mealSlot: 'breakfast' }),
        ],
      });

      const grouped = useMealPlanStore.getState().getMealsGroupedBySlot(date);

      expect(grouped.breakfast).toHaveLength(2);
      expect(grouped.lunch).toHaveLength(1);
      expect(grouped.dinner).toHaveLength(1);
      expect(grouped.snacks).toHaveLength(1);
    });

    it('returns empty arrays when no meals for that date', () => {
      useMealPlanStore.setState({
        weekMeals: [makeMeal({ date: '2024-06-11' })],
      });

      const grouped = useMealPlanStore.getState().getMealsGroupedBySlot('2024-06-10');

      expect(grouped.breakfast).toEqual([]);
      expect(grouped.lunch).toEqual([]);
      expect(grouped.dinner).toEqual([]);
      expect(grouped.snacks).toEqual([]);
    });

    it('correctly groups mixed meals with different statuses', () => {
      const date = '2024-06-10';
      useMealPlanStore.setState({
        weekMeals: [
          makeMeal({ id: 'm1', date, mealSlot: 'breakfast', status: 'planned' }),
          makeMeal({ id: 'm2', date, mealSlot: 'breakfast', status: 'logged' }),
          makeMeal({ id: 'm3', date, mealSlot: 'lunch', status: 'skipped' }),
        ],
      });

      const grouped = useMealPlanStore.getState().getMealsGroupedBySlot(date);

      expect(grouped.breakfast).toHaveLength(2);
      expect(grouped.breakfast[0].status).toBe('planned');
      expect(grouped.breakfast[1].status).toBe('logged');
      expect(grouped.lunch).toHaveLength(1);
      expect(grouped.lunch[0].status).toBe('skipped');
    });
  });
});
