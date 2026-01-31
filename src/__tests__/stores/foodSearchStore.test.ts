/**
 * Food Search Store Tests
 * Tests for food search state management including local + USDA search,
 * deduplication, recent/frequent foods, CRUD operations, and error handling.
 */

import { useFoodSearchStore } from '@/stores/foodSearchStore';
import { foodRepository } from '@/repositories';
import { USDAFoodService } from '@/services/usda/USDAFoodService';
import { FoodItem } from '@/types/domain';

jest.mock('@/repositories', () => ({
  foodRepository: {
    search: jest.fn(),
    getRecent: jest.fn(),
    getFrequent: jest.fn(),
    findByBarcode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/constants/defaults', () => ({
  SEARCH_SETTINGS: {
    debounceMs: 300,
    minQueryLength: 2,
    maxResults: 50,
    recentLimit: 20,
    frequentLimit: 10,
  },
}));

jest.mock('@/services/usda/USDAFoodService', () => ({
  USDAFoodService: {
    searchFoods: jest.fn(),
    countAvailableNutrients: jest.fn(),
  },
}));

describe('useFoodSearchStore', () => {
  const mockFoodRepo = foodRepository as jest.Mocked<typeof foodRepository>;
  const mockUSDA = USDAFoodService as jest.Mocked<typeof USDAFoodService>;

  const initialState = {
    query: '',
    results: [],
    recentFoods: [],
    frequentFoods: [],
    isSearching: false,
    isLoadingRecent: false,
    isLoaded: false,
    error: null,
  };

  const makeFoodItem = (overrides: Partial<FoodItem> = {}): FoodItem => ({
    id: 'food-1',
    name: 'Chicken Breast',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 4,
    servingSize: 100,
    servingUnit: 'g',
    source: 'user',
    isVerified: false,
    isUserCreated: true,
    usageCount: 5,
    usdaNutrientCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  const mockLocalFood = makeFoodItem({ id: 'local-1', name: 'Chicken Breast' });
  const mockLocalFood2 = makeFoodItem({ id: 'local-2', name: 'Brown Rice', calories: 215, protein: 5, carbs: 45, fat: 2 });

  beforeEach(() => {
    jest.clearAllMocks();
    useFoodSearchStore.setState(initialState);
  });

  // ============================================================
  // setQuery
  // ============================================================

  describe('setQuery', () => {
    it('updates the query state', () => {
      useFoodSearchStore.getState().setQuery('ch');

      expect(useFoodSearchStore.getState().query).toBe('ch');
    });

    it('clears results when query is shorter than minQueryLength', () => {
      useFoodSearchStore.setState({ results: [mockLocalFood] });

      useFoodSearchStore.getState().setQuery('a');

      expect(useFoodSearchStore.getState().results).toEqual([]);
    });

    it('clears results when query is empty', () => {
      useFoodSearchStore.setState({ results: [mockLocalFood] });

      useFoodSearchStore.getState().setQuery('');

      expect(useFoodSearchStore.getState().results).toEqual([]);
    });

    it('triggers search when query meets minQueryLength', async () => {
      mockFoodRepo.search.mockResolvedValue([mockLocalFood]);
      mockUSDA.searchFoods.mockResolvedValue([]);

      useFoodSearchStore.getState().setQuery('ch');

      // Wait for async search to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockFoodRepo.search).toHaveBeenCalledWith('ch');
    });
  });

  // ============================================================
  // search
  // ============================================================

  describe('search', () => {
    it('returns empty results for queries below minQueryLength', async () => {
      await useFoodSearchStore.getState().search('a');

      expect(useFoodSearchStore.getState().results).toEqual([]);
      expect(mockFoodRepo.search).not.toHaveBeenCalled();
    });

    it('searches local DB first for immediate results', async () => {
      mockFoodRepo.search.mockResolvedValue([mockLocalFood]);
      mockUSDA.searchFoods.mockResolvedValue([]);

      await useFoodSearchStore.getState().search('chicken');

      expect(mockFoodRepo.search).toHaveBeenCalledWith('chicken');
      expect(useFoodSearchStore.getState().results).toContainEqual(mockLocalFood);
    });

    it('sets isSearching during local search', async () => {
      let searchingDuringCall = false;
      mockFoodRepo.search.mockImplementation(async () => {
        searchingDuringCall = useFoodSearchStore.getState().isSearching;
        return [mockLocalFood];
      });
      mockUSDA.searchFoods.mockResolvedValue([]);

      await useFoodSearchStore.getState().search('chicken');

      expect(searchingDuringCall).toBe(true);
      expect(useFoodSearchStore.getState().isSearching).toBe(false);
    });

    it('merges USDA results after local results', async () => {
      mockFoodRepo.search.mockResolvedValue([mockLocalFood]);
      mockUSDA.searchFoods.mockResolvedValue([
        {
          fdcId: 12345,
          description: 'USDA Grilled Chicken',
          brandOwner: undefined,
          foodNutrients: [
            { nutrientId: 1008, value: 180 },
            { nutrientId: 1003, value: 35 },
            { nutrientId: 1005, value: 0 },
            { nutrientId: 1004, value: 5 },
          ],
          servingSize: 100,
          servingSizeUnit: 'g',
        },
      ]);
      mockUSDA.countAvailableNutrients.mockReturnValue(4);

      await useFoodSearchStore.getState().search('chicken');

      const results = useFoodSearchStore.getState().results;
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockLocalFood);
      expect(results[1].id).toBe('usda-12345');
      expect(results[1].name).toBe('USDA Grilled Chicken');
    });

    it('deduplicates USDA results by name (case-insensitive)', async () => {
      mockFoodRepo.search.mockResolvedValue([mockLocalFood]); // name: "Chicken Breast"
      mockUSDA.searchFoods.mockResolvedValue([
        {
          fdcId: 99999,
          description: 'chicken breast', // same name, different case
          foodNutrients: [],
          servingSize: 100,
          servingSizeUnit: 'g',
        },
      ]);
      mockUSDA.countAvailableNutrients.mockReturnValue(0);

      await useFoodSearchStore.getState().search('chicken');

      const results = useFoodSearchStore.getState().results;
      // Should only have the local result; duplicate USDA result is filtered
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('local-1');
    });

    it('handles USDA search failure gracefully (keeps local results)', async () => {
      mockFoodRepo.search.mockResolvedValue([mockLocalFood]);
      mockUSDA.searchFoods.mockRejectedValue(new Error('Network error'));

      await useFoodSearchStore.getState().search('chicken');

      const state = useFoodSearchStore.getState();
      expect(state.results).toEqual([mockLocalFood]);
      expect(state.error).toBeNull(); // USDA failure is non-critical
    });

    it('handles local search failure and sets error', async () => {
      mockFoodRepo.search.mockRejectedValue(new Error('DB corrupted'));

      await useFoodSearchStore.getState().search('chicken');

      const state = useFoodSearchStore.getState();
      expect(state.error).toBe('DB corrupted');
      expect(state.isSearching).toBe(false);
    });

    it('sets fallback error message for non-Error exceptions', async () => {
      mockFoodRepo.search.mockRejectedValue('unknown');

      await useFoodSearchStore.getState().search('chicken');

      expect(useFoodSearchStore.getState().error).toBe('Search failed');
    });
  });

  // ============================================================
  // clearSearch
  // ============================================================

  describe('clearSearch', () => {
    it('resets query and results', () => {
      useFoodSearchStore.setState({ query: 'chicken', results: [mockLocalFood] });

      useFoodSearchStore.getState().clearSearch();

      const state = useFoodSearchStore.getState();
      expect(state.query).toBe('');
      expect(state.results).toEqual([]);
    });
  });

  // ============================================================
  // loadRecentFoods
  // ============================================================

  describe('loadRecentFoods', () => {
    it('loads recent foods and sets isLoaded', async () => {
      mockFoodRepo.getRecent.mockResolvedValue([mockLocalFood, mockLocalFood2]);

      await useFoodSearchStore.getState().loadRecentFoods();

      const state = useFoodSearchStore.getState();
      expect(state.recentFoods).toHaveLength(2);
      expect(state.isLoadingRecent).toBe(false);
      expect(state.isLoaded).toBe(true);
    });

    it('handles errors and sets error message', async () => {
      mockFoodRepo.getRecent.mockRejectedValue(new Error('Load recent failed'));

      await useFoodSearchStore.getState().loadRecentFoods();

      const state = useFoodSearchStore.getState();
      expect(state.error).toBe('Load recent failed');
      expect(state.isLoadingRecent).toBe(false);
      expect(state.isLoaded).toBe(true);
    });
  });

  // ============================================================
  // loadFrequentFoods
  // ============================================================

  describe('loadFrequentFoods', () => {
    it('loads frequent foods', async () => {
      mockFoodRepo.getFrequent.mockResolvedValue([mockLocalFood]);

      await useFoodSearchStore.getState().loadFrequentFoods();

      const state = useFoodSearchStore.getState();
      expect(state.frequentFoods).toHaveLength(1);
      expect(state.isLoadingRecent).toBe(false);
    });

    it('handles errors and sets error message', async () => {
      mockFoodRepo.getFrequent.mockRejectedValue(new Error('Load frequent failed'));

      await useFoodSearchStore.getState().loadFrequentFoods();

      expect(useFoodSearchStore.getState().error).toBe('Load frequent failed');
    });
  });

  // ============================================================
  // findByBarcode
  // ============================================================

  describe('findByBarcode', () => {
    it('returns food item when found', async () => {
      mockFoodRepo.findByBarcode.mockResolvedValue(mockLocalFood);

      const result = await useFoodSearchStore.getState().findByBarcode('1234567890');

      expect(mockFoodRepo.findByBarcode).toHaveBeenCalledWith('1234567890');
      expect(result).toEqual(mockLocalFood);
      expect(useFoodSearchStore.getState().isSearching).toBe(false);
    });

    it('returns null when not found', async () => {
      mockFoodRepo.findByBarcode.mockResolvedValue(null);

      const result = await useFoodSearchStore.getState().findByBarcode('0000000000');

      expect(result).toBeNull();
    });

    it('returns null and sets error on failure', async () => {
      mockFoodRepo.findByBarcode.mockRejectedValue(new Error('Scan error'));

      const result = await useFoodSearchStore.getState().findByBarcode('bad-barcode');

      expect(result).toBeNull();
      expect(useFoodSearchStore.getState().error).toBe('Scan error');
    });
  });

  // ============================================================
  // createFood
  // ============================================================

  describe('createFood', () => {
    const createInput = {
      name: 'Custom Food',
      calories: 300,
      protein: 25,
      carbs: 30,
      fat: 10,
      servingSize: 150,
      servingUnit: 'g',
    };

    it('creates food and refreshes recent foods', async () => {
      mockFoodRepo.create.mockResolvedValue(makeFoodItem({ id: 'new-1', name: 'Custom Food' }));
      mockFoodRepo.getRecent.mockResolvedValue([]);

      const result = await useFoodSearchStore.getState().createFood(createInput as any);

      expect(mockFoodRepo.create).toHaveBeenCalledWith(createInput);
      expect(result.name).toBe('Custom Food');
      // loadRecentFoods should be called as a side effect
      expect(mockFoodRepo.getRecent).toHaveBeenCalled();
    });

    it('throws and sets error on failure', async () => {
      mockFoodRepo.create.mockRejectedValue(new Error('Create failed'));

      await expect(useFoodSearchStore.getState().createFood(createInput as any)).rejects.toThrow('Create failed');

      expect(useFoodSearchStore.getState().error).toBe('Create failed');
    });
  });

  // ============================================================
  // updateFood
  // ============================================================

  describe('updateFood', () => {
    it('updates food and returns updated item', async () => {
      const updatedFood = makeFoodItem({ id: 'food-1', name: 'Chicken Breast', calories: 180 });
      mockFoodRepo.update.mockResolvedValue(updatedFood);

      const result = await useFoodSearchStore.getState().updateFood('food-1', { calories: 180 });

      expect(mockFoodRepo.update).toHaveBeenCalledWith('food-1', { calories: 180 });
      expect(result.calories).toBe(180);
      expect(useFoodSearchStore.getState().isSearching).toBe(false);
    });

    it('throws and sets error on failure', async () => {
      mockFoodRepo.update.mockRejectedValue(new Error('Update failed'));

      await expect(useFoodSearchStore.getState().updateFood('food-1', { calories: 180 })).rejects.toThrow('Update failed');

      expect(useFoodSearchStore.getState().error).toBe('Update failed');
    });
  });

  // ============================================================
  // deleteFood
  // ============================================================

  describe('deleteFood', () => {
    it('deletes food and refreshes both recent and frequent', async () => {
      mockFoodRepo.delete.mockResolvedValue(undefined);
      mockFoodRepo.getRecent.mockResolvedValue([]);
      mockFoodRepo.getFrequent.mockResolvedValue([]);

      await useFoodSearchStore.getState().deleteFood('food-1');

      expect(mockFoodRepo.delete).toHaveBeenCalledWith('food-1');
      expect(mockFoodRepo.getRecent).toHaveBeenCalled();
      expect(mockFoodRepo.getFrequent).toHaveBeenCalled();
    });

    it('throws and sets error on failure', async () => {
      mockFoodRepo.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(useFoodSearchStore.getState().deleteFood('food-1')).rejects.toThrow('Delete failed');

      expect(useFoodSearchStore.getState().error).toBe('Delete failed');
    });
  });
});
