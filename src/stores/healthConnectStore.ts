/**
 * Health Connect Store
 * Zustand store for managing Health Connect state on Android
 */
// TODO [POST_LAUNCH_HEALTH]: Enable after HealthKit package installed and Health Connect verified

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  healthConnectService,
  HealthConnectStatus,
  MealSyncData,
  syncMealToHealthConnect,
  syncWaterToHealthConnect,
  syncWeightToHealthConnect,
  getWeightFromHealthConnect,
  getActiveCaloriesFromHealthConnect,
} from '../services/healthconnect';

interface HealthConnectState {
  // Status
  status: HealthConnectStatus;
  isLoading: boolean;
  lastSyncTime: string | null;
  syncError: string | null;

  // User preferences (persisted)
  syncNutritionEnabled: boolean;
  syncWaterEnabled: boolean;
  readWeightEnabled: boolean;
  adjustForActivityEnabled: boolean;

  // Activity data
  todayActivityCalories: number;

  // Actions
  checkAvailability: () => Promise<void>;
  initializeAndRequestPermissions: () => Promise<boolean>;
  refreshPermissions: () => Promise<void>;
  setSyncNutritionEnabled: (enabled: boolean) => Promise<void>;
  setSyncWaterEnabled: (enabled: boolean) => Promise<void>;
  setReadWeightEnabled: (enabled: boolean) => Promise<void>;
  setAdjustForActivityEnabled: (enabled: boolean) => Promise<void>;
  syncMeal: (mealData: MealSyncData) => Promise<boolean>;
  syncWater: (volumeMl: number) => Promise<boolean>;
  syncWeight: (weightKg: number) => Promise<boolean>;
  fetchActivityCalories: () => Promise<void>;
  fetchLatestWeight: () => Promise<{ kg: number; date: Date } | null>;
  openSettings: () => Promise<void>;
  openPlayStore: () => Promise<void>;
  resetSyncError: () => void;
  reset: () => void;
}

const initialState = {
  status: {
    isAvailable: false,
    needsInstall: false,
    isInitialized: false,
    permissionsGranted: [] as string[],
  },
  isLoading: false,
  lastSyncTime: null,
  syncError: null,
  syncNutritionEnabled: false,
  syncWaterEnabled: false,
  readWeightEnabled: false,
  adjustForActivityEnabled: false,
  todayActivityCalories: 0,
};

