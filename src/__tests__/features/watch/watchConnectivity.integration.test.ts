/**
 * Watch Connectivity Integration Tests
 * End-to-end tests for Apple Watch communication flow
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock native module and event emitter
let reachabilityCallback: ((event: { isReachable: boolean }) => void) | null = null;
let sessionStateCallback: ((event: { state: string; error?: string }) => void) | null = null;
let watchCommandCallback: ((command: any) => void) | null = null;

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
    addListener: jest.fn((eventName, callback) => {
      if (eventName === 'WatchReachabilityChanged') {
        reachabilityCallback = callback;
      } else if (eventName === 'WatchSessionStateChanged') {
        sessionStateCallback = callback;
      } else if (eventName === 'WatchCommand') {
        watchCommandCallback = callback;
      }
      return { remove: jest.fn() };
    }),
    removeAllListeners: jest.fn(),
  })),
}));

// Get mock references after mocking
const { NativeModules } = require('react-native');
const mockNativeModule = NativeModules.WatchConnectivityModule;

import { watchConnectivityService } from '@/services/watchConnectivity/watchConnectivityService';
import { useWatchConnectivity } from '@/hooks/useWatchConnectivity';
import { WatchDailyData, WatchCommand } from '@/types/watch';

describe('Watch Connectivity Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reachabilityCallback = null;
    sessionStateCallback = null;
    watchCommandCallback = null;

    // Default session state
    mockNativeModule.getWatchSessionState.mockResolvedValue({
      isSupported: true,
      isPaired: true,
      isWatchAppInstalled: true,
      isReachable: true,
    });
  });

  describe('Full sync flow', () => {
    it('syncs daily data from React Native to Watch', async () => {
      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      const dailyData: WatchDailyData = {
        date: '2024-01-15',
        caloriesConsumed: 1500,
        calorieTarget: 2000,
        waterGlasses: 5,
        waterTarget: 8,
        protein: 100,
        carbs: 150,
        fat: 50,
        recentFoods: [
          { id: '1', name: 'Apple', calories: 95 },
          { id: '2', name: 'Chicken Breast', calories: 165, protein: 31 },
        ],
        favoriteFoods: [
          { id: '3', name: 'Greek Yogurt', calories: 150, protein: 15 },
        ],
      };

      await act(async () => {
        await result.current.sendDailyData(dailyData);
      });

      expect(mockNativeModule.sendDailyDataToWatch).toHaveBeenCalledWith(dailyData);
    });

    it('handles watch becoming reachable and syncing data', async () => {
      // Start with watch not reachable
      mockNativeModule.getWatchSessionState.mockResolvedValue({
        isSupported: true,
        isPaired: true,
        isWatchAppInstalled: true,
        isReachable: false,
      });

      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(result.current.isReachable).toBe(false);
      });

      // Simulate watch becoming reachable
      act(() => {
        reachabilityCallback?.({ isReachable: true });
      });

      expect(result.current.isReachable).toBe(true);

      // Now data can be sent
      const dailyData: WatchDailyData = {
        date: '2024-01-15',
        caloriesConsumed: 500,
        calorieTarget: 2000,
        waterGlasses: 2,
        waterTarget: 8,
        protein: 30,
        carbs: 50,
        fat: 15,
        recentFoods: [],
        favoriteFoods: [],
      };

      await act(async () => {
        await result.current.sendDailyData(dailyData);
      });

      expect(mockNativeModule.sendDailyDataToWatch).toHaveBeenCalled();
    });
  });

  describe('Command handling flow', () => {
    it('processes addWater command from watch', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(watchCommandCallback).not.toBeNull();
      });

      const addWaterCommand: WatchCommand = {
        type: 'addWater',
        glasses: 1,
      };

      act(() => {
        watchCommandCallback?.(addWaterCommand);
      });

      expect(handleCommand).toHaveBeenCalledWith(addWaterCommand);
    });

    it('processes quickAddCalories command from watch', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(watchCommandCallback).not.toBeNull();
      });

      const quickAddCommand: WatchCommand = {
        type: 'quickAddCalories',
        calories: 200,
        meal: 'Lunch',
      };

      act(() => {
        watchCommandCallback?.(quickAddCommand);
      });

      expect(handleCommand).toHaveBeenCalledWith(quickAddCommand);
    });

    it('processes logFood command from watch', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(watchCommandCallback).not.toBeNull();
      });

      const logFoodCommand: WatchCommand = {
        type: 'logFood',
        foodId: 'food-123',
        meal: 'Dinner',
      };

      act(() => {
        watchCommandCallback?.(logFoodCommand);
      });

      expect(handleCommand).toHaveBeenCalledWith(logFoodCommand);
    });

    it('processes requestSync command from watch', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(watchCommandCallback).not.toBeNull();
      });

      const syncCommand: WatchCommand = {
        type: 'requestSync',
      };

      act(() => {
        watchCommandCallback?.(syncCommand);
      });

      expect(handleCommand).toHaveBeenCalledWith(syncCommand);
    });
  });

  describe('Error recovery', () => {
    it('recovers from temporary network errors', async () => {
      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(result.current.isReachable).toBe(true);
      });

      // Simulate connection loss
      act(() => {
        reachabilityCallback?.({ isReachable: false });
      });

      expect(result.current.isReachable).toBe(false);

      // Simulate connection restored
      act(() => {
        reachabilityCallback?.({ isReachable: true });
      });

      expect(result.current.isReachable).toBe(true);
    });
  });

  describe('Recent foods sync', () => {
    it('sends recent foods to watch', async () => {
      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      const recentFoods = [
        { id: '1', name: 'Apple', calories: 95 },
        { id: '2', name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 },
        { id: '3', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 4 },
      ];

      await act(async () => {
        await result.current.sendRecentFoods(recentFoods);
      });

      expect(mockNativeModule.sendRecentFoodsToWatch).toHaveBeenCalledWith(recentFoods);
    });
  });

  describe('Multiple command sequence', () => {
    it('handles rapid command sequence', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(watchCommandCallback).not.toBeNull();
      });

      // Simulate rapid water additions (user tapping quickly)
      const commands: WatchCommand[] = [
        { type: 'addWater', glasses: 1 },
        { type: 'addWater', glasses: 1 },
        { type: 'addWater', glasses: 1 },
      ];

      commands.forEach((command) => {
        act(() => {
          watchCommandCallback?.(command);
        });
      });

      expect(handleCommand).toHaveBeenCalledTimes(3);
    });
  });
});

describe('Watch Connectivity - Data Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNativeModule.getWatchSessionState.mockResolvedValue({
      isSupported: true,
      isPaired: true,
      isWatchAppInstalled: true,
      isReachable: true,
    });
  });

  it('sends properly formatted daily data', async () => {
    const { result } = renderHook(() => useWatchConnectivity());

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    const dailyData: WatchDailyData = {
      date: '2024-01-15',
      caloriesConsumed: 0,
      calorieTarget: 2000,
      waterGlasses: 0,
      waterTarget: 8,
      protein: 0,
      carbs: 0,
      fat: 0,
      recentFoods: [],
      favoriteFoods: [],
    };

    await act(async () => {
      await result.current.sendDailyData(dailyData);
    });

    const sentData = mockNativeModule.sendDailyDataToWatch.mock.calls[0][0];

    expect(sentData).toHaveProperty('date');
    expect(sentData).toHaveProperty('caloriesConsumed');
    expect(sentData).toHaveProperty('calorieTarget');
    expect(sentData).toHaveProperty('waterGlasses');
    expect(sentData).toHaveProperty('waterTarget');
  });

  it('handles over-target calorie values', async () => {
    const { result } = renderHook(() => useWatchConnectivity());

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    // User consumed more than target (should still send, watch handles display)
    const dailyData: WatchDailyData = {
      date: '2024-01-15',
      caloriesConsumed: 2500,
      calorieTarget: 2000,
      waterGlasses: 10,
      waterTarget: 8,
      protein: 150,
      carbs: 300,
      fat: 100,
      recentFoods: [],
      favoriteFoods: [],
    };

    await act(async () => {
      await result.current.sendDailyData(dailyData);
    });

    expect(mockNativeModule.sendDailyDataToWatch).toHaveBeenCalledWith(dailyData);
  });
});
