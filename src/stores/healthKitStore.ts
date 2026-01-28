/**
 * HealthKit Store
 * Manages HealthKit connection state and sync settings
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthKitService } from '@/services/healthkit/healthKitService';

interface HealthKitState {
  // Connection state
  isConnected: boolean;
  isAvailable: boolean | null;
  hasPromptedPermission: boolean;

  // Sync settings
  syncNutrition: boolean;
  syncWater: boolean;
  readWeight: boolean;
  writeWeight: boolean;
  useActivityCalories: boolean;
  activityCaloriesMultiplier: number;

  // Sync tracking (tracks which dates have been synced)
  lastNutritionSyncDates: Record<string, boolean>;
  lastWaterSyncDates: Record<string, number>; // date -> total ml synced

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  checkAvailability: () => Promise<boolean>;
  requestAuthorization: () => Promise<{ success: boolean; error?: string }>;
  checkConnectionStatus: () => Promise<void>;

  setIsConnected: (connected: boolean) => void;
  setHasPromptedPermission: (prompted: boolean) => void;
  setSyncNutrition: (enabled: boolean) => void;
  setSyncWater: (enabled: boolean) => void;
  setReadWeight: (enabled: boolean) => void;
  setWriteWeight: (enabled: boolean) => void;
  setUseActivityCalories: (enabled: boolean) => void;
  setActivityCaloriesMultiplier: (multiplier: number) => void;

  // Sync tracking
  markDateSynced: (dateKey: string) => void;
  isDateSynced: (dateKey: string) => boolean;
  markWaterSynced: (dateKey: string, milliliters: number) => void;
  getWaterSyncedForDate: (dateKey: string) => number;
  clearSyncHistory: () => void;

  // Reset
  disconnect: () => void;
}

/**
 * Get a date key in YYYY-MM-DD format for tracking synced dates
 */
export function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Default activity calories multiplier (50% of exercise calories)
 * Most nutrition experts recommend not eating back all exercise calories
 */
const DEFAULT_ACTIVITY_MULTIPLIER = 0.5;

export const useHealthKitStore = create<HealthKitState>()(
  persist(
    (set, get) => ({
      // Initial state
      isConnected: false,
      isAvailable: null,
      hasPromptedPermission: false,

      syncNutrition: true,
      syncWater: true,
      readWeight: true,
      writeWeight: false, // Default off - let Health be source of truth
      useActivityCalories: false, // Default off - advanced feature
      activityCaloriesMultiplier: DEFAULT_ACTIVITY_MULTIPLIER,

      lastNutritionSyncDates: {},
      lastWaterSyncDates: {},

      isLoading: false,
      error: null,

      // Check if HealthKit is available on this device
      checkAvailability: async () => {
        try {
          const available = await healthKitService.isAvailable();
          set({ isAvailable: available });
          return available;
        } catch (error) {
          console.error('Error checking HealthKit availability:', error);
          set({ isAvailable: false });
          return false;
        }
      },

      // Request authorization for HealthKit
      requestAuthorization: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await healthKitService.requestAuthorization();

          if (result.success) {
            set({
              isConnected: true,
              hasPromptedPermission: true,
              isLoading: false,
            });
          } else {
            set({
              hasPromptedPermission: true,
              isLoading: false,
              error: result.error,
            });
          }

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Authorization failed';
          set({
            hasPromptedPermission: true,
            isLoading: false,
            error: errorMessage,
          });
          return { success: false, error: errorMessage };
        }
      },

      // Check if we have authorization (useful on app launch)
      checkConnectionStatus: async () => {
        try {
          const available = await healthKitService.isAvailable();
          if (!available) {
            set({ isAvailable: false, isConnected: false });
            return;
          }

          set({ isAvailable: true });

          const canWrite = await healthKitService.canWriteNutrition();
          set({ isConnected: canWrite });
        } catch (error) {
          console.error('Error checking connection status:', error);
          set({ isConnected: false });
        }
      },

      setIsConnected: (connected) => set({ isConnected: connected }),

      setHasPromptedPermission: (prompted) => set({ hasPromptedPermission: prompted }),

      setSyncNutrition: (enabled) => set({ syncNutrition: enabled }),

      setSyncWater: (enabled) => set({ syncWater: enabled }),

      setReadWeight: (enabled) => set({ readWeight: enabled }),

      setWriteWeight: (enabled) => set({ writeWeight: enabled }),

      setUseActivityCalories: (enabled) => set({ useActivityCalories: enabled }),

      setActivityCaloriesMultiplier: (multiplier) =>
        set({ activityCaloriesMultiplier: Math.max(0, Math.min(1, multiplier)) }),

      // Mark a date as having been synced for nutrition
      markDateSynced: (dateKey) =>
        set((state) => ({
          lastNutritionSyncDates: { ...state.lastNutritionSyncDates, [dateKey]: true },
        })),

      // Check if a date has been synced
      isDateSynced: (dateKey) => !!get().lastNutritionSyncDates[dateKey],

      // Track water synced for a date (accumulates)
      markWaterSynced: (dateKey, milliliters) =>
        set((state) => ({
          lastWaterSyncDates: {
            ...state.lastWaterSyncDates,
            [dateKey]: (state.lastWaterSyncDates[dateKey] ?? 0) + milliliters,
          },
        })),

      // Get total water synced for a date
      getWaterSyncedForDate: (dateKey) => get().lastWaterSyncDates[dateKey] ?? 0,

      // Clear sync history (useful for debugging or reset)
      clearSyncHistory: () =>
        set({
          lastNutritionSyncDates: {},
          lastWaterSyncDates: {},
        }),

      // Disconnect from HealthKit (resets all connection state)
      disconnect: () =>
        set({
          isConnected: false,
          hasPromptedPermission: false,
          lastNutritionSyncDates: {},
          lastWaterSyncDates: {},
        }),
    }),
    {
      name: 'nutritionrx-healthkit',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist settings and sync tracking, not transient state
      partialize: (state) => ({
        hasPromptedPermission: state.hasPromptedPermission,
        syncNutrition: state.syncNutrition,
        syncWater: state.syncWater,
        readWeight: state.readWeight,
        writeWeight: state.writeWeight,
        useActivityCalories: state.useActivityCalories,
        activityCaloriesMultiplier: state.activityCaloriesMultiplier,
        lastNutritionSyncDates: state.lastNutritionSyncDates,
        lastWaterSyncDates: state.lastWaterSyncDates,
      }),
    }
  )
);