export const useHealthConnectStore = create<HealthConnectState>()(
  persist(
    (set, get) => ({
      ...initialState,

      checkAvailability: async () => {
        if (Platform.OS !== 'android') {
          return;
        }

        set({ isLoading: true });
        try {
          const status = await healthConnectService.checkAvailability();
          set({ status, isLoading: false });
        } catch (error) {
          if (__DEV__) console.error('Failed to check Health Connect availability:', error);
          set({ isLoading: false });
        }
      },

      initializeAndRequestPermissions: async () => {
        if (Platform.OS !== 'android') {
          return false;
        }

        set({ isLoading: true, syncError: null });

        try {
          const initialized = await healthConnectService.initialize();
          if (!initialized) {
            set({
              isLoading: false,
              syncError: 'Could not connect to Health Connect',
            });
            return false;
          }

          const { granted, permissions } =
            await healthConnectService.requestPermissions();

          // Update status with granted permissions
          const currentStatus = get().status;
          set({
            isLoading: false,
            status: {
              ...currentStatus,
              isInitialized: true,
              permissionsGranted: permissions,
            },
            // Auto-enable features based on granted permissions
            syncNutritionEnabled: permissions.includes('write:Nutrition'),
            syncWaterEnabled: permissions.includes('write:Hydration'),
            readWeightEnabled: permissions.includes('read:Weight'),
            adjustForActivityEnabled: permissions.includes(
              'read:ActiveCaloriesBurned'
            ),
          });

          // Fetch activity calories if permission granted
          if (permissions.includes('read:ActiveCaloriesBurned')) {
            get().fetchActivityCalories();
          }

          return granted;
        } catch (error) {
          if (__DEV__) console.error('Failed to initialize Health Connect:', error);
          set({
            isLoading: false,
            syncError: 'Something went wrong connecting to Health Connect',
          });
          return false;
        }
      },

      refreshPermissions: async () => {
        if (Platform.OS !== 'android') {
          return;
        }

        try {
          const permissions =
            await healthConnectService.getGrantedPermissions();
          const currentStatus = get().status;
          set({
            status: {
              ...currentStatus,
              permissionsGranted: permissions,
            },
          });
        } catch (error) {
          if (__DEV__) console.error('Failed to refresh permissions:', error);
        }
      },

      setSyncNutritionEnabled: async (enabled: boolean) => {
        if (enabled) {
          // Check if we have permission first
          const hasPermission = await healthConnectService.hasPermission(
            'write',
            'Nutrition'
          );
          if (!hasPermission) {
            // Request permissions
            await get().initializeAndRequestPermissions();
            return;
          }
        }
        set({ syncNutritionEnabled: enabled });
      },

      setSyncWaterEnabled: async (enabled: boolean) => {
        if (enabled) {
          const hasPermission = await healthConnectService.hasPermission(
            'write',
            'Hydration'
          );
          if (!hasPermission) {
            await get().initializeAndRequestPermissions();
            return;
          }
        }
        set({ syncWaterEnabled: enabled });
      },

      setReadWeightEnabled: async (enabled: boolean) => {
        if (enabled) {
          const hasPermission = await healthConnectService.hasPermission(
            'read',
            'Weight'
          );
          if (!hasPermission) {
            await get().initializeAndRequestPermissions();
            return;
          }
        }
        set({ readWeightEnabled: enabled });
      },

      setAdjustForActivityEnabled: async (enabled: boolean) => {
        if (enabled) {
          const hasPermission = await healthConnectService.hasPermission(
            'read',
            'ActiveCaloriesBurned'
          );
          if (!hasPermission) {
            await get().initializeAndRequestPermissions();
            return;
          }
          // Fetch activity calories when enabled
          get().fetchActivityCalories();
        } else {
          set({ todayActivityCalories: 0 });
        }
        set({ adjustForActivityEnabled: enabled });
      },

      syncMeal: async (mealData: MealSyncData) => {
        if (!get().syncNutritionEnabled) {
          return false;
        }

        set({ syncError: null });

        const result = await syncMealToHealthConnect(mealData);

        if (result.success) {
          set({ lastSyncTime: new Date().toISOString() });
        } else {
          set({ syncError: result.error || 'Couldn\'t sync meal' });
        }

        return result.success;
      },

      syncWater: async (volumeMl: number) => {
        if (!get().syncWaterEnabled) {
          return false;
        }

        set({ syncError: null });

        const result = await syncWaterToHealthConnect({
          date: new Date(),
          milliliters: volumeMl,
        });

        if (result.success) {
          set({ lastSyncTime: new Date().toISOString() });
        } else {
          set({ syncError: result.error || 'Couldn\'t sync water' });
        }

        return result.success;
      },

      syncWeight: async (weightKg: number) => {
        set({ syncError: null });

        const result = await syncWeightToHealthConnect(weightKg);

        if (result.success) {
          set({ lastSyncTime: new Date().toISOString() });
        } else {
          set({ syncError: result.error || 'Couldn\'t sync weight' });
        }

        return result.success;
      },

      fetchActivityCalories: async () => {
        if (!get().adjustForActivityEnabled) {
          return;
        }

        try {
          const calories = await getActiveCaloriesFromHealthConnect(new Date());
          set({ todayActivityCalories: calories });
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch activity calories:', error);
        }
      },

      fetchLatestWeight: async () => {
        if (!get().readWeightEnabled) {
          return null;
        }

        try {
          return await getWeightFromHealthConnect();
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch latest weight:', error);
          return null;
        }
      },

      openSettings: async () => {
        try {
          await healthConnectService.openSettings();
        } catch (error) {
          if (__DEV__) console.error('Failed to open Health Connect settings:', error);
        }
      },

      openPlayStore: async () => {
        try {
          await healthConnectService.openPlayStoreForInstall();
        } catch (error) {
          if (__DEV__) console.error('Failed to open Play Store:', error);
        }
      },

      resetSyncError: () => {
        set({ syncError: null });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'nutrition-health-connect-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        syncNutritionEnabled: state.syncNutritionEnabled,
        syncWaterEnabled: state.syncWaterEnabled,
        readWeightEnabled: state.readWeightEnabled,
        adjustForActivityEnabled: state.adjustForActivityEnabled,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
