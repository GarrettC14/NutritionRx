import { create } from 'zustand';
import {
  logEntryRepository,
  quickAddRepository,
  foodRepository,
  CreateLogEntryInput,
  UpdateLogEntryInput,
  CreateQuickAddInput,
  UpdateQuickAddInput,
} from '@/repositories';
import { LogEntry, QuickAddEntry, DailyTotals, DailySummary } from '@/types/domain';
import { MealType, MEAL_ORDER } from '@/constants/mealTypes';
import { useSettingsStore } from './settingsStore';
import { useGoalStore } from './goalStore';
import { useOnboardingStore } from './onboardingStore';

interface FoodLogState {
  // State
  selectedDate: string;
  entries: LogEntry[];
  quickAddEntries: QuickAddEntry[];
  dailyTotals: DailyTotals;
  streak: number;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  setSelectedDate: (date: string) => void;
  loadEntriesForDate: (date: string) => Promise<void>;
  refreshCurrentDate: () => Promise<void>;
  loadStreak: () => Promise<void>;

  // Log entry actions
  addLogEntry: (input: CreateLogEntryInput) => Promise<LogEntry>;
  updateLogEntry: (id: string, updates: UpdateLogEntryInput) => Promise<LogEntry>;
  deleteLogEntry: (id: string) => Promise<void>;

  // Quick add actions
  addQuickEntry: (input: CreateQuickAddInput) => Promise<QuickAddEntry>;
  updateQuickEntry: (id: string, updates: UpdateQuickAddInput) => Promise<QuickAddEntry>;
  deleteQuickEntry: (id: string) => Promise<void>;

  // Copy actions
  copyMealToDate: (sourceMealType: MealType, targetDate: string, targetMealType?: MealType) => Promise<void>;
  copyDayToDate: (sourceDate: string, targetDate: string) => Promise<void>;

  // Computed
  getDailySummary: () => DailySummary;
  getEntriesByMeal: () => Record<MealType, LogEntry[]>;
  getQuickEntriesByMeal: () => Record<MealType, QuickAddEntry[]>;
}

const getFormattedDate = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

const emptyTotals: DailyTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

