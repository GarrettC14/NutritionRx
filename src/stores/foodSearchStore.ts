import { create } from 'zustand';
import { foodRepository, CreateFoodInput } from '@/repositories';
import { FoodItem } from '@/types/domain';
import { SEARCH_SETTINGS } from '@/constants/defaults';
import { USDAFoodService } from '@/services/usda/USDAFoodService';

interface FoodSearchState {
  // State
  query: string;
  results: FoodItem[];
  recentFoods: FoodItem[];
  frequentFoods: FoodItem[];
  isSearching: boolean;
  isLoadingRecent: boolean;
  isLoaded: boolean;
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
  isLoaded: false,
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
      // Search local DB first for immediate results
      const localResults = await foodRepository.search(query);
      set({ results: localResults, isSearching: false });

      // Then search USDA in background and merge results
      try {
        const usdaResults = await USDAFoodService.searchFoods(query, {
          dataTypes: ['Foundation', 'SR Legacy'],
          pageSize: 10,
        });

        if (usdaResults.length > 0) {
          // Convert USDA results to FoodItem format (unsaved, prefixed IDs)
          const usdaFoods: FoodItem[] = usdaResults
            .filter((r) => r.description)
            .map((r) => ({
              id: `usda-${r.fdcId}`,
              name: r.description,
              brand: r.brandOwner || undefined,
              calories: Math.round(
                r.foodNutrients?.find((n) => n.nutrientId === 1008)?.value || 0
              ),
              protein: Math.round(
                r.foodNutrients?.find((n) => n.nutrientId === 1003)?.value || 0
              ),
              carbs: Math.round(
                r.foodNutrients?.find((n) => n.nutrientId === 1005)?.value || 0
              ),
              fat: Math.round(
                r.foodNutrients?.find((n) => n.nutrientId === 1004)?.value || 0
              ),
              servingSize: r.servingSize || 100,
              servingUnit: r.servingSizeUnit || 'g',
              servingSizeGrams: r.servingSize || 100,
              source: 'usda' as const,
              sourceId: String(r.fdcId),
              isVerified: true,
              isUserCreated: false,
              usageCount: 0,
              usdaFdcId: r.fdcId,
              usdaNutrientCount: USDAFoodService.countAvailableNutrients(r),
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

          // Merge: local results first, then USDA results (deduped by name)
          const localNames = new Set(
            localResults.map((f) => f.name.toLowerCase())
          );
          const uniqueUsda = usdaFoods.filter(
            (f) => !localNames.has(f.name.toLowerCase())
          );

          set({ results: [...localResults, ...uniqueUsda] });
        }
      } catch {
        // USDA search failure is non-critical - local results already set
      }
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
      set({ recentFoods, isLoadingRecent: false, isLoaded: true });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load recent foods',
        isLoadingRecent: false,
        isLoaded: true,
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
