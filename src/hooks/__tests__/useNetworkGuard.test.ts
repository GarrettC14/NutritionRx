/**
 * useNetworkGuard Hook Tests
 *
 * Tests for the hook that provides action-level network checks,
 * wrapping async actions with connectivity and service health guards.
 */

import { renderHook, act } from '@testing-library/react-native';
import type { ConnectivityState, ServiceHealth, ServiceHealthInfo, ServiceId } from '@/types/network';

// ---- Mock state ----

let mockConnectivity: ConnectivityState = 'online';

const makeServiceHealth = (
  service: ServiceId,
  health: ServiceHealth = 'healthy'
): ServiceHealthInfo => ({
  service,
  health,
  lastChecked: Date.now(),
  consecutiveFailures: 0,
});

let mockServiceHealth: Record<ServiceId, ServiceHealthInfo> = {
  ai: makeServiceHealth('ai'),
  'food-data': makeServiceHealth('food-data'),
  sync: makeServiceHealth('sync'),
  premium: makeServiceHealth('premium'),
};

jest.mock('@/stores/networkStore', () => ({
  useNetworkStore: jest.fn((selector: (s: any) => any) =>
    selector({
      connectivity: mockConnectivity,
      serviceHealth: mockServiceHealth,
    })
  ),
}));

// Import after mocks are defined
import { useNetworkGuard } from '@/hooks/useNetworkGuard';

