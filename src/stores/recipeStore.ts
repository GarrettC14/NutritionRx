import { create } from 'zustand';
import { recipeRepository } from '@/repositories/recipeRepository';
import { Recipe, RecipeItemDraft, RecipeItemOverride } from '@/types/recipes';
import { MealType } from '@/constants/mealTypes';

interface RecipeState {
  recipes: Recipe[];
  isLoaded: boolean;

  loadRecipes: () => Promise<void>;
  createRecipe: (name: string, description: string | undefined, items: RecipeItemDraft[]) => Promise<Recipe>;
  updateRecipe: (id: string, name: string, description?: string) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<void>;
  searchRecipes: (query: string) => Promise<Recipe[]>;
  logRecipe: (recipeId: string, recipeName: string, date: string, mealType: MealType, items: RecipeItemOverride[]) => Promise<string>;
  deleteRecipeLog: (recipeLogId: string) => Promise<void>;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  isLoaded: false,

  loadRecipes: async () => {
    const recipes = await recipeRepository.getAll();
    set({ recipes, isLoaded: true });
  },

  createRecipe: async (name, description, items) => {
    const recipe = await recipeRepository.create(name, description, items);
    await get().loadRecipes();
    return recipe;
  },

  updateRecipe: async (id, name, description) => {
    await recipeRepository.update(id, name, description);
    await get().loadRecipes();
  },

  deleteRecipe: async (id) => {
    await recipeRepository.delete(id);
    set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) }));
  },

  toggleFavorite: async (id, isFavorite) => {
    await recipeRepository.toggleFavorite(id, isFavorite);
    set((s) => ({
      recipes: s.recipes.map((r) => (r.id === id ? { ...r, isFavorite } : r)),
    }));
  },

  searchRecipes: async (query) => {
    return recipeRepository.search(query);
  },

  logRecipe: async (recipeId, recipeName, date, mealType, items) => {
    return recipeRepository.logRecipe(recipeId, recipeName, date, mealType, items);
  },

  deleteRecipeLog: async (recipeLogId) => {
    await recipeRepository.deleteRecipeLog(recipeLogId);
  },
}));
