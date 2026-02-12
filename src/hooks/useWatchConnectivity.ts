/**
 * useWatchConnectivity Hook
 * React hook for Apple Watch connectivity
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { watchConnectivityService } from '@/services/watchConnectivity/watchConnectivityService';
import {
  WatchDailyData,
  WatchSimpleFood,
  WatchCommand,
  WatchSessionState,
} from '@/types/watch';

interface UseWatchConnectivityResult {
  /** Whether watch connectivity is available on this device */
  isAvailable: boolean;
  /** Whether the watch is currently reachable */
  isReachable: boolean;
  /** Whether an Apple Watch is paired */
  isPaired: boolean;
  /** Whether the NutritionRx watch app is installed */
  isWatchAppInstalled: boolean;
  /** Send daily nutrition data to the watch */
  sendDailyData: (data: WatchDailyData) => Promise<void>;
  /** Send recent foods to the watch */
  sendRecentFoods: (foods: WatchSimpleFood[]) => Promise<void>;
  /** Refresh the session state */
  refreshSessionState: () => Promise<void>;
}

/**
 * Hook for managing Apple Watch connectivity
 */
export function useWatchConnectivity(
  onWatchCommand?: (command: WatchCommand) => void
): UseWatchConnectivityResult {
  const [isAvailable] = useState(() => watchConnectivityService.isAvailable());
  const [isReachable, setIsReachable] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [isWatchAppInstalled, setIsWatchAppInstalled] = useState(false);

  const onWatchCommandRef = useRef(onWatchCommand);
  onWatchCommandRef.current = onWatchCommand;

  // Fetch initial session state
  const refreshSessionState = useCallback(async () => {
    if (!isAvailable) return;

    try {
      const state: WatchSessionState =
        await watchConnectivityService.getSessionState();
      setIsPaired(state.isPaired);
      setIsWatchAppInstalled(state.isWatchAppInstalled);
      setIsReachable(state.isReachable);
    } catch (error) {
      if (__DEV__) console.error('Failed to get watch session state:', error);
    }
  }, [isAvailable]);

  // Set up event listeners
  useEffect(() => {
    if (!isAvailable) return;

    // Fetch initial state
    refreshSessionState();

    // Subscribe to reachability changes
    const unsubscribeReachability = watchConnectivityService.onReachabilityChange(
      (event) => {
        setIsReachable(event.isReachable);
      }
    );

    // Subscribe to session state changes
    const unsubscribeSessionState = watchConnectivityService.onSessionStateChange(
      () => {
        // Refresh full state when session state changes
        refreshSessionState();
      }
    );

    // Subscribe to watch commands
    const unsubscribeCommands = watchConnectivityService.onWatchCommand(
      (command) => {
        if (onWatchCommandRef.current) {
          onWatchCommandRef.current(command);
        }
      }
    );

    return () => {
      unsubscribeReachability();
      unsubscribeSessionState();
      unsubscribeCommands();
    };
  }, [isAvailable, refreshSessionState]);

  // Send daily data to watch
  const sendDailyData = useCallback(
    async (data: WatchDailyData): Promise<void> => {
      if (!isAvailable) return;
      await watchConnectivityService.sendDailyData(data);
    },
    [isAvailable]
  );

  // Send recent foods to watch
  const sendRecentFoods = useCallback(
    async (foods: WatchSimpleFood[]): Promise<void> => {
      if (!isAvailable) return;
      await watchConnectivityService.sendRecentFoods(foods);
    },
    [isAvailable]
  );

  return {
    isAvailable,
    isReachable,
    isPaired,
    isWatchAppInstalled,
    sendDailyData,
    sendRecentFoods,
    refreshSessionState,
  };
}

export default useWatchConnectivity;
