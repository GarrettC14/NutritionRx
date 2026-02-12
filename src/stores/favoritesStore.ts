import { create } from 'zustand';
import { favoriteRepository } from '@/repositories';
import { FoodItem } from '@/types/domain';

interface FavoritesState {
  // State
  favorites: FoodItem[];
  favoritedIds: Set<string>;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  loadFavorites: () => Promise<void>;
  toggleFavorite: (foodId: string) => Promise<boolean>;
  isFavorite: (foodId: string) => boolean;
  updateFavoriteDefaults: (
    foodId: string,
    servingSize: number,
    servingUnit: string
  ) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  favoritedIds: new Set(),
  isLoading: false,
  isLoaded: false,
  error: null,

  loadFavorites: async () => {
    set({ isLoading: true, error: null });
    try {
      const [favorites, ids] = await Promise.all([
        favoriteRepository.getAll(),
        favoriteRepository.getAllIds(),
      ]);
      set({
        favorites,
        favoritedIds: new Set(ids),
        isLoading: false,
        isLoaded: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load favorites',
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  toggleFavorite: async (foodId: string) => {
    const { favoritedIds, favorites } = get();
    const wasFavorited = favoritedIds.has(foodId);

    // Optimistic update
    const newIds = new Set(favoritedIds);
    if (wasFavorited) {
      newIds.delete(foodId);
      set({
        favoritedIds: newIds,
        favorites: favorites.filter((f) => f.id !== foodId),
      });
    } else {
      newIds.add(foodId);
      set({ favoritedIds: newIds });
    }

    try {
      const isNowFavorited = await favoriteRepository.toggle(foodId);

      // Reload to get accurate data including the food item details
      if (isNowFavorited) {
        const updatedFavorites = await favoriteRepository.getAll();
        set({ favorites: updatedFavorites });
      }

      return isNowFavorited;
    } catch (error) {
      // Rollback on error
      set({ favoritedIds, favorites });
      throw error;
    }
  },

  isFavorite: (foodId: string) => {
    return get().favoritedIds.has(foodId);
  },

  updateFavoriteDefaults: async (
    foodId: string,
    servingSize: number,
    servingUnit: string
  ) => {
    try {
      await favoriteRepository.updateDefaults(foodId, servingSize, servingUnit);
    } catch (error) {
      if (__DEV__) console.error('Failed to update favorite defaults:', error);
    }
  },
}));
