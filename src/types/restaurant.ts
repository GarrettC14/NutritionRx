/**
 * Restaurant/Chain Database Types
 * Domain models for restaurant food tracking
 */

import { MealType } from '@/constants/mealTypes';

// ============================================================
// Restaurant Source Types
// ============================================================

export type RestaurantDataSource = 'bundled' | 'api' | 'community';
export type RestaurantFoodSource = 'nutritionix' | 'usda' | 'restaurant' | 'community';

// ============================================================
// Restaurant Entity
// ============================================================

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoAssetPath?: string;
  categories: MenuCategory[];
  metadata: RestaurantMetadata;
}

export interface RestaurantMetadata {
  lastUpdated: string;
  source: RestaurantDataSource;
  itemCount: number;
  isVerified: boolean;
}

// ============================================================
// Menu Category
// ============================================================

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
  iconName?: string;
}

// ============================================================
// Restaurant Food Item
// ============================================================

export interface RestaurantFood {
  id: string;
  restaurantId: string;
  restaurantName: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  imageUrl?: string;

  nutrition: RestaurantFoodNutrition;
  serving: RestaurantFoodServing;
  metadata: RestaurantFoodMetadata;
}

export interface RestaurantFoodNutrition {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
}

export interface RestaurantFoodServing {
  size: string;
  sizeGrams?: number;
}

export interface RestaurantFoodMetadata {
  source: RestaurantFoodSource;
  sourceId?: string;
  lastVerified: string;
  isVerified: boolean;
  popularityScore: number;
}

// ============================================================
// Food Variants (sizes, options)
// ============================================================

export interface FoodVariant {
  id: string;
  restaurantFoodId: string;
  name: string;
  nutritionDelta: Partial<RestaurantFoodNutrition>;
}

// ============================================================
// Restaurant Food Log Entry
// ============================================================

export interface RestaurantFoodLog {
  id: string;
  restaurantFoodId: string;
  restaurantName: string;
  foodName: string;
  variantId?: string;
  loggedAt: string;
  date: string;
  meal: MealType;
  quantity: number;
  notes?: string;

  // Nutrition snapshot (preserved even if source data changes)
  nutritionSnapshot: RestaurantFoodNutrition;

  createdAt: Date;
}

// ============================================================
// User Restaurant Usage (for recents)
// ============================================================

export interface UserRestaurantUsage {
  restaurantId: string;
  lastUsed: string;
  useCount: number;
}

// ============================================================
// Database Row Types (snake_case)
// ============================================================

export interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  logo_asset_path: string | null;
  last_updated: string;
  source: string;
  item_count: number;
  is_verified: number;
  created_at: string;
}

export interface MenuCategoryRow {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number;
  icon_name: string | null;
}

export interface RestaurantFoodRow {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  category_id: string | null;
  category_name: string | null;
  name: string;
  description: string | null;
  image_url: string | null;

  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  saturated_fat: number | null;

  serving_size: string;
  serving_grams: number | null;

  source: string;
  source_id: string | null;
  last_verified: string;
  is_verified: number;
  popularity_score: number;

  created_at: string;
  updated_at: string;
}

export interface FoodVariantRow {
  id: string;
  restaurant_food_id: string;
  name: string;
  calories_delta: number;
  protein_delta: number;
  carbohydrates_delta: number;
  fat_delta: number;
}

export interface RestaurantFoodLogRow {
  id: string;
  restaurant_food_id: string;
  restaurant_name: string;
  food_name: string;
  variant_id: string | null;
  logged_at: string;
  date: string;
  meal: string;
  quantity: number;
  notes: string | null;

  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;

  created_at: string;
}

export interface UserRestaurantUsageRow {
  restaurant_id: string;
  last_used: string;
  use_count: number;
}

// ============================================================
// Input Types
// ============================================================

export interface LogRestaurantFoodInput {
  restaurantFoodId: string;
  restaurantName: string;
  foodName: string;
  variantId?: string;
  meal: MealType;
  quantity?: number;
  notes?: string;
  nutritionSnapshot: RestaurantFoodNutrition;
}

// ============================================================
// Search Result Types
// ============================================================

export interface RestaurantSearchResult {
  restaurants: Restaurant[];
  foods: RestaurantFood[];
}

// ============================================================
// Bundled Data Types (for JSON import)
// ============================================================

export interface BundledRestaurantData {
  id: string;
  name: string;
  slug: string;
  logoAsset: string;
  categories: BundledCategory[];
  metadata: {
    lastUpdated: string;
    source: RestaurantDataSource;
    isVerified: boolean;
  };
}

export interface BundledCategory {
  id: string;
  name: string;
  displayOrder: number;
  icon?: string;
}

export interface BundledMenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  nutrition: RestaurantFoodNutrition;
  serving: RestaurantFoodServing;
  metadata: {
    source: RestaurantFoodSource;
    lastVerified: string;
    isVerified: boolean;
  };
}

export interface BundledMenuData {
  items: BundledMenuItem[];
}
