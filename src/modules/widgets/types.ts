/**
 * Widget Data Types
 * Shared types for widget data synchronization
 */

// Matches the Swift NutritionData structure
export interface WidgetNutritionData {
  caloriesConsumed: number;
  caloriesGoal: number;
  proteinConsumed: number;
  proteinGoal: number;
  carbsConsumed: number;
  carbsGoal: number;
  fatConsumed: number;
  fatGoal: number;
  lastUpdated: string; // ISO date string
}

// Matches the Swift WaterData structure
export interface WidgetWaterData {
  glassesConsumed: number;
  glassesGoal: number;
  glassSizeMl: number;
  lastUpdated: string; // ISO date string
}

// Matches the Swift WidgetDataContainer structure
export interface WidgetDataContainer {
  nutrition: WidgetNutritionData;
  water: WidgetWaterData;
  date: string; // YYYY-MM-DD format
}

// Widget types available in the app
export type WidgetType = 'today_summary' | 'water_tracking' | 'quick_add';

// Widget configuration
export interface WidgetConfig {
  type: WidgetType;
  size: 'small' | 'medium' | 'large' | 'circular' | 'rectangular';
}
