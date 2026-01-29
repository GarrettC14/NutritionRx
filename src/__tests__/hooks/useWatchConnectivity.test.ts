/**
 * useWatchConnectivity Hook Tests
 * Tests for Apple Watch connectivity React hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock the watch connectivity service
const mockGetSessionState = jest.fn();
const mockSendDailyData = jest.fn();
const mockSendRecentFoods = jest.fn();
const mockOnReachabilityChange = jest.fn();
const mockOnSessionStateChange = jest.fn();
const mockOnWatchCommand = jest.fn();

jest.mock('@/services/watchConnectivity/watchConnectivityService', () => ({
  watchConnectivityService: {
    isAvailable: jest.fn(() => true),
    getSessionState: mockGetSessionState,
    sendDailyData: mockSendDailyData,
    sendRecentFoods: mockSendRecentFoods,
    onReachabilityChange: mockOnReachabilityChange,
    onSessionStateChange: mockOnSessionStateChange,
    onWatchCommand: mockOnWatchCommand,
  },
}));

import { useWatchConnectivity } from '@/hooks/useWatchConnectivity';
import { WatchDailyData, WatchSimpleFood, WatchCommand } from '@/types/watch';

describe('useWatchConnectivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockGetSessionState.mockResolvedValue({
      isSupported: true,
      isPaired: true,
      isWatchAppInstalled: true,
      isReachable: true,
    });

    mockOnReachabilityChange.mockReturnValue(jest.fn());
    mockOnSessionStateChange.mockReturnValue(jest.fn());
    mockOnWatchCommand.mockReturnValue(jest.fn());
  });

  describe('initialization', () => {
    it('fetches initial session state on mount', async () => {
      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(mockGetSessionState).toHaveBeenCalled();
      });

      expect(result.current.isAvailable).toBe(true);
    });

    it('updates state with session info', async () => {
      mockGetSessionState.mockResolvedValue({
        isSupported: true,
        isPaired: true,
        isWatchAppInstalled: true,
        isReachable: true,
      });

      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(result.current.isPaired).toBe(true);
        expect(result.current.isWatchAppInstalled).toBe(true);
        expect(result.current.isReachable).toBe(true);
      });
    });

    it('subscribes to reachability changes', async () => {
      renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(mockOnReachabilityChange).toHaveBeenCalled();
      });
    });

    it('subscribes to session state changes', async () => {
      renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(mockOnSessionStateChange).toHaveBeenCalled();
      });
    });

    it('subscribes to watch commands', async () => {
      renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(mockOnWatchCommand).toHaveBeenCalled();
      });
    });
  });

  describe('cleanup', () => {
    it('unsubscribes from all events on unmount', async () => {
      const unsubReachability = jest.fn();
      const unsubSessionState = jest.fn();
      const unsubCommands = jest.fn();

      mockOnReachabilityChange.mockReturnValue(unsubReachability);
      mockOnSessionStateChange.mockReturnValue(unsubSessionState);
      mockOnWatchCommand.mockReturnValue(unsubCommands);

      const { unmount } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(mockOnReachabilityChange).toHaveBeenCalled();
      });

      unmount();

      expect(unsubReachability).toHaveBeenCalled();
      expect(unsubSessionState).toHaveBeenCalled();
      expect(unsubCommands).toHaveBeenCalled();
    });
  });

  describe('sendDailyData', () => {
    it('sends data through service', async () => {
      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

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

      await act(async () => {
        await result.current.sendDailyData(mockData);
      });

      expect(mockSendDailyData).toHaveBeenCalledWith(mockData);
    });
  });

  describe('sendRecentFoods', () => {
    it('sends foods through service', async () => {
      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
      });

      const mockFoods: WatchSimpleFood[] = [
        { id: '1', name: 'Apple', calories: 95 },
        { id: '2', name: 'Banana', calories: 105 },
      ];

      await act(async () => {
        await result.current.sendRecentFoods(mockFoods);
      });

      expect(mockSendRecentFoods).toHaveBeenCalledWith(mockFoods);
    });
  });

  describe('refreshSessionState', () => {
    it('refreshes session state on demand', async () => {
      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(mockGetSessionState).toHaveBeenCalled();
      });

      mockGetSessionState.mockClear();
      mockGetSessionState.mockResolvedValue({
        isSupported: true,
        isPaired: false,
        isWatchAppInstalled: false,
        isReachable: false,
      });

      await act(async () => {
        await result.current.refreshSessionState();
      });

      expect(mockGetSessionState).toHaveBeenCalled();
      expect(result.current.isPaired).toBe(false);
    });
  });

  describe('reachability changes', () => {
    it('updates isReachable when reachability changes', async () => {
      let reachabilityCallback: ((event: { isReachable: boolean }) => void) | null = null;

      mockOnReachabilityChange.mockImplementation((callback) => {
        reachabilityCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(reachabilityCallback).not.toBeNull();
      });

      // Simulate reachability change
      act(() => {
        reachabilityCallback!({ isReachable: false });
      });

      expect(result.current.isReachable).toBe(false);

      act(() => {
        reachabilityCallback!({ isReachable: true });
      });

      expect(result.current.isReachable).toBe(true);
    });
  });

  describe('watch commands', () => {
    it('calls onWatchCommand callback when command received', async () => {
      let commandCallback: ((command: WatchCommand) => void) | null = null;
      const userCallback = jest.fn();

      mockOnWatchCommand.mockImplementation((callback) => {
        commandCallback = callback;
        return jest.fn();
      });

      renderHook(() => useWatchConnectivity(userCallback));

      await waitFor(() => {
        expect(commandCallback).not.toBeNull();
      });

      const mockCommand: WatchCommand = {
        type: 'addWater',
        glasses: 1,
      };

      act(() => {
        commandCallback!(mockCommand);
      });

      expect(userCallback).toHaveBeenCalledWith(mockCommand);
    });

    it('handles command callback changes', async () => {
      let commandCallback: ((command: WatchCommand) => void) | null = null;

      mockOnWatchCommand.mockImplementation((callback) => {
        commandCallback = callback;
        return jest.fn();
      });

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { rerender } = renderHook(
        ({ cb }) => useWatchConnectivity(cb),
        { initialProps: { cb: callback1 } }
      );

      await waitFor(() => {
        expect(commandCallback).not.toBeNull();
      });

      // Update callback
      rerender({ cb: callback2 });

      const mockCommand: WatchCommand = {
        type: 'quickAddCalories',
        calories: 200,
        meal: 'Lunch',
      };

      act(() => {
        commandCallback!(mockCommand);
      });

      // Should call the new callback
      expect(callback2).toHaveBeenCalledWith(mockCommand);
    });
  });

  describe('error handling', () => {
    it('handles session state errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGetSessionState.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useWatchConnectivity());

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // Should have default values
      expect(result.current.isPaired).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});

describe('useWatchConnectivity when unavailable', () => {
  // Import the service to spy on it
  const { watchConnectivityService } = require('@/services/watchConnectivity/watchConnectivityService');

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock service as unavailable
    (watchConnectivityService.isAvailable as jest.Mock).mockReturnValue(false);
    mockGetSessionState.mockResolvedValue({
      isSupported: false,
      isPaired: false,
      isWatchAppInstalled: false,
      isReachable: false,
    });
    mockOnReachabilityChange.mockReturnValue(jest.fn());
    mockOnSessionStateChange.mockReturnValue(jest.fn());
    mockOnWatchCommand.mockReturnValue(jest.fn());
  });

  it('returns unavailable state', async () => {
    const { result } = renderHook(() => useWatchConnectivity());

    expect(result.current.isAvailable).toBe(false);
  });

  it('sendDailyData is a no-op when unavailable', async () => {
    const { result } = renderHook(() => useWatchConnectivity());

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

    await act(async () => {
      await result.current.sendDailyData(mockData);
    });

    // When unavailable, sendDailyData should not call the service
    expect(mockSendDailyData).not.toHaveBeenCalled();
  });
});
