/**
 * useWidgetSync Hook
 * Syncs app state with native widgets
 */

import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { widgetDataService, formatDate } from './widgetDataService';
import { WidgetNutritionData, WidgetWaterData } from './types';

interface WidgetSyncOptions {
  /**
   * Whether to sync immediately on mount
   * @default true
   */
  syncOnMount?: boolean;

  /**
   * Whether to sync when app comes to foreground
   * @default true
   */
  syncOnForeground?: boolean;

  /**
   * Debounce delay in ms for sync operations
   * @default 500
   */
  debounceMs?: number;
}

interface UseWidgetSyncReturn {
  /**
   * Sync nutrition data to widgets
   */
  syncNutrition: (data: Partial<WidgetNutritionData>) => Promise<void>;

  /**
   * Sync water data to widgets
   */
  syncWater: (data: Partial<WidgetWaterData>) => Promise<void>;

  /**
   * Force reload all widgets
   */
  reloadWidgets: () => Promise<void>;

  /**
   * Check if native widget module is available
   */
  isWidgetSupported: boolean;
}

/**
 * Hook for syncing app data with native widgets
 */
export function useWidgetSync(options: WidgetSyncOptions = {}): UseWidgetSyncReturn {
  const {
    syncOnMount = true,
    syncOnForeground = true,
    debounceMs = 500,
  } = options;

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWidgetSupported = Platform.OS === 'ios' && widgetDataService.isNativeModuleAvailable();

  // Debounced sync function
  const debouncedSync = useCallback(
    (syncFn: () => Promise<void>) => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        try {
          await syncFn();
        } catch (error) {
          if (__DEV__) console.warn('Widget sync failed:', error);
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  // Sync nutrition data
  const syncNutrition = useCallback(
    async (data: Partial<WidgetNutritionData>) => {
      debouncedSync(async () => {
        await widgetDataService.updateNutritionData(data);
        await widgetDataService.reloadWidgets('TodaySummaryWidget');
      });
    },
    [debouncedSync]
  );

  // Sync water data
  const syncWater = useCallback(
    async (data: Partial<WidgetWaterData>) => {
      debouncedSync(async () => {
        await widgetDataService.updateWaterData(data);
        await widgetDataService.reloadWidgets('WaterTrackingWidget');
      });
    },
    [debouncedSync]
  );

  // Force reload widgets
  const reloadWidgets = useCallback(async () => {
    await widgetDataService.reloadWidgets();
  }, []);

  // Handle app state changes
  useEffect(() => {
    if (!syncOnForeground) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - sync data
        widgetDataService.clearCache();
        reloadWidgets();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [syncOnForeground, reloadWidgets]);

  // Initial sync on mount
  useEffect(() => {
    if (!syncOnMount) return;

    // Trigger initial sync after a short delay
    const timer = setTimeout(() => {
      reloadWidgets();
    }, 1000);

    return () => clearTimeout(timer);
  }, [syncOnMount, reloadWidgets]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    syncNutrition,
    syncWater,
    reloadWidgets,
    isWidgetSupported,
  };
}

/**
 * Hook specifically for syncing food log data to widgets
 * Use this in components that modify food logs
 */
export function useFoodLogWidgetSync() {
  const { syncNutrition, isWidgetSupported } = useWidgetSync({ syncOnMount: false });

  const syncFoodLog = useCallback(
    async (params: {
      totalCalories: number;
      caloriesGoal: number;
      protein: number;
      proteinGoal: number;
      carbs: number;
      carbsGoal: number;
      fat: number;
      fatGoal: number;
    }) => {
      await syncNutrition({
        caloriesConsumed: params.totalCalories,
        caloriesGoal: params.caloriesGoal,
        proteinConsumed: params.protein,
        proteinGoal: params.proteinGoal,
        carbsConsumed: params.carbs,
        carbsGoal: params.carbsGoal,
        fatConsumed: params.fat,
        fatGoal: params.fatGoal,
      });
    },
    [syncNutrition]
  );

  return { syncFoodLog, isWidgetSupported };
}

/**
 * Hook specifically for syncing water data to widgets
 * Use this in components that modify water logs
 */
export function useWaterWidgetSync() {
  const { syncWater, isWidgetSupported } = useWidgetSync({ syncOnMount: false });

  const syncWaterLog = useCallback(
    async (params: {
      glasses: number;
      goal: number;
      glassSizeMl: number;
    }) => {
      await syncWater({
        glassesConsumed: params.glasses,
        glassesGoal: params.goal,
        glassSizeMl: params.glassSizeMl,
      });
    },
    [syncWater]
  );

  return { syncWaterLog, isWidgetSupported };
}
