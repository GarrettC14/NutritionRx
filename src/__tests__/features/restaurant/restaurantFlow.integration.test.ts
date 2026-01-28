/**
 * Restaurant Feature Integration Tests
 * End-to-end tests for the restaurant/chain database flow
 */

import { MealType } from '@/constants/mealTypes';

// Mock data
const mockRestaurants = [
  {
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
      {
        id: 'mcdonalds-chicken',
        restaurantId: 'mcdonalds',
        name: 'Chicken',
        displayOrder: 2,
        iconName: 'fast-food',
      },
    ],
    metadata: {
      lastUpdated: '2024-01-01',
      source: 'bundled' as const,
      itemCount: 50,
      isVerified: true,
    },
  },
  {
    id: 'chipotle',
    name: 'Chipotle',
    slug: 'chipotle',
    logoAssetPath: undefined,
    categories: [],
    metadata: {
      lastUpdated: '2024-01-01',
      source: 'bundled' as const,
      itemCount: 30,
      isVerified: true,
    },
  },
];

const mockFoods = [
  {
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
  },
  {
    id: 'mcdonalds-mcchicken',
    restaurantId: 'mcdonalds',
    restaurantName: "McDonald's",
    categoryId: 'mcdonalds-chicken',
    categoryName: 'Chicken',
    name: 'McChicken',
    description: 'Crispy chicken sandwich',
    nutrition: {
      calories: 400,
      protein: 14,
      carbohydrates: 39,
      fat: 21,
    },
    serving: {
      size: '1 sandwich (147g)',
      sizeGrams: 147,
    },
    metadata: {
      source: 'restaurant' as const,
      lastVerified: '2024-01-01',
      isVerified: true,
      popularityScore: 80,
    },
  },
];

