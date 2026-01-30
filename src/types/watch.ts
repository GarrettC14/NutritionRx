/**
 * Apple Watch Types
 * Type definitions for Watch connectivity
 */

import { MealType } from '@/constants/mealTypes';

// MARK: - Fasting State

/**
 * Fasting state sent to the watch
 */
export interface WatchFastingState {
  /** Whether fasting feature is enabled */
  isEnabled: boolean;
  /** Whether currently in fasting window */
  isFasting: boolean;
  /** Active fasting protocol */
  fastingProtocol?: {
    id: string;
    name: string;
    fastingHours: number;
    eatingHours: number;
  };
  /** ISO 8601 timestamp when current fast started */
  fastStartTime?: string;
  /** Target fasting hours */
  targetHours?: number;
  /** Eating window start time (HH:mm format) */
  eatingWindowStart?: string;
  /** Eating window end time (HH:mm format) */
  eatingWindowEnd?: string;
  /** Current consecutive day streak */
  currentStreak: number;
}

// MARK: - Watch Daily Data

/**
 * Daily nutrition data sent to the watch
 */
export interface WatchDailyData {
  /** ISO date string */
  date: string;
  /** Calories consumed today */
  caloriesConsumed: number;
  /** Daily calorie target */
  calorieTarget: number;
  /** Water glasses consumed */
  waterGlasses: number;
  /** Daily water target */
  waterTarget: number;
  /** Grams of protein consumed */
  protein: number;
  /** Grams of carbs consumed */
  carbs: number;
  /** Grams of fat consumed */
  fat: number;
  /** Recent foods for quick logging */
  recentFoods: WatchSimpleFood[];
  /** Favorite foods for quick logging */
  favoriteFoods: WatchSimpleFood[];
  /** Current fasting state (optional) */
  fasting?: WatchFastingState;
}

/**
 * Simplified food item for watch display
 */
export interface WatchSimpleFood {
  /** Unique food ID */
  id: string;
  /** Food name (will be truncated on watch) */
  name: string;
  /** Calories per serving */
  calories: number;
  /** Grams of protein (optional) */
  protein?: number;
  /** Grams of carbs (optional) */
  carbs?: number;
  /** Grams of fat (optional) */
  fat?: number;
}

// MARK: - Watch Commands

/**
 * Command types that can be received from the watch
 */
export type WatchCommandType =
  | 'addWater'
  | 'removeWater'
  | 'quickAddCalories'
  | 'logFood'
  | 'requestSync';

/**
 * Add water command from watch
 */
export interface AddWaterCommand {
  type: 'addWater';
  glasses: number;
}

/**
 * Remove water command from watch
 */
export interface RemoveWaterCommand {
  type: 'removeWater';
  glasses: number;
}

/**
 * Quick add calories command from watch
 */
export interface QuickAddCaloriesCommand {
  type: 'quickAddCalories';
  calories: number;
  meal: MealType;
}

/**
 * Log food command from watch
 */
export interface LogFoodCommand {
  type: 'logFood';
  foodId: string;
  meal: MealType;
}

/**
 * Request sync command from watch
 */
export interface RequestSyncCommand {
  type: 'requestSync';
}

/**
 * Union type for all watch commands
 */
export type WatchCommand =
  | AddWaterCommand
  | RemoveWaterCommand
  | QuickAddCaloriesCommand
  | LogFoodCommand
  | RequestSyncCommand;

// MARK: - Watch Session State

/**
 * Watch session connection state
 */
export interface WatchSessionState {
  /** Whether WatchConnectivity is supported on this device */
  isSupported: boolean;
  /** Whether an Apple Watch is paired */
  isPaired: boolean;
  /** Whether the NutritionRx Watch app is installed */
  isWatchAppInstalled: boolean;
  /** Whether the watch is currently reachable */
  isReachable: boolean;
}

/**
 * Watch session activation states
 */
export type WatchActivationState =
  | 'notActivated'
  | 'inactive'
  | 'activated'
  | 'unknown';

// MARK: - Event Types

/**
 * Watch reachability changed event
 */
export interface WatchReachabilityEvent {
  isReachable: boolean;
}

/**
 * Watch session state changed event
 */
export interface WatchSessionStateEvent {
  state: WatchActivationState;
  error?: string;
}
