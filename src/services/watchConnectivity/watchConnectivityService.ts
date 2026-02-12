/**
 * Watch Connectivity Service
 * Handles communication with the Apple Watch companion app
 */
// TODO [POST_LAUNCH_WEAR]: Enable after native modules implemented and schema bugs fixed

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import {
  WatchDailyData,
  WatchSimpleFood,
  WatchCommand,
  WatchSessionState,
  WatchReachabilityEvent,
  WatchSessionStateEvent,
} from '@/types/watch';

// Native module interface
interface WatchConnectivityModuleInterface {
  sendDailyDataToWatch: (dailyData: WatchDailyData) => void;
  sendRecentFoodsToWatch: (foods: WatchSimpleFood[]) => void;
  isWatchReachable: () => Promise<boolean>;
  isWatchPaired: () => Promise<boolean>;
  isWatchAppInstalled: () => Promise<boolean>;
  getWatchSessionState: () => Promise<WatchSessionState>;
}

// Get native module (only available on iOS)
const WatchConnectivityModule: WatchConnectivityModuleInterface | null =
  Platform.OS === 'ios' ? NativeModules.WatchConnectivityModule : null;

// Event emitter for watch events
let eventEmitter: NativeEventEmitter | null = null;
if (WatchConnectivityModule) {
  eventEmitter = new NativeEventEmitter(NativeModules.WatchConnectivityModule);
}

/**
 * Watch Connectivity Service
 */
export const watchConnectivityService = {
  /**
   * Check if watch connectivity is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && WatchConnectivityModule !== null;
  },

  /**
   * Send daily nutrition data to the watch
   */
  async sendDailyData(data: WatchDailyData): Promise<void> {
    if (!WatchConnectivityModule) {
      if (__DEV__) console.log('Watch connectivity not available');
      return;
    }

    try {
      WatchConnectivityModule.sendDailyDataToWatch(data);
    } catch (error) {
      if (__DEV__) console.error('Failed to send daily data to watch:', error);
    }
  },

  /**
   * Send recent foods to the watch
   */
  async sendRecentFoods(foods: WatchSimpleFood[]): Promise<void> {
    if (!WatchConnectivityModule) return;

    try {
      WatchConnectivityModule.sendRecentFoodsToWatch(foods);
    } catch (error) {
      if (__DEV__) console.error('Failed to send recent foods to watch:', error);
    }
  },

  /**
   * Check if the watch is currently reachable
   */
  async isWatchReachable(): Promise<boolean> {
    if (!WatchConnectivityModule) return false;
    return WatchConnectivityModule.isWatchReachable();
  },

  /**
   * Check if an Apple Watch is paired
   */
  async isWatchPaired(): Promise<boolean> {
    if (!WatchConnectivityModule) return false;
    return WatchConnectivityModule.isWatchPaired();
  },

  /**
   * Check if the watch app is installed
   */
  async isWatchAppInstalled(): Promise<boolean> {
    if (!WatchConnectivityModule) return false;
    return WatchConnectivityModule.isWatchAppInstalled();
  },

  /**
   * Get the current watch session state
   */
  async getSessionState(): Promise<WatchSessionState> {
    if (!WatchConnectivityModule) {
      return {
        isSupported: false,
        isPaired: false,
        isWatchAppInstalled: false,
        isReachable: false,
      };
    }
    return WatchConnectivityModule.getWatchSessionState();
  },

  /**
   * Subscribe to watch commands
   */
  onWatchCommand(callback: (command: WatchCommand) => void): () => void {
    if (!eventEmitter) return () => {};

    const subscription = eventEmitter.addListener('WatchCommand', callback);
    return () => subscription.remove();
  },

  /**
   * Subscribe to watch reachability changes
   */
  onReachabilityChange(
    callback: (event: WatchReachabilityEvent) => void
  ): () => void {
    if (!eventEmitter) return () => {};

    const subscription = eventEmitter.addListener(
      'WatchReachabilityChanged',
      callback
    );
    return () => subscription.remove();
  },

  /**
   * Subscribe to watch session state changes
   */
  onSessionStateChange(
    callback: (event: WatchSessionStateEvent) => void
  ): () => void {
    if (!eventEmitter) return () => {};

    const subscription = eventEmitter.addListener(
      'WatchSessionStateChanged',
      callback
    );
    return () => subscription.remove();
  },
};