const mockLoggedFood = {
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

// Setup mocks
jest.mock('@/repositories', () => ({
  restaurantRepository: {
    getAll: jest.fn(() => Promise.resolve(mockRestaurants)),
    getById: jest.fn((id) =>
      Promise.resolve(mockRestaurants.find((r) => r.id === id) || null)
    ),
    getRecent: jest.fn(() => Promise.resolve([])),
    searchRestaurants: jest.fn((query) =>
      Promise.resolve(
        mockRestaurants.filter((r) =>
          r.name.toLowerCase().includes(query.toLowerCase())
        )
      )
    ),
    getFoods: jest.fn((restaurantId, categoryId) =>
      Promise.resolve(
        mockFoods.filter(
          (f) =>
            f.restaurantId === restaurantId &&
            (!categoryId || f.categoryId === categoryId)
        )
      )
    ),
    getFoodById: jest.fn((id) =>
      Promise.resolve(mockFoods.find((f) => f.id === id) || null)
    ),
    searchFoods: jest.fn((query) =>
      Promise.resolve(
        mockFoods.filter((f) =>
          f.name.toLowerCase().includes(query.toLowerCase())
        )
      )
    ),
    searchFoodsInRestaurant: jest.fn((restaurantId, query) =>
      Promise.resolve(
        mockFoods.filter(
          (f) =>
            f.restaurantId === restaurantId &&
            f.name.toLowerCase().includes(query.toLowerCase())
        )
      )
    ),
    logFood: jest.fn(() => Promise.resolve(mockLoggedFood)),
    incrementPopularity: jest.fn(() => Promise.resolve()),
    updateUsage: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/services/restaurants', () => ({
  restaurantDataService: {
    initializeData: jest.fn(() => Promise.resolve()),
  },
}));

import { useRestaurantStore } from '@/stores/restaurantStore';
import { restaurantRepository } from '@/repositories';
import { restaurantDataService } from '@/services/restaurants';

const mockRepo = restaurantRepository as jest.Mocked<typeof restaurantRepository>;
const mockService = restaurantDataService as jest.Mocked<typeof restaurantDataService>;

describe('Restaurant Feature Integration', () => {
  beforeEach(() => {
    // Reset store
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

    jest.clearAllMocks();
  });

  describe('Restaurant Discovery Flow', () => {
    it('initializes data and loads restaurant list', async () => {
      const store = useRestaurantStore.getState();

      // Initialize data
      await store.initializeData();
      expect(mockService.initializeData).toHaveBeenCalled();
      expect(useRestaurantStore.getState().isDataInitialized).toBe(true);

      // Load restaurants
      await store.loadRestaurants();
      const state = useRestaurantStore.getState();
      expect(state.restaurants).toHaveLength(2);
      expect(state.restaurants[0].name).toBe("McDonald's");
    });

    it('searches for restaurants by name', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();

      const results = await store.searchRestaurants('mcdon');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("McDonald's");
    });

    it('handles empty search results gracefully', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();

      const results = await store.searchRestaurants('nonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('Restaurant Menu Browsing Flow', () => {
    it('selects restaurant and loads full menu', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();

      await store.selectRestaurant('mcdonalds');

      const state = useRestaurantStore.getState();
      expect(state.currentRestaurant).not.toBeNull();
      expect(state.currentRestaurant?.name).toBe("McDonald's");
      expect(state.menuFoods).toHaveLength(2);
    });

    it('filters menu by category', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();
      await store.selectRestaurant('mcdonalds');

      // Select burgers category
      const burgersCategory = mockRestaurants[0].categories[0];
      store.selectCategory(burgersCategory);

      // Wait for menu to load with category filter
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockRepo.getFoods).toHaveBeenCalledWith(
        'mcdonalds',
        'mcdonalds-burgers'
      );
    });

    it('searches within restaurant menu', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();
      await store.selectRestaurant('mcdonalds');

      await store.searchFoodsInRestaurant('mcdonalds', 'big');

      expect(mockRepo.searchFoodsInRestaurant).toHaveBeenCalledWith(
        'mcdonalds',
        'big'
      );
    });

    it('clears restaurant state when navigating away', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();
      await store.selectRestaurant('mcdonalds');

      store.clearCurrentRestaurant();

      const state = useRestaurantStore.getState();
      expect(state.currentRestaurant).toBeNull();
      expect(state.currentCategory).toBeNull();
      expect(state.menuFoods).toEqual([]);
    });
  });

  describe('Food Logging Flow', () => {
    it('logs food from restaurant menu', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();
      await store.selectRestaurant('mcdonalds');

      const bigMac = mockFoods[0];
      const result = await store.logFood(bigMac, MealType.Lunch, 1);

      expect(result.id).toBe('log-1');
      expect(result.nutritionSnapshot.calories).toBe(590);
      expect(mockRepo.logFood).toHaveBeenCalledWith({
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

    it('logs food with custom quantity', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();

      const bigMac = mockFoods[0];
      await store.logFood(bigMac, MealType.Dinner, 2);

      expect(mockRepo.logFood).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 2,
          nutritionSnapshot: {
            calories: 1180, // 590 * 2
            protein: 50, // 25 * 2
            carbohydrates: 92, // 46 * 2
            fat: 68, // 34 * 2
          },
        })
      );
    });

    it('logs food with customization notes', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();

      const bigMac = mockFoods[0];
      await store.logFood(bigMac, MealType.Lunch, 1, 'No pickles, extra lettuce');

      expect(mockRepo.logFood).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'No pickles, extra lettuce',
        })
      );
    });
  });

  describe('Global Food Search Flow', () => {
    it('searches foods across all restaurants', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();

      await store.searchFoods('big mac');

      const state = useRestaurantStore.getState();
      expect(state.searchResults).toHaveLength(1);
      expect(state.searchResults[0].name).toBe('Big Mac');
    });

    it('clears search results', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();
      await store.searchFoods('big mac');

      store.clearSearch();

      expect(useRestaurantStore.getState().searchResults).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('handles restaurant not found', async () => {
      mockRepo.getById.mockResolvedValueOnce(null);

      const store = useRestaurantStore.getState();
      await store.initializeData();
      await store.selectRestaurant('nonexistent');

      const state = useRestaurantStore.getState();
      expect(state.error).toBe('Restaurant not found');
      expect(state.currentRestaurant).toBeNull();
    });

    it('handles food logging failure', async () => {
      mockRepo.logFood.mockRejectedValueOnce(new Error('Network error'));

      const store = useRestaurantStore.getState();
      await store.initializeData();

      const bigMac = mockFoods[0];
      await expect(
        store.logFood(bigMac, MealType.Lunch)
      ).rejects.toThrow('Network error');

      const state = useRestaurantStore.getState();
      expect(state.error).toBe('Network error');
    });

    it('clears errors when requested', async () => {
      mockRepo.logFood.mockRejectedValueOnce(new Error('Error'));
      const store = useRestaurantStore.getState();
      await store.initializeData();

      try {
        await store.logFood(mockFoods[0], MealType.Lunch);
      } catch {
        // Expected error
      }

      store.clearError();
      expect(useRestaurantStore.getState().error).toBeNull();
    });
  });

  describe('State Reset', () => {
    it('resets all state to initial values', async () => {
      const store = useRestaurantStore.getState();
      await store.initializeData();
      await store.loadRestaurants();
      await store.selectRestaurant('mcdonalds');
      await store.searchFoods('big mac');

      store.reset();

      const state = useRestaurantStore.getState();
      expect(state.restaurants).toEqual([]);
      expect(state.currentRestaurant).toBeNull();
      expect(state.menuFoods).toEqual([]);
      expect(state.searchResults).toEqual([]);
      expect(state.isDataInitialized).toBe(false);
    });
  });
});
