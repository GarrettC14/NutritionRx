/**
 * Health Connect Store Tests
 *
 * Tests for the Health Connect Zustand store.
 */

import { Platform } from 'react-native';
import { healthConnectService } from '@/services/healthconnect';

// Mock the health connect service
jest.mock('@/services/healthconnect', () => ({
  healthConnectService: {
    checkAvailability: jest.fn(),
    initialize: jest.fn(),
    requestPermissions: jest.fn(),
    getGrantedPermissions: jest.fn(),
    hasPermission: jest.fn(),
    openSettings: jest.fn(),
    openPlayStoreForInstall: jest.fn(),
    syncMeal: jest.fn(),
    syncWater: jest.fn(),
    syncWeight: jest.fn(),
    readActiveCalories: jest.fn(),
    readWeightData: jest.fn(),
  },
  syncMealToHealthConnect: jest.fn(),
  syncWaterToHealthConnect: jest.fn(),
  syncWeightToHealthConnect: jest.fn(),
  getWeightFromHealthConnect: jest.fn(),
  getActiveCaloriesFromHealthConnect: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockHealthConnectService = healthConnectService as jest.Mocked<
  typeof healthConnectService
>;

// Import store after mocks
import { useHealthConnectStore } from '../healthConnectStore';

beforeEach(() => {
  jest.clearAllMocks();
  // Reset store state
  useHealthConnectStore.getState().reset();
});

describe('useHealthConnectStore', () => {
  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useHealthConnectStore.getState();

      expect(state.status.isAvailable).toBe(false);
      expect(state.status.needsInstall).toBe(false);
      expect(state.status.isInitialized).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.syncNutritionEnabled).toBe(false);
      expect(state.syncWaterEnabled).toBe(false);
      expect(state.readWeightEnabled).toBe(false);
      expect(state.adjustForActivityEnabled).toBe(false);
      expect(state.todayActivityCalories).toBe(0);
    });
  });

  describe('checkAvailability', () => {
    it('should update status when available', async () => {
      Platform.OS = 'android';
      mockHealthConnectService.checkAvailability.mockResolvedValue({
        isAvailable: true,
        needsInstall: false,
        isInitialized: false,
        permissionsGranted: [],
      });

      await useHealthConnectStore.getState().checkAvailability();

      const state = useHealthConnectStore.getState();
      expect(state.status.isAvailable).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should update status when needs install', async () => {
      Platform.OS = 'android';
      mockHealthConnectService.checkAvailability.mockResolvedValue({
        isAvailable: false,
        needsInstall: true,
        isInitialized: false,
        permissionsGranted: [],
      });

      await useHealthConnectStore.getState().checkAvailability();

      const state = useHealthConnectStore.getState();
      expect(state.status.isAvailable).toBe(false);
      expect(state.status.needsInstall).toBe(true);
    });

    it('should not call service on iOS', async () => {
      Platform.OS = 'ios';

      await useHealthConnectStore.getState().checkAvailability();

      expect(mockHealthConnectService.checkAvailability).not.toHaveBeenCalled();
    });
  });

  describe('initializeAndRequestPermissions', () => {
    it('should initialize and set permissions when granted', async () => {
      Platform.OS = 'android';
      mockHealthConnectService.initialize.mockResolvedValue(true);
      mockHealthConnectService.requestPermissions.mockResolvedValue({
        granted: true,
        permissions: [
          'write:Nutrition',
          'write:Hydration',
          'read:Weight',
          'read:ActiveCaloriesBurned',
        ],
      });

      const result = await useHealthConnectStore
        .getState()
        .initializeAndRequestPermissions();

      expect(result).toBe(true);
      const state = useHealthConnectStore.getState();
      expect(state.status.isInitialized).toBe(true);
      expect(state.syncNutritionEnabled).toBe(true);
      expect(state.syncWaterEnabled).toBe(true);
      expect(state.readWeightEnabled).toBe(true);
      expect(state.adjustForActivityEnabled).toBe(true);
    });

    it('should handle initialization failure', async () => {
      Platform.OS = 'android';
      mockHealthConnectService.initialize.mockResolvedValue(false);

      const result = await useHealthConnectStore
        .getState()
        .initializeAndRequestPermissions();

      expect(result).toBe(false);
      const state = useHealthConnectStore.getState();
      expect(state.syncError).toBe('Could not connect to Health Connect');
    });

    it('should return false on iOS', async () => {
      Platform.OS = 'ios';

      const result = await useHealthConnectStore
        .getState()
        .initializeAndRequestPermissions();

      expect(result).toBe(false);
    });
  });

  describe('setSyncNutritionEnabled', () => {
    it('should enable sync when permission exists', async () => {
      Platform.OS = 'android';
      mockHealthConnectService.hasPermission.mockResolvedValue(true);

      await useHealthConnectStore.getState().setSyncNutritionEnabled(true);

      const state = useHealthConnectStore.getState();
      expect(state.syncNutritionEnabled).toBe(true);
    });

    it('should disable sync', async () => {
      Platform.OS = 'android';
      mockHealthConnectService.hasPermission.mockResolvedValue(true);

      // First enable it
      await useHealthConnectStore.getState().setSyncNutritionEnabled(true);

      // Then disable it
      await useHealthConnectStore.getState().setSyncNutritionEnabled(false);

      const state = useHealthConnectStore.getState();
      expect(state.syncNutritionEnabled).toBe(false);
    });
  });

  describe('syncMeal', () => {
    it('should not sync when nutrition sync disabled', async () => {
      Platform.OS = 'android';
      const syncMealMock =
        require('@/services/healthconnect').syncMealToHealthConnect;

      const result = await useHealthConnectStore.getState().syncMeal({
        id: 'meal-1',
        mealType: 'Lunch',
        timestamp: new Date(),
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
      });

      expect(result).toBe(false);
      expect(syncMealMock).not.toHaveBeenCalled();
    });

    it('should sync when enabled', async () => {
      Platform.OS = 'android';
      const syncMealMock =
        require('@/services/healthconnect').syncMealToHealthConnect;
      syncMealMock.mockResolvedValue({ success: true });
      mockHealthConnectService.hasPermission.mockResolvedValue(true);

      // Enable sync
      await useHealthConnectStore.getState().setSyncNutritionEnabled(true);

      await useHealthConnectStore.getState().syncMeal({
        id: 'meal-1',
        mealType: 'Lunch',
        timestamp: new Date(),
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
      });

      expect(syncMealMock).toHaveBeenCalled();
    });
  });

  describe('syncWater', () => {
    it('should not sync when water sync disabled', async () => {
      Platform.OS = 'android';

      const result = await useHealthConnectStore.getState().syncWater(250);

      expect(result).toBe(false);
    });
  });

  describe('fetchActivityCalories', () => {
    it('should not fetch when activity adjustment disabled', async () => {
      Platform.OS = 'android';
      const getActiveCaloriesMock =
        require('@/services/healthconnect').getActiveCaloriesFromHealthConnect;

      await useHealthConnectStore.getState().fetchActivityCalories();

      expect(getActiveCaloriesMock).not.toHaveBeenCalled();
    });
  });

  describe('openSettings', () => {
    it('should call service openSettings', async () => {
      await useHealthConnectStore.getState().openSettings();

      expect(mockHealthConnectService.openSettings).toHaveBeenCalled();
    });
  });

  describe('openPlayStore', () => {
    it('should call service openPlayStoreForInstall', async () => {
      await useHealthConnectStore.getState().openPlayStore();

      expect(
        mockHealthConnectService.openPlayStoreForInstall
      ).toHaveBeenCalled();
    });
  });

  describe('resetSyncError', () => {
    it('should clear sync error', async () => {
      Platform.OS = 'android';
      mockHealthConnectService.initialize.mockResolvedValue(false);

      // Create an error
      await useHealthConnectStore.getState().initializeAndRequestPermissions();
      expect(useHealthConnectStore.getState().syncError).toBeTruthy();

      // Reset the error
      useHealthConnectStore.getState().resetSyncError();

      expect(useHealthConnectStore.getState().syncError).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', async () => {
      Platform.OS = 'android';
      mockHealthConnectService.hasPermission.mockResolvedValue(true);

      // Modify some state
      await useHealthConnectStore.getState().setSyncNutritionEnabled(true);
      expect(useHealthConnectStore.getState().syncNutritionEnabled).toBe(true);

      // Reset
      useHealthConnectStore.getState().reset();

      const state = useHealthConnectStore.getState();
      expect(state.syncNutritionEnabled).toBe(false);
      expect(state.status.isAvailable).toBe(false);
      expect(state.lastSyncTime).toBeNull();
    });
  });
});
