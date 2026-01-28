/**
 * Restaurant Store Tests
 * Tests for restaurant/chain state management
 */

import { MealType } from '@/constants/mealTypes';

// Mock repositories and services
const mockRestaurant = {
  id: 'mcdonalds',
  name: "McDonald's",
  slug: 'mcdonalds',
  logoAssetPath: undefined,
  categories: [
    {
      id: 'mcdonalds-burgers',
      restaurantId: 'mcdonalds',
      name: 'Burgers',
      displayOrder: 1,
      iconName: 'fast-food',
    },
  ],
  metadata: {
    lastUpdated: '2024-01-01',
    source: 'bundled' as const,
    itemCount: 50,
    isVerified: true,
  },
};

const mockFood = {
  id: 'mcdonalds-big-mac',
  restaurantId: 'mcdonalds',
  restaurantName: "McDonald's",
  categoryId: 'mcdonalds-burgers',
  categoryName: 'Burgers',
  name: 'Big Mac',
  description: 'Two all-beef patties',
  nutrition: {
    calories: 590,
    protein: 25,
    carbohydrates: 46,
    fat: 34,
  },
  serving: {
    size: '1 sandwich (211g)',
    sizeGrams: 211,
  },
  metadata: {
    source: 'restaurant' as const,
    lastVerified: '2024-01-01',
    isVerified: true,
    popularityScore: 100,
  },
};

const mockFoodLog = {
  id: 'log-1',
  restaurantFoodId: 'mcdonalds-big-mac',
  restaurantName: "McDonald's",
  foodName: 'Big Mac',
  loggedAt: '2024-01-15T12:00:00.000Z',
  date: '2024-01-15',
  meal: MealType.Lunch,
  quantity: 1,
  nutritionSnapshot: {
    calories: 590,
    protein: 25,
    carbohydrates: 46,
    fat: 34,
  },
  createdAt: new Date('2024-01-15T12:00:00.000Z'),
};