// Calculate streak from a list of dates (sorted descending)
const calculateStreakFromDates = (dates: string[]): number => {
  if (dates.length === 0) return 0;

  const today = getFormattedDate();
  const yesterday = getFormattedDate(new Date(Date.now() - 86400000));

  // Check if streak is active (logged today or yesterday)
  const hasLoggedToday = dates.includes(today);
  const hasLoggedYesterday = dates.includes(yesterday);

  // If no logs today or yesterday, streak is broken
  if (!hasLoggedToday && !hasLoggedYesterday) {
    return 0;
  }

  // Start counting from the most recent logged date
  const startDate = hasLoggedToday ? today : yesterday;
  let streak = 0;
  let currentDate = new Date(startDate + 'T12:00:00');

  // Count consecutive days
  const dateSet = new Set(dates);
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (dateSet.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

export const useFoodLogStore = create<FoodLogState>((set, get) => ({
  selectedDate: getFormattedDate(),
  entries: [],
  quickAddEntries: [],
  dailyTotals: emptyTotals,
  streak: 0,
  isLoading: false,
  isLoaded: false,
  error: null,

  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().loadEntriesForDate(date);
  },

  loadEntriesForDate: async (date) => {
    set({ isLoading: true, error: null });
    try {
      const [entries, quickAddEntries, dailyTotals] = await Promise.all([
        logEntryRepository.findByDate(date),
        quickAddRepository.findByDate(date),
        logEntryRepository.getDailyTotals(date),
      ]);

      set({
        entries,
        quickAddEntries,
        dailyTotals,
        isLoading: false,
        isLoaded: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load entries',
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  refreshCurrentDate: async () => {
    await get().loadEntriesForDate(get().selectedDate);
  },

  loadStreak: async () => {
    try {
      const dates = await logEntryRepository.getDatesWithLogs();
      const streak = calculateStreakFromDates(dates);
      set({ streak });
    } catch (error) {
      console.error('Failed to load streak:', error);
    }
  },

  addLogEntry: async (input) => {
    set({ isLoading: true, error: null });
    try {
      // Record food usage for "recent" and "frequent" tracking
      await foodRepository.recordUsage(input.foodItemId);

      const entry = await logEntryRepository.create(input);
      const dailyTotals = await logEntryRepository.getDailyTotals(get().selectedDate);

      set((state) => ({
        entries: [...state.entries, entry].sort((a, b) => {
          const mealDiff = MEAL_ORDER[a.mealType] - MEAL_ORDER[b.mealType];
          if (mealDiff !== 0) return mealDiff;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }),
        dailyTotals,
        isLoading: false,
      }));

      // Update streak
      get().loadStreak();

      // Track first food and increment count for onboarding celebrations
      useOnboardingStore.getState().markFirstFoodLogged();
      useOnboardingStore.getState().incrementFoodsLogged();

      return entry;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add entry',
        isLoading: false,
      });
      throw error;
    }
  },

  updateLogEntry: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const entry = await logEntryRepository.update(id, updates);
      const dailyTotals = await logEntryRepository.getDailyTotals(get().selectedDate);

      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? entry : e)),
        dailyTotals,
        isLoading: false,
      }));

      return entry;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update entry',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteLogEntry: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await logEntryRepository.delete(id);
      const dailyTotals = await logEntryRepository.getDailyTotals(get().selectedDate);

      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
        dailyTotals,
        isLoading: false,
      }));

      // Update streak
      get().loadStreak();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete entry',
        isLoading: false,
      });
      throw error;
    }
  },

  addQuickEntry: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const entry = await quickAddRepository.create(input);
      const dailyTotals = await logEntryRepository.getDailyTotals(get().selectedDate);

      set((state) => ({
        quickAddEntries: [...state.quickAddEntries, entry].sort((a, b) => {
          const mealDiff = MEAL_ORDER[a.mealType] - MEAL_ORDER[b.mealType];
          if (mealDiff !== 0) return mealDiff;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }),
        dailyTotals,
        isLoading: false,
      }));

      // Update streak
      get().loadStreak();

      // Track first food and increment count for onboarding celebrations
      useOnboardingStore.getState().markFirstFoodLogged();
      useOnboardingStore.getState().incrementFoodsLogged();

      return entry;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add quick entry',
        isLoading: false,
      });
      throw error;
    }
  },

  updateQuickEntry: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const entry = await quickAddRepository.update(id, updates);
      const dailyTotals = await logEntryRepository.getDailyTotals(get().selectedDate);

      set((state) => ({
        quickAddEntries: state.quickAddEntries.map((e) => (e.id === id ? entry : e)),
        dailyTotals,
        isLoading: false,
      }));

      return entry;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update quick entry',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteQuickEntry: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await quickAddRepository.delete(id);
      const dailyTotals = await logEntryRepository.getDailyTotals(get().selectedDate);

      set((state) => ({
        quickAddEntries: state.quickAddEntries.filter((e) => e.id !== id),
        dailyTotals,
        isLoading: false,
      }));

      // Update streak
      get().loadStreak();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete quick entry',
        isLoading: false,
      });
      throw error;
    }
  },

  copyMealToDate: async (sourceMealType, targetDate, targetMealType) => {
    set({ isLoading: true, error: null });
    try {
      const sourceDate = get().selectedDate;
      const entries = get().entries.filter((e) => e.mealType === sourceMealType);
      const quickEntries = get().quickAddEntries.filter((e) => e.mealType === sourceMealType);

      const finalMealType = targetMealType || sourceMealType;

      // Copy log entries
      for (const entry of entries) {
        await logEntryRepository.create({
          foodItemId: entry.foodItemId,
          date: targetDate,
          mealType: finalMealType,
          servings: entry.servings,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          notes: entry.notes,
        });
      }

      // Copy quick add entries
      for (const entry of quickEntries) {
        await quickAddRepository.create({
          date: targetDate,
          mealType: finalMealType,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          description: entry.description,
        });
      }

      // Reload if we copied to current date
      if (targetDate === get().selectedDate) {
        await get().loadEntriesForDate(targetDate);
      }

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to copy meal',
        isLoading: false,
      });
      throw error;
    }
  },

  copyDayToDate: async (sourceDate, targetDate) => {
    set({ isLoading: true, error: null });
    try {
      // Load entries from source date
      const [sourceEntries, sourceQuickEntries] = await Promise.all([
        logEntryRepository.findByDate(sourceDate),
        quickAddRepository.findByDate(sourceDate),
      ]);

      // Copy log entries
      for (const entry of sourceEntries) {
        await logEntryRepository.create({
          foodItemId: entry.foodItemId,
          date: targetDate,
          mealType: entry.mealType,
          servings: entry.servings,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          notes: entry.notes,
        });
      }

      // Copy quick add entries
      for (const entry of sourceQuickEntries) {
        await quickAddRepository.create({
          date: targetDate,
          mealType: entry.mealType,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          description: entry.description,
        });
      }

      // Reload if we copied to current date
      if (targetDate === get().selectedDate) {
        await get().loadEntriesForDate(targetDate);
      }

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to copy day',
        isLoading: false,
      });
      throw error;
    }
  },

  getDailySummary: () => {
    const state = get();
    const goalState = useGoalStore.getState();

    const goals = {
      calories: goalState.calorieGoal || 2000,
      protein: goalState.proteinGoal || 150,
      carbs: goalState.carbGoal || 250,
      fat: goalState.fatGoal || 65,
    };

    const entriesByMeal = state.getEntriesByMeal();
    const quickAddsByMeal = state.getQuickEntriesByMeal();

    return {
      date: state.selectedDate,
      totals: state.dailyTotals,
      goals,
      entries: state.entries,
      quickAdds: state.quickAddEntries,
      entriesByMeal,
      quickAddsByMeal,
    };
  },

  getEntriesByMeal: () => {
    const entries = get().entries;
    return {
      breakfast: entries.filter((e) => e.mealType === 'breakfast'),
      lunch: entries.filter((e) => e.mealType === 'lunch'),
      dinner: entries.filter((e) => e.mealType === 'dinner'),
      snack: entries.filter((e) => e.mealType === 'snack'),
    };
  },

  getQuickEntriesByMeal: () => {
    const entries = get().quickAddEntries;
    return {
      breakfast: entries.filter((e) => e.mealType === 'breakfast'),
      lunch: entries.filter((e) => e.mealType === 'lunch'),
      dinner: entries.filter((e) => e.mealType === 'dinner'),
      snack: entries.filter((e) => e.mealType === 'snack'),
    };
  },
}));
