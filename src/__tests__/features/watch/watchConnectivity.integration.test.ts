/**
 * Watch Connectivity Integration Tests
 * End-to-end tests for Apple Watch communication flow
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock native module and event emitter - stored in global to avoid hoisting issues

jest.mock('react-native', () => {
  // Create fresh mock inside the factory function
  const nativeModule = {
    sendDailyDataToWatch: jest.fn(),
    sendRecentFoodsToWatch: jest.fn(),
    isWatchReachable: jest.fn(),
    isWatchPaired: jest.fn(),
    isWatchAppInstalled: jest.fn(),
    getWatchSessionState: jest.fn(),
  };

  // Store reference for tests to access
  (global as any).__mockNativeModule = nativeModule;

  return {
    Platform: {
      OS: 'ios',
    },
    NativeModules: {
      WatchConnectivityModule: nativeModule,
    },
    NativeEventEmitter: jest.fn().mockImplementation(() => ({
      addListener: jest.fn((eventName, callback) => {
        if (eventName === 'WatchReachabilityChanged') {
          (global as any).__reachabilityCallback = callback;
        } else if (eventName === 'WatchSessionStateChanged') {
          (global as any).__sessionStateCallback = callback;
        } else if (eventName === 'WatchCommand') {
          (global as any).__watchCommandCallback = callback;
        }
        return { remove: jest.fn() };
      }),
      removeAllListeners: jest.fn(),
    })),
  };
});

import { watchConnectivityService } from '@/services/watchConnectivity/watchConnectivityService';
import { useWatchConnectivity } from '@/hooks/useWatchConnectivity';
import { WatchDailyData, WatchCommand } from '@/types/watch';

// Helper to get mock native module from global
const getMockNativeModule = () => (global as any).__mockNativeModule;
const getReachabilityCallback = () => (global as any).__reachabilityCallback;
const getSessionStateCallback = () => (global as any).__sessionStateCallback;
const getWatchCommandCallback = () => (global as any).__watchCommandCallback;

describe('Watch Connectivity Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).__reachabilityCallback = null;
    (global as any).__sessionStateCallback = null;
    (global as any).__watchCommandCallback = null;

    // Default session state
    const mockModule = getMockNativeModule();
    if (mockModule) {
      mockModule.getWatchSessionState.mockResolvedValue({
        isSupported: true,
        isPaired: true,
        isWatchAppInstalled: true,
        isReachable: true,
      });
    }
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

      expect(getMockNativeModule().sendDailyDataToWatch).toHaveBeenCalledWith(dailyData);
    });

    it('handles watch becoming reachable and syncing data', async () => {
      // Start with watch not reachable
      getMockNativeModule().getWatchSessionState.mockResolvedValue({
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
        getReachabilityCallback()?.({ isReachable: true });
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

      expect(getMockNativeModule().sendDailyDataToWatch).toHaveBeenCalled();
    });
  });

  describe('Command handling flow', () => {
    it('processes addWater command from watch', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(getWatchCommandCallback()).not.toBeNull();
      });

      const addWaterCommand: WatchCommand = {
        type: 'addWater',
        glasses: 1,
      };

      act(() => {
        getWatchCommandCallback()?.(addWaterCommand);
      });

      expect(handleCommand).toHaveBeenCalledWith(addWaterCommand);
    });

    it('processes quickAddCalories command from watch', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(getWatchCommandCallback()).not.toBeNull();
      });

      const quickAddCommand: WatchCommand = {
        type: 'quickAddCalories',
        calories: 200,
        meal: 'Lunch',
      };

      act(() => {
        getWatchCommandCallback()?.(quickAddCommand);
      });

      expect(handleCommand).toHaveBeenCalledWith(quickAddCommand);
    });

    it('processes logFood command from watch', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(getWatchCommandCallback()).not.toBeNull();
      });

      const logFoodCommand: WatchCommand = {
        type: 'logFood',
        foodId: 'food-123',
        meal: 'Dinner',
      };

      act(() => {
        getWatchCommandCallback()?.(logFoodCommand);
      });

      expect(handleCommand).toHaveBeenCalledWith(logFoodCommand);
    });

    it('processes requestSync command from watch', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(getWatchCommandCallback()).not.toBeNull();
      });

      const syncCommand: WatchCommand = {
        type: 'requestSync',
      };

      act(() => {
        getWatchCommandCallback()?.(syncCommand);
      });

      expect(handleCommand).toHaveBeenCalledWith(syncCommand);
    });
  });

  describe('Session state transitions', () => {
    it('handles watch app installation', async () => {
      // Start with watch app not installed
      getMockNativeModule().getWatchSessionState.mockResolvedValue({
        isSupported: true,
        isPaired: true,
        isWatchAppInstalled: false,
        isReachable: false,
      });

      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(result.current.isWatchAppInstalled).toBe(false);
      });

      // Simulate watch app being installed
      getMockNativeModule().getWatchSessionState.mockResolvedValue({
        isSupported: true,
        isPaired: true,
        isWatchAppInstalled: true,
        isReachable: true,
      });

      act(() => {
        getSessionStateCallback()?.({ state: 'activated' });
      });

      await waitFor(() => {
        expect(result.current.isWatchAppInstalled).toBe(true);
      });
    });

    it('handles watch pairing changes', async () => {
      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(result.current.isPaired).toBe(true);
      });

      // Simulate watch being unpaired
      getMockNativeModule().getWatchSessionState.mockResolvedValue({
        isSupported: true,
        isPaired: false,
        isWatchAppInstalled: false,
        isReachable: false,
      });

      act(() => {
        getSessionStateCallback()?.({ state: 'inactive' });
      });

      await waitFor(() => {
        expect(result.current.isPaired).toBe(false);
      });
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
        getReachabilityCallback()?.({ isReachable: false });
      });

      expect(result.current.isReachable).toBe(false);

      // Simulate connection restored
      act(() => {
        getReachabilityCallback()?.({ isReachable: true });
      });

      expect(result.current.isReachable).toBe(true);
    });

    it('handles session activation error', async () => {
      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      // Simulate activation error
      act(() => {
        getSessionStateCallback()?.({
          state: 'inactive',
          error: 'Activation failed',
        });
      });

      // Hook should still function
      expect(result.current.isAvailable).toBe(true);
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
        { id: '4', name: 'Rice', calories: 130, protein: 3, carbs: 28, fat: 0 },
        { id: '5', name: 'Broccoli', calories: 55, protein: 4, carbs: 11, fat: 1 },
      ];

      await act(async () => {
        await result.current.sendRecentFoods(recentFoods);
      });

      expect(getMockNativeModule().sendRecentFoodsToWatch).toHaveBeenCalledWith(recentFoods);
    });
  });

  describe('Multiple command sequence', () => {
    it('handles rapid command sequence', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(getWatchCommandCallback()).not.toBeNull();
      });

      // Simulate rapid water additions (user tapping quickly)
      const commands: WatchCommand[] = [
        { type: 'addWater', glasses: 1 },
        { type: 'addWater', glasses: 1 },
        { type: 'addWater', glasses: 1 },
      ];

      commands.forEach((command) => {
        act(() => {
          getWatchCommandCallback()?.(command);
        });
      });

      expect(handleCommand).toHaveBeenCalledTimes(3);
    });

    it('handles mixed command types', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(getWatchCommandCallback()).not.toBeNull();
      });

      const commands: WatchCommand[] = [
        { type: 'addWater', glasses: 1 },
        { type: 'quickAddCalories', calories: 200, meal: 'Lunch' },
        { type: 'logFood', foodId: 'food-123', meal: 'Lunch' },
        { type: 'requestSync' },
      ];

      commands.forEach((command) => {
        act(() => {
          getWatchCommandCallback()?.(command);
        });
      });

      expect(handleCommand).toHaveBeenCalledTimes(4);
      expect(handleCommand).toHaveBeenNthCalledWith(1, commands[0]);
      expect(handleCommand).toHaveBeenNthCalledWith(2, commands[1]);
      expect(handleCommand).toHaveBeenNthCalledWith(3, commands[2]);
      expect(handleCommand).toHaveBeenNthCalledWith(4, commands[3]);
    });
  });
});

describe('Watch Connectivity - Meal Type Timing', () => {
  // Test that the meal type suggestion works correctly based on time
  describe('meal suggestions based on time', () => {
    it('includes meal type in quick add commands', async () => {
      const handleCommand = jest.fn();
      renderHook(() => useWatchConnectivity(handleCommand));

      await waitFor(() => {
        expect(getWatchCommandCallback()).not.toBeNull();
      });

      // Test breakfast time
      const breakfastCommand: WatchCommand = {
        type: 'quickAddCalories',
        calories: 300,
        meal: 'Breakfast',
      };

      act(() => {
        getWatchCommandCallback()?.(breakfastCommand);
      });

      expect(handleCommand).toHaveBeenCalledWith(
        expect.objectContaining({ meal: 'Breakfast' })
      );
    });
  });
});

describe('Watch Connectivity - Data Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMockNativeModule().getWatchSessionState.mockResolvedValue({
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

    const sentData = getMockNativeModule().sendDailyDataToWatch.mock.calls[0][0];

    expect(sentData).toHaveProperty('date');
    expect(sentData).toHaveProperty('caloriesConsumed');
    expect(sentData).toHaveProperty('calorieTarget');
    expect(sentData).toHaveProperty('waterGlasses');
    expect(sentData).toHaveProperty('waterTarget');
    expect(sentData).toHaveProperty('protein');
    expect(sentData).toHaveProperty('carbs');
    expect(sentData).toHaveProperty('fat');
    expect(sentData).toHaveProperty('recentFoods');
    expect(sentData).toHaveProperty('favoriteFoods');
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

    expect(getMockNativeModule().sendDailyDataToWatch).toHaveBeenCalledWith(dailyData);
  });
});
