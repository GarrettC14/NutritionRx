/**
 * Wear OS Sync Service
 * Handles bidirectional sync between React Native app and Wear OS watch
 * Uses react-native-wear-connectivity for Data Layer communication
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { useFoodLogStore } from '@/stores/foodLogStore';
import { useWaterStore } from '@/stores/waterStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGoalStore } from '@/stores/goalStore';
import { useMacroCycleStore } from '@/stores/macroCycleStore';
import { macroCycleRepository } from '@/repositories';
import {
  WearDailySummary,
  WearRecentFood,
  WearAction,
  WearConnectionState,
  WearSyncStatus,
  WEAR_DATA_PATH_DAILY_SUMMARY,
  WEAR_DATA_PATH_RECENT_FOODS,
  WEAR_MESSAGE_PATH_SYNC_COMPLETE,
  WEAR_MESSAGE_PATH_ACTION_CONFIRMED,
  WEAR_CAPABILITY,
} from '@/types/wearOS';
import { MealType } from '@/constants/mealTypes';
import { getCurrentMealPeriod, getTodayDate } from '../voiceAssistant/voiceAssistantService';

// Native module - only available on Android
const WearConnectivity = Platform.OS === 'android' ? NativeModules.WearConnectivity : null;

let eventEmitter: NativeEventEmitter | null = null;
let messageListener: any = null;

/**
 * Check if Wear OS connectivity is available
 */
export function isWearOSAvailable(): boolean {
  return Platform.OS === 'android' && WearConnectivity != null;
}

/**
 * Initialize Wear OS sync service
 * Sets up listeners for watch messages and capability changes
 */
export async function initWearSync(): Promise<boolean> {
  if (!isWearOSAvailable()) {
    if (__DEV__) console.log('Wear OS connectivity not available');
    return false;
  }

  try {
    // Initialize native module
    await WearConnectivity.init();

    // Set up event emitter for messages from watch
    eventEmitter = new NativeEventEmitter(WearConnectivity);

    // Listen for messages from watch
    messageListener = eventEmitter.addListener('messageReceived', handleWatchMessage);

    // Check for connected watch
    const isConnected = await checkWatchConnection();

    // If connected, send initial sync
    if (isConnected) {
      await syncToWatch();
    }

    if (__DEV__) console.log('Wear OS sync initialized, connected:', isConnected);
    return true;
  } catch (error) {
    if (__DEV__) console.error('Failed to initialize Wear OS sync:', error);
    return false;
  }
}

/**
 * Cleanup Wear OS sync service
 */
export function cleanupWearSync(): void {
  if (messageListener) {
    messageListener.remove();
    messageListener = null;
  }
  eventEmitter = null;
}

/**
 * Check if a watch is connected
 */
export async function checkWatchConnection(): Promise<boolean> {
  if (!isWearOSAvailable()) return false;

  try {
    const nodes = await WearConnectivity.getConnectedNodes();
    return nodes && nodes.length > 0;
  } catch (error) {
    if (__DEV__) console.error('Failed to check watch connection:', error);
    return false;
  }
}

/**
 * Get connected watch info
 */
export async function getConnectedWatch(): Promise<WearConnectionState> {
  if (!isWearOSAvailable()) {
    return { isConnected: false };
  }

  try {
    const nodes = await WearConnectivity.getConnectedNodes();
    if (nodes && nodes.length > 0) {
      const node = nodes[0];
      return {
        isConnected: true,
        nodeId: node.id,
        nodeName: node.displayName,
      };
    }
    return { isConnected: false };
  } catch (error) {
    if (__DEV__) console.error('Failed to get connected watch:', error);
    return { isConnected: false };
  }
}

/**
 * Sync current data to watch
 */
export async function syncToWatch(): Promise<boolean> {
  if (!isWearOSAvailable()) return false;

  try {
    // Get current state from stores
    const foodLogStore = useFoodLogStore.getState();
    const waterStore = useWaterStore.getState();
    const settingsStore = useSettingsStore.getState();

    const today = getTodayDate();

    // Load today's entries if needed
    if (foodLogStore.selectedDate !== today) {
      await foodLogStore.loadEntriesForDate(today);
    }

    const summary = foodLogStore.getDailySummary();
    const waterProgress = waterStore.getTodayProgress();
    const goals = settingsStore.settings;

    // Resolve targets — use goalStore as primary, fall back to defaults
    const goalState = useGoalStore.getState();
    let calorieGoal = goalState.calorieGoal || 2000;
    let proteinGoal = goalState.proteinGoal || 150;
    let carbsGoal = goalState.carbGoal || 250;
    let fatGoal = goalState.fatGoal || 65;

    // Resolve via macro cycling if active
    const cycleConfig = useMacroCycleStore.getState().config;
    if (cycleConfig?.enabled) {
      try {
        const baseTargets = {
          calories: calorieGoal,
          protein: proteinGoal,
          carbs: carbsGoal,
          fat: fatGoal,
        };
        const resolved = await macroCycleRepository.getTargetsForDate(today, baseTargets);
        calorieGoal = resolved.calories;
        proteinGoal = resolved.protein;
        carbsGoal = resolved.carbs;
        fatGoal = resolved.fat;
      } catch {
        // Fall back to base goals on error
      }
    }

    // Build daily summary
    const dailySummary: WearDailySummary = {
      date: today,
      calories: summary.totals.calories,
      calorieGoal,
      protein: summary.totals.protein,
      proteinGoal,
      carbs: summary.totals.carbs,
      carbsGoal,
      fat: summary.totals.fat,
      fatGoal,
      water: waterProgress.glasses,
      waterGoal: waterProgress.goal,
      lastSyncTime: Date.now(),
    };

    // Send to watch via Data Layer
    await WearConnectivity.sendData(
      WEAR_DATA_PATH_DAILY_SUMMARY,
      JSON.stringify(dailySummary)
    );

    // Get and send recent foods
    const recentFoods = await getRecentFoodsForWatch();
    await WearConnectivity.sendData(
      WEAR_DATA_PATH_RECENT_FOODS,
      JSON.stringify(recentFoods)
    );

    // Send sync complete message
    await sendMessageToWatch(WEAR_MESSAGE_PATH_SYNC_COMPLETE, '{}');

    if (__DEV__) console.log('Synced to watch successfully');
    return true;
  } catch (error) {
    if (__DEV__) console.error('Failed to sync to watch:', error);
    return false;
  }
}

