/**
 * Meal Planning Integration Tests
 *
 * Tests the interaction between the meal plan store and the meal plan
 * repository (mocked at the boundary), as well as interactions with
 * the food log store. Validates:
 * - Creating a meal plan entry persists correctly
 * - Loading meals for a specific week
 * - Week navigation (next/previous)
 * - Interaction between planned meals and food log
 * - Error handling
 */

// Mock repositories before imports
jest.mock('@/repositories', () => ({
  mealPlanRepository: {
    getOrCreateSettings: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    getPlannedMealsForToday: jest.fn(() => Promise.resolve([])),
    getMealsForDateRange: jest.fn(() => Promise.resolve([])),
    getMealsForDate: jest.fn(() => Promise.resolve([])),
    getMealById: jest.fn(),
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
    getWeeklyStats: jest.fn(),
  },
  logEntryRepository: {
    findByDate: jest.fn(() => Promise.resolve([])),
    getDailyTotals: jest.fn(() =>
      Promise.resolve({ calories: 0, protein: 0, carbs: 0, fat: 0 })
    ),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getDatesWithLogs: jest.fn(() => Promise.resolve([])),
  },
  quickAddRepository: {
    findByDate: jest.fn(() => Promise.resolve([])),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  foodRepository: {
    recordUsage: jest.fn(),
  },
}));

// Mock settingsStore since foodLogStore depends on it
jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      settings: {
        dailyCalorieGoal: 2000,
        dailyProteinGoal: 150,
        dailyCarbsGoal: 200,
        dailyFatGoal: 65,
      },
    })),
  },
}));

import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useFoodLogStore } from '@/stores/foodLogStore';
import {
  mealPlanRepository,
  logEntryRepository,
  foodRepository,
} from '@/repositories';
import { PlannedMeal, MealPlanSettings, DayMealPlan } from '@/types/planning';

const mockMealRepo = mealPlanRepository as jest.Mocked<typeof mealPlanRepository>;
const mockLogEntryRepo = logEntryRepository as jest.Mocked<typeof logEntryRepository>;
const mockFoodRepo = foodRepository as jest.Mocked<typeof foodRepository>;

// ============================================================
// Test Helpers
// ============================================================

const makePlannedMeal = (overrides: Partial<PlannedMeal> = {}): PlannedMeal => ({
  id: 'meal-1',
  date: '2025-01-27',
  mealSlot: 'breakfast',
  foodId: 'food-oatmeal',
  foodName: 'Oatmeal',
  servings: 1,
  calories: 300,
  protein: 10,
  carbs: 50,
  fat: 5,
  status: 'planned',
  createdAt: '2025-01-27T08:00:00.000Z',
  ...overrides,
});

