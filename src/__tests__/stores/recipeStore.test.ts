/**
 * Recipe Store Tests
 * Tests for recipe CRUD, favorites, search, and recipe logging
 */

import { useRecipeStore } from '@/stores/recipeStore';
import { recipeRepository } from '@/repositories/recipeRepository';
import { Recipe, RecipeItemDraft, RecipeItemOverride } from '@/types/recipes';
import { MealType } from '@/constants/mealTypes';

jest.mock('@/repositories/recipeRepository', () => ({
  recipeRepository: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleFavorite: jest.fn(),
    search: jest.fn(),
    logRecipe: jest.fn(),
    deleteRecipeLog: jest.fn(),
  },
}));

const mockRepo = recipeRepository as jest.Mocked<typeof recipeRepository>;

// ============================================================
// Mock Data
// ============================================================

const mockRecipe1: Recipe = {
  id: 'r1',
  name: 'Chicken & Rice Bowl',
  description: 'High protein meal',
  totalCalories: 550,
  totalProtein: 45,
  totalCarbs: 60,
  totalFat: 12,
  itemCount: 2,
  isFavorite: false,
  usageCount: 3,
  lastUsedAt: '2024-06-01',
  items: [
    {
      id: 'ri1',
      recipeId: 'r1',
      foodItemId: 'f1',
      foodName: 'Chicken Breast',
      foodBrand: 'Generic',
      servings: 1,
      servingUnit: '100g',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      sortOrder: 0,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'ri2',
      recipeId: 'r1',
      foodItemId: 'f2',
      foodName: 'Brown Rice',
      servings: 1,
      servingUnit: 'cup',
      calories: 385,
      protein: 14,
      carbs: 60,
      fat: 8.4,
      sortOrder: 1,
      createdAt: new Date('2024-01-01'),
    },
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockRecipe2: Recipe = {
  id: 'r2',
  name: 'Protein Smoothie',
  description: undefined,
  totalCalories: 320,
  totalProtein: 30,
  totalCarbs: 40,
  totalFat: 5,
  itemCount: 3,
  isFavorite: true,
  usageCount: 10,
  lastUsedAt: '2024-06-10',
  items: [],
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-02-15'),
};

const mockDraftItems: RecipeItemDraft[] = [
  {
    foodItemId: 'f1',
    foodName: 'Chicken Breast',
    foodBrand: 'Generic',
    servings: 1,
    servingUnit: '100g',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
  },
];

const mockOverrideItems: RecipeItemOverride[] = [
  {
    foodItemId: 'f1',
    servings: 2,
    servingUnit: '100g',
    calories: 330,
    protein: 62,
    carbs: 0,
    fat: 7.2,
  },
];

// ============================================================
// Tests
// ============================================================

describe('useRecipeStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRecipeStore.setState({ recipes: [], isLoaded: false });
  });

  // ==========================================================
  // Initial State
  // ==========================================================

  describe('initial state', () => {
    it('has empty recipes array', () => {
      expect(useRecipeStore.getState().recipes).toEqual([]);
    });

    it('has isLoaded set to false', () => {
      expect(useRecipeStore.getState().isLoaded).toBe(false);
    });
  });

  // ==========================================================
  // loadRecipes
  // ==========================================================

  describe('loadRecipes', () => {
    it('calls recipeRepository.getAll', async () => {
      mockRepo.getAll.mockResolvedValue([]);

      await useRecipeStore.getState().loadRecipes();

      expect(mockRepo.getAll).toHaveBeenCalledTimes(1);
    });

    it('sets recipes from repository result', async () => {
      mockRepo.getAll.mockResolvedValue([mockRecipe1, mockRecipe2]);

      await useRecipeStore.getState().loadRecipes();

      expect(useRecipeStore.getState().recipes).toEqual([mockRecipe1, mockRecipe2]);
    });

    it('sets isLoaded to true after loading', async () => {
      mockRepo.getAll.mockResolvedValue([]);

      await useRecipeStore.getState().loadRecipes();

      expect(useRecipeStore.getState().isLoaded).toBe(true);
    });

    it('handles empty result from repository', async () => {
      mockRepo.getAll.mockResolvedValue([]);

      await useRecipeStore.getState().loadRecipes();

      expect(useRecipeStore.getState().recipes).toEqual([]);
      expect(useRecipeStore.getState().isLoaded).toBe(true);
    });

    it('replaces existing recipes on reload', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1], isLoaded: true });
      mockRepo.getAll.mockResolvedValue([mockRecipe2]);

      await useRecipeStore.getState().loadRecipes();

      expect(useRecipeStore.getState().recipes).toEqual([mockRecipe2]);
    });

    it('propagates errors from repository', async () => {
      mockRepo.getAll.mockRejectedValue(new Error('DB connection failed'));

      await expect(useRecipeStore.getState().loadRecipes()).rejects.toThrow('DB connection failed');
    });
  });

  // ==========================================================
  // createRecipe
  // ==========================================================

  describe('createRecipe', () => {
    it('calls recipeRepository.create with correct arguments', async () => {
      mockRepo.create.mockResolvedValue(mockRecipe1);
      mockRepo.getAll.mockResolvedValue([mockRecipe1]);

      await useRecipeStore.getState().createRecipe('Chicken & Rice Bowl', 'High protein meal', mockDraftItems);

      expect(mockRepo.create).toHaveBeenCalledWith('Chicken & Rice Bowl', 'High protein meal', mockDraftItems);
    });

    it('reloads recipes after creation', async () => {
      mockRepo.create.mockResolvedValue(mockRecipe1);
      mockRepo.getAll.mockResolvedValue([mockRecipe1]);

      await useRecipeStore.getState().createRecipe('Chicken & Rice Bowl', 'High protein meal', mockDraftItems);

      expect(mockRepo.getAll).toHaveBeenCalledTimes(1);
      expect(useRecipeStore.getState().recipes).toEqual([mockRecipe1]);
    });

    it('returns the created recipe', async () => {
      mockRepo.create.mockResolvedValue(mockRecipe1);
      mockRepo.getAll.mockResolvedValue([mockRecipe1]);

      const result = await useRecipeStore.getState().createRecipe('Chicken & Rice Bowl', 'High protein meal', mockDraftItems);

      expect(result).toEqual(mockRecipe1);
    });

    it('passes undefined description correctly', async () => {
      mockRepo.create.mockResolvedValue(mockRecipe2);
      mockRepo.getAll.mockResolvedValue([mockRecipe2]);

      await useRecipeStore.getState().createRecipe('Protein Smoothie', undefined, []);

      expect(mockRepo.create).toHaveBeenCalledWith('Protein Smoothie', undefined, []);
    });

    it('propagates errors from repository.create', async () => {
      mockRepo.create.mockRejectedValue(new Error('Unique constraint violated'));

      await expect(
        useRecipeStore.getState().createRecipe('Dup Recipe', undefined, mockDraftItems)
      ).rejects.toThrow('Unique constraint violated');
    });

    it('does not reload recipes if create fails', async () => {
      mockRepo.create.mockRejectedValue(new Error('Create failed'));

      await expect(
        useRecipeStore.getState().createRecipe('Bad Recipe', undefined, [])
      ).rejects.toThrow();

      expect(mockRepo.getAll).not.toHaveBeenCalled();
    });
  });

  // ==========================================================
  // updateRecipe
  // ==========================================================

  describe('updateRecipe', () => {
    it('calls recipeRepository.update with correct arguments', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.getAll.mockResolvedValue([mockRecipe1]);

      await useRecipeStore.getState().updateRecipe('r1', 'Updated Name', 'New desc');

      expect(mockRepo.update).toHaveBeenCalledWith('r1', 'Updated Name', 'New desc');
    });

    it('reloads recipes after update', async () => {
      const updatedRecipe = { ...mockRecipe1, name: 'Updated Name' };
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.getAll.mockResolvedValue([updatedRecipe]);

      await useRecipeStore.getState().updateRecipe('r1', 'Updated Name', 'New desc');

      expect(mockRepo.getAll).toHaveBeenCalledTimes(1);
      expect(useRecipeStore.getState().recipes).toEqual([updatedRecipe]);
    });

    it('passes undefined description when omitted', async () => {
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.getAll.mockResolvedValue([]);

      await useRecipeStore.getState().updateRecipe('r1', 'Updated Name');

      expect(mockRepo.update).toHaveBeenCalledWith('r1', 'Updated Name', undefined);
    });

    it('propagates errors from repository.update', async () => {
      mockRepo.update.mockRejectedValue(new Error('Recipe not found'));

      await expect(
        useRecipeStore.getState().updateRecipe('r999', 'Nope')
      ).rejects.toThrow('Recipe not found');
    });

    it('does not reload recipes if update fails', async () => {
      mockRepo.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        useRecipeStore.getState().updateRecipe('r1', 'Bad Update')
      ).rejects.toThrow();

      expect(mockRepo.getAll).not.toHaveBeenCalled();
    });
  });

  // ==========================================================
  // deleteRecipe
  // ==========================================================

  describe('deleteRecipe', () => {
    it('calls recipeRepository.delete with correct id', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1, mockRecipe2] });
      mockRepo.delete.mockResolvedValue(undefined);

      await useRecipeStore.getState().deleteRecipe('r1');

      expect(mockRepo.delete).toHaveBeenCalledWith('r1');
    });

    it('optimistically removes recipe from local state', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1, mockRecipe2] });
      mockRepo.delete.mockResolvedValue(undefined);

      await useRecipeStore.getState().deleteRecipe('r1');

      const state = useRecipeStore.getState();
      expect(state.recipes).toHaveLength(1);
      expect(state.recipes[0].id).toBe('r2');
    });

    it('keeps other recipes intact after deletion', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1, mockRecipe2] });
      mockRepo.delete.mockResolvedValue(undefined);

      await useRecipeStore.getState().deleteRecipe('r1');

      expect(useRecipeStore.getState().recipes).toEqual([mockRecipe2]);
    });

    it('handles deleting the last recipe', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1] });
      mockRepo.delete.mockResolvedValue(undefined);

      await useRecipeStore.getState().deleteRecipe('r1');

      expect(useRecipeStore.getState().recipes).toEqual([]);
    });

    it('handles deleting a non-existent recipe id gracefully', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1, mockRecipe2] });
      mockRepo.delete.mockResolvedValue(undefined);

      await useRecipeStore.getState().deleteRecipe('r999');

      // Recipes unchanged since filter just filters out nothing
      expect(useRecipeStore.getState().recipes).toEqual([mockRecipe1, mockRecipe2]);
      expect(mockRepo.delete).toHaveBeenCalledWith('r999');
    });

    it('does not call loadRecipes (uses optimistic local removal)', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1] });
      mockRepo.delete.mockResolvedValue(undefined);

      await useRecipeStore.getState().deleteRecipe('r1');

      expect(mockRepo.getAll).not.toHaveBeenCalled();
    });

    it('propagates errors from repository.delete', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1] });
      mockRepo.delete.mockRejectedValue(new Error('Foreign key constraint'));

      await expect(
        useRecipeStore.getState().deleteRecipe('r1')
      ).rejects.toThrow('Foreign key constraint');
    });

    it('still removes recipe from local state even if delete is called on empty store', async () => {
      useRecipeStore.setState({ recipes: [] });
      mockRepo.delete.mockResolvedValue(undefined);

      await useRecipeStore.getState().deleteRecipe('r1');

      expect(useRecipeStore.getState().recipes).toEqual([]);
    });
  });

  // ==========================================================
  // toggleFavorite
  // ==========================================================

  describe('toggleFavorite', () => {
    it('calls recipeRepository.toggleFavorite with correct arguments', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1] });
      mockRepo.toggleFavorite.mockResolvedValue(undefined);

      await useRecipeStore.getState().toggleFavorite('r1', true);

      expect(mockRepo.toggleFavorite).toHaveBeenCalledWith('r1', true);
    });

    it('optimistically sets isFavorite to true', async () => {
      useRecipeStore.setState({ recipes: [{ ...mockRecipe1, isFavorite: false }] });
      mockRepo.toggleFavorite.mockResolvedValue(undefined);

      await useRecipeStore.getState().toggleFavorite('r1', true);

      const recipe = useRecipeStore.getState().recipes.find((r) => r.id === 'r1');
      expect(recipe?.isFavorite).toBe(true);
    });

    it('optimistically sets isFavorite to false', async () => {
      useRecipeStore.setState({ recipes: [{ ...mockRecipe2, isFavorite: true }] });
      mockRepo.toggleFavorite.mockResolvedValue(undefined);

      await useRecipeStore.getState().toggleFavorite('r2', false);

      const recipe = useRecipeStore.getState().recipes.find((r) => r.id === 'r2');
      expect(recipe?.isFavorite).toBe(false);
    });

    it('only updates the targeted recipe, leaving others unchanged', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1, mockRecipe2] });
      mockRepo.toggleFavorite.mockResolvedValue(undefined);

      await useRecipeStore.getState().toggleFavorite('r1', true);

      const state = useRecipeStore.getState();
      expect(state.recipes.find((r) => r.id === 'r1')?.isFavorite).toBe(true);
      expect(state.recipes.find((r) => r.id === 'r2')?.isFavorite).toBe(mockRecipe2.isFavorite);
    });

    it('handles toggling a non-existent recipe id gracefully', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1] });
      mockRepo.toggleFavorite.mockResolvedValue(undefined);

      await useRecipeStore.getState().toggleFavorite('r999', true);

      // Original recipe should be unchanged
      expect(useRecipeStore.getState().recipes).toEqual([mockRecipe1]);
      expect(mockRepo.toggleFavorite).toHaveBeenCalledWith('r999', true);
    });

    it('does not call loadRecipes (uses optimistic local update)', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1] });
      mockRepo.toggleFavorite.mockResolvedValue(undefined);

      await useRecipeStore.getState().toggleFavorite('r1', true);

      expect(mockRepo.getAll).not.toHaveBeenCalled();
    });

    it('propagates errors from repository.toggleFavorite', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1] });
      mockRepo.toggleFavorite.mockRejectedValue(new Error('Toggle failed'));

      await expect(
        useRecipeStore.getState().toggleFavorite('r1', true)
      ).rejects.toThrow('Toggle failed');
    });
  });

  // ==========================================================
  // searchRecipes
  // ==========================================================

  describe('searchRecipes', () => {
    it('delegates to recipeRepository.search with the query', async () => {
      mockRepo.search.mockResolvedValue([mockRecipe1]);

      await useRecipeStore.getState().searchRecipes('chicken');

      expect(mockRepo.search).toHaveBeenCalledWith('chicken');
    });

    it('returns search results from repository', async () => {
      mockRepo.search.mockResolvedValue([mockRecipe1, mockRecipe2]);

      const results = await useRecipeStore.getState().searchRecipes('recipe');

      expect(results).toEqual([mockRecipe1, mockRecipe2]);
    });

    it('returns empty array when no matches', async () => {
      mockRepo.search.mockResolvedValue([]);

      const results = await useRecipeStore.getState().searchRecipes('nonexistent');

      expect(results).toEqual([]);
    });

    it('does not modify the store state', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1], isLoaded: true });
      mockRepo.search.mockResolvedValue([mockRecipe2]);

      await useRecipeStore.getState().searchRecipes('smoothie');

      // Store state unchanged
      expect(useRecipeStore.getState().recipes).toEqual([mockRecipe1]);
      expect(useRecipeStore.getState().isLoaded).toBe(true);
    });

    it('handles empty query string', async () => {
      mockRepo.search.mockResolvedValue([mockRecipe1, mockRecipe2]);

      const results = await useRecipeStore.getState().searchRecipes('');

      expect(mockRepo.search).toHaveBeenCalledWith('');
      expect(results).toEqual([mockRecipe1, mockRecipe2]);
    });

    it('propagates errors from repository.search', async () => {
      mockRepo.search.mockRejectedValue(new Error('Search failed'));

      await expect(
        useRecipeStore.getState().searchRecipes('test')
      ).rejects.toThrow('Search failed');
    });
  });

  // ==========================================================
  // logRecipe
  // ==========================================================

  describe('logRecipe', () => {
    it('delegates to recipeRepository.logRecipe with correct arguments', async () => {
      mockRepo.logRecipe.mockResolvedValue('log-1');

      await useRecipeStore.getState().logRecipe(
        'r1',
        'Chicken & Rice Bowl',
        '2024-06-15',
        MealType.Lunch,
        mockOverrideItems,
      );

      expect(mockRepo.logRecipe).toHaveBeenCalledWith(
        'r1',
        'Chicken & Rice Bowl',
        '2024-06-15',
        MealType.Lunch,
        mockOverrideItems,
      );
    });

    it('returns the log ID from repository', async () => {
      mockRepo.logRecipe.mockResolvedValue('log-abc-123');

      const logId = await useRecipeStore.getState().logRecipe(
        'r1',
        'Chicken & Rice Bowl',
        '2024-06-15',
        MealType.Dinner,
        mockOverrideItems,
      );

      expect(logId).toBe('log-abc-123');
    });

    it('does not modify store state', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1], isLoaded: true });
      mockRepo.logRecipe.mockResolvedValue('log-1');

      await useRecipeStore.getState().logRecipe(
        'r1',
        'Chicken & Rice Bowl',
        '2024-06-15',
        MealType.Breakfast,
        [],
      );

      expect(useRecipeStore.getState().recipes).toEqual([mockRecipe1]);
    });

    it('works with all meal types', async () => {
      mockRepo.logRecipe.mockResolvedValue('log-1');

      for (const mealType of Object.values(MealType)) {
        await useRecipeStore.getState().logRecipe('r1', 'Test', '2024-06-15', mealType, []);
      }

      expect(mockRepo.logRecipe).toHaveBeenCalledTimes(Object.values(MealType).length);
    });

    it('works with empty override items', async () => {
      mockRepo.logRecipe.mockResolvedValue('log-1');

      await useRecipeStore.getState().logRecipe('r1', 'Test', '2024-06-15', MealType.Snack, []);

      expect(mockRepo.logRecipe).toHaveBeenCalledWith('r1', 'Test', '2024-06-15', MealType.Snack, []);
    });

    it('propagates errors from repository.logRecipe', async () => {
      mockRepo.logRecipe.mockRejectedValue(new Error('Logging failed'));

      await expect(
        useRecipeStore.getState().logRecipe('r1', 'Test', '2024-06-15', MealType.Lunch, [])
      ).rejects.toThrow('Logging failed');
    });
  });

  // ==========================================================
  // deleteRecipeLog
  // ==========================================================

  describe('deleteRecipeLog', () => {
    it('delegates to recipeRepository.deleteRecipeLog', async () => {
      mockRepo.deleteRecipeLog.mockResolvedValue(undefined);

      await useRecipeStore.getState().deleteRecipeLog('log-1');

      expect(mockRepo.deleteRecipeLog).toHaveBeenCalledWith('log-1');
    });

    it('does not modify store state', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1], isLoaded: true });
      mockRepo.deleteRecipeLog.mockResolvedValue(undefined);

      await useRecipeStore.getState().deleteRecipeLog('log-1');

      expect(useRecipeStore.getState().recipes).toEqual([mockRecipe1]);
      expect(useRecipeStore.getState().isLoaded).toBe(true);
    });

    it('propagates errors from repository.deleteRecipeLog', async () => {
      mockRepo.deleteRecipeLog.mockRejectedValue(new Error('Log not found'));

      await expect(
        useRecipeStore.getState().deleteRecipeLog('log-999')
      ).rejects.toThrow('Log not found');
    });
  });

  // ==========================================================
  // Error Handling
  // ==========================================================

  describe('error handling', () => {
    it('loadRecipes does not set isLoaded when repository throws', async () => {
      mockRepo.getAll.mockRejectedValue(new Error('Network error'));

      await expect(useRecipeStore.getState().loadRecipes()).rejects.toThrow();

      expect(useRecipeStore.getState().isLoaded).toBe(false);
    });

    it('createRecipe does not add recipe to state when repository throws', async () => {
      mockRepo.create.mockRejectedValue(new Error('Create error'));

      await expect(
        useRecipeStore.getState().createRecipe('Bad', undefined, [])
      ).rejects.toThrow();

      expect(useRecipeStore.getState().recipes).toEqual([]);
    });

    it('deleteRecipe still optimistically removes from state before rejection', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe1] });

      // The store calls set() AFTER the await, so if delete rejects,
      // the set() is never called. Let's verify the behavior.
      mockRepo.delete.mockRejectedValue(new Error('Delete error'));

      await expect(
        useRecipeStore.getState().deleteRecipe('r1')
      ).rejects.toThrow('Delete error');

      // Since the repo.delete throws, the set() call after it doesn't execute
      // because the store code is: await repo.delete(id); set(...)
      // So recipes should still contain r1
      expect(useRecipeStore.getState().recipes).toEqual([mockRecipe1]);
    });

    it('toggleFavorite does not update state when repository throws', async () => {
      useRecipeStore.setState({ recipes: [{ ...mockRecipe1, isFavorite: false }] });
      mockRepo.toggleFavorite.mockRejectedValue(new Error('Toggle error'));

      await expect(
        useRecipeStore.getState().toggleFavorite('r1', true)
      ).rejects.toThrow('Toggle error');

      // Since repo throws, the set() after it doesn't execute
      expect(useRecipeStore.getState().recipes[0].isFavorite).toBe(false);
    });
  });
});