jest.mock('@/repositories', () => ({
  restaurantRepository: {
    getAll: jest.fn(() => Promise.resolve([mockRestaurant])),
    getById: jest.fn(() => Promise.resolve(mockRestaurant)),
    getBySlug: jest.fn(() => Promise.resolve(mockRestaurant)),
    getRecent: jest.fn(() => Promise.resolve([mockRestaurant])),
    searchRestaurants: jest.fn(() => Promise.resolve([mockRestaurant])),
    getFoods: jest.fn(() => Promise.resolve([mockFood])),
    getFoodById: jest.fn(() => Promise.resolve(mockFood)),
    searchFoods: jest.fn(() => Promise.resolve([mockFood])),
    searchFoodsInRestaurant: jest.fn(() => Promise.resolve([mockFood])),
    logFood: jest.fn(() => Promise.resolve(mockFoodLog)),
    incrementPopularity: jest.fn(() => Promise.resolve()),
    updateUsage: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/services/restaurants', () => ({
  restaurantDataService: {
    initializeData: jest.fn(() => Promise.resolve()),
  },
}));

// Import after mocks
import { useRestaurantStore } from '@/stores/restaurantStore';
import { restaurantRepository } from '@/repositories';
import { restaurantDataService } from '@/services/restaurants';

const mockRestaurantRepository = restaurantRepository as jest.Mocked<typeof restaurantRepository>;
const mockRestaurantDataService = restaurantDataService as jest.Mocked<typeof restaurantDataService>;

describe('restaurantStore', () => {
  beforeEach(() => {
    // Reset store state
    useRestaurantStore.setState({
      restaurants: [],
      currentRestaurant: null,
      currentCategory: null,
      menuFoods: [],
      searchResults: [],
      recentRestaurants: [],
      selectedFood: null,
      isLoading: false,
      isLoadingMenu: false,
      isSearching: false,
      isDataInitialized: false,
      error: null,
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useRestaurantStore.getState();

      expect(state.restaurants).toEqual([]);
      expect(state.currentRestaurant).toBeNull();
      expect(state.menuFoods).toEqual([]);
      expect(state.searchResults).toEqual([]);
      expect(state.isDataInitialized).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('initializeData', () => {
    it('initializes restaurant data', async () => {
      await useRestaurantStore.getState().initializeData();

      const state = useRestaurantStore.getState();
      expect(state.isDataInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(mockRestaurantDataService.initializeData).toHaveBeenCalled();
    });

    it('only initializes once', async () => {
      await useRestaurantStore.getState().initializeData();
      await useRestaurantStore.getState().initializeData();

      expect(mockRestaurantDataService.initializeData).toHaveBeenCalledTimes(1);
    });

    it('sets error on failure', async () => {
      mockRestaurantDataService.initializeData.mockRejectedValueOnce(
        new Error('Init failed')
      );

      await useRestaurantStore.getState().initializeData();

      const state = useRestaurantStore.getState();
      expect(state.error).toBe('Init failed');
    });
  });

  describe('loadRestaurants', () => {
    it('loads all restaurants', async () => {
      await useRestaurantStore.getState().loadRestaurants();

      const state = useRestaurantStore.getState();
      expect(state.restaurants).toHaveLength(1);
      expect(state.restaurants[0].id).toBe('mcdonalds');
      expect(state.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockRestaurantRepository.getAll.mockRejectedValueOnce(
        new Error('Load failed')
      );

      await useRestaurantStore.getState().loadRestaurants();

      const state = useRestaurantStore.getState();
      expect(state.error).toBe('Load failed');
    });
  });

  describe('loadRecentRestaurants', () => {
    it('loads recent restaurants', async () => {
      await useRestaurantStore.getState().loadRecentRestaurants();

      const state = useRestaurantStore.getState();
      expect(state.recentRestaurants).toHaveLength(1);
      expect(mockRestaurantRepository.getRecent).toHaveBeenCalledWith(5);
    });
  });

  describe('selectRestaurant', () => {
    it('selects restaurant and loads menu', async () => {
      await useRestaurantStore.getState().selectRestaurant('mcdonalds');

      const state = useRestaurantStore.getState();
      expect(state.currentRestaurant).not.toBeNull();
      expect(state.currentRestaurant?.id).toBe('mcdonalds');
      expect(state.menuFoods).toHaveLength(1);
    });

    it('sets error when restaurant not found', async () => {
      mockRestaurantRepository.getById.mockResolvedValueOnce(null);

      await useRestaurantStore.getState().selectRestaurant('nonexistent');

      const state = useRestaurantStore.getState();
      expect(state.error).toBe('Restaurant not found');
    });
  });

  describe('clearCurrentRestaurant', () => {
    it('clears current restaurant state', async () => {
      await useRestaurantStore.getState().selectRestaurant('mcdonalds');
      useRestaurantStore.getState().clearCurrentRestaurant();

      const state = useRestaurantStore.getState();
      expect(state.currentRestaurant).toBeNull();
      expect(state.currentCategory).toBeNull();
      expect(state.menuFoods).toEqual([]);
    });
  });

  describe('loadRestaurantMenu', () => {
    it('loads menu for restaurant', async () => {
      await useRestaurantStore.getState().loadRestaurantMenu('mcdonalds');

      const state = useRestaurantStore.getState();
      expect(state.menuFoods).toHaveLength(1);
      expect(state.menuFoods[0].name).toBe('Big Mac');
      expect(state.isLoadingMenu).toBe(false);
    });

    it('filters by category when provided', async () => {
      await useRestaurantStore.getState().loadRestaurantMenu(
        'mcdonalds',
        'mcdonalds-burgers'
      );

      expect(mockRestaurantRepository.getFoods).toHaveBeenCalledWith(
        'mcdonalds',
        'mcdonalds-burgers'
      );
    });
  });

  describe('selectCategory', () => {
    it('sets current category and reloads menu', async () => {
      // First select a restaurant
      await useRestaurantStore.getState().selectRestaurant('mcdonalds');
      jest.clearAllMocks();

      const category = mockRestaurant.categories[0];
      useRestaurantStore.getState().selectCategory(category);

      const state = useRestaurantStore.getState();
      expect(state.currentCategory).toBe(category);
    });
  });

  describe('selectFood', () => {
    it('sets selected food', () => {
      useRestaurantStore.getState().selectFood(mockFood);

      const state = useRestaurantStore.getState();
      expect(state.selectedFood).toBe(mockFood);
    });

    it('clears selected food when null', () => {
      useRestaurantStore.getState().selectFood(mockFood);
      useRestaurantStore.getState().selectFood(null);

      const state = useRestaurantStore.getState();
      expect(state.selectedFood).toBeNull();
    });
  });

  describe('searchRestaurants', () => {
    it('returns matching restaurants', async () => {
      const results = await useRestaurantStore.getState().searchRestaurants('mcdonald');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mcdonalds');
    });

    it('returns empty for short queries', async () => {
      const results = await useRestaurantStore.getState().searchRestaurants('m');

      expect(results).toHaveLength(0);
      expect(mockRestaurantRepository.searchRestaurants).not.toHaveBeenCalled();
    });
  });

  describe('searchFoods', () => {
    it('searches for foods', async () => {
      await useRestaurantStore.getState().searchFoods('big mac');

      const state = useRestaurantStore.getState();
      expect(state.searchResults).toHaveLength(1);
      expect(state.searchResults[0].name).toBe('Big Mac');
    });

    it('clears results for short queries', async () => {
      useRestaurantStore.setState({ searchResults: [mockFood] });

      await useRestaurantStore.getState().searchFoods('b');

      const state = useRestaurantStore.getState();
      expect(state.searchResults).toEqual([]);
    });
  });

  describe('searchFoodsInRestaurant', () => {
    it('searches foods within restaurant', async () => {
      await useRestaurantStore.getState().searchFoodsInRestaurant(
        'mcdonalds',
        'big'
      );

      expect(mockRestaurantRepository.searchFoodsInRestaurant).toHaveBeenCalledWith(
        'mcdonalds',
        'big'
      );
    });

    it('reloads full menu for short queries', async () => {
      await useRestaurantStore.getState().searchFoodsInRestaurant(
        'mcdonalds',
        'b'
      );

      expect(mockRestaurantRepository.getFoods).toHaveBeenCalledWith(
        'mcdonalds',
        undefined
      );
    });
  });

  describe('clearSearch', () => {
    it('clears search results', () => {
      useRestaurantStore.setState({ searchResults: [mockFood] });

      useRestaurantStore.getState().clearSearch();

      const state = useRestaurantStore.getState();
      expect(state.searchResults).toEqual([]);
    });
  });

  describe('logFood', () => {
    it('logs food to repository', async () => {
      const result = await useRestaurantStore.getState().logFood(
        mockFood,
        MealType.Lunch,
        1
      );

      expect(result.id).toBe('log-1');
      expect(mockRestaurantRepository.logFood).toHaveBeenCalledWith({
        restaurantFoodId: 'mcdonalds-big-mac',
        restaurantName: "McDonald's",
        foodName: 'Big Mac',
        meal: MealType.Lunch,
        quantity: 1,
        notes: undefined,
        nutritionSnapshot: {
          calories: 590,
          protein: 25,
          carbohydrates: 46,
          fat: 34,
        },
      });
    });

    it('logs with custom quantity', async () => {
      await useRestaurantStore.getState().logFood(mockFood, MealType.Dinner, 2);

      expect(mockRestaurantRepository.logFood).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 2,
          nutritionSnapshot: {
            calories: 1180, // 590 * 2
            protein: 50,
            carbohydrates: 92,
            fat: 68,
          },
        })
      );
    });

    it('includes notes when provided', async () => {
      await useRestaurantStore.getState().logFood(
        mockFood,
        MealType.Lunch,
        1,
        'No pickles'
      );

      expect(mockRestaurantRepository.logFood).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'No pickles',
        })
      );
    });

    it('sets error on failure', async () => {
      mockRestaurantRepository.logFood.mockRejectedValueOnce(
        new Error('Log failed')
      );

      await expect(
        useRestaurantStore.getState().logFood(mockFood, MealType.Lunch)
      ).rejects.toThrow('Log failed');

      const state = useRestaurantStore.getState();
      expect(state.error).toBe('Log failed');
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useRestaurantStore.setState({ error: 'Some error' });

      useRestaurantStore.getState().clearError();

      const state = useRestaurantStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      // Load some data
      await useRestaurantStore.getState().loadRestaurants();
      await useRestaurantStore.getState().selectRestaurant('mcdonalds');

      // Reset
      useRestaurantStore.getState().reset();

      const state = useRestaurantStore.getState();
      expect(state.restaurants).toEqual([]);
      expect(state.currentRestaurant).toBeNull();
      expect(state.menuFoods).toEqual([]);
      expect(state.isDataInitialized).toBe(false);
    });
  });
});
