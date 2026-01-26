/**
 * Food Log Store Tests
 * Tests for food logging state management
 */

import { useFoodLogStore } from '@/stores/foodLogStore';
import { logEntryRepository, quickAddRepository, foodRepository } from '@/repositories';
import { MealType } from '@/constants/mealTypes';

// Mock repositories
jest.mock('@/repositories', () => ({
  logEntryRepository: {
    findByDate: jest.fn(),
    getDailyTotals: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  quickAddRepository: {
    findByDate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  foodRepository: {
    recordUsage: jest.fn(),
  },
}));

// Mock settings store
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

describe('useFoodLogStore', () => {
  const mockLogRepo = logEntryRepository as jest.Mocked<typeof logEntryRepository>;
  const mockQuickRepo = quickAddRepository as jest.Mocked<typeof quickAddRepository>;
  const mockFoodRepo = foodRepository as jest.Mocked<typeof foodRepository>;

  const mockLogEntry = {
    id: 'entry-1',
    foodId: 'food-1',
    foodItemId: 'food-1',
    foodName: 'Chicken Breast',
    foodBrand: undefined,
    date: '2024-01-15',
    mealType: MealType.Lunch,
    servings: 1.5,
    calories: 250,
    protein: 45,
    carbs: 0,
    fat: 6,
    notes: undefined,
    createdAt: new Date('2024-01-15T12:00:00'),
    updatedAt: new Date('2024-01-15T12:00:00'),
  };

  const mockQuickEntry = {
    id: 'quick-1',
    date: '2024-01-15',
    mealType: MealType.Dinner,
    calories: 500,
    protein: 20,
    carbs: 50,
    fat: 25,
    description: 'Restaurant meal',
    createdAt: new Date('2024-01-15T19:00:00'),
    updatedAt: new Date('2024-01-15T19:00:00'),
  };

  const mockDailyTotals = {
    calories: 750,
    protein: 65,
    carbs: 50,
    fat: 31,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useFoodLogStore.setState({
      selectedDate: '2024-01-15',
      entries: [],
      quickAddEntries: [],
      dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      isLoading: false,
      error: null,
    });
  });

  describe('setSelectedDate', () => {
    it('updates selected date and loads entries', async () => {
      mockLogRepo.findByDate.mockResolvedValue([mockLogEntry]);
      mockQuickRepo.findByDate.mockResolvedValue([mockQuickEntry]);
      mockLogRepo.getDailyTotals.mockResolvedValue(mockDailyTotals);

      useFoodLogStore.getState().setSelectedDate('2024-01-16');
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(useFoodLogStore.getState().selectedDate).toBe('2024-01-16');
      expect(mockLogRepo.findByDate).toHaveBeenCalledWith('2024-01-16');
    });
  });

  describe('loadEntriesForDate', () => {
    it('loads entries and totals for a date', async () => {
      mockLogRepo.findByDate.mockResolvedValue([mockLogEntry]);
      mockQuickRepo.findByDate.mockResolvedValue([mockQuickEntry]);
      mockLogRepo.getDailyTotals.mockResolvedValue(mockDailyTotals);

      await useFoodLogStore.getState().loadEntriesForDate('2024-01-15');

      const state = useFoodLogStore.getState();
      expect(state.entries).toHaveLength(1);
      expect(state.quickAddEntries).toHaveLength(1);
      expect(state.dailyTotals).toEqual(mockDailyTotals);
      expect(state.isLoading).toBe(false);
    });

    it('handles errors gracefully', async () => {
      mockLogRepo.findByDate.mockRejectedValue(new Error('Database error'));

      await useFoodLogStore.getState().loadEntriesForDate('2024-01-15');

      const state = useFoodLogStore.getState();
      expect(state.error).toBe('Database error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('refreshCurrentDate', () => {
    it('reloads entries for current selected date', async () => {
      mockLogRepo.findByDate.mockResolvedValue([mockLogEntry]);
      mockQuickRepo.findByDate.mockResolvedValue([]);
      mockLogRepo.getDailyTotals.mockResolvedValue(mockDailyTotals);

      useFoodLogStore.setState({ selectedDate: '2024-01-15' });

      await useFoodLogStore.getState().refreshCurrentDate();

      expect(mockLogRepo.findByDate).toHaveBeenCalledWith('2024-01-15');
    });
  });

  describe('addLogEntry', () => {
    const createInput = {
      foodItemId: 'food-1',
      date: '2024-01-15',
      mealType: MealType.Lunch,
      servings: 1.5,
      calories: 250,
      protein: 45,
      carbs: 0,
      fat: 6,
    };

    it('creates entry and updates state', async () => {
      mockFoodRepo.recordUsage.mockResolvedValue(undefined);
      mockLogRepo.create.mockResolvedValue(mockLogEntry);
      mockLogRepo.getDailyTotals.mockResolvedValue(mockDailyTotals);

      const result = await useFoodLogStore.getState().addLogEntry(createInput);
      expect(result).toEqual(mockLogEntry);

      const state = useFoodLogStore.getState();
      expect(state.entries).toContainEqual(mockLogEntry);
      expect(state.dailyTotals).toEqual(mockDailyTotals);
      expect(mockFoodRepo.recordUsage).toHaveBeenCalledWith('food-1');
    });

    it('sorts entries by meal type', async () => {
      const breakfastEntry = { ...mockLogEntry, id: 'entry-2', mealType: MealType.Breakfast };

      useFoodLogStore.setState({ entries: [mockLogEntry] }); // lunch entry
      mockFoodRepo.recordUsage.mockResolvedValue(undefined);
      mockLogRepo.create.mockResolvedValue(breakfastEntry);
      mockLogRepo.getDailyTotals.mockResolvedValue(mockDailyTotals);

      await useFoodLogStore.getState().addLogEntry({ ...createInput, mealType: MealType.Breakfast });

      const state = useFoodLogStore.getState();
      expect(state.entries[0].mealType).toBe('breakfast');
      expect(state.entries[1].mealType).toBe('lunch');
    });

    it('handles errors and throws', async () => {
      mockFoodRepo.recordUsage.mockRejectedValue(new Error('Recording failed'));

      await expect(useFoodLogStore.getState().addLogEntry(createInput)).rejects.toThrow('Recording failed');

      expect(useFoodLogStore.getState().error).toBe('Recording failed');
    });
  });

  describe('updateLogEntry', () => {
    it('updates entry and refreshes totals', async () => {
      const updatedEntry = { ...mockLogEntry, calories: 300 };
      useFoodLogStore.setState({ entries: [mockLogEntry] });
      mockLogRepo.update.mockResolvedValue(updatedEntry);
      mockLogRepo.getDailyTotals.mockResolvedValue({ ...mockDailyTotals, calories: 800 });

      const result = await useFoodLogStore.getState().updateLogEntry('entry-1', { calories: 300 });
      expect(result.calories).toBe(300);

      const state = useFoodLogStore.getState();
      expect(state.entries[0].calories).toBe(300);
    });

    it('handles update errors', async () => {
      useFoodLogStore.setState({ entries: [mockLogEntry] });
      mockLogRepo.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        useFoodLogStore.getState().updateLogEntry('entry-1', { calories: 300 })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteLogEntry', () => {
    it('removes entry from state', async () => {
      useFoodLogStore.setState({ entries: [mockLogEntry] });
      mockLogRepo.delete.mockResolvedValue(undefined);
      mockLogRepo.getDailyTotals.mockResolvedValue({ calories: 0, protein: 0, carbs: 0, fat: 0 });

      await useFoodLogStore.getState().deleteLogEntry('entry-1');

      expect(useFoodLogStore.getState().entries).toHaveLength(0);
    });

    it('handles delete errors', async () => {
      useFoodLogStore.setState({ entries: [mockLogEntry] });
      mockLogRepo.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(useFoodLogStore.getState().deleteLogEntry('entry-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('addQuickEntry', () => {
    const quickInput = {
      date: '2024-01-15',
      mealType: MealType.Dinner,
      calories: 500,
      protein: 20,
      carbs: 50,
      fat: 25,
      description: 'Restaurant meal',
    };

    it('creates quick entry and updates state', async () => {
      mockQuickRepo.create.mockResolvedValue(mockQuickEntry);
      mockLogRepo.getDailyTotals.mockResolvedValue(mockDailyTotals);

      const result = await useFoodLogStore.getState().addQuickEntry(quickInput);
      expect(result).toEqual(mockQuickEntry);

      expect(useFoodLogStore.getState().quickAddEntries).toContainEqual(mockQuickEntry);
    });

    it('handles errors', async () => {
      mockQuickRepo.create.mockRejectedValue(new Error('Create failed'));

      await expect(useFoodLogStore.getState().addQuickEntry(quickInput)).rejects.toThrow('Create failed');
    });
  });

  describe('updateQuickEntry', () => {
    it('updates quick entry', async () => {
      const updatedQuick = { ...mockQuickEntry, calories: 600 };
      useFoodLogStore.setState({ quickAddEntries: [mockQuickEntry] });
      mockQuickRepo.update.mockResolvedValue(updatedQuick);
      mockLogRepo.getDailyTotals.mockResolvedValue(mockDailyTotals);

      const result = await useFoodLogStore.getState().updateQuickEntry('quick-1', { calories: 600 });
      expect(result.calories).toBe(600);
    });
  });

  describe('deleteQuickEntry', () => {
    it('removes quick entry from state', async () => {
      useFoodLogStore.setState({ quickAddEntries: [mockQuickEntry] });
      mockQuickRepo.delete.mockResolvedValue(undefined);
      mockLogRepo.getDailyTotals.mockResolvedValue({ calories: 0, protein: 0, carbs: 0, fat: 0 });

      await useFoodLogStore.getState().deleteQuickEntry('quick-1');

      expect(useFoodLogStore.getState().quickAddEntries).toHaveLength(0);
    });
  });

  describe('getDailySummary', () => {
    it('returns formatted daily summary', () => {
      useFoodLogStore.setState({
        selectedDate: '2024-01-15',
        entries: [mockLogEntry],
        quickAddEntries: [mockQuickEntry],
        dailyTotals: mockDailyTotals,
      });

      const summary = useFoodLogStore.getState().getDailySummary();

      expect(summary.date).toBe('2024-01-15');
      expect(summary.totals).toEqual(mockDailyTotals);
      expect(summary.goals.calories).toBe(2000);
      expect(summary.entries).toHaveLength(1);
      expect(summary.quickAdds).toHaveLength(1);
    });
  });

  describe('getEntriesByMeal', () => {
    it('groups entries by meal type', () => {
      const breakfastEntry = { ...mockLogEntry, id: 'entry-2', mealType: MealType.Breakfast };
      useFoodLogStore.setState({ entries: [mockLogEntry, breakfastEntry] });

      const byMeal = useFoodLogStore.getState().getEntriesByMeal();

      expect(byMeal.breakfast).toHaveLength(1);
      expect(byMeal.lunch).toHaveLength(1);
      expect(byMeal.dinner).toHaveLength(0);
      expect(byMeal.snack).toHaveLength(0);
    });
  });

  describe('getQuickEntriesByMeal', () => {
    it('groups quick entries by meal type', () => {
      const lunchQuick = { ...mockQuickEntry, id: 'quick-2', mealType: MealType.Lunch };
      useFoodLogStore.setState({ quickAddEntries: [mockQuickEntry, lunchQuick] });

      const byMeal = useFoodLogStore.getState().getQuickEntriesByMeal();

      expect(byMeal.lunch).toHaveLength(1);
      expect(byMeal.dinner).toHaveLength(1);
      expect(byMeal.breakfast).toHaveLength(0);
      expect(byMeal.snack).toHaveLength(0);
    });
  });
});
