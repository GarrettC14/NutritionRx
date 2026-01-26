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

interface FoodLogState {
  // State
  selectedDate: string;
  entries: LogEntry[];
  quickAddEntries: QuickAddEntry[];
  dailyTotals: DailyTotals;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSelectedDate: (date: string) => void;
  loadEntriesForDate: (date: string) => Promise<void>;
  refreshCurrentDate: () => Promise<void>;

  // Log entry actions
  addLogEntry: (input: CreateLogEntryInput) => Promise<LogEntry>;
  updateLogEntry: (id: string, updates: UpdateLogEntryInput) => Promise<LogEntry>;
  deleteLogEntry: (id: string) => Promise<void>;

  // Quick add actions
  addQuickEntry: (input: CreateQuickAddInput) => Promise<QuickAddEntry>;
  updateQuickEntry: (id: string, updates: UpdateQuickAddInput) => Promise<QuickAddEntry>;
  deleteQuickEntry: (id: string) => Promise<void>;

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

export const useFoodLogStore = create<FoodLogState>((set, get) => ({
  selectedDate: getFormattedDate(),
  entries: [],
  quickAddEntries: [],
  dailyTotals: emptyTotals,
  isLoading: false,
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
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load entries',
        isLoading: false,
      });
    }
  },

  refreshCurrentDate: async () => {
    await get().loadEntriesForDate(get().selectedDate);
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
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete quick entry',
        isLoading: false,
      });
      throw error;
    }
  },

  getDailySummary: () => {
    const state = get();
    const settings = useSettingsStore.getState().settings;

    const goals = {
      calories: settings.dailyCalorieGoal,
      protein: settings.dailyProteinGoal,
      carbs: settings.dailyCarbsGoal,
      fat: settings.dailyFatGoal,
    };

    const entriesByMeal = state.getEntriesByMeal();
    const quickEntriesByMeal = state.getQuickEntriesByMeal();

    return {
      date: state.selectedDate,
      totals: state.dailyTotals,
      goals,
      entries: state.entries,
      quickAddEntries: state.quickAddEntries,
      entriesByMeal,
      quickEntriesByMeal,
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