describe('useNetworkGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectivity = 'online';
    mockServiceHealth = {
      ai: makeServiceHealth('ai'),
      'food-data': makeServiceHealth('food-data'),
      sync: makeServiceHealth('sync'),
      premium: makeServiceHealth('premium'),
    };
  });

  // ============================================================
  // isOnline
  // ============================================================

  describe('isOnline', () => {
    it('returns true when connectivity is online', () => {
      mockConnectivity = 'online';

      const { result } = renderHook(() => useNetworkGuard());

      expect(result.current.isOnline).toBe(true);
    });

    it('returns false when connectivity is offline', () => {
      mockConnectivity = 'offline';

      const { result } = renderHook(() => useNetworkGuard());

      expect(result.current.isOnline).toBe(false);
    });

    it('returns false when connectivity is unknown', () => {
      mockConnectivity = 'unknown';

      const { result } = renderHook(() => useNetworkGuard());

      expect(result.current.isOnline).toBe(false);
    });
  });

  // ============================================================
  // isServiceHealthy
  // ============================================================

  describe('isServiceHealthy', () => {
    it('returns true when no service option is provided', () => {
      const { result } = renderHook(() => useNetworkGuard());

      expect(result.current.isServiceHealthy).toBe(true);
    });

    it('returns true when no service option is provided (even with undefined)', () => {
      const { result } = renderHook(() => useNetworkGuard(undefined));

      expect(result.current.isServiceHealthy).toBe(true);
    });

    it('returns true when service health is healthy', () => {
      mockServiceHealth.ai = makeServiceHealth('ai', 'healthy');

      const { result } = renderHook(() => useNetworkGuard({ service: 'ai' }));

      expect(result.current.isServiceHealthy).toBe(true);
    });

    it('returns true when service health is degraded (not down)', () => {
      mockServiceHealth.ai = makeServiceHealth('ai', 'degraded');

      const { result } = renderHook(() => useNetworkGuard({ service: 'ai' }));

      expect(result.current.isServiceHealthy).toBe(true);
    });

    it('returns false when service health is down', () => {
      mockServiceHealth.ai = makeServiceHealth('ai', 'down');

      const { result } = renderHook(() => useNetworkGuard({ service: 'ai' }));

      expect(result.current.isServiceHealthy).toBe(false);
    });

    it('checks the correct service by id', () => {
      // ai is healthy, but food-data is down
      mockServiceHealth.ai = makeServiceHealth('ai', 'healthy');
      mockServiceHealth['food-data'] = makeServiceHealth('food-data', 'down');

      const { result: aiResult } = renderHook(() => useNetworkGuard({ service: 'ai' }));
      const { result: foodResult } = renderHook(() => useNetworkGuard({ service: 'food-data' }));

      expect(aiResult.current.isServiceHealthy).toBe(true);
      expect(foodResult.current.isServiceHealthy).toBe(false);
    });
  });

  // ============================================================
  // guardedAction
  // ============================================================

  describe('guardedAction', () => {
    it('executes action and returns result when online and service healthy', async () => {
      mockConnectivity = 'online';

      const { result } = renderHook(() => useNetworkGuard({ service: 'ai' }));

      const action = jest.fn().mockResolvedValue('success');
      let actionResult: string | null = null;

      await act(async () => {
        actionResult = await result.current.guardedAction(action);
      });

      expect(action).toHaveBeenCalledTimes(1);
      expect(actionResult).toBe('success');
    });

    it('executes action without service option when online', async () => {
      mockConnectivity = 'online';

      const { result } = renderHook(() => useNetworkGuard());

      const action = jest.fn().mockResolvedValue(42);
      let actionResult: number | null = null;

      await act(async () => {
        actionResult = await result.current.guardedAction(action);
      });

      expect(action).toHaveBeenCalledTimes(1);
      expect(actionResult).toBe(42);
    });

    it('calls onOffline and returns null when offline', async () => {
      mockConnectivity = 'offline';

      const { result } = renderHook(() => useNetworkGuard());

      const action = jest.fn().mockResolvedValue('success');
      const onOffline = jest.fn();
      let actionResult: string | null = 'initial';

      await act(async () => {
        actionResult = await result.current.guardedAction(action, onOffline);
      });

      expect(action).not.toHaveBeenCalled();
      expect(onOffline).toHaveBeenCalledTimes(1);
      expect(actionResult).toBeNull();
    });

    it('calls onOffline and returns null when service is down', async () => {
      mockConnectivity = 'online';
      mockServiceHealth.ai = makeServiceHealth('ai', 'down');

      const { result } = renderHook(() => useNetworkGuard({ service: 'ai' }));

      const action = jest.fn().mockResolvedValue('success');
      const onOffline = jest.fn();
      let actionResult: string | null = 'initial';

      await act(async () => {
        actionResult = await result.current.guardedAction(action, onOffline);
      });

      expect(action).not.toHaveBeenCalled();
      expect(onOffline).toHaveBeenCalledTimes(1);
      expect(actionResult).toBeNull();
    });

    it('calls onOffline when online but service is down (both conditions)', async () => {
      mockConnectivity = 'online';
      mockServiceHealth.sync = makeServiceHealth('sync', 'down');

      const { result } = renderHook(() => useNetworkGuard({ service: 'sync' }));

      const action = jest.fn().mockResolvedValue('data');
      const onOffline = jest.fn();
      let actionResult: string | null = 'initial';

      await act(async () => {
        actionResult = await result.current.guardedAction(action, onOffline);
      });

      expect(action).not.toHaveBeenCalled();
      expect(onOffline).toHaveBeenCalledTimes(1);
      expect(actionResult).toBeNull();
    });

    it('does not crash when offline and no onOffline callback provided', async () => {
      mockConnectivity = 'offline';

      const { result } = renderHook(() => useNetworkGuard());

      const action = jest.fn().mockResolvedValue('success');
      let actionResult: string | null = 'initial';

      await act(async () => {
        actionResult = await result.current.guardedAction(action);
      });

      expect(action).not.toHaveBeenCalled();
      expect(actionResult).toBeNull();
    });

    it('does not crash when service is down and no onOffline callback provided', async () => {
      mockConnectivity = 'online';
      mockServiceHealth.premium = makeServiceHealth('premium', 'down');

      const { result } = renderHook(() => useNetworkGuard({ service: 'premium' }));

      const action = jest.fn().mockResolvedValue('data');
      let actionResult: string | null = 'initial';

      await act(async () => {
        actionResult = await result.current.guardedAction(action);
      });

      expect(action).not.toHaveBeenCalled();
      expect(actionResult).toBeNull();
    });

    it('propagates action errors (not caught by guard)', async () => {
      mockConnectivity = 'online';

      const { result } = renderHook(() => useNetworkGuard());

      const error = new Error('API failure');
      const action = jest.fn().mockRejectedValue(error);

      await expect(
        act(async () => {
          await result.current.guardedAction(action);
        })
      ).rejects.toThrow('API failure');

      expect(action).toHaveBeenCalledTimes(1);
    });

    it('returns typed result from action', async () => {
      mockConnectivity = 'online';

      const { result } = renderHook(() => useNetworkGuard());

      const action = jest.fn().mockResolvedValue({ id: 1, name: 'test' });
      let actionResult: { id: number; name: string } | null = null;

      await act(async () => {
        actionResult = await result.current.guardedAction(action);
      });

      expect(actionResult).toEqual({ id: 1, name: 'test' });
    });
  });
});
