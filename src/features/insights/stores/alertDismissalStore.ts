/**
 * Alert Dismissal Store
 * Zustand store for tracking dismissed/snoozed nutrient alerts
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlertDismissal } from '../types/insights.types';

interface AlertDismissalState {
  // Dismissals
  dismissals: AlertDismissal[];

  // Actions
  dismissAlert: (nutrientId: string, type: AlertDismissal['dismissType']) => void;
  clearDismissal: (nutrientId: string) => void;
  clearExpiredSnoozes: () => void;
  clearAllDismissals: () => void;

  // Computed
  isAlertDismissed: (nutrientId: string) => boolean;
  getActiveDismissals: () => AlertDismissal[];
  getDismissalForNutrient: (nutrientId: string) => AlertDismissal | undefined;
}

/**
 * Get date string for N days in the future
 */
function getDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/**
 * Check if a snooze has expired
 */
function isSnoozExpired(dismissal: AlertDismissal): boolean {
  if (dismissal.dismissType !== 'snoozed_7d' || !dismissal.snoozeUntil) {
    return false;
  }
  return new Date(dismissal.snoozeUntil) < new Date();
}

/**
 * Check if an acknowledged dismissal should re-trigger
 * (after 3 days, acknowledged alerts can re-trigger)
 */
function isAcknowledgmentExpired(dismissal: AlertDismissal): boolean {
  if (dismissal.dismissType !== 'acknowledged') {
    return false;
  }
  const dismissedAt = new Date(dismissal.dismissedAt);
  const now = new Date();
  const daysSinceDismissal = Math.floor(
    (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceDismissal >= 3;
}

export const useAlertDismissalStore = create<AlertDismissalState>()(
  persist(
    (set, get) => ({
      // Initial state
      dismissals: [],

      // Actions
      dismissAlert: (nutrientId, type) => {
        const now = new Date().toISOString();

        const newDismissal: AlertDismissal = {
          nutrientId,
          dismissedAt: now,
          dismissType: type,
          snoozeUntil: type === 'snoozed_7d' ? getDateInDays(7) : undefined,
        };

        set((state) => ({
          dismissals: [
            // Remove any existing dismissal for this nutrient
            ...state.dismissals.filter((d) => d.nutrientId !== nutrientId),
            newDismissal,
          ],
        }));
      },

      clearDismissal: (nutrientId) => {
        set((state) => ({
          dismissals: state.dismissals.filter((d) => d.nutrientId !== nutrientId),
        }));
      },

      clearExpiredSnoozes: () => {
        set((state) => ({
          dismissals: state.dismissals.filter((d) => {
            // Keep permanent dismissals
            if (d.dismissType === 'permanent') return true;

            // Remove expired snoozes
            if (d.dismissType === 'snoozed_7d' && isSnoozExpired(d)) return false;

            // Remove expired acknowledgments
            if (d.dismissType === 'acknowledged' && isAcknowledgmentExpired(d)) return false;

            return true;
          }),
        }));
      },

      clearAllDismissals: () => {
        set({ dismissals: [] });
      },

      // Check if an alert is currently dismissed
      isAlertDismissed: (nutrientId) => {
        const { dismissals } = get();
        const dismissal = dismissals.find((d) => d.nutrientId === nutrientId);

        if (!dismissal) return false;

        // Permanent dismissal - always dismissed
        if (dismissal.dismissType === 'permanent') return true;

        // Check if snooze expired
        if (dismissal.dismissType === 'snoozed_7d' && isSnoozExpired(dismissal)) {
          return false;
        }

        // Check if acknowledgment expired
        if (dismissal.dismissType === 'acknowledged' && isAcknowledgmentExpired(dismissal)) {
          return false;
        }

        return true;
      },

      // Get all active (non-expired) dismissals
      getActiveDismissals: () => {
        const { dismissals } = get();
        return dismissals.filter((d) => {
          if (d.dismissType === 'permanent') return true;
          if (d.dismissType === 'snoozed_7d' && isSnoozExpired(d)) return false;
          if (d.dismissType === 'acknowledged' && isAcknowledgmentExpired(d)) return false;
          return true;
        });
      },

      // Get dismissal for specific nutrient
      getDismissalForNutrient: (nutrientId) => {
        const { dismissals } = get();
        return dismissals.find((d) => d.nutrientId === nutrientId);
      },
    }),
    {
      name: 'nutritionrx-alert-dismissals',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