const makeSettings = (overrides: Partial<MealPlanSettings> = {}): MealPlanSettings => ({
  enabled: true,
  showOnToday: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  lastModified: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const resetMealPlanStore = () => {
  useMealPlanStore.setState({
    settings: null,
    todayMeals: [],
    selectedWeekStart: '2025-01-27', // Monday
    weekMeals: [],
    isLoading: false,
    isLoaded: false,
    error: null,
  });
};

const resetFoodLogStore = () => {
  useFoodLogStore.setState({
    selectedDate: '2025-01-27',
    entries: [],
    quickAddEntries: [],
    dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    streak: 0,
    isLoading: false,
    isLoaded: false,
    error: null,
  });
};

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

describe('Meal Planning Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMealPlanStore();
    resetFoodLogStore();
  });

  // ============================================================
  // Creating a Meal Plan Entry
  // ============================================================

  describe('Creating a meal plan entry persists correctly', () => {
    it('addPlannedMeal calls repository createMeal with correct input', async () => {
      const createdMeal = makePlannedMeal();
      mockMealRepo.createMeal.mockResolvedValueOnce(createdMeal);
      mockMealRepo.getMealsForDateRange.mockResolvedValue([createdMeal]);

      const input = {
        date: '2025-01-27',
        mealSlot: 'breakfast' as const,
        foodId: 'food-oatmeal',
        foodName: 'Oatmeal',
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      };

      const result = await useMealPlanStore.getState().addPlannedMeal(input);

      expect(mockMealRepo.createMeal).toHaveBeenCalledWith(input);
      expect(result).toEqual(createdMeal);
    });

    it('addPlannedMeal reloads week meals after creation', async () => {
      const createdMeal = makePlannedMeal();
      mockMealRepo.createMeal.mockResolvedValueOnce(createdMeal);
      mockMealRepo.getMealsForDateRange.mockResolvedValue([createdMeal]);

      await useMealPlanStore.getState().addPlannedMeal({
        date: '2025-01-27',
        mealSlot: 'breakfast',
        foodId: 'food-oatmeal',
        foodName: 'Oatmeal',
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      });

      expect(mockMealRepo.getMealsForDateRange).toHaveBeenCalled();
      expect(useMealPlanStore.getState().weekMeals).toEqual([createdMeal]);
    });

    it('addPlannedMeal reloads today meals if the meal is for today', async () => {
      const today = toLocalDateKey(new Date());
      const todayMeal = makePlannedMeal({ date: today });

      mockMealRepo.createMeal.mockResolvedValueOnce(todayMeal);
      mockMealRepo.getPlannedMealsForToday.mockResolvedValueOnce([todayMeal]);
      mockMealRepo.getMealsForDateRange.mockResolvedValue([todayMeal]);

      await useMealPlanStore.getState().addPlannedMeal({
        date: today,
        mealSlot: 'breakfast',
        foodId: 'food-oatmeal',
        foodName: 'Oatmeal',
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      });

      expect(mockMealRepo.getPlannedMealsForToday).toHaveBeenCalled();
    });

    it('multiple meals can be added to the same day and slot', async () => {
      const meal1 = makePlannedMeal({ id: 'meal-1', foodName: 'Oatmeal' });
      const meal2 = makePlannedMeal({
        id: 'meal-2',
        foodId: 'food-banana',
        foodName: 'Banana',
        calories: 105,
        protein: 1,
        carbs: 27,
        fat: 0,
      });

      mockMealRepo.createMeal
        .mockResolvedValueOnce(meal1)
        .mockResolvedValueOnce(meal2);
      mockMealRepo.getMealsForDateRange
        .mockResolvedValueOnce([meal1])
        .mockResolvedValueOnce([meal1, meal2]);

      await useMealPlanStore.getState().addPlannedMeal({
        date: '2025-01-27',
        mealSlot: 'breakfast',
        foodId: 'food-oatmeal',
        foodName: 'Oatmeal',
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      });

      await useMealPlanStore.getState().addPlannedMeal({
        date: '2025-01-27',
        mealSlot: 'breakfast',
        foodId: 'food-banana',
        foodName: 'Banana',
        calories: 105,
        protein: 1,
        carbs: 27,
        fat: 0,
      });

      expect(mockMealRepo.createMeal).toHaveBeenCalledTimes(2);
      expect(useMealPlanStore.getState().weekMeals).toHaveLength(2);
    });

    it('addPlannedMeal can set custom servings', async () => {
      const mealWithServings = makePlannedMeal({ servings: 2 });
      mockMealRepo.createMeal.mockResolvedValueOnce(mealWithServings);
      mockMealRepo.getMealsForDateRange.mockResolvedValue([mealWithServings]);

      await useMealPlanStore.getState().addPlannedMeal({
        date: '2025-01-27',
        mealSlot: 'breakfast',
        foodId: 'food-oatmeal',
        foodName: 'Oatmeal',
        servings: 2,
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      });

      expect(mockMealRepo.createMeal).toHaveBeenCalledWith(
        expect.objectContaining({ servings: 2 })
      );
    });

    it('deletePlannedMeal removes the meal and reloads data', async () => {
      mockMealRepo.deleteMeal.mockResolvedValueOnce(undefined);
      mockMealRepo.getPlannedMealsForToday.mockResolvedValueOnce([]);
      mockMealRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      useMealPlanStore.setState({
        weekMeals: [makePlannedMeal()],
        todayMeals: [makePlannedMeal()],
      });

      await useMealPlanStore.getState().deletePlannedMeal('meal-1');

      expect(mockMealRepo.deleteMeal).toHaveBeenCalledWith('meal-1');
      expect(mockMealRepo.getPlannedMealsForToday).toHaveBeenCalled();
      expect(mockMealRepo.getMealsForDateRange).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Loading Meals for a Specific Week
  // ============================================================

  describe('Loading meals for a specific week', () => {
    it('loadWeekMeals fetches from Monday to Sunday', async () => {
      mockMealRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      useMealPlanStore.setState({ selectedWeekStart: '2025-01-27' });
      await useMealPlanStore.getState().loadWeekMeals();

      expect(mockMealRepo.getMealsForDateRange).toHaveBeenCalledWith(
        '2025-01-27',
        '2025-02-02'
      );
    });

    it('loadWeekMeals populates weekMeals state', async () => {
      const meals = [
        makePlannedMeal({ id: 'm1', date: '2025-01-27', mealSlot: 'breakfast' }),
        makePlannedMeal({ id: 'm2', date: '2025-01-27', mealSlot: 'lunch' }),
        makePlannedMeal({ id: 'm3', date: '2025-01-28', mealSlot: 'dinner' }),
      ];
      mockMealRepo.getMealsForDateRange.mockResolvedValueOnce(meals);

      useMealPlanStore.setState({ selectedWeekStart: '2025-01-27' });
      await useMealPlanStore.getState().loadWeekMeals();

      expect(useMealPlanStore.getState().weekMeals).toEqual(meals);
    });

    it('loadWeekMeals with explicit weekStart overrides selectedWeekStart', async () => {
      mockMealRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().loadWeekMeals('2025-02-03');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2025-02-03');
      expect(mockMealRepo.getMealsForDateRange).toHaveBeenCalledWith(
        '2025-02-03',
        '2025-02-09'
      );
    });

    it('loadTodayMeals fetches meals for the current day', async () => {
      const todayMeals = [
        makePlannedMeal({ id: 'm1', mealSlot: 'breakfast' }),
        makePlannedMeal({ id: 'm2', mealSlot: 'lunch' }),
      ];
      mockMealRepo.getPlannedMealsForToday.mockResolvedValue(todayMeals);

      await useMealPlanStore.getState().loadTodayMeals();

      expect(mockMealRepo.getPlannedMealsForToday).toHaveBeenCalled();
      expect(useMealPlanStore.getState().todayMeals).toEqual(todayMeals);
    });

    it('getMealsGroupedBySlot groups loaded week meals by slot for a date', async () => {
      const date = '2025-01-27';
      const meals = [
        makePlannedMeal({ id: 'm1', date, mealSlot: 'breakfast', foodName: 'Oatmeal' }),
        makePlannedMeal({ id: 'm2', date, mealSlot: 'breakfast', foodName: 'Banana' }),
        makePlannedMeal({ id: 'm3', date, mealSlot: 'lunch', foodName: 'Chicken Salad' }),
        makePlannedMeal({ id: 'm4', date, mealSlot: 'dinner', foodName: 'Salmon' }),
        makePlannedMeal({ id: 'm5', date, mealSlot: 'snacks', foodName: 'Greek Yogurt' }),
      ];

      useMealPlanStore.setState({ weekMeals: meals });

      const grouped = useMealPlanStore.getState().getMealsGroupedBySlot(date);

      expect(grouped.breakfast).toHaveLength(2);
      expect(grouped.lunch).toHaveLength(1);
      expect(grouped.dinner).toHaveLength(1);
      expect(grouped.snacks).toHaveLength(1);
    });

    it('getMealsGroupedBySlot returns empty arrays for date with no meals', () => {
      useMealPlanStore.setState({
        weekMeals: [makePlannedMeal({ date: '2025-01-28' })],
      });

      const grouped = useMealPlanStore.getState().getMealsGroupedBySlot('2025-01-27');

      expect(grouped.breakfast).toEqual([]);
      expect(grouped.lunch).toEqual([]);
      expect(grouped.dinner).toEqual([]);
      expect(grouped.snacks).toEqual([]);
    });

    it('settings can be loaded from repository', async () => {
      const settings = makeSettings({ enabled: true, showOnToday: true });
      mockMealRepo.getOrCreateSettings.mockResolvedValueOnce(settings);

      await useMealPlanStore.getState().loadSettings();

      expect(useMealPlanStore.getState().settings).toEqual(settings);
      expect(useMealPlanStore.getState().isLoaded).toBe(true);
    });
  });

  // ============================================================
  // Week Navigation (Next / Previous)
  // ============================================================

  describe('Week navigation (next/previous)', () => {
    beforeEach(() => {
      useMealPlanStore.setState({ selectedWeekStart: '2025-01-27' });
      mockMealRepo.getMealsForDateRange.mockResolvedValue([]);
    });

    it('navigateWeek next advances by 7 days', () => {
      useMealPlanStore.getState().navigateWeek('next');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2025-02-03');
    });

    it('navigateWeek prev goes back by 7 days', () => {
      useMealPlanStore.getState().navigateWeek('prev');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2025-01-20');
    });

    it('navigating forward then backward returns to original week', () => {
      useMealPlanStore.getState().navigateWeek('next');
      useMealPlanStore.getState().navigateWeek('prev');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2025-01-27');
    });

    it('navigating triggers loadWeekMeals for the new week', () => {
      useMealPlanStore.getState().navigateWeek('next');

      expect(mockMealRepo.getMealsForDateRange).toHaveBeenCalledWith(
        '2025-02-03',
        '2025-02-09'
      );
    });

    it('multiple forward navigations accumulate correctly', () => {
      useMealPlanStore.getState().navigateWeek('next');
      useMealPlanStore.getState().navigateWeek('next');
      useMealPlanStore.getState().navigateWeek('next');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2025-02-17');
    });

    it('multiple backward navigations accumulate correctly', () => {
      useMealPlanStore.getState().navigateWeek('prev');
      useMealPlanStore.getState().navigateWeek('prev');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2025-01-13');
    });

    it('setSelectedWeek sets an arbitrary week and loads meals', () => {
      useMealPlanStore.getState().setSelectedWeek('2025-06-02');

      expect(useMealPlanStore.getState().selectedWeekStart).toBe('2025-06-02');
      expect(mockMealRepo.getMealsForDateRange).toHaveBeenCalledWith(
        '2025-06-02',
        '2025-06-08'
      );
    });

    it('week range is always Monday to Sunday (7 days)', () => {
      // Navigate to a known Monday
      useMealPlanStore.getState().setSelectedWeek('2025-03-10');

      const call = mockMealRepo.getMealsForDateRange.mock.calls[0];
      const startDate = new Date(call[0] + 'T12:00:00');
      const endDate = new Date(call[1] + 'T12:00:00');

      // Calculate day difference
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      expect(diffDays).toBe(6); // Monday to Sunday = 6 day span
    });
  });

  // ============================================================
  // Interaction Between Planned Meals and Food Log
  // ============================================================

  describe('Interaction between planned meals and food log', () => {
    it('markMealAsLogged updates the meal status to logged', async () => {
      mockMealRepo.updateMealStatus.mockResolvedValueOnce(undefined);
      mockMealRepo.getPlannedMealsForToday.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().markMealAsLogged('meal-1');

      expect(mockMealRepo.updateMealStatus).toHaveBeenCalledWith(
        'meal-1',
        'logged',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      );
    });

    it('markMealAsSkipped updates the meal status to skipped', async () => {
      mockMealRepo.updateMealStatus.mockResolvedValueOnce(undefined);
      mockMealRepo.getPlannedMealsForToday.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().markMealAsSkipped('meal-1');

      expect(mockMealRepo.updateMealStatus).toHaveBeenCalledWith(
        'meal-1',
        'skipped'
      );
    });

    it('marking a meal as logged reloads today meals', async () => {
      const updatedMeal = makePlannedMeal({
        status: 'logged',
        loggedAt: new Date().toISOString(),
      });
      mockMealRepo.updateMealStatus.mockResolvedValueOnce(undefined);
      mockMealRepo.getPlannedMealsForToday.mockResolvedValueOnce([updatedMeal]);

      useMealPlanStore.setState({
        todayMeals: [makePlannedMeal({ status: 'planned' })],
      });

      await useMealPlanStore.getState().markMealAsLogged('meal-1');

      expect(mockMealRepo.getPlannedMealsForToday).toHaveBeenCalled();
    });

    it('getPendingMealsForToday filters only planned status meals', () => {
      useMealPlanStore.setState({
        todayMeals: [
          makePlannedMeal({ id: 'm1', status: 'planned', mealSlot: 'breakfast' }),
          makePlannedMeal({ id: 'm2', status: 'logged', mealSlot: 'lunch' }),
          makePlannedMeal({ id: 'm3', status: 'planned', mealSlot: 'dinner' }),
          makePlannedMeal({ id: 'm4', status: 'skipped', mealSlot: 'snacks' }),
        ],
      });

      const pending = useMealPlanStore.getState().getPendingMealsForToday();

      expect(pending).toHaveLength(2);
      expect(pending[0].id).toBe('m1');
      expect(pending[1].id).toBe('m3');
    });

    it('logging a food entry via foodLogStore is independent of meal plan', async () => {
      const createdEntry = {
        id: 'entry-1',
        foodItemId: 'food-oatmeal',
        date: '2025-01-27',
        mealType: 'breakfast' as const,
        servings: 1,
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
        notes: undefined,
        foodName: 'Oatmeal',
        createdAt: '2025-01-27T08:00:00.000Z',
      };

      mockFoodRepo.recordUsage.mockResolvedValueOnce(undefined);
      mockLogEntryRepo.create.mockResolvedValueOnce(createdEntry);
      mockLogEntryRepo.getDailyTotals.mockResolvedValueOnce({
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      });
      mockLogEntryRepo.getDatesWithLogs.mockResolvedValueOnce(['2025-01-27']);

      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'food-oatmeal',
        date: '2025-01-27',
        mealType: 'breakfast',
        servings: 1,
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      });

      // Food log should have the entry
      expect(useFoodLogStore.getState().entries).toHaveLength(1);
      expect(useFoodLogStore.getState().dailyTotals.calories).toBe(300);

      // Meal plan should be unaffected
      expect(useMealPlanStore.getState().todayMeals).toEqual([]);
    });

    it('full workflow: plan meal, log it, then mark as logged in plan', async () => {
      // Step 1: Create a planned meal
      const plannedMeal = makePlannedMeal({ id: 'planned-meal-1' });
      mockMealRepo.createMeal.mockResolvedValueOnce(plannedMeal);
      mockMealRepo.getMealsForDateRange.mockResolvedValue([plannedMeal]);

      await useMealPlanStore.getState().addPlannedMeal({
        date: '2025-01-27',
        mealSlot: 'breakfast',
        foodId: 'food-oatmeal',
        foodName: 'Oatmeal',
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      });

      expect(useMealPlanStore.getState().weekMeals).toHaveLength(1);

      // Step 2: Log the food via the food log store
      const logEntry = {
        id: 'log-entry-1',
        foodItemId: 'food-oatmeal',
        date: '2025-01-27',
        mealType: 'breakfast' as const,
        servings: 1,
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
        notes: undefined,
        foodName: 'Oatmeal',
        createdAt: '2025-01-27T08:30:00.000Z',
      };

      mockFoodRepo.recordUsage.mockResolvedValueOnce(undefined);
      mockLogEntryRepo.create.mockResolvedValueOnce(logEntry);
      mockLogEntryRepo.getDailyTotals.mockResolvedValueOnce({
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      });
      mockLogEntryRepo.getDatesWithLogs.mockResolvedValueOnce(['2025-01-27']);

      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'food-oatmeal',
        date: '2025-01-27',
        mealType: 'breakfast',
        servings: 1,
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 5,
      });

      expect(useFoodLogStore.getState().entries).toHaveLength(1);

      // Step 3: Mark the planned meal as logged
      const loggedMeal = makePlannedMeal({
        id: 'planned-meal-1',
        status: 'logged',
        loggedAt: new Date().toISOString(),
      });
      mockMealRepo.updateMealStatus.mockResolvedValueOnce(undefined);
      mockMealRepo.getPlannedMealsForToday.mockResolvedValueOnce([loggedMeal]);

      await useMealPlanStore.getState().markMealAsLogged('planned-meal-1');

      expect(mockMealRepo.updateMealStatus).toHaveBeenCalledWith(
        'planned-meal-1',
        'logged',
        expect.any(String)
      );
    });

    it('settings enableMealPlanning / disableMealPlanning toggle enabled flag', async () => {
      const enabledSettings = makeSettings({ enabled: true });
      const disabledSettings = makeSettings({ enabled: false });

      mockMealRepo.updateSettings
        .mockResolvedValueOnce(enabledSettings)
        .mockResolvedValueOnce(disabledSettings);

      await useMealPlanStore.getState().enableMealPlanning();
      expect(mockMealRepo.updateSettings).toHaveBeenCalledWith({ enabled: true });
      expect(useMealPlanStore.getState().settings?.enabled).toBe(true);

      await useMealPlanStore.getState().disableMealPlanning();
      expect(mockMealRepo.updateSettings).toHaveBeenCalledWith({ enabled: false });
      expect(useMealPlanStore.getState().settings?.enabled).toBe(false);
    });
  });

  // ============================================================
  // Copy and Clear Operations
  // ============================================================

  describe('Copy and clear operations', () => {
    it('copyMealToDate delegates to repository and reloads week', async () => {
      mockMealRepo.copyMealToDate.mockResolvedValueOnce(
        makePlannedMeal({ id: 'copied-meal', date: '2025-01-29' }) as any
      );
      mockMealRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().copyMealToDate('meal-1', '2025-01-29');

      expect(mockMealRepo.copyMealToDate).toHaveBeenCalledWith('meal-1', '2025-01-29');
      expect(mockMealRepo.getMealsForDateRange).toHaveBeenCalled();
    });

    it('copyDayToDate delegates to repository and reloads week', async () => {
      mockMealRepo.copyDayToDate.mockResolvedValueOnce(undefined as any);
      mockMealRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().copyDayToDate('2025-01-27', '2025-01-28');

      expect(mockMealRepo.copyDayToDate).toHaveBeenCalledWith(
        '2025-01-27',
        '2025-01-28'
      );
    });

    it('copyDayToMultipleDates copies to all target dates', async () => {
      mockMealRepo.copyDayToMultipleDates.mockResolvedValueOnce(undefined);
      mockMealRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      const targets = ['2025-01-28', '2025-01-29', '2025-01-30'];
      await useMealPlanStore.getState().copyDayToMultipleDates('2025-01-27', targets);

      expect(mockMealRepo.copyDayToMultipleDates).toHaveBeenCalledWith(
        '2025-01-27',
        targets
      );
    });

    it('clearDay removes all meals for a date', async () => {
      mockMealRepo.clearDay.mockResolvedValueOnce(undefined);
      mockMealRepo.getPlannedMealsForToday.mockResolvedValueOnce([]);
      mockMealRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().clearDay('2025-01-27');

      expect(mockMealRepo.clearDay).toHaveBeenCalledWith('2025-01-27');
      expect(mockMealRepo.getPlannedMealsForToday).toHaveBeenCalled();
      expect(mockMealRepo.getMealsForDateRange).toHaveBeenCalled();
    });

    it('clearSlot removes meals for a specific slot and date', async () => {
      mockMealRepo.clearSlot.mockResolvedValueOnce(undefined);
      mockMealRepo.getPlannedMealsForToday.mockResolvedValueOnce([]);
      mockMealRepo.getMealsForDateRange.mockResolvedValueOnce([]);

      await useMealPlanStore.getState().clearSlot('2025-01-27', 'breakfast');

      expect(mockMealRepo.clearSlot).toHaveBeenCalledWith('2025-01-27', 'breakfast');
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================

  describe('Error handling', () => {
    it('addPlannedMeal sets error and re-throws on repository failure', async () => {
      mockMealRepo.createMeal.mockRejectedValueOnce(new Error('DB write failed'));

      await expect(
        useMealPlanStore.getState().addPlannedMeal({
          date: '2025-01-27',
          mealSlot: 'breakfast',
          foodId: 'food-oatmeal',
          foodName: 'Oatmeal',
          calories: 300,
          protein: 10,
          carbs: 50,
          fat: 5,
        })
      ).rejects.toThrow('DB write failed');

      expect(useMealPlanStore.getState().error).toBe('DB write failed');
    });

    it('deletePlannedMeal sets error on failure', async () => {
      mockMealRepo.deleteMeal.mockRejectedValueOnce(new Error('Delete failed'));

      await useMealPlanStore.getState().deletePlannedMeal('meal-1');

      expect(useMealPlanStore.getState().error).toBe('Delete failed');
    });

    it('loadSettings sets error on failure', async () => {
      mockMealRepo.getOrCreateSettings.mockRejectedValueOnce(
        new Error('Settings DB error')
      );

      await useMealPlanStore.getState().loadSettings();

      expect(useMealPlanStore.getState().error).toBe('Settings DB error');
      expect(useMealPlanStore.getState().isLoaded).toBe(true);
    });

    it('loadTodayMeals handles error gracefully without setting error state', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMealRepo.getPlannedMealsForToday.mockRejectedValueOnce(
        new Error('Query failed')
      );

      await useMealPlanStore.getState().loadTodayMeals();

      // loadTodayMeals logs error but does not set error state
      expect(useMealPlanStore.getState().error).toBeNull();
      expect(useMealPlanStore.getState().todayMeals).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('loadWeekMeals handles error gracefully without setting error state', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMealRepo.getMealsForDateRange.mockRejectedValueOnce(
        new Error('Range query failed')
      );

      await useMealPlanStore.getState().loadWeekMeals();

      // loadWeekMeals logs error but does not set error state
      expect(useMealPlanStore.getState().error).toBeNull();

      consoleSpy.mockRestore();
    });

    it('markMealAsLogged sets error on failure', async () => {
      mockMealRepo.updateMealStatus.mockRejectedValueOnce(
        new Error('Status update failed')
      );

      await useMealPlanStore.getState().markMealAsLogged('meal-1');

      // Error instance message is used directly
      expect(useMealPlanStore.getState().error).toBe('Status update failed');
    });

    it('markMealAsSkipped sets error on failure', async () => {
      mockMealRepo.updateMealStatus.mockRejectedValueOnce(
        new Error('Skip failed')
      );

      await useMealPlanStore.getState().markMealAsSkipped('meal-1');

      // Error instance message is used directly
      expect(useMealPlanStore.getState().error).toBe('Skip failed');
    });

    it('updateSettings sets error on failure', async () => {
      mockMealRepo.updateSettings.mockRejectedValueOnce(
        new Error('Settings update error')
      );

      await useMealPlanStore.getState().updateSettings({ enabled: true });

      expect(useMealPlanStore.getState().error).toBe('Settings update error');
    });

    it('copyMealToDate sets error on failure', async () => {
      mockMealRepo.copyMealToDate.mockRejectedValueOnce(
        new Error('Copy error')
      );

      await useMealPlanStore.getState().copyMealToDate('meal-1', '2025-01-29');

      expect(useMealPlanStore.getState().error).toBe('Copy error');
    });

    it('clearDay sets error on failure', async () => {
      mockMealRepo.clearDay.mockRejectedValueOnce(
        new Error('Clear day failed')
      );

      await useMealPlanStore.getState().clearDay('2025-01-27');

      expect(useMealPlanStore.getState().error).toBe('Clear day failed');
    });

    it('food log store addLogEntry sets error on failure', async () => {
      mockFoodRepo.recordUsage.mockRejectedValueOnce(
        new Error('Food usage recording failed')
      );

      await expect(
        useFoodLogStore.getState().addLogEntry({
          foodItemId: 'food-oatmeal',
          date: '2025-01-27',
          mealType: 'breakfast',
          servings: 1,
          calories: 300,
          protein: 10,
          carbs: 50,
          fat: 5,
        })
      ).rejects.toThrow('Food usage recording failed');

      expect(useFoodLogStore.getState().error).toBe(
        'Food usage recording failed'
      );
    });

    it('errors are cleared when a subsequent action succeeds', async () => {
      // First: cause an error
      mockMealRepo.getOrCreateSettings.mockRejectedValueOnce(
        new Error('Transient error')
      );
      await useMealPlanStore.getState().loadSettings();
      expect(useMealPlanStore.getState().error).toBe('Transient error');

      // Second: succeed
      mockMealRepo.getOrCreateSettings.mockResolvedValueOnce(makeSettings());
      // loadSettings resets isLoaded, so we need to allow it to load again
      useMealPlanStore.setState({ isLoaded: false });
      await useMealPlanStore.getState().loadSettings();

      expect(useMealPlanStore.getState().error).toBeNull();
      expect(useMealPlanStore.getState().settings).not.toBeNull();
    });
  });

  // ============================================================
  // getDayMealPlan (computed via repository)
  // ============================================================

  describe('getDayMealPlan', () => {
    it('delegates to repository and returns structured day plan', async () => {
      const dayPlan: DayMealPlan = {
        date: '2025-01-27',
        meals: {
          breakfast: [makePlannedMeal({ mealSlot: 'breakfast' })],
          lunch: [makePlannedMeal({ id: 'm2', mealSlot: 'lunch', foodName: 'Salad', calories: 400 })],
          dinner: [],
          snacks: [],
        },
        totalCalories: 700,
        totalProtein: 20,
        totalCarbs: 80,
        totalFat: 10,
      };

      mockMealRepo.getDayMealPlan.mockResolvedValueOnce(dayPlan);

      const result = await useMealPlanStore.getState().getDayMealPlan('2025-01-27');

      expect(result).toEqual(dayPlan);
      expect(result.totalCalories).toBe(700);
      expect(result.meals.breakfast).toHaveLength(1);
      expect(result.meals.lunch).toHaveLength(1);
      expect(result.meals.dinner).toHaveLength(0);
    });
  });
});
