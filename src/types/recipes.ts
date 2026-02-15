import { MealType } from '@/constants/mealTypes';

// ============================================================
// Recipe Domain Types
// ============================================================

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  itemCount: number;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: string;
  items: RecipeItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeItem {
  id: string;
  recipeId: string;
  foodItemId: string;
  foodName: string;
  foodBrand?: string;
  servings: number;
  servingUnit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sortOrder: number;
  createdAt: Date;
}

export interface RecipeLog {
  id: string;
  recipeId: string;
  recipeName: string;
  date: string;
  mealType: MealType;
  createdAt: Date;
}

/** Used when creating a recipe from existing meal entries */
export interface RecipeItemDraft {
  foodItemId: string;
  foodName: string;
  foodBrand?: string;
  servings: number;
  servingUnit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Optional per-item overrides when logging a recipe */
export interface RecipeItemOverride {
  foodItemId: string;
  servings: number;
  servingUnit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
