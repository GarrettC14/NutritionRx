import { create } from 'zustand';
import {
  foodRepository,
  favoriteRepository,
  CreateFoodInput,
} from '@/repositories';
import { FoodItem, FoodItemWithServing } from '@/types/domain';
import { SEARCH_SETTINGS } from '@/constants/defaults';
import { USDAFoodService } from '@/services/usda/USDAFoodService';
import * as Sentry from '@sentry/react-native';
import { isExpectedError } from '@/utils/sentryHelpers';

interface FoodSearchState {
  // State
  query: string;
  results: FoodItem[];
  recentFoods: FoodItem[];
  frequentFoods: FoodItem[];
  mealContextFoods: FoodItemWithServing[];
  scannedHistory: FoodItem[];
  isSearching: boolean;
  isLoadingRecent: boolean;
  isLoadingMealContext: boolean;
  isLoadingScanned: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  loadRecentFoods: () => Promise<void>;
  loadFrequentFoods: () => Promise<void>;
  loadMealContextFoods: (mealType: string, limit?: number) => Promise<void>;
  loadScannedHistory: (limit?: number) => Promise<void>;
  findByBarcode: (barcode: string) => Promise<FoodItem | null>;
  createFood: (input: CreateFoodInput) => Promise<FoodItem>;
  updateFood: (id: string, updates: Partial<CreateFoodInput>) => Promise<FoodItem>;
  deleteFood: (id: string) => Promise<void>;
}

const resolveServingHints = async (foods: FoodItem[]): Promise<FoodItemWithServing[]> => {
  if (foods.length === 0) {
    return [];
  }

  const foodIds = foods.map((food) => food.id);

  const [lastUsedServingsByFood, favoriteDefaults] = await Promise.all([
    foodRepository.getBatchLastLogServings(foodIds),
    Promise.all(foodIds.map((foodId) => favoriteRepository.getDefaults(foodId))),
  ]);

  const favoriteServingByFood = new Map<string, { size: number; unit: string }>();
  favoriteDefaults.forEach((defaults, index) => {
    if (!defaults) return;
    if (defaults.servingSize != null && defaults.servingUnit != null) {
      favoriteServingByFood.set(foodIds[index], {
        size: defaults.servingSize,
        unit: defaults.servingUnit,
      });
    }
  });

  return foods.map((food) => {
    const foodWithServing = food as FoodItemWithServing;
    const lastUsedServings = lastUsedServingsByFood.get(food.id);
    const favoriteServing = favoriteServingByFood.get(food.id);

    return {
      ...foodWithServing,
      lastUsedServings: lastUsedServings ?? foodWithServing.lastUsedServings ?? null,
      servingHint: foodWithServing.servingHint
        ?? favoriteServing
        ?? (lastUsedServings != null
          ? { size: lastUsedServings, unit: food.servingUnit }
          : { size: food.servingSize, unit: food.servingUnit }),
    };
  });
};

let currentSearchId = 0;

