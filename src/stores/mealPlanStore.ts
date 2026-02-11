import { create } from 'zustand';
import { mealPlanRepository, CreatePlannedMealInput } from '@/repositories';
import { PlannedMeal, MealPlanSettings, MealSlot, DayMealPlan } from '@/types/planning';

interface MealPlanState {
  // State
  settings: MealPlanSettings | null;
  todayMeals: PlannedMeal[];
  selectedWeekStart: string; // YYYY-MM-DD (Monday)
  weekMeals: PlannedMeal[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions - Settings
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<MealPlanSettings>) => Promise<void>;
  enableMealPlanning: () => Promise<void>;
  disableMealPlanning: () => Promise<void>;

  // Actions - Meals
  loadTodayMeals: () => Promise<void>;
  loadWeekMeals: (weekStart?: string) => Promise<void>;
  setSelectedWeek: (weekStart: string) => void;
  navigateWeek: (direction: 'prev' | 'next') => void;

  // Actions - CRUD
  addPlannedMeal: (input: CreatePlannedMealInput) => Promise<PlannedMeal>;
  deletePlannedMeal: (id: string) => Promise<void>;
  markMealAsLogged: (id: string) => Promise<void>;
  markMealAsSkipped: (id: string) => Promise<void>;

  // Actions - Copy
  copyMealToDate: (mealId: string, targetDate: string) => Promise<void>;
  copySlotToDate: (sourceDate: string, mealSlot: MealSlot, targetDate: string) => Promise<void>;
  copyDayToDate: (sourceDate: string, targetDate: string) => Promise<void>;
  copyDayToMultipleDates: (sourceDate: string, targetDates: string[]) => Promise<void>;

  // Actions - Clear
  clearDay: (date: string) => Promise<void>;
  clearSlot: (date: string, mealSlot: MealSlot) => Promise<void>;

  // Computed
  getPendingMealsForToday: () => PlannedMeal[];
  getDayMealPlan: (date: string) => Promise<DayMealPlan>;
  getMealsGroupedBySlot: (date: string) => {
    breakfast: PlannedMeal[];
    lunch: PlannedMeal[];
    dinner: PlannedMeal[];
    snacks: PlannedMeal[];
  };
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return toLocalDateKey(d);
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  return toLocalDateKey(d);
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  // Initial state
  settings: null,
  todayMeals: [],
  selectedWeekStart: getWeekStart(),
  weekMeals: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  // ============================================================
  // Settings Actions
  // ============================================================

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await mealPlanRepository.getOrCreateSettings();
      set({ settings, isLoading: false, isLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load meal plan settings',
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  updateSettings: async (updates) => {
    try {
      const settings = await mealPlanRepository.updateSettings(updates);
      set({ settings });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update settings',
      });
    }
  },

  enableMealPlanning: async () => {
    await get().updateSettings({ enabled: true });
  },

  disableMealPlanning: async () => {
    await get().updateSettings({ enabled: false });
  },

  // ============================================================
  // Load Actions
  // ============================================================

  loadTodayMeals: async () => {
    try {
      const todayMeals = await mealPlanRepository.getPlannedMealsForToday();
      set({ todayMeals });
    } catch (error) {
      console.error('Failed to load today meals:', error);
    }
  },

  loadWeekMeals: async (weekStart) => {
    const start = weekStart || get().selectedWeekStart;
    const end = getWeekEnd(start);

    try {
      const weekMeals = await mealPlanRepository.getMealsForDateRange(start, end);
      set({ weekMeals, selectedWeekStart: start });
    } catch (error) {
      console.error('Failed to load week meals:', error);
    }
  },

  setSelectedWeek: (weekStart) => {
    set({ selectedWeekStart: weekStart });
    get().loadWeekMeals(weekStart);
  },

  navigateWeek: (direction) => {
    const { selectedWeekStart } = get();
    const current = new Date(selectedWeekStart + 'T12:00:00');
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    const newWeekStart = toLocalDateKey(current);
    get().setSelectedWeek(newWeekStart);
  },

  // ============================================================
  // CRUD Actions
  // ============================================================

  addPlannedMeal: async (input) => {
    try {
      const meal = await mealPlanRepository.createMeal(input);

      // Reload relevant data
      const today = toLocalDateKey(new Date());
      if (input.date === today) {
        await get().loadTodayMeals();
      }
      await get().loadWeekMeals();

      return meal;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add planned meal',
      });
      throw error;
    }
  },

  deletePlannedMeal: async (id) => {
    try {
      await mealPlanRepository.deleteMeal(id);

      // Reload data
      await get().loadTodayMeals();
      await get().loadWeekMeals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete meal',
      });
    }
  },

  markMealAsLogged: async (id) => {
    try {
      const now = new Date().toISOString();
      await mealPlanRepository.updateMealStatus(id, 'logged', now);

      // Reload today meals
      await get().loadTodayMeals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to mark meal as logged',
      });
    }
  },

  markMealAsSkipped: async (id) => {
    try {
      await mealPlanRepository.updateMealStatus(id, 'skipped');

      // Reload today meals
      await get().loadTodayMeals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to mark meal as skipped',
      });
    }
  },

  // ============================================================
  // Copy Actions
  // ============================================================

  copyMealToDate: async (mealId, targetDate) => {
    try {
      await mealPlanRepository.copyMealToDate(mealId, targetDate);
      await get().loadWeekMeals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to copy meal',
      });
    }
  },

  copySlotToDate: async (sourceDate, mealSlot, targetDate) => {
    try {
      await mealPlanRepository.copySlotToDate(sourceDate, mealSlot, targetDate);
      await get().loadWeekMeals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to copy meal slot',
      });
    }
  },

  copyDayToDate: async (sourceDate, targetDate) => {
    try {
      await mealPlanRepository.copyDayToDate(sourceDate, targetDate);
      await get().loadWeekMeals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to copy day',
      });
    }
  },

  copyDayToMultipleDates: async (sourceDate, targetDates) => {
    try {
      await mealPlanRepository.copyDayToMultipleDates(sourceDate, targetDates);
      await get().loadWeekMeals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to copy day to multiple dates',
      });
    }
  },

  // ============================================================
  // Clear Actions
  // ============================================================

  clearDay: async (date) => {
    try {
      await mealPlanRepository.clearDay(date);
      await get().loadTodayMeals();
      await get().loadWeekMeals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear day',
      });
    }
  },

  clearSlot: async (date, mealSlot) => {
    try {
      await mealPlanRepository.clearSlot(date, mealSlot);
      await get().loadTodayMeals();
      await get().loadWeekMeals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear slot',
      });
    }
  },

  // ============================================================
  // Computed
  // ============================================================

  getPendingMealsForToday: () => {
    const { todayMeals } = get();
    return todayMeals.filter(m => m.status === 'planned');
  },

  getDayMealPlan: async (date) => {
    return mealPlanRepository.getDayMealPlan(date);
  },

  getMealsGroupedBySlot: (date) => {
    const { weekMeals } = get();
    const dayMeals = weekMeals.filter(m => m.date === date);

    return {
      breakfast: dayMeals.filter(m => m.mealSlot === 'breakfast'),
      lunch: dayMeals.filter(m => m.mealSlot === 'lunch'),
      dinner: dayMeals.filter(m => m.mealSlot === 'dinner'),
      snacks: dayMeals.filter(m => m.mealSlot === 'snacks'),
    };
  },
}));
