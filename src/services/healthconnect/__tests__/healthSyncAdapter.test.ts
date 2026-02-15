import { createHealthConnectSyncAdapter } from '../healthSyncAdapter';
import type { HealthSyncService } from '../../healthSyncService';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockInitializeAndRequestPermissions = jest.fn();
const mockReset = jest.fn();

jest.mock('@/stores/healthConnectStore', () => ({
  useHealthConnectStore: {
    getState: jest.fn(() => ({
      status: { isInitialized: true },
      syncNutritionEnabled: true,
      syncWaterEnabled: true,
      initializeAndRequestPermissions: mockInitializeAndRequestPermissions,
      reset: mockReset,
    })),
  },
}));

jest.mock('../healthConnectService', () => ({
  healthConnectService: {
    checkAvailability: jest.fn(),
    readWeightData: jest.fn(),
  },
}));

jest.mock('../healthConnectNutritionSync', () => ({
  syncMealToHealthConnect: jest.fn(),
  syncWeightToHealthConnect: jest.fn(),
  syncWaterToHealthConnect: jest.fn(),
  getActiveCaloriesFromHealthConnect: jest.fn(),
}));

jest.mock('@/repositories/healthSyncRepository', () => ({
  getLastSyncTimestamp: jest.fn(),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { useHealthConnectStore } from '@/stores/healthConnectStore';
import { healthConnectService } from '../healthConnectService';
import {
  syncMealToHealthConnect,
  syncWeightToHealthConnect,
  syncWaterToHealthConnect,
  getActiveCaloriesFromHealthConnect,
} from '../healthConnectNutritionSync';
import { getLastSyncTimestamp } from '@/repositories/healthSyncRepository';

// ── Helpers ────────────────────────────────────────────────────────────────

const getState = useHealthConnectStore.getState as jest.Mock;

function setStoreState(overrides: Record<string, unknown> = {}) {
  getState.mockReturnValue({
    status: { isInitialized: true },
    syncNutritionEnabled: true,
    syncWaterEnabled: true,
    initializeAndRequestPermissions: mockInitializeAndRequestPermissions,
    reset: mockReset,
    ...overrides,
  });
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('createHealthConnectSyncAdapter', () => {
  let adapter: HealthSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    setStoreState();
    adapter = createHealthConnectSyncAdapter();
  });

  // ── isAvailable ──────────────────────────────────────────────────────────

  describe('isAvailable', () => {
    it('returns true when Health Connect is available', async () => {
      (healthConnectService.checkAvailability as jest.Mock).mockResolvedValue({
        isAvailable: true,
      });

      const result = await adapter.isAvailable();
      expect(result).toBe(true);
      expect(healthConnectService.checkAvailability).toHaveBeenCalledTimes(1);
    });

    it('returns false when Health Connect is not available', async () => {
      (healthConnectService.checkAvailability as jest.Mock).mockResolvedValue({
        isAvailable: false,
      });

      const result = await adapter.isAvailable();
      expect(result).toBe(false);
    });
  });

  // ── getPlatformName ──────────────────────────────────────────────────────

  describe('getPlatformName', () => {
    it('returns health_connect', () => {
      expect(adapter.getPlatformName()).toBe('health_connect');
    });
  });

  // ── connect ──────────────────────────────────────────────────────────────

  describe('connect', () => {
    it('returns granted arrays when permissions are granted', async () => {
      mockInitializeAndRequestPermissions.mockResolvedValue(true);

      const result = await adapter.connect();

      expect(mockInitializeAndRequestPermissions).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        granted: ['read:HealthConnect', 'write:HealthConnect'],
        denied: [],
      });
    });

    it('returns denied arrays when permissions are denied', async () => {
      mockInitializeAndRequestPermissions.mockResolvedValue(false);

      const result = await adapter.connect();

      expect(result).toEqual({
        granted: [],
        denied: ['read:HealthConnect', 'write:HealthConnect'],
      });
    });
  });

  // ── disconnect ───────────────────────────────────────────────────────────

  describe('disconnect', () => {
    it('calls state().reset()', async () => {
      await adapter.disconnect();
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  // ── isConnected ──────────────────────────────────────────────────────────

  describe('isConnected', () => {
    it('returns true when status.isInitialized is true', () => {
      setStoreState({ status: { isInitialized: true } });
      expect(adapter.isConnected()).toBe(true);
    });

    it('returns false when status.isInitialized is false', () => {
      setStoreState({ status: { isInitialized: false } });
      expect(adapter.isConnected()).toBe(false);
    });
  });

  // ── writeNutrition ──────────────────────────────────────────────────────

  describe('writeNutrition', () => {
    const baseParams = {
      localRecordId: 'meal-123',
      localRecordType: 'log_entry' as const,
      timestamp: '2025-06-15T12:00:00.000Z',
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 20,
      mealType: 'lunch',
    };

    it('returns no-op success when not initialized', async () => {
      setStoreState({ status: { isInitialized: false } });

      const result = await adapter.writeNutrition(baseParams);

      expect(result).toEqual({ success: true });
      expect(syncMealToHealthConnect).not.toHaveBeenCalled();
    });

    it('returns no-op success when syncNutritionEnabled is false', async () => {
      setStoreState({ syncNutritionEnabled: false });

      const result = await adapter.writeNutrition(baseParams);

      expect(result).toEqual({ success: true });
      expect(syncMealToHealthConnect).not.toHaveBeenCalled();
    });

    it('syncs meal with correct params on success', async () => {
      (syncMealToHealthConnect as jest.Mock).mockResolvedValue({ success: true });

      const result = await adapter.writeNutrition(baseParams);

      expect(syncMealToHealthConnect).toHaveBeenCalledWith({
        id: 'meal-123',
        mealType: 'Lunch',
        timestamp: new Date('2025-06-15T12:00:00.000Z'),
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
      });
      expect(result).toEqual({
        success: true,
        externalId: 'meal-123:2025-06-15T12:00:00.000Z',
        error: undefined,
      });
    });

    it.each([
      ['breakfast', 'Breakfast'],
      ['lunch', 'Lunch'],
      ['dinner', 'Dinner'],
      ['snack', 'Snack'],
    ])('maps mealType "%s" to "%s"', async (input, expected) => {
      (syncMealToHealthConnect as jest.Mock).mockResolvedValue({ success: true });

      await adapter.writeNutrition({ ...baseParams, mealType: input });

      expect(syncMealToHealthConnect).toHaveBeenCalledWith(
        expect.objectContaining({ mealType: expected })
      );
    });

    it('maps unknown mealType to Snack', async () => {
      (syncMealToHealthConnect as jest.Mock).mockResolvedValue({ success: true });

      await adapter.writeNutrition({ ...baseParams, mealType: 'brunch' });

      expect(syncMealToHealthConnect).toHaveBeenCalledWith(
        expect.objectContaining({ mealType: 'Snack' })
      );
    });

    it('defaults undefined mealType to Snack', async () => {
      (syncMealToHealthConnect as jest.Mock).mockResolvedValue({ success: true });

      const { mealType: _, ...noMealType } = baseParams;
      await adapter.writeNutrition(noMealType);

      expect(syncMealToHealthConnect).toHaveBeenCalledWith(
        expect.objectContaining({ mealType: 'Snack' })
      );
    });

    it('returns error from sync result', async () => {
      (syncMealToHealthConnect as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Sync failed',
      });

      const result = await adapter.writeNutrition(baseParams);

      expect(result).toEqual({
        success: false,
        externalId: 'meal-123:2025-06-15T12:00:00.000Z',
        error: 'Sync failed',
      });
    });
  });

  // ── writeWeight ─────────────────────────────────────────────────────────

  describe('writeWeight', () => {
    const weightParams = {
      localRecordId: 'weight-456',
      localRecordType: 'weight_entry' as const,
      timestamp: '2025-06-15T08:00:00.000Z',
      weightKg: 75.5,
    };

    it('returns no-op success when not initialized', async () => {
      setStoreState({ status: { isInitialized: false } });

      const result = await adapter.writeWeight(weightParams);

      expect(result).toEqual({ success: true });
      expect(syncWeightToHealthConnect).not.toHaveBeenCalled();
    });

    it('syncs weight with correct params on success', async () => {
      (syncWeightToHealthConnect as jest.Mock).mockResolvedValue({ success: true });

      const result = await adapter.writeWeight(weightParams);

      expect(syncWeightToHealthConnect).toHaveBeenCalledWith(
        75.5,
        new Date('2025-06-15T08:00:00.000Z')
      );
      expect(result).toEqual({ success: true, error: undefined });
    });

    it('returns error from sync result', async () => {
      (syncWeightToHealthConnect as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Weight sync failed',
      });

      const result = await adapter.writeWeight(weightParams);

      expect(result).toEqual({ success: false, error: 'Weight sync failed' });
    });
  });

  // ── writeWater ──────────────────────────────────────────────────────────

  describe('writeWater', () => {
    const waterParams = {
      localRecordId: 'water-789',
      localRecordType: 'water_entry' as const,
      timestamp: '2025-06-15T14:00:00.000Z',
      milliliters: 500,
    };

    it('returns no-op success when not initialized', async () => {
      setStoreState({ status: { isInitialized: false } });

      const result = await adapter.writeWater(waterParams);

      expect(result).toEqual({ success: true });
      expect(syncWaterToHealthConnect).not.toHaveBeenCalled();
    });

    it('returns no-op success when syncWaterEnabled is false', async () => {
      setStoreState({ syncWaterEnabled: false });

      const result = await adapter.writeWater(waterParams);

      expect(result).toEqual({ success: true });
      expect(syncWaterToHealthConnect).not.toHaveBeenCalled();
    });

    it('syncs water with correct params on success', async () => {
      (syncWaterToHealthConnect as jest.Mock).mockResolvedValue({ success: true });

      const result = await adapter.writeWater(waterParams);

      expect(syncWaterToHealthConnect).toHaveBeenCalledWith({
        date: new Date('2025-06-15T14:00:00.000Z'),
        milliliters: 500,
      });
      expect(result).toEqual({ success: true, error: undefined });
    });

    it('returns error from sync result', async () => {
      (syncWaterToHealthConnect as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Water sync failed',
      });

      const result = await adapter.writeWater(waterParams);

      expect(result).toEqual({ success: false, error: 'Water sync failed' });
    });
  });

  // ── readWeightChanges ───────────────────────────────────────────────────

  describe('readWeightChanges', () => {
    it('maps records to WeightSample format with healthconnect: prefix', async () => {
      const mockRecords = [
        { timestamp: '2025-06-14T08:00:00.000Z', weightKg: 74.2 },
        { timestamp: '2025-06-15T08:00:00.000Z', weightKg: 74.0 },
      ];
      (healthConnectService.readWeightData as jest.Mock).mockResolvedValue(mockRecords);

      const result = await adapter.readWeightChanges('2025-06-14T00:00:00.000Z');

      expect(healthConnectService.readWeightData).toHaveBeenCalledWith(
        new Date('2025-06-14T00:00:00.000Z'),
        expect.any(Date)
      );
      expect(result).toEqual([
        {
          valueKg: 74.2,
          timestamp: '2025-06-14T08:00:00.000Z',
          externalId: 'healthconnect:2025-06-14T08:00:00.000Z',
          sourceBundle: undefined,
        },
        {
          valueKg: 74.0,
          timestamp: '2025-06-15T08:00:00.000Z',
          externalId: 'healthconnect:2025-06-15T08:00:00.000Z',
          sourceBundle: undefined,
        },
      ]);
    });

    it('returns empty array when no records', async () => {
      (healthConnectService.readWeightData as jest.Mock).mockResolvedValue([]);

      const result = await adapter.readWeightChanges('2025-06-14T00:00:00.000Z');

      expect(result).toEqual([]);
    });

    it('handles Date objects in timestamp field', async () => {
      const dateObj = new Date('2025-06-14T10:30:00.000Z');
      (healthConnectService.readWeightData as jest.Mock).mockResolvedValue([
        { timestamp: dateObj, weightKg: 73.5 },
      ]);

      const result = await adapter.readWeightChanges('2025-06-14T00:00:00.000Z');

      expect(result).toEqual([
        {
          valueKg: 73.5,
          timestamp: '2025-06-14T10:30:00.000Z',
          externalId: 'healthconnect:2025-06-14T10:30:00.000Z',
          sourceBundle: undefined,
        },
      ]);
    });
  });

  // ── readActiveCalories ──────────────────────────────────────────────────

  describe('readActiveCalories', () => {
    it('delegates to getActiveCaloriesFromHealthConnect with Date', async () => {
      (getActiveCaloriesFromHealthConnect as jest.Mock).mockResolvedValue(350);

      const result = await adapter.readActiveCalories('2025-06-15T00:00:00.000Z');

      expect(getActiveCaloriesFromHealthConnect).toHaveBeenCalledWith(
        new Date('2025-06-15T00:00:00.000Z')
      );
      expect(result).toBe(350);
    });
  });

  // ── readSteps ───────────────────────────────────────────────────────────

  describe('readSteps', () => {
    it('returns 0 (not implemented)', async () => {
      const result = await adapter.readSteps('2025-06-15', '2025-06-16');
      expect(result).toBe(0);
    });
  });

  // ── getLastSyncTime ─────────────────────────────────────────────────────

  describe('getLastSyncTime', () => {
    it('delegates with health_connect, read, weight', async () => {
      (getLastSyncTimestamp as jest.Mock).mockResolvedValue('2025-06-15T10:00:00.000Z');

      const result = await adapter.getLastSyncTime();

      expect(getLastSyncTimestamp).toHaveBeenCalledWith('health_connect', 'read', 'weight');
      expect(result).toBe('2025-06-15T10:00:00.000Z');
    });

    it('returns null when no sync history', async () => {
      (getLastSyncTimestamp as jest.Mock).mockResolvedValue(null);

      const result = await adapter.getLastSyncTime();

      expect(result).toBeNull();
    });
  });
});
