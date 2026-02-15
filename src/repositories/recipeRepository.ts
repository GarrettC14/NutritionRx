import { generateId } from '@/utils/generateId';
import { getDatabase } from '@/db/database';
import { MealType } from '@/constants/mealTypes';
import { Recipe, RecipeItem, RecipeItemDraft, RecipeItemOverride } from '@/types/recipes';

// ============================================================
// Row types (internal)
// ============================================================

interface RecipeRow {
  id: string;
  name: string;
  description: string | null;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  item_count: number;
  is_favorite: number;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RecipeItemRow {
  id: string;
  recipe_id: string;
  food_item_id: string;
  food_name: string;
  food_brand: string | null;
  servings: number;
  serving_unit: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sort_order: number;
  created_at: string;
}

// ============================================================
// Mappers
// ============================================================

function mapRecipeRow(row: RecipeRow, items: RecipeItem[] = []): Recipe {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    totalCalories: row.total_calories,
    totalProtein: row.total_protein,
    totalCarbs: row.total_carbs,
    totalFat: row.total_fat,
    itemCount: row.item_count,
    isFavorite: row.is_favorite === 1,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at ?? undefined,
    items,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRecipeItemRow(row: RecipeItemRow): RecipeItem {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    foodItemId: row.food_item_id,
    foodName: row.food_name,
    foodBrand: row.food_brand ?? undefined,
    servings: row.servings,
    servingUnit: row.serving_unit ?? undefined,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
  };
}

// ============================================================
// Repository
// ============================================================

export const recipeRepository = {
  /** Get all recipes (summary only, no items loaded) */
  async getAll(): Promise<Recipe[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RecipeRow>(
      `SELECT * FROM recipes ORDER BY last_used_at DESC NULLS LAST, created_at DESC`
    );
    return rows.map((r) => mapRecipeRow(r));
  },

  /** Get a single recipe with its items */
  async getById(id: string): Promise<Recipe | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<RecipeRow>(
      `SELECT * FROM recipes WHERE id = ?`,
      [id]
    );
    if (!row) return null;

    const itemRows = await db.getAllAsync<RecipeItemRow>(
      `SELECT * FROM recipe_items WHERE recipe_id = ? ORDER BY sort_order`,
      [id]
    );
    return mapRecipeRow(row, itemRows.map(mapRecipeItemRow));
  },

  /** Get items for a recipe */
  async getItems(recipeId: string): Promise<RecipeItem[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RecipeItemRow>(
      `SELECT * FROM recipe_items WHERE recipe_id = ? ORDER BY sort_order`,
      [recipeId]
    );
    return rows.map(mapRecipeItemRow);
  },

  /** Create a new recipe with items */
  async create(
    name: string,
    description: string | undefined,
    items: RecipeItemDraft[]
  ): Promise<Recipe> {
    const db = getDatabase();
    const recipeId = generateId();
    const now = new Date().toISOString();

    const totalCalories = items.reduce((sum, i) => sum + i.calories, 0);
    const totalProtein = items.reduce((sum, i) => sum + i.protein, 0);
    const totalCarbs = items.reduce((sum, i) => sum + i.carbs, 0);
    const totalFat = items.reduce((sum, i) => sum + i.fat, 0);

    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(
        `INSERT INTO recipes (id, name, description, total_calories, total_protein, total_carbs, total_fat, item_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [recipeId, name, description ?? null, totalCalories, totalProtein, totalCarbs, totalFat, items.length, now, now]
      );

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await tx.runAsync(
          `INSERT INTO recipe_items (id, recipe_id, food_item_id, food_name, food_brand, servings, serving_unit, calories, protein, carbs, fat, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), recipeId, item.foodItemId, item.foodName, item.foodBrand ?? null, item.servings, item.servingUnit ?? null, item.calories, item.protein, item.carbs, item.fat, i, now]
        );
      }
    });

    const recipe = await this.getById(recipeId);
    if (!recipe) throw new Error('Failed to create recipe');
    return recipe;
  },

  /** Update recipe name/description */
  async update(id: string, name: string, description?: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE recipes SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
      [name, description ?? null, now, id]
    );
  },

  /** Delete a recipe and its items (cascade) */
  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(`DELETE FROM recipe_items WHERE recipe_id = ?`, [id]);
      await tx.runAsync(`DELETE FROM recipes WHERE id = ?`, [id]);
    });
  },

  /** Toggle favorite status */
  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE recipes SET is_favorite = ?, updated_at = ? WHERE id = ?`,
      [isFavorite ? 1 : 0, now, id]
    );
  },

  /** Search recipes by name */
  async search(query: string): Promise<Recipe[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<RecipeRow>(
      `SELECT * FROM recipes WHERE name LIKE ? ORDER BY usage_count DESC, name ASC LIMIT 30`,
      [`%${query}%`]
    );
    return rows.map((r) => mapRecipeRow(r));
  },

  /**
   * Log a recipe: creates a recipe_log row and N log_entries
   * sharing the same recipe_log_id.
   */
  async logRecipe(
    recipeId: string,
    recipeName: string,
    date: string,
    mealType: MealType,
    items: RecipeItemOverride[]
  ): Promise<string> {
    const db = getDatabase();
    const recipeLogId = generateId();
    const now = new Date().toISOString();

    await db.withExclusiveTransactionAsync(async (tx) => {
      // Create recipe_log
      await tx.runAsync(
        `INSERT INTO recipe_logs (id, recipe_id, recipe_name, date, meal_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [recipeLogId, recipeId, recipeName, date, mealType, now]
      );

      // Create log_entries for each item
      for (const item of items) {
        await tx.runAsync(
          `INSERT INTO log_entries (id, food_item_id, date, meal_type, servings, calories, protein, carbs, fat, recipe_log_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), item.foodItemId, date, mealType, item.servings, item.calories, item.protein, item.carbs, item.fat, recipeLogId, now, now]
        );
      }

      // Update recipe usage stats
      await tx.runAsync(
        `UPDATE recipes SET usage_count = usage_count + 1, last_used_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, recipeId]
      );
    });

    return recipeLogId;
  },

  /** Delete a recipe log and all associated log entries */
  async deleteRecipeLog(recipeLogId: string): Promise<void> {
    const db = getDatabase();
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(`DELETE FROM log_entries WHERE recipe_log_id = ?`, [recipeLogId]);
      await tx.runAsync(`DELETE FROM recipe_logs WHERE id = ?`, [recipeLogId]);
    });
  },
};
