/**
 * Watch Connectivity Service Tests
 * Tests for Apple Watch communication service
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

// Mock NativeEventEmitter
const mockAddListener = jest.fn(() => ({ remove: jest.fn() }));
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  NativeModules: {
    WatchConnectivityModule: {
      sendDailyDataToWatch: jest.fn(),
      sendRecentFoodsToWatch: jest.fn(),
      isWatchReachable: jest.fn(),
      isWatchPaired: jest.fn(),
      isWatchAppInstalled: jest.fn(),
      getWatchSessionState: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: mockAddListener,
    removeAllListeners: jest.fn(),
  })),
}));

// Import after mocks
import { watchConnectivityService } from '@/services/watchConnectivity/watchConnectivityService';
import { WatchDailyData, WatchSimpleFood } from '@/types/watch';

const mockModule = NativeModules.WatchConnectivityModule;

describe('watchConnectivityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('returns true on iOS with module available', () => {
      expect(watchConnectivityService.isAvailable()).toBe(true);
    });
  });

  describe('sendDailyData', () => {
    it('sends daily data to watch module', async () => {
      const mockData: WatchDailyData = {
        date: '2024-01-15',
        caloriesConsumed: 1500,
        calorieTarget: 2000,
        waterGlasses: 5,
        waterTarget: 8,
        protein: 100,
        carbs: 150,
        fat: 50,
        recentFoods: [],
        favoriteFoods: [],
      };

      await watchConnectivityService.sendDailyData(mockData);

      expect(mockModule.sendDailyDataToWatch).toHaveBeenCalledWith(mockData);
    });

    it('handles errors gracefully', async () => {
      mockModule.sendDailyDataToWatch.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockData: WatchDailyData = {
        date: '2024-01-15',
        caloriesConsumed: 1500,
        calorieTarget: 2000,
        waterGlasses: 5,
        waterTarget: 8,
        protein: 100,
        carbs: 150,
        fat: 50,
        recentFoods: [],
        favoriteFoods: [],
      };

      await watchConnectivityService.sendDailyData(mockData);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('sendRecentFoods', () => {
    it('sends recent foods to watch module', async () => {
      const mockFoods: WatchSimpleFood[] = [
        { id: '1', name: 'Apple', calories: 95 },
        { id: '2', name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 },
      ];

      await watchConnectivityService.sendRecentFoods(mockFoods);

      expect(mockModule.sendRecentFoodsToWatch).toHaveBeenCalledWith(mockFoods);
    });
  });

  describe('isWatchReachable', () => {
    it('returns reachability status', async () => {
      mockModule.isWatchReachable.mockResolvedValue(true);

      const result = await watchConnectivityService.isWatchReachable();

      expect(result).toBe(true);
      expect(mockModule.isWatchReachable).toHaveBeenCalled();
    });

    it('returns false when not reachable', async () => {
      mockModule.isWatchReachable.mockResolvedValue(false);

      const result = await watchConnectivityService.isWatchReachable();

      expect(result).toBe(false);
    });
  });

  describe('isWatchPaired', () => {
    it('returns paired status', async () => {
      mockModule.isWatchPaired.mockResolvedValue(true);

      const result = await watchConnectivityService.isWatchPaired();

      expect(result).toBe(true);
      expect(mockModule.isWatchPaired).toHaveBeenCalled();
    });
  });

  describe('isWatchAppInstalled', () => {
    it('returns installed status', async () => {
      mockModule.isWatchAppInstalled.mockResolvedValue(true);

      const result = await watchConnectivityService.isWatchAppInstalled();

      expect(result).toBe(true);
      expect(mockModule.isWatchAppInstalled).toHaveBeenCalled();
    });
  });

  describe('getSessionState', () => {
    it('returns full session state', async () => {
      const mockState = {
        isSupported: true,
        isPaired: true,
        isWatchAppInstalled: true,
        isReachable: true,
      };
      mockModule.getWatchSessionState.mockResolvedValue(mockState);

      const result = await watchConnectivityService.getSessionState();

      expect(result).toEqual(mockState);
      expect(mockModule.getWatchSessionState).toHaveBeenCalled();
    });
  });

  describe('onWatchCommand', () => {
    it('subscribes to watch commands', () => {
      const callback = jest.fn();
      const unsubscribe = watchConnectivityService.onWatchCommand(callback);

      expect(mockAddListener).toHaveBeenCalledWith('WatchCommand', callback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = watchConnectivityService.onWatchCommand(callback);

      unsubscribe();
      // Unsubscribe should have been called
    });
  });

  describe('onReachabilityChange', () => {
    it('subscribes to reachability changes', () => {
      const callback = jest.fn();
      watchConnectivityService.onReachabilityChange(callback);

      expect(mockAddListener).toHaveBeenCalledWith(
        'WatchReachabilityChanged',
        callback
      );
    });
  });

  describe('onSessionStateChange', () => {
    it('subscribes to session state changes', () => {
      const callback = jest.fn();
      watchConnectivityService.onSessionStateChange(callback);

      expect(mockAddListener).toHaveBeenCalledWith(
        'WatchSessionStateChanged',
        callback
      );
    });
  });
});

describe('watchConnectivityService on Android', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: {
        OS: 'android',
      },
      NativeModules: {},
      NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: jest.fn(() => ({ remove: jest.fn() })),
        removeAllListeners: jest.fn(),
      })),
    }));
  });

  it('isAvailable returns false on Android', () => {
    // Re-import with Android mocks
    const { watchConnectivityService: androidService } = require('@/services/watchConnectivity/watchConnectivityService');

    expect(androidService.isAvailable()).toBe(false);
  });

  it('sendDailyData is a no-op on Android', async () => {
    const { watchConnectivityService: androidService } = require('@/services/watchConnectivity/watchConnectivityService');

    const mockData: WatchDailyData = {
      date: '2024-01-15',
      caloriesConsumed: 1500,
      calorieTarget: 2000,
      waterGlasses: 5,
      waterTarget: 8,
      protein: 100,
      carbs: 150,
      fat: 50,
      recentFoods: [],
      favoriteFoods: [],
    };

    // Should not throw
    await expect(androidService.sendDailyData(mockData)).resolves.toBeUndefined();
  });

  it('isWatchReachable returns false on Android', async () => {
    const { watchConnectivityService: androidService } = require('@/services/watchConnectivity/watchConnectivityService');

    const result = await androidService.isWatchReachable();
    expect(result).toBe(false);
  });

  it('getSessionState returns not supported state on Android', async () => {
    const { watchConnectivityService: androidService } = require('@/services/watchConnectivity/watchConnectivityService');

    const result = await androidService.getSessionState();
    expect(result).toEqual({
      isSupported: false,
      isPaired: false,
      isWatchAppInstalled: false,
      isReachable: false,
    });
  });

  it('onWatchCommand returns no-op unsubscribe on Android', () => {
    const { watchConnectivityService: androidService } = require('@/services/watchConnectivity/watchConnectivityService');

    const callback = jest.fn();
    const unsubscribe = androidService.onWatchCommand(callback);

    expect(typeof unsubscribe).toBe('function');
    // Should not throw
    unsubscribe();
  });
});
