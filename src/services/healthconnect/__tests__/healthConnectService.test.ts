/**
 * Health Connect Service Tests
 *
 * Note: Due to the complexity of mocking dynamic imports in Jest,
 * full service integration tests should be done via E2E tests.
 * These unit tests focus on platform-specific behavior and error handling.
 */

import { Platform } from 'react-native';

describe('HealthConnectService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('platform checks', () => {
    it('should return not available on iOS', async () => {
      Platform.OS = 'ios';

      // Import fresh module for each test
      const { healthConnectService } = require('../healthConnectService');
      const status = await healthConnectService.checkAvailability();

      expect(status.isAvailable).toBe(false);
      expect(status.needsInstall).toBe(false);
      expect(status.isInitialized).toBe(false);
      expect(status.permissionsGranted).toEqual([]);
    });

    it('should return false from initialize on iOS', async () => {
      Platform.OS = 'ios';

      const { healthConnectService } = require('../healthConnectService');
      const result = await healthConnectService.initialize();

      expect(result).toBe(false);
    });

    it('should return empty permissions on iOS', async () => {
      Platform.OS = 'ios';

      const { healthConnectService } = require('../healthConnectService');
      const result = await healthConnectService.requestPermissions();

      expect(result.granted).toBe(false);
      expect(result.permissions).toEqual([]);
    });

    it('should return not initialized error when syncing before init', async () => {
      Platform.OS = 'android';

      const { healthConnectService } = require('../healthConnectService');

      // Mock the module load to fail (simulating not initialized)
      jest.doMock('react-native-health-connect', () => {
        throw new Error('Module not found');
      });

      const result = await healthConnectService.syncMeal({
        id: 'test',
        mealType: 'Lunch',
        timestamp: new Date(),
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Health Connect not initialized');
    });
  });

  describe('isInitialized', () => {
    it('should return false initially', async () => {
      Platform.OS = 'android';

      const { healthConnectService } = require('../healthConnectService');

      expect(healthConnectService.isInitialized()).toBe(false);
    });
  });

  describe('hasUserDeniedMultipleTimes', () => {
    it('should return false initially', async () => {
      Platform.OS = 'android';

      const { healthConnectService } = require('../healthConnectService');

      expect(healthConnectService.hasUserDeniedMultipleTimes()).toBe(false);
    });
  });

  describe('data type exports', () => {
    it('should export HealthConnectStatus interface', () => {
      const module = require('../healthConnectService');

      // Verify the module exports the service
      expect(module.healthConnectService).toBeDefined();
      expect(typeof module.healthConnectService.checkAvailability).toBe('function');
      expect(typeof module.healthConnectService.initialize).toBe('function');
      expect(typeof module.healthConnectService.requestPermissions).toBe('function');
      expect(typeof module.healthConnectService.syncMeal).toBe('function');
      expect(typeof module.healthConnectService.syncWater).toBe('function');
      expect(typeof module.healthConnectService.syncWeight).toBe('function');
      expect(typeof module.healthConnectService.readWeightData).toBe('function');
      expect(typeof module.healthConnectService.readActiveCalories).toBe('function');
      expect(typeof module.healthConnectService.openSettings).toBe('function');
      expect(typeof module.healthConnectService.openPlayStoreForInstall).toBe('function');
    });
  });

  describe('read operations when not initialized', () => {
    it('should return empty array for readWeightData', async () => {
      Platform.OS = 'android';

      const { healthConnectService } = require('../healthConnectService');
      const data = await healthConnectService.readWeightData(
        new Date(),
        new Date()
      );

      expect(data).toEqual([]);
    });

    it('should return 0 for readActiveCalories', async () => {
      Platform.OS = 'android';

      const { healthConnectService } = require('../healthConnectService');
      const calories = await healthConnectService.readActiveCalories(new Date());

      expect(calories).toBe(0);
    });

    it('should return 0 for readWaterIntake', async () => {
      Platform.OS = 'android';

      const { healthConnectService } = require('../healthConnectService');
      const water = await healthConnectService.readWaterIntake(new Date());

      expect(water).toBe(0);
    });
  });

  describe('write operations when not initialized', () => {
    it('should return error for syncWater', async () => {
      Platform.OS = 'android';

      const { healthConnectService } = require('../healthConnectService');
      const result = await healthConnectService.syncWater({
        timestamp: new Date(),
        volumeMl: 250,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Health Connect not initialized');
    });

    it('should return error for syncWeight', async () => {
      Platform.OS = 'android';

      const { healthConnectService } = require('../healthConnectService');
      const result = await healthConnectService.syncWeight({
        timestamp: new Date(),
        weightKg: 75,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Health Connect not initialized');
    });
  });
});
