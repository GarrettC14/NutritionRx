import { create } from 'zustand';
import {
  ConnectivityState,
  NetworkState,
  ServiceId,
  ServiceHealth,
  ServiceHealthInfo,
  SERVICE_HEALTH_THRESHOLDS,
} from '@/types/network';

const defaultServiceHealth = (service: ServiceId): ServiceHealthInfo => ({
  service,
  health: 'healthy',
  lastChecked: Date.now(),
  consecutiveFailures: 0,
});

interface NetworkStore extends NetworkState {
  /** Update device connectivity state */
  setConnectivity: (state: ConnectivityState) => void;

  /** Record a service request success */
  recordSuccess: (service: ServiceId) => void;

  /** Record a service request failure */
  recordFailure: (service: ServiceId) => void;

  /** Clear the justReconnected flag */
  clearReconnected: () => void;
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  connectivity: 'unknown',
  justReconnected: false,
  serviceHealth: {
    ai: defaultServiceHealth('ai'),
    'food-data': defaultServiceHealth('food-data'),
    sync: defaultServiceHealth('sync'),
    premium: defaultServiceHealth('premium'),
  },

  setConnectivity: (connectivity) => {
    const prev = get().connectivity;
    const justReconnected = prev === 'offline' && connectivity === 'online';

    set({ connectivity, justReconnected });

    // Auto-clear reconnected flag after 5 seconds
    if (justReconnected) {
      setTimeout(() => {
        if (get().justReconnected) {
          set({ justReconnected: false });
        }
      }, 5000);
    }
  },

  recordSuccess: (service) => {
    set((state) => ({
      serviceHealth: {
        ...state.serviceHealth,
        [service]: {
          service,
          health: 'healthy' as ServiceHealth,
          lastChecked: Date.now(),
          consecutiveFailures: 0,
        },
      },
    }));
  },

  recordFailure: (service) => {
    set((state) => {
      const current = state.serviceHealth[service];
      const failures = current.consecutiveFailures + 1;

      let health: ServiceHealth = 'healthy';
      if (failures >= SERVICE_HEALTH_THRESHOLDS.DOWN_AFTER) {
        health = 'down';
      } else if (failures >= SERVICE_HEALTH_THRESHOLDS.DEGRADED_AFTER) {
        health = 'degraded';
      }

      return {
        serviceHealth: {
          ...state.serviceHealth,
          [service]: {
            service,
            health,
            lastChecked: Date.now(),
            consecutiveFailures: failures,
          },
        },
      };
    });
  },

  clearReconnected: () => set({ justReconnected: false }),
}));
