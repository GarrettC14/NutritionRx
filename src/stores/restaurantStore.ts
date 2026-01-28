/**
 * Restaurant Store
 * Zustand store for restaurant/chain database feature
 */

import { create } from 'zustand';
import { restaurantRepository } from '@/repositories';
import { restaurantDataService } from '@/services/restaurants';
import {
  Restaurant,
  RestaurantFood,
  RestaurantFoodLog,
  MenuCategory,
} from '@/types/restaurant';
import { MealType } from '@/constants/mealTypes';

interface RestaurantState {
  // State
  restaurants: Restaurant[];
  currentRestaurant: Restaurant | null;
  currentCategory: MenuCategory | null;
  menuFoods: RestaurantFood[];
  searchResults: RestaurantFood[];
  recentRestaurants: Restaurant[];
  selectedFood: RestaurantFood | null;

  // Loading states
  isLoading: boolean;
  isLoadingMenu: boolean;
  isSearching: boolean;
  isDataInitialized: boolean;

  // Error state
  error: string | null;

  // Actions - Initialization
  initializeData: () => Promise<void>;

  // Actions - Restaurants
  loadRestaurants: () => Promise<void>;
  loadRecentRestaurants: () => Promise<void>;
  selectRestaurant: (restaurantId: string) => Promise<void>;
  clearCurrentRestaurant: () => void;

  // Actions - Menu
  loadRestaurantMenu: (restaurantId: string, categoryId?: string) => Promise<void>;
  selectCategory: (category: MenuCategory | null) => void;
  selectFood: (food: RestaurantFood | null) => void;

  // Actions - Search
  searchRestaurants: (query: string) => Promise<Restaurant[]>;
  searchFoods: (query: string) => Promise<void>;
  searchFoodsInRestaurant: (restaurantId: string, query: string) => Promise<void>;
  clearSearch: () => void;

  // Actions - Logging
  logFood: (
    food: RestaurantFood,
    meal: MealType,
    quantity?: number,
    notes?: string
  ) => Promise<RestaurantFoodLog>;

  // Actions - Utility
  clearError: () => void;
  reset: () => void;
}

const initialState = {
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
};

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  ...initialState,

  // ============================================================
  // Initialization
  // ============================================================

  initializeData: async () => {
    if (get().isDataInitialized) return;

    set({ isLoading: true, error: null });
    try {
      await restaurantDataService.initializeData();
      set({ isDataInitialized: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize restaurant data',
        isLoading: false,
      });
    }
  },

  // ============================================================
  // Restaurants
  // ============================================================

  loadRestaurants: async () => {
    set({ isLoading: true, error: null });
    try {
      const restaurants = await restaurantRepository.getAll();
      set({ restaurants, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load restaurants',
        isLoading: false,
      });
    }
  },

  loadRecentRestaurants: async () => {
    try {
      const recentRestaurants = await restaurantRepository.getRecent(5);
      set({ recentRestaurants });
    } catch (error) {
      console.error('Failed to load recent restaurants:', error);
    }
  },

  selectRestaurant: async (restaurantId: string) => {
    set({ isLoading: true, error: null });
    try {
      const restaurant = await restaurantRepository.getById(restaurantId);
      if (restaurant) {
        set({
          currentRestaurant: restaurant,
          currentCategory: null,
          isLoading: false,
        });
        // Load menu for the restaurant
        await get().loadRestaurantMenu(restaurantId);
      } else {
        set({
          error: 'Restaurant not found',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load restaurant',
        isLoading: false,
      });
    }
  },

  clearCurrentRestaurant: () => {
    set({
      currentRestaurant: null,
      currentCategory: null,
      menuFoods: [],
      selectedFood: null,
    });
  },

  // ============================================================
  // Menu
  // ============================================================

  loadRestaurantMenu: async (restaurantId: string, categoryId?: string) => {
    set({ isLoadingMenu: true, error: null });
    try {
      const menuFoods = await restaurantRepository.getFoods(restaurantId, categoryId);
      set({ menuFoods, isLoadingMenu: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load menu',
        isLoadingMenu: false,
      });
    }
  },

  selectCategory: (category: MenuCategory | null) => {
    set({ currentCategory: category });
    const { currentRestaurant } = get();
    if (currentRestaurant) {
      get().loadRestaurantMenu(currentRestaurant.id, category?.id);
    }
  },

  selectFood: (food: RestaurantFood | null) => {
    set({ selectedFood: food });
  },

  // ============================================================
  // Search
  // ============================================================

  searchRestaurants: async (query: string) => {
    if (query.length < 2) return [];

    try {
      const results = await restaurantRepository.searchRestaurants(query);
      return results;
    } catch (error) {
      console.error('Failed to search restaurants:', error);
      return [];
    }
  },

  searchFoods: async (query: string) => {
    if (query.length < 2) {
      set({ searchResults: [] });
      return;
    }

    set({ isSearching: true, error: null });
    try {
      const searchResults = await restaurantRepository.searchFoods(query);
      set({ searchResults, isSearching: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        isSearching: false,
      });
    }
  },

  searchFoodsInRestaurant: async (restaurantId: string, query: string) => {
    if (query.length < 2) {
      // Reset to full menu
      await get().loadRestaurantMenu(restaurantId);
      return;
    }

    set({ isSearching: true, error: null });
    try {
      const menuFoods = await restaurantRepository.searchFoodsInRestaurant(
        restaurantId,
        query
      );
      set({ menuFoods, isSearching: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        isSearching: false,
      });
    }
  },

  clearSearch: () => {
    set({ searchResults: [] });
  },

  // ============================================================
  // Logging
  // ============================================================

  logFood: async (
    food: RestaurantFood,
    meal: MealType,
    quantity: number = 1,
    notes?: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      const log = await restaurantRepository.logFood({
        restaurantFoodId: food.id,
        restaurantName: food.restaurantName,
        foodName: food.name,
        meal,
        quantity,
        notes,
        nutritionSnapshot: {
          calories: Math.round(food.nutrition.calories * quantity),
          protein: Math.round(food.nutrition.protein * quantity),
          carbohydrates: Math.round(food.nutrition.carbohydrates * quantity),
          fat: Math.round(food.nutrition.fat * quantity),
        },
      });

      // Refresh recent restaurants
      await get().loadRecentRestaurants();

      set({ isLoading: false });
      return log;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to log food',
        isLoading: false,
      });
      throw error;
    }
  },

  // ============================================================
  // Utility
  // ============================================================

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));
