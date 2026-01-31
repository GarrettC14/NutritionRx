/**
 * USDA FoodData Central API Types
 * https://fdc.nal.usda.gov/api-guide
 */

export interface USDASearchResult {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: USDASearchNutrient[];
}

export interface USDASearchNutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  value: number;
  unitName: string;
}

export interface USDAFoodDetail {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  foodPortions?: USDAFoodPortion[];
}

export interface USDANutrient {
  nutrient: {
    id: number;
    name: string;
    number: string;
    unitName: string;
  };
  amount: number;
}

export interface USDAFoodPortion {
  id: number;
  gramWeight: number;
  amount: number;
  measureUnit: {
    name: string;
    abbreviation: string;
  };
  portionDescription?: string;
}

export interface SearchOptions {
  dataTypes?: ('Foundation' | 'SR Legacy' | 'Branded')[];
  pageSize?: number;
  pageNumber?: number;
}

export interface MicronutrientData {
  [nutrientId: string]: number;
}

export enum USDAError {
  RateLimited = 'RATE_LIMITED',
  InvalidApiKey = 'INVALID_API_KEY',
  FoodNotFound = 'FOOD_NOT_FOUND',
  NetworkError = 'NETWORK_ERROR',
}

export interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDASearchResult[];
}
