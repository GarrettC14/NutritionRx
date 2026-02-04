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
        console.log(`[LLM:AlertStore] dismissAlert(${alertId}) — expires ${new Date(now + DISMISSAL_DURATION_MS).toISOString()}`);

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

        const dismissed = dismissal.expiresAt > now;
        console.log(`[LLM:AlertStore] isAlertDismissed(${alertId}) → ${dismissed}`);
        return dismissed;
      },

      getDismissedAlertIds: () => {
        const { dismissals } = get();
        const now = Date.now();

        const validDismissals = dismissals.filter((d) => d.expiresAt > now);
        const ids = new Set(validDismissals.map((d) => d.alertId));
        console.log(`[LLM:AlertStore] getDismissedAlertIds() → ${ids.size} active dismissals: [${[...ids].join(', ')}]`);
        return ids;
      },

      clearExpiredDismissals: () => {
        const now = Date.now();
        const { dismissals } = get();
        const expiredCount = dismissals.filter((d) => d.expiresAt <= now).length;
        if (expiredCount > 0) {
          console.log(`[LLM:AlertStore] clearExpiredDismissals() — removing ${expiredCount} expired`);
        }
        set((state) => ({
          dismissals: state.dismissals.filter((d) => d.expiresAt > now),
        }));
      },

      clearAllDismissals: () => {
        console.log('[LLM:AlertStore] clearAllDismissals()');
        set({ dismissals: [] });
      },
    }),
    {
      name: 'alert-dismissals-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