export const useFoodSearchStore = create<FoodSearchState>((set, get) => ({
  query: '',
  results: [],
  recentFoods: [],
  frequentFoods: [],
  mealContextFoods: [],
  scannedHistory: [],
  isSearching: false,
  isLoadingRecent: false,
  isLoadingMealContext: false,
  isLoadingScanned: false,
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

    const thisSearchId = ++currentSearchId;

    set({ isSearching: true, error: null });
    try {
      // Search local DB first for immediate results
      const localResults = await foodRepository.search(query);
      if (thisSearchId !== currentSearchId) return; // stale, discard
      set({ results: localResults, isSearching: false });

      // Then search USDA in background and merge results
      try {
        const usdaResults = await USDAFoodService.searchFoods(query, {
          dataTypes: ['Foundation', 'SR Legacy'],
          pageSize: 10,
        });

        if (thisSearchId !== currentSearchId) return; // stale, discard

        if (usdaResults.length > 0) {
          // Helper: find nutrient value with fallback IDs
          // USDA Foundation foods may use alternate energy IDs (2048/2047) instead of 1008
          const findNutrient = (
            nutrients: typeof usdaResults[0]['foodNutrients'],
            ...ids: number[]
          ): number => {
            if (!nutrients) return 0;
            for (const id of ids) {
              const found = nutrients.find((n) => n.nutrientId === id);
              if (found && found.value > 0) return found.value;
            }
            return 0;
          };

          // Convert USDA results to FoodItem format (unsaved, prefixed IDs)
          const usdaFoods: FoodItem[] = usdaResults
            .filter((r) => r.description)
            .map((r) => ({
              id: `usda-${r.fdcId}`,
              name: r.description,
              brand: r.brandOwner || undefined,
              calories: Math.round(
                findNutrient(r.foodNutrients, 1008, 2048, 2047)
              ),
              protein: Math.round(
                findNutrient(r.foodNutrients, 1003)
              ),
              carbs: Math.round(
                findNutrient(r.foodNutrients, 1005)
              ),
              fat: Math.round(
                findNutrient(r.foodNutrients, 1004)
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
      } catch (usdaError) {
        // USDA search failure is non-critical - local results already set
        if (!isExpectedError(usdaError)) {
          Sentry.captureException(usdaError, { tags: { feature: 'food-search', action: 'search-usda' } });
        }
      }
    } catch (error) {
      if (!isExpectedError(error)) {
        Sentry.captureException(error, { tags: { feature: 'food-search', action: 'search' } });
      }
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
      const recentFoodsWithServing = await resolveServingHints(recentFoods);
      set({
        recentFoods: recentFoodsWithServing,
        isLoadingRecent: false,
        isLoaded: true,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'food-search', action: 'load-recent' } });
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
      const frequentFoodsWithServing = await resolveServingHints(frequentFoods);
      set({
        frequentFoods: frequentFoodsWithServing,
        isLoadingRecent: false,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { feature: 'food-search', action: 'load-frequent' } });
      set({
        error: error instanceof Error ? error.message : 'Failed to load frequent foods',
        isLoadingRecent: false,
      });
    }
  },

  loadMealContextFoods: async (mealType, limit = 10) => {
    set({ isLoadingMealContext: true, error: null });
    try {
      const mealContextFoods = await foodRepository.getMealContextFoods(mealType, limit);
      const mealContextFoodsWithServing = await resolveServingHints(
        mealContextFoods as unknown as FoodItem[]
      );
      set({
        mealContextFoods: mealContextFoodsWithServing,
        isLoadingMealContext: false,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: 'food-search', action: 'load-meal-context-foods' },
      });
      set({
        error: error instanceof Error ? error.message : 'Failed to load meal-context foods',
        isLoadingMealContext: false,
      });
    }
  },

  loadScannedHistory: async (limit = 10) => {
    set({ isLoadingScanned: true, error: null });
    try {
      const scannedHistory = await foodRepository.getScannedHistory(limit);
      const scannedHistoryWithServing = await resolveServingHints(scannedHistory);
      set({
        scannedHistory: scannedHistoryWithServing,
        isLoadingScanned: false,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: 'food-search', action: 'load-scanned-history' },
      });
      set({
        error: error instanceof Error ? error.message : 'Failed to load scanned foods',
        isLoadingScanned: false,
      });
    }
  },

  findByBarcode: async (barcode) => {
    set({ isSearching: true, error: null });
    try {
      const food = await foodRepository.findByBarcode(barcode);
      set({ isSearching: false });
      Sentry.addBreadcrumb({
        category: 'barcode',
        message: 'Barcode scan attempted',
        level: 'info',
        data: { result: food ? 'found' : 'not-found' },
      });
      return food;
    } catch (error) {
      if (!isExpectedError(error)) {
        Sentry.captureException(error, { tags: { feature: 'food-search', action: 'barcode-lookup' } });
      }
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
      Sentry.captureException(error, { tags: { feature: 'food-search', action: 'create-food' } });
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
      Sentry.captureException(error, { tags: { feature: 'food-search', action: 'update-food' } });
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
      Sentry.captureException(error, { tags: { feature: 'food-search', action: 'delete-food' } });
      set({
        error: error instanceof Error ? error.message : 'Failed to delete food',
        isSearching: false,
      });
      throw error;
    }
  },
}));
