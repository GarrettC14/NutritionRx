/**
 * Network Store Tests
 * Tests for connectivity state management and service health tracking
 */

import { useNetworkStore } from '@/stores/networkStore';
import { SERVICE_HEALTH_THRESHOLDS } from '@/types/network';

describe('networkStore', () => {
  beforeEach(() => {
    useNetworkStore.setState({
      connectivity: 'unknown',
      justReconnected: false,
      serviceHealth: {
        ai: { service: 'ai', health: 'healthy', lastChecked: Date.now(), consecutiveFailures: 0 },
        'food-data': { service: 'food-data', health: 'healthy', lastChecked: Date.now(), consecutiveFailures: 0 },
        sync: { service: 'sync', health: 'healthy', lastChecked: Date.now(), consecutiveFailures: 0 },
        premium: { service: 'premium', health: 'healthy', lastChecked: Date.now(), consecutiveFailures: 0 },
      },
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================
  // Connectivity State
  // ============================================================

  describe('connectivity', () => {
    it('starts with unknown state', () => {
      expect(useNetworkStore.getState().connectivity).toBe('unknown');
    });

    it('updates to online', () => {
      useNetworkStore.getState().setConnectivity('online');
      expect(useNetworkStore.getState().connectivity).toBe('online');
    });

    it('updates to offline', () => {
      useNetworkStore.getState().setConnectivity('offline');
      expect(useNetworkStore.getState().connectivity).toBe('offline');
    });
  });

  // ============================================================
  // Reconnection Detection
  // ============================================================

  describe('reconnection', () => {
    it('sets justReconnected when transitioning from offline to online', () => {
      useNetworkStore.getState().setConnectivity('offline');
      useNetworkStore.getState().setConnectivity('online');
      expect(useNetworkStore.getState().justReconnected).toBe(true);
    });

    it('does not set justReconnected for unknown → online', () => {
      useNetworkStore.getState().setConnectivity('online');
      expect(useNetworkStore.getState().justReconnected).toBe(false);
    });

    it('does not set justReconnected for online → online', () => {
      useNetworkStore.getState().setConnectivity('online');
      useNetworkStore.getState().setConnectivity('online');
      expect(useNetworkStore.getState().justReconnected).toBe(false);
    });

    it('auto-clears justReconnected after timeout', () => {
      useNetworkStore.getState().setConnectivity('offline');
      useNetworkStore.getState().setConnectivity('online');
      expect(useNetworkStore.getState().justReconnected).toBe(true);

      jest.advanceTimersByTime(5000);
      expect(useNetworkStore.getState().justReconnected).toBe(false);
    });

    it('clearReconnected manually clears the flag', () => {
      useNetworkStore.getState().setConnectivity('offline');
      useNetworkStore.getState().setConnectivity('online');
      expect(useNetworkStore.getState().justReconnected).toBe(true);

      useNetworkStore.getState().clearReconnected();
      expect(useNetworkStore.getState().justReconnected).toBe(false);
    });
  });

  // ============================================================
  // Service Health Tracking
  // ============================================================

  describe('service health', () => {
    it('starts all services as healthy', () => {
      const { serviceHealth } = useNetworkStore.getState();
      expect(serviceHealth.ai.health).toBe('healthy');
      expect(serviceHealth['food-data'].health).toBe('healthy');
      expect(serviceHealth.sync.health).toBe('healthy');
      expect(serviceHealth.premium.health).toBe('healthy');
    });

    it('recordSuccess resets failures and sets healthy', () => {
      // First create some failures
      for (let i = 0; i < 3; i++) {
        useNetworkStore.getState().recordFailure('ai');
      }
      expect(useNetworkStore.getState().serviceHealth.ai.health).toBe('degraded');

      useNetworkStore.getState().recordSuccess('ai');
      const health = useNetworkStore.getState().serviceHealth.ai;
      expect(health.health).toBe('healthy');
      expect(health.consecutiveFailures).toBe(0);
    });

    it('transitions to degraded after threshold failures', () => {
      for (let i = 0; i < SERVICE_HEALTH_THRESHOLDS.DEGRADED_AFTER; i++) {
        useNetworkStore.getState().recordFailure('ai');
      }
      expect(useNetworkStore.getState().serviceHealth.ai.health).toBe('degraded');
      expect(useNetworkStore.getState().serviceHealth.ai.consecutiveFailures).toBe(
        SERVICE_HEALTH_THRESHOLDS.DEGRADED_AFTER
      );
    });

    it('transitions to down after threshold failures', () => {
      for (let i = 0; i < SERVICE_HEALTH_THRESHOLDS.DOWN_AFTER; i++) {
        useNetworkStore.getState().recordFailure('ai');
      }
      expect(useNetworkStore.getState().serviceHealth.ai.health).toBe('down');
    });

    it('does not affect other services', () => {
      for (let i = 0; i < SERVICE_HEALTH_THRESHOLDS.DOWN_AFTER; i++) {
        useNetworkStore.getState().recordFailure('ai');
      }
      expect(useNetworkStore.getState().serviceHealth.ai.health).toBe('down');
      expect(useNetworkStore.getState().serviceHealth['food-data'].health).toBe('healthy');
      expect(useNetworkStore.getState().serviceHealth.sync.health).toBe('healthy');
    });

    it('single failure keeps healthy', () => {
      useNetworkStore.getState().recordFailure('ai');
      expect(useNetworkStore.getState().serviceHealth.ai.health).toBe('healthy');
      expect(useNetworkStore.getState().serviceHealth.ai.consecutiveFailures).toBe(1);
    });

    it('updates lastChecked timestamp on both success and failure', () => {
      const before = Date.now();
      useNetworkStore.getState().recordFailure('ai');
      const afterFailure = useNetworkStore.getState().serviceHealth.ai.lastChecked;
      expect(afterFailure).toBeGreaterThanOrEqual(before);

      useNetworkStore.getState().recordSuccess('ai');
      const afterSuccess = useNetworkStore.getState().serviceHealth.ai.lastChecked;
      expect(afterSuccess).toBeGreaterThanOrEqual(afterFailure);
    });
  });
});
