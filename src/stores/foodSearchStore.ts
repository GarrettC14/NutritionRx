import { create } from 'zustand';
import { foodRepository, CreateFoodInput } from '@/repositories';
import { FoodItem } from '@/types/domain';
import { SEARCH_SETTINGS } from '@/constants/defaults';

interface FoodSearchState {
  // State
  query: string;
  results: FoodItem[];
  recentFoods: FoodItem[];
  frequentFoods: FoodItem[];
  isSearching: boolean;
  isLoadingRecent: boolean;
  error: string | null;

  // Actions
  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  loadRecentFoods: () => Promise<void>;
  loadFrequentFoods: () => Promise<void>;
  findByBarcode: (barcode: string) => Promise<FoodItem | null>;
  createFood: (input: CreateFoodInput) => Promise<FoodItem>;
  updateFood: (id: string, updates: Partial<CreateFoodInput>) => Promise<FoodItem>;
  deleteFood: (id: string) => Promise<void>;
}

export const useFoodSearchStore = create<FoodSearchState>((set, get) => ({
  query: '',
  results: [],
  recentFoods: [],
  frequentFoods: [],
  isSearching: false,
  isLoadingRecent: false,
  error: null,

  setQuery: (query) => {
    set({ query });

    // Debounce search
    if (query.length >= SEARCH_SETTINGS.minQueryLength) {
      get().search(query);
    } else {
      set({ results: [] });
    }
  },

  search: async (query) => {
    if (query.length < SEARCH_SETTINGS.minQueryLength) {
      set({ results: [] });
      return;
    }

    set({ isSearching: true, error: null });
    try {
      const results = await foodRepository.search(query);
      set({ results, isSearching: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        isSearching: false,
      });
    }
  },

  clearSearch: () => {
    set({ query: '', results: [] });
  },

  loadRecentFoods: async () => {
    set({ isLoadingRecent: true, error: null });
    try {
      const recentFoods = await foodRepository.getRecent();
      set({ recentFoods, isLoadingRecent: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load recent foods',
        isLoadingRecent: false,
      });
    }
  },

  loadFrequentFoods: async () => {
    set({ isLoadingRecent: true, error: null });
    try {
      const frequentFoods = await foodRepository.getFrequent();
      set({ frequentFoods, isLoadingRecent: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load frequent foods',
        isLoadingRecent: false,
      });
    }
  },

  findByBarcode: async (barcode) => {
    set({ isSearching: true, error: null });
    try {
      const food = await foodRepository.findByBarcode(barcode);
      set({ isSearching: false });
      return food;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Barcode lookup failed',
        isSearching: false,
      });
      return null;
    }
  },

  createFood: async (input) => {
    set({ isSearching: true, error: null });
    try {
      const food = await foodRepository.create(input);

      // Refresh recent foods
      get().loadRecentFoods();

      set({ isSearching: false });
      return food;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create food',
        isSearching: false,
      });
      throw error;
    }
  },

  updateFood: async (id, updates) => {
    set({ isSearching: true, error: null });
    try {
      const food = await foodRepository.update(id, updates);
      set({ isSearching: false });
      return food;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update food',
        isSearching: false,
      });
      throw error;
    }
  },

  deleteFood: async (id) => {
    set({ isSearching: true, error: null });
    try {
      await foodRepository.delete(id);

      // Refresh recent and frequent foods
      await Promise.all([
        get().loadRecentFoods(),
        get().loadFrequentFoods(),
      ]);

      set({ isSearching: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete food',
        isSearching: false,
      });
      throw error;
    }
  },
}));
