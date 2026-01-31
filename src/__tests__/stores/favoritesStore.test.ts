/**
 * Favorites Store Tests
 * Tests for favorite food management with optimistic updates and rollback
 */

import { useFavoritesStore } from '@/stores/favoritesStore';
import { favoriteRepository } from '@/repositories';
import { FoodItem } from '@/types/domain';

// Mock repositories
jest.mock('@/repositories', () => ({
  favoriteRepository: {
    getAll: jest.fn(),
    getAllIds: jest.fn(),
    toggle: jest.fn(),
    updateDefaults: jest.fn(),
  },
}));

const mockFavoriteRepo = favoriteRepository as jest.Mocked<typeof favoriteRepository>;

const initialState = {
  favorites: [],
  favoritedIds: new Set<string>(),
  isLoading: false,
  isLoaded: false,
  error: null,
};

const mockFoodItem: FoodItem = {
  id: 'food-1',
  name: 'Chicken Breast',
  brand: 'Generic',
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
  servingSize: 100,
  servingUnit: 'g',
  source: 'usda',
  isVerified: true,
  isUserCreated: false,
  usageCount: 10,
  usdaNutrientCount: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockFoodItem2: FoodItem = {
  id: 'food-2',
  name: 'Brown Rice',
  brand: 'Generic',
  calories: 216,
  protein: 5,
  carbs: 45,
  fat: 1.8,
  servingSize: 1,
  servingUnit: 'cup',
  source: 'usda',
  isVerified: true,
  isUserCreated: false,
  usageCount: 8,
  usdaNutrientCount: 0,
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
};

describe('useFavoritesStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState(initialState);
  });

  // ==========================================================
  // loadFavorites
  // ==========================================================

  describe('loadFavorites', () => {
    it('loads favorites and ids in parallel', async () => {
      mockFavoriteRepo.getAll.mockResolvedValue([mockFoodItem, mockFoodItem2]);
      mockFavoriteRepo.getAllIds.mockResolvedValue(['food-1', 'food-2']);

      await useFavoritesStore.getState().loadFavorites();

      const state = useFavoritesStore.getState();
      expect(state.favorites).toEqual([mockFoodItem, mockFoodItem2]);
      expect(state.favoritedIds).toEqual(new Set(['food-1', 'food-2']));
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(true);
    });

    it('calls getAll and getAllIds concurrently', async () => {
      let getAllResolved = false;
      let getAllIdsResolved = false;

      mockFavoriteRepo.getAll.mockImplementation(async () => {
        getAllResolved = true;
        // Verify getAllIds was also called (concurrent)
        expect(mockFavoriteRepo.getAllIds).toHaveBeenCalled();
        return [];
      });
      mockFavoriteRepo.getAllIds.mockImplementation(async () => {
        getAllIdsResolved = true;
        return [];
      });

      await useFavoritesStore.getState().loadFavorites();

      expect(getAllResolved).toBe(true);
      expect(getAllIdsResolved).toBe(true);
    });

    it('sets isLoading to true during load', async () => {
      let capturedLoading = false;
      mockFavoriteRepo.getAll.mockImplementation(async () => {
        capturedLoading = useFavoritesStore.getState().isLoading;
        return [];
      });
      mockFavoriteRepo.getAllIds.mockResolvedValue([]);

      await useFavoritesStore.getState().loadFavorites();

      expect(capturedLoading).toBe(true);
      expect(useFavoritesStore.getState().isLoading).toBe(false);
    });

    it('sets error and isLoaded on failure', async () => {
      mockFavoriteRepo.getAll.mockRejectedValue(new Error('Load failed'));
      mockFavoriteRepo.getAllIds.mockResolvedValue([]);

      await useFavoritesStore.getState().loadFavorites();

      const state = useFavoritesStore.getState();
      expect(state.error).toBe('Load failed');
      expect(state.isLoading).toBe(false);
      expect(state.isLoaded).toBe(true);
    });

    it('handles non-Error thrown values', async () => {
      mockFavoriteRepo.getAll.mockRejectedValue('string error');
      mockFavoriteRepo.getAllIds.mockResolvedValue([]);

      await useFavoritesStore.getState().loadFavorites();

      expect(useFavoritesStore.getState().error).toBe('Failed to load favorites');
    });
  });

  // ==========================================================
  // isFavorite
  // ==========================================================

  describe('isFavorite', () => {
    it('returns true when food id is in favoritedIds', () => {
      useFavoritesStore.setState({ favoritedIds: new Set(['food-1', 'food-2']) });

      expect(useFavoritesStore.getState().isFavorite('food-1')).toBe(true);
    });

    it('returns false when food id is not in favoritedIds', () => {
      useFavoritesStore.setState({ favoritedIds: new Set(['food-1']) });

      expect(useFavoritesStore.getState().isFavorite('food-99')).toBe(false);
    });

    it('returns false for empty set', () => {
      useFavoritesStore.setState({ favoritedIds: new Set() });

      expect(useFavoritesStore.getState().isFavorite('food-1')).toBe(false);
    });
  });

  // ==========================================================
  // toggleFavorite
  // ==========================================================

  describe('toggleFavorite', () => {
    describe('adding a favorite', () => {
      it('optimistically adds id to favoritedIds', async () => {
        useFavoritesStore.setState({
          favorites: [],
          favoritedIds: new Set(),
        });

        let capturedIds: Set<string> | null = null;
        mockFavoriteRepo.toggle.mockImplementation(async () => {
          capturedIds = new Set(useFavoritesStore.getState().favoritedIds);
          return true;
        });
        mockFavoriteRepo.getAll.mockResolvedValue([mockFoodItem]);

        await useFavoritesStore.getState().toggleFavorite('food-1');

        // During the toggle call, the id should already be in the set
        expect(capturedIds!.has('food-1')).toBe(true);
      });

      it('reloads favorites list after adding', async () => {
        useFavoritesStore.setState({
          favorites: [],
          favoritedIds: new Set(),
        });
        mockFavoriteRepo.toggle.mockResolvedValue(true);
        mockFavoriteRepo.getAll.mockResolvedValue([mockFoodItem]);

        await useFavoritesStore.getState().toggleFavorite('food-1');

        expect(mockFavoriteRepo.getAll).toHaveBeenCalled();
        expect(useFavoritesStore.getState().favorites).toEqual([mockFoodItem]);
      });

      it('returns true when item is now favorited', async () => {
        useFavoritesStore.setState({
          favorites: [],
          favoritedIds: new Set(),
        });
        mockFavoriteRepo.toggle.mockResolvedValue(true);
        mockFavoriteRepo.getAll.mockResolvedValue([mockFoodItem]);

        const result = await useFavoritesStore.getState().toggleFavorite('food-1');

        expect(result).toBe(true);
      });
    });

    describe('removing a favorite', () => {
      it('optimistically removes id from favoritedIds and removes from array', async () => {
        useFavoritesStore.setState({
          favorites: [mockFoodItem],
          favoritedIds: new Set(['food-1']),
        });

        let capturedIds: Set<string> | null = null;
        let capturedFavorites: FoodItem[] | null = null;
        mockFavoriteRepo.toggle.mockImplementation(async () => {
          capturedIds = new Set(useFavoritesStore.getState().favoritedIds);
          capturedFavorites = [...useFavoritesStore.getState().favorites];
          return false;
        });

        await useFavoritesStore.getState().toggleFavorite('food-1');

        // During the toggle call, the id and item should be removed
        expect(capturedIds!.has('food-1')).toBe(false);
        expect(capturedFavorites).toEqual([]);
      });

      it('does not reload favorites list after removing', async () => {
        useFavoritesStore.setState({
          favorites: [mockFoodItem],
          favoritedIds: new Set(['food-1']),
        });
        mockFavoriteRepo.toggle.mockResolvedValue(false);

        await useFavoritesStore.getState().toggleFavorite('food-1');

        // getAll should NOT be called when unfavoriting (only on add)
        expect(mockFavoriteRepo.getAll).not.toHaveBeenCalled();
      });

      it('returns false when item is now unfavorited', async () => {
        useFavoritesStore.setState({
          favorites: [mockFoodItem],
          favoritedIds: new Set(['food-1']),
        });
        mockFavoriteRepo.toggle.mockResolvedValue(false);

        const result = await useFavoritesStore.getState().toggleFavorite('food-1');

        expect(result).toBe(false);
      });
    });

    describe('rollback on error', () => {
      it('rolls back favoritedIds on add failure', async () => {
        const originalIds = new Set(['food-2']);
        const originalFavorites = [mockFoodItem2];
        useFavoritesStore.setState({
          favorites: originalFavorites,
          favoritedIds: originalIds,
        });
        mockFavoriteRepo.toggle.mockRejectedValue(new Error('Network error'));

        await expect(
          useFavoritesStore.getState().toggleFavorite('food-1')
        ).rejects.toThrow('Network error');

        const state = useFavoritesStore.getState();
        // Should roll back to original state
        expect(state.favoritedIds.has('food-1')).toBe(false);
        expect(state.favoritedIds.has('food-2')).toBe(true);
        expect(state.favorites).toEqual(originalFavorites);
      });

      it('rolls back favoritedIds on remove failure', async () => {
        const originalIds = new Set(['food-1', 'food-2']);
        const originalFavorites = [mockFoodItem, mockFoodItem2];
        useFavoritesStore.setState({
          favorites: originalFavorites,
          favoritedIds: originalIds,
        });
        mockFavoriteRepo.toggle.mockRejectedValue(new Error('Server error'));

        await expect(
          useFavoritesStore.getState().toggleFavorite('food-1')
        ).rejects.toThrow('Server error');

        const state = useFavoritesStore.getState();
        // Should roll back: food-1 should still be present
        expect(state.favoritedIds.has('food-1')).toBe(true);
        expect(state.favorites).toEqual(originalFavorites);
      });
    });
  });

  // ==========================================================
  // updateFavoriteDefaults
  // ==========================================================

  describe('updateFavoriteDefaults', () => {
    it('calls repository with correct parameters', async () => {
      mockFavoriteRepo.updateDefaults.mockResolvedValue(undefined);

      await useFavoritesStore.getState().updateFavoriteDefaults('food-1', 150, 'g');

      expect(mockFavoriteRepo.updateDefaults).toHaveBeenCalledWith('food-1', 150, 'g');
    });

    it('handles errors silently (logs to console)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFavoriteRepo.updateDefaults.mockRejectedValue(new Error('Update failed'));

      await useFavoritesStore.getState().updateFavoriteDefaults('food-1', 200, 'ml');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update favorite defaults:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('does not throw on error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      mockFavoriteRepo.updateDefaults.mockRejectedValue(new Error('Update failed'));

      // Should not reject
      await expect(
        useFavoritesStore.getState().updateFavoriteDefaults('food-1', 200, 'ml')
      ).resolves.toBeUndefined();

      jest.restoreAllMocks();
    });
  });
});