/**
 * Get recent foods formatted for watch
 */
async function getRecentFoodsForWatch(): Promise<WearRecentFood[]> {
  const foodLogStore = useFoodLogStore.getState();

  // Get recent entries from the last 7 days
  const recentEntries = foodLogStore.entries
    .filter(e => e.foodId && e.name)
    .slice(0, 20);

  // Deduplicate by food ID and format
  const seen = new Set<string>();
  const recentFoods: WearRecentFood[] = [];

  for (const entry of recentEntries) {
    if (!entry.foodId || seen.has(entry.foodId)) continue;
    seen.add(entry.foodId);

    recentFoods.push({
      id: entry.foodId,
      name: entry.name || 'Unknown',
      calories: entry.calories,
      protein: entry.protein || 0,
      carbs: entry.carbs || 0,
      fat: entry.fat || 0,
      servingSize: entry.servingSize,
      lastUsed: new Date(entry.date).getTime(),
    });

    if (recentFoods.length >= 10) break;
  }

  return recentFoods;
}

/**
 * Send message to watch
 */
async function sendMessageToWatch(path: string, data: string): Promise<boolean> {
  if (!isWearOSAvailable()) return false;

  try {
    const connection = await getConnectedWatch();
    if (!connection.isConnected || !connection.nodeId) {
      return false;
    }

    await WearConnectivity.sendMessage(connection.nodeId, path, data);
    return true;
  } catch (error) {
    if (__DEV__) console.error('Failed to send message to watch:', error);
    return false;
  }
}

/**
 * Handle incoming message from watch
 */
async function handleWatchMessage(message: { path: string; data: string }): Promise<void> {
  if (__DEV__) console.log('Received watch message:', message.path);

  try {
    const payload = message.data ? JSON.parse(message.data) : {};

    switch (message.path) {
      case '/action/water/add':
        await handleWaterAction(payload);
        break;

      case '/action/quickadd':
        await handleQuickAddAction(payload);
        break;

      case '/action/food/log':
        await handleLogFoodAction(payload);
        break;

      case '/action/sync':
        await syncToWatch();
        break;

      default:
        if (__DEV__) console.log('Unknown watch action:', message.path);
    }

    // Confirm action processed
    await sendMessageToWatch(WEAR_MESSAGE_PATH_ACTION_CONFIRMED, '{}');

    // Sync updated data back to watch
    await syncToWatch();
  } catch (error) {
    if (__DEV__) console.error('Failed to handle watch message:', error);
  }
}

/**
 * Handle water add action from watch
 */
async function handleWaterAction(payload: { glasses?: number }): Promise<void> {
  const waterStore = useWaterStore.getState();
  const glasses = payload.glasses || 1;

  for (let i = 0; i < glasses; i++) {
    await waterStore.addGlass();
  }

  if (__DEV__) console.log(`Added ${glasses} glass(es) of water from watch`);
}

/**
 * Handle quick add action from watch
 */
async function handleQuickAddAction(payload: {
  calories?: number;
  meal?: string;
}): Promise<void> {
  const foodLogStore = useFoodLogStore.getState();
  const calories = payload.calories || 0;

  if (calories <= 0) return;

  const targetMeal = payload.meal
    ? (payload.meal as MealType)
    : getCurrentMealPeriod();

  await foodLogStore.addQuickEntry({
    date: getTodayDate(),
    mealType: targetMeal,
    calories,
    protein: 0,
    carbs: 0,
    fat: 0,
    description: 'Added from watch',
  });

  if (__DEV__) console.log(`Quick added ${calories} calories to ${targetMeal} from watch`);
}

/**
 * Handle log food action from watch
 */
async function handleLogFoodAction(payload: { foodId?: string }): Promise<void> {
  if (!payload.foodId) return;

  const foodLogStore = useFoodLogStore.getState();

  // Find the food in recent entries
  const recentEntry = foodLogStore.entries.find(e => e.foodId === payload.foodId);

  if (recentEntry) {
    await foodLogStore.addQuickEntry({
      date: getTodayDate(),
      mealType: getCurrentMealPeriod(),
      calories: recentEntry.calories,
      protein: recentEntry.protein || 0,
      carbs: recentEntry.carbs || 0,
      fat: recentEntry.fat || 0,
      description: recentEntry.name || 'Logged from watch',
    });

    if (__DEV__) console.log(`Logged food ${recentEntry.name} from watch`);
  }
}

/**
 * Export sync function for use in stores
 */
export { syncToWatch as triggerWearSync };
