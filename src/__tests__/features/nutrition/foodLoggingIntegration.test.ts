/**
 * Food Logging Integration Tests
 *
 * Tests the integration between foodLogStore, settingsStore, goalStore,
 * and repository layer for food logging workflows.
 */

// Track accumulated totals for simulating repository state
let accumulatedTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
let storedEntries: any[] = [];
let entryIdCounter = 0;

// Mock repositories at the boundary
jest.mock('@/repositories', () => ({
  logEntryRepository: {
    findByDate: jest.fn(() => Promise.resolve(storedEntries)),
    getDailyTotals: jest.fn(() => Promise.resolve({ ...accumulatedTotals })),
    create: jest.fn((input: any) => {
      entryIdCounter++;
      const entry = {
        id: `entry-${entryIdCounter}`,
        foodItemId: input.foodItemId,
        foodName: `Food ${input.foodItemId}`,
        foodBrand: undefined,
        date: input.date,
        mealType: input.mealType,
        servings: input.servings,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        notes: input.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      storedEntries.push(entry);
      accumulatedTotals.calories += input.calories;
      accumulatedTotals.protein += input.protein;
      accumulatedTotals.carbs += input.carbs;
      accumulatedTotals.fat += input.fat;
      return Promise.resolve(entry);
    }),
    update: jest.fn(),
    delete: jest.fn((id: string) => {
      const entry = storedEntries.find((e) => e.id === id);
      if (entry) {
        accumulatedTotals.calories -= entry.calories;
        accumulatedTotals.protein -= entry.protein;
        accumulatedTotals.carbs -= entry.carbs;
        accumulatedTotals.fat -= entry.fat;
        storedEntries = storedEntries.filter((e) => e.id !== id);
      }
      return Promise.resolve();
    }),
    getDatesWithLogs: jest.fn(() => Promise.resolve([])),
  },
  quickAddRepository: {
    findByDate: jest.fn(() => Promise.resolve([])),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  foodRepository: {
    recordUsage: jest.fn(() => Promise.resolve()),
  },
  settingsRepository: {
    getAll: jest.fn(),
    updateSettings: jest.fn(),
    resetToDefaults: jest.fn(),
  },
}));

// Mock settingsStore so we can control the settings it returns
jest.mock('@/stores/settingsStore', () => {
  const { create } = require('zustand');

  const useSettingsStore = create(() => ({
    settings: {
      dailyCalorieGoal: 2000,
      dailyProteinGoal: 150,
      dailyCarbsGoal: 250,
      dailyFatGoal: 65,
      weightUnit: 'lbs' as const,
      theme: 'dark' as const,
      notificationsEnabled: false,
      reminderTime: null,
    },
    isLoading: false,
    isLoaded: true,
    error: null,
  }));

  return { useSettingsStore };
});

import { useFoodLogStore } from '@/stores/foodLogStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGoalStore } from '@/stores/goalStore';
import {
  logEntryRepository,
  quickAddRepository,
  foodRepository,
} from '@/repositories';
import { MealType } from '@/constants/mealTypes';

// Mock goalStore's repository dependencies (goalStore also imports from @/repositories)
jest.mock('@/services/macroCalculator', () => ({
  macroCalculator: {
    calculateMacros: jest.fn(() => ({
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
    })),
  },
}));

const mockLogRepo = logEntryRepository as jest.Mocked<typeof logEntryRepository>;
const mockQuickRepo = quickAddRepository as jest.Mocked<typeof quickAddRepository>;
const mockFoodRepo = foodRepository as jest.Mocked<typeof foodRepository>;

describe('Food Logging Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset simulated repository state
    accumulatedTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    storedEntries = [];
    entryIdCounter = 0;

    // Reset food log store
    useFoodLogStore.setState({
      selectedDate: '2024-06-15',
      entries: [],
      quickAddEntries: [],
      dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      streak: 0,
      isLoading: false,
      isLoaded: false,
      error: null,
    });

    // Reset settings store with custom goals
    useSettingsStore.setState({
      settings: {
        dailyCalorieGoal: 2000,
        dailyProteinGoal: 150,
        dailyCarbsGoal: 250,
        dailyFatGoal: 65,
        weightUnit: 'lbs' as const,
        theme: 'dark' as const,
        notificationsEnabled: false,
        reminderTime: null,
      },
    });
  });

  // ================================================================
  // Loading entries uses settingsStore for date context
  // ================================================================
  describe('Loading entries uses settingsStore for date context', () => {
    it('getDailySummary pulls goal values from settingsStore', () => {
      useFoodLogStore.setState({
        selectedDate: '2024-06-15',
        entries: [],
        quickAddEntries: [],
        dailyTotals: { calories: 800, protein: 60, carbs: 100, fat: 30 },
      });

      const summary = useFoodLogStore.getState().getDailySummary();

      // Goals should come from settingsStore
      expect(summary.goals.calories).toBe(2000);
      expect(summary.goals.protein).toBe(150);
      expect(summary.goals.carbs).toBe(250);
      expect(summary.goals.fat).toBe(65);
      expect(summary.date).toBe('2024-06-15');
    });

    it('getDailySummary reflects updated settingsStore values', () => {
      // Update settings goals
      useSettingsStore.setState({
        settings: {
          dailyCalorieGoal: 1800,
          dailyProteinGoal: 130,
          dailyCarbsGoal: 200,
          dailyFatGoal: 55,
          weightUnit: 'lbs' as const,
          theme: 'dark' as const,
          notificationsEnabled: false,
          reminderTime: null,
        },
      });

      useFoodLogStore.setState({
        selectedDate: '2024-06-15',
        entries: [],
        quickAddEntries: [],
        dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      });

      const summary = useFoodLogStore.getState().getDailySummary();

      expect(summary.goals.calories).toBe(1800);
      expect(summary.goals.protein).toBe(130);
      expect(summary.goals.carbs).toBe(200);
      expect(summary.goals.fat).toBe(55);
    });

    it('loadEntriesForDate calls repository with the correct date', async () => {
      await useFoodLogStore.getState().loadEntriesForDate('2024-06-15');

      expect(mockLogRepo.findByDate).toHaveBeenCalledWith('2024-06-15');
      expect(mockQuickRepo.findByDate).toHaveBeenCalledWith('2024-06-15');
      expect(mockLogRepo.getDailyTotals).toHaveBeenCalledWith('2024-06-15');
    });

    it('setSelectedDate triggers loading entries for that date', async () => {
      useFoodLogStore.getState().setSelectedDate('2024-06-20');

      // Allow async loading to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(useFoodLogStore.getState().selectedDate).toBe('2024-06-20');
      expect(mockLogRepo.findByDate).toHaveBeenCalledWith('2024-06-20');
    });
  });

  // ================================================================
  // Adding a food entry persists via repository AND updates daily totals
  // ================================================================
  describe('Adding a food entry persists via repository and updates daily totals', () => {
    it('adding a single entry updates store totals from repository', async () => {
      const input = {
        foodItemId: 'chicken-breast-1',
        date: '2024-06-15',
        mealType: 'lunch' as MealType,
        servings: 1,
        calories: 250,
        protein: 45,
        carbs: 0,
        fat: 6,
      };

      const result = await useFoodLogStore.getState().addLogEntry(input);

      // Entry should be returned and exist in store
      expect(result.id).toBe('entry-1');
      expect(result.calories).toBe(250);
      expect(result.protein).toBe(45);

      const state = useFoodLogStore.getState();

      // Entry should be in the store entries array
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0].foodItemId).toBe('chicken-breast-1');

      // Daily totals should reflect the entry
      expect(state.dailyTotals.calories).toBe(250);
      expect(state.dailyTotals.protein).toBe(45);
      expect(state.dailyTotals.carbs).toBe(0);
      expect(state.dailyTotals.fat).toBe(6);

      // Food usage should be recorded
      expect(mockFoodRepo.recordUsage).toHaveBeenCalledWith('chicken-breast-1');
    });

    it('adding multiple entries accumulates totals correctly', async () => {
      // Add breakfast
      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'oatmeal-1',
        date: '2024-06-15',
        mealType: 'breakfast' as MealType,
        servings: 1,
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 8,
      });

      // Add lunch
      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'chicken-breast-1',
        date: '2024-06-15',
        mealType: 'lunch' as MealType,
        servings: 1,
        calories: 250,
        protein: 45,
        carbs: 0,
        fat: 6,
      });

      // Add dinner
      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'salmon-1',
        date: '2024-06-15',
        mealType: 'dinner' as MealType,
        servings: 1,
        calories: 400,
        protein: 35,
        carbs: 5,
        fat: 20,
      });

      const state = useFoodLogStore.getState();

      expect(state.entries).toHaveLength(3);
      expect(state.dailyTotals.calories).toBe(950);
      expect(state.dailyTotals.protein).toBe(90);
      expect(state.dailyTotals.carbs).toBe(55);
      expect(state.dailyTotals.fat).toBe(34);
    });

    it('entries are sorted by meal type after adding', async () => {
      // Add dinner first
      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'salmon-1',
        date: '2024-06-15',
        mealType: 'dinner' as MealType,
        servings: 1,
        calories: 400,
        protein: 35,
        carbs: 5,
        fat: 20,
      });

      // Then add breakfast
      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'oatmeal-1',
        date: '2024-06-15',
        mealType: 'breakfast' as MealType,
        servings: 1,
        calories: 300,
        protein: 10,
        carbs: 50,
        fat: 8,
      });

      const state = useFoodLogStore.getState();

      // Breakfast (order 1) should come before dinner (order 3)
      expect(state.entries[0].mealType).toBe('breakfast');
      expect(state.entries[1].mealType).toBe('dinner');
    });

    it('records food usage for tracking recent/frequent foods', async () => {
      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'apple-1',
        date: '2024-06-15',
        mealType: 'snack' as MealType,
        servings: 1,
        calories: 95,
        protein: 0,
        carbs: 25,
        fat: 0,
      });

      expect(mockFoodRepo.recordUsage).toHaveBeenCalledWith('apple-1');
      expect(mockFoodRepo.recordUsage).toHaveBeenCalledTimes(1);
    });
  });

  // ================================================================
  // Deleting an entry updates totals correctly
  // ================================================================
  describe('Deleting an entry updates totals correctly', () => {
    it('deleting an entry removes it and decrements totals', async () => {
      // Add two entries
      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'food-a',
        date: '2024-06-15',
        mealType: 'lunch' as MealType,
        servings: 1,
        calories: 300,
        protein: 30,
        carbs: 20,
        fat: 10,
      });

      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'food-b',
        date: '2024-06-15',
        mealType: 'dinner' as MealType,
        servings: 1,
        calories: 500,
        protein: 40,
        carbs: 30,
        fat: 25,
      });

      expect(useFoodLogStore.getState().entries).toHaveLength(2);
      expect(useFoodLogStore.getState().dailyTotals.calories).toBe(800);

      // Delete the first entry
      await useFoodLogStore.getState().deleteLogEntry('entry-1');

      const state = useFoodLogStore.getState();

      // Only one entry should remain
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0].id).toBe('entry-2');

      // Totals should reflect only the remaining entry
      expect(state.dailyTotals.calories).toBe(500);
      expect(state.dailyTotals.protein).toBe(40);
      expect(state.dailyTotals.carbs).toBe(30);
      expect(state.dailyTotals.fat).toBe(25);
    });

    it('deleting all entries zeros out daily totals', async () => {
      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'food-a',
        date: '2024-06-15',
        mealType: 'breakfast' as MealType,
        servings: 1,
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
      });

      expect(useFoodLogStore.getState().dailyTotals.calories).toBe(400);

      await useFoodLogStore.getState().deleteLogEntry('entry-1');

      const state = useFoodLogStore.getState();
      expect(state.entries).toHaveLength(0);
      expect(state.dailyTotals.calories).toBe(0);
      expect(state.dailyTotals.protein).toBe(0);
      expect(state.dailyTotals.carbs).toBe(0);
      expect(state.dailyTotals.fat).toBe(0);
    });
  });

  // ================================================================
  // Interaction between goalStore targets and daily nutrition totals
  // ================================================================
  describe('Goal store targets and daily nutrition totals interaction', () => {
    it('daily summary shows totals vs goal targets from settings', async () => {
      // Simulate that settings reflect a goal's targets
      useSettingsStore.setState({
        settings: {
          dailyCalorieGoal: 1950,
          dailyProteinGoal: 153,
          dailyCarbsGoal: 200,
          dailyFatGoal: 60,
          weightUnit: 'lbs' as const,
          theme: 'dark' as const,
          notificationsEnabled: false,
          reminderTime: null,
        },
      });

      // Add some food entries
      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'food-1',
        date: '2024-06-15',
        mealType: 'lunch' as MealType,
        servings: 1,
        calories: 600,
        protein: 50,
        carbs: 60,
        fat: 20,
      });

      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'food-2',
        date: '2024-06-15',
        mealType: 'dinner' as MealType,
        servings: 1,
        calories: 700,
        protein: 45,
        carbs: 70,
        fat: 25,
      });

      const summary = useFoodLogStore.getState().getDailySummary();

      // Totals should reflect what was eaten
      expect(summary.totals.calories).toBe(1300);
      expect(summary.totals.protein).toBe(95);

      // Goals should come from settings (which reflect goal targets)
      expect(summary.goals.calories).toBe(1950);
      expect(summary.goals.protein).toBe(153);
      expect(summary.goals.carbs).toBe(200);
      expect(summary.goals.fat).toBe(60);

      // The user still has room to eat more
      const remainingCalories = summary.goals.calories - summary.totals.calories;
      expect(remainingCalories).toBe(650);
    });

    it('goalStore computed values provide macro targets independently', () => {
      // Set up goalStore with an active goal
      useGoalStore.setState({
        activeGoal: {
          id: 'goal-1',
          type: 'lose',
          targetWeightKg: 75,
          targetRatePercent: 0.5,
          startDate: '2024-06-01',
          startWeightKg: 85,
          initialTdeeEstimate: 2500,
          initialTargetCalories: 1950,
          initialProteinG: 153,
          initialCarbsG: 200,
          initialFatG: 60,
          currentTdeeEstimate: 2500,
          currentTargetCalories: 1950,
          currentProteinG: 153,
          currentCarbsG: 200,
          currentFatG: 60,
          planningMode: 'rate' as const,
          eatingStyle: 'flexible' as const,
          proteinPriority: 'active' as const,
          isActive: true,
          createdAt: new Date('2024-06-01'),
          updatedAt: new Date('2024-06-01'),
        },
        calorieGoal: 1950,
        proteinGoal: 153,
        carbGoal: 200,
        fatGoal: 60,
      });

      const goalState = useGoalStore.getState();

      // Goal store provides macro targets
      expect(goalState.calorieGoal).toBe(1950);
      expect(goalState.proteinGoal).toBe(153);
      expect(goalState.carbGoal).toBe(200);
      expect(goalState.fatGoal).toBe(60);
    });

    it('food log entries by meal can be compared against per-meal estimates', () => {
      useFoodLogStore.setState({
        entries: [
          {
            id: 'e1',
            foodItemId: 'f1',
            foodName: 'Eggs',
            date: '2024-06-15',
            mealType: 'breakfast' as MealType,
            servings: 2,
            calories: 280,
            protein: 24,
            carbs: 2,
            fat: 20,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'e2',
            foodItemId: 'f2',
            foodName: 'Chicken',
            date: '2024-06-15',
            mealType: 'lunch' as MealType,
            servings: 1,
            calories: 350,
            protein: 50,
            carbs: 5,
            fat: 12,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'e3',
            foodItemId: 'f3',
            foodName: 'Salmon',
            date: '2024-06-15',
            mealType: 'dinner' as MealType,
            servings: 1,
            calories: 450,
            protein: 40,
            carbs: 10,
            fat: 25,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const byMeal = useFoodLogStore.getState().getEntriesByMeal();

      expect(byMeal.breakfast).toHaveLength(1);
      expect(byMeal.lunch).toHaveLength(1);
      expect(byMeal.dinner).toHaveLength(1);
      expect(byMeal.snack).toHaveLength(0);

      // Validate meal totals
      const breakfastCals = byMeal.breakfast.reduce((sum, e) => sum + e.calories, 0);
      const lunchCals = byMeal.lunch.reduce((sum, e) => sum + e.calories, 0);
      const dinnerCals = byMeal.dinner.reduce((sum, e) => sum + e.calories, 0);

      expect(breakfastCals).toBe(280);
      expect(lunchCals).toBe(350);
      expect(dinnerCals).toBe(450);
    });
  });

  // ================================================================
  // Error handling when repository calls fail
  // ================================================================
  describe('Error handling when repository calls fail', () => {
    it('loadEntriesForDate sets error when repository throws', async () => {
      mockLogRepo.findByDate.mockRejectedValueOnce(new Error('Database connection lost'));

      await useFoodLogStore.getState().loadEntriesForDate('2024-06-15');

      const state = useFoodLogStore.getState();
      expect(state.error).toBe('Database connection lost');
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(true);
    });

    it('addLogEntry propagates error and sets error state', async () => {
      mockFoodRepo.recordUsage.mockRejectedValueOnce(new Error('Disk full'));

      await expect(
        useFoodLogStore.getState().addLogEntry({
          foodItemId: 'food-1',
          date: '2024-06-15',
          mealType: 'lunch' as MealType,
          servings: 1,
          calories: 200,
          protein: 20,
          carbs: 10,
          fat: 5,
        })
      ).rejects.toThrow('Disk full');

      expect(useFoodLogStore.getState().error).toBe('Disk full');
      expect(useFoodLogStore.getState().isLoading).toBe(false);
    });

    it('deleteLogEntry propagates error and sets error state', async () => {
      // First add an entry so there is something to delete
      await useFoodLogStore.getState().addLogEntry({
        foodItemId: 'food-1',
        date: '2024-06-15',
        mealType: 'lunch' as MealType,
        servings: 1,
        calories: 200,
        protein: 20,
        carbs: 10,
        fat: 5,
      });

      // Now make delete fail
      mockLogRepo.delete.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(
        useFoodLogStore.getState().deleteLogEntry('entry-1')
      ).rejects.toThrow('Permission denied');

      expect(useFoodLogStore.getState().error).toBe('Permission denied');
    });

    it('store recovers after an error when subsequent calls succeed', async () => {
      // First call fails
      mockLogRepo.findByDate.mockRejectedValueOnce(new Error('Temporary failure'));

      await useFoodLogStore.getState().loadEntriesForDate('2024-06-15');
      expect(useFoodLogStore.getState().error).toBe('Temporary failure');

      // Reset mocks to default behavior (storedEntries)
      mockLogRepo.findByDate.mockImplementation(() => Promise.resolve(storedEntries));

      // Second call succeeds
      await useFoodLogStore.getState().loadEntriesForDate('2024-06-15');

      const state = useFoodLogStore.getState();
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('handles non-Error exceptions gracefully', async () => {
      mockLogRepo.findByDate.mockRejectedValueOnce('string error');

      await useFoodLogStore.getState().loadEntriesForDate('2024-06-15');

      const state = useFoodLogStore.getState();
      expect(state.error).toBe('Failed to load entries');
      expect(state.isLoading).toBe(false);
    });
  });
});
