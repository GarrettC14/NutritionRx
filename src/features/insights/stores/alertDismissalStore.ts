/**
 * Alert Dismissal Store
 * Tracks dismissed deficiency alerts with expiration
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlertDismissal } from '../types/insights.types';

interface AlertDismissalState {
  dismissals: AlertDismissal[];

  // Actions
  dismissAlert: (nutrientId: string, severity: string) => void;
  isAlertDismissed: (nutrientId: string, severity: string) => boolean;
  getDismissedAlertIds: () => Set<string>;
  clearExpiredDismissals: () => void;
  clearAllDismissals: () => void;
}

const DISMISSAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useAlertDismissalStore = create<AlertDismissalState>()(
  persist(
    (set, get) => ({
      dismissals: [],

      dismissAlert: (nutrientId, severity) => {
        const now = Date.now();
        const alertId = `${nutrientId}_${severity}`;

        set((state) => {
          // Remove any existing dismissal for this alert
          const filtered = state.dismissals.filter((d) => d.alertId !== alertId);

          return {
            dismissals: [
              ...filtered,
              {
                alertId,
                nutrientId,
                dismissedAt: now,
                expiresAt: now + DISMISSAL_DURATION_MS,
              },
            ],
          };
        });
      },

      isAlertDismissed: (nutrientId, severity) => {
        const alertId = `${nutrientId}_${severity}`;
        const { dismissals } = get();
        const now = Date.now();

        const dismissal = dismissals.find((d) => d.alertId === alertId);
        if (!dismissal) return false;

        return dismissal.expiresAt > now;
      },

      getDismissedAlertIds: () => {
        const { dismissals } = get();
        const now = Date.now();

        const validDismissals = dismissals.filter((d) => d.expiresAt > now);
        return new Set(validDismissals.map((d) => d.alertId));
      },

      clearExpiredDismissals: () => {
        const now = Date.now();
        set((state) => ({
          dismissals: state.dismissals.filter((d) => d.expiresAt > now),
        }));
      },

      clearAllDismissals: () => set({ dismissals: [] }),
    }),
    {
      name: 'alert-dismissals-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
