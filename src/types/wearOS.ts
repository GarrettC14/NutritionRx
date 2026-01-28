/**
 * Wear OS Types
 * Types for phone-watch communication via Wearable Data Layer
 */

/**
 * Data sent to Wear OS watch
 */
export interface WearDailySummary {
  date: string;
  calories: number;
  calorieGoal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fat: number;
  fatGoal: number;
  water: number;
  waterGoal: number;
  lastSyncTime: number;
}

/**
 * Recent food item sent to watch
 */
export interface WearRecentFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  lastUsed: number;
}

/**
 * Actions received from watch
 */
export type WearActionType = 'ADD_WATER' | 'QUICK_ADD' | 'LOG_FOOD' | 'REQUEST_SYNC';

export interface WearAction {
  type: WearActionType;
  payload: WearActionPayload;
}

export interface WearActionPayload {
  // Water
  glasses?: number;
  // Quick add
  calories?: number;
  meal?: string;
  // Food log
  foodId?: string;
}

/**
 * Sync status
 */
export type WearSyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'disconnected';

/**
 * Watch connection state
 */
export interface WearConnectionState {
  isConnected: boolean;
  nodeId?: string;
  nodeName?: string;
}

/**
 * Capability constants
 */
export const WEAR_CAPABILITY = 'nutritionrx_phone';
export const WEAR_DATA_PATH_DAILY_SUMMARY = '/data/daily_summary';
export const WEAR_DATA_PATH_RECENT_FOODS = '/data/recent_foods';
export const WEAR_MESSAGE_PATH_SYNC_COMPLETE = '/sync/complete';
export const WEAR_MESSAGE_PATH_ACTION_CONFIRMED = '/action/confirmed';
