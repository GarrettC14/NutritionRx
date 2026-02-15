/**
 * HealthKit Sync Adapter Tests
 * Tests the createHealthKitSyncAdapter() factory and all HealthSyncService methods.
 */

import { createHealthKitSyncAdapter } from '../healthSyncAdapter';
import { healthKitService } from '../healthKitService';
import {
  syncDailyNutritionToHealthKit,
  syncWeightToHealthKit,
  syncWaterToHealthKit,
  getWeightFromHealthKit,
  getActiveCaloriesFromHealthKit,
} from '../healthKitNutritionSync';
import { useHealthKitStore } from '@/stores/healthKitStore';
import { getLastSyncTimestamp } from '@/repositories/healthSyncRepository';
import type { HealthSyncService } from '../../healthSyncService';

// ═══ Mocks ═══

jest.mock('@/stores/healthKitStore');
jest.mock('../healthKitService', () => ({
  healthKitService: {
    isAvailable: jest.fn(),
    requestAuthorization: jest.fn(),
  },
}));
jest.mock('../healthKitNutritionSync', () => ({
  syncDailyNutritionToHealthKit: jest.fn(),
  syncWeightToHealthKit: jest.fn(),
  syncWaterToHealthKit: jest.fn(),
  getWeightFromHealthKit: jest.fn(),
  getActiveCaloriesFromHealthKit: jest.fn(),
}));
jest.mock('@/repositories/healthSyncRepository', () => ({
  getLastSyncTimestamp: jest.fn(),
}));

const mockHealthKitService = healthKitService as jest.Mocked<typeof healthKitService>;
const mockSyncDailyNutrition = syncDailyNutritionToHealthKit as jest.MockedFunction<typeof syncDailyNutritionToHealthKit>;
const mockSyncWeight = syncWeightToHealthKit as jest.MockedFunction<typeof syncWeightToHealthKit>;
const mockSyncWater = syncWaterToHealthKit as jest.MockedFunction<typeof syncWaterToHealthKit>;
const mockGetWeight = getWeightFromHealthKit as jest.MockedFunction<typeof getWeightFromHealthKit>;
const mockGetActiveCalories = getActiveCaloriesFromHealthKit as jest.MockedFunction<typeof getActiveCaloriesFromHealthKit>;
const mockGetLastSyncTimestamp = getLastSyncTimestamp as jest.MockedFunction<typeof getLastSyncTimestamp>;
const mockUseHealthKitStore = useHealthKitStore as unknown as jest.Mocked<typeof useHealthKitStore>;

// ═══ Helpers ═══

function createMockState(overrides: Partial<{
  isConnected: boolean;
  syncNutrition: boolean;
  writeWeight: boolean;
  syncWater: boolean;
  setIsConnected: jest.Mock;
}> = {}) {
  return {
    isConnected: false,
    syncNutrition: true,
    writeWeight: true,
    syncWater: true,
    setIsConnected: jest.fn(),
    ...overrides,
  };
}

function setupState(overrides: Partial<{
  isConnected: boolean;
  syncNutrition: boolean;
  writeWeight: boolean;
  syncWater: boolean;
  setIsConnected: jest.Mock;
}> = {}) {
  const state = createMockState(overrides);
  (mockUseHealthKitStore.getState as jest.Mock).mockReturnValue(state);
  return state;
}

// ═══ Tests ═══

describe('createHealthKitSyncAdapter', () => {
  let adapter: HealthSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: provide a basic state for getState()
    (mockUseHealthKitStore.getState as jest.Mock) = jest.fn().mockReturnValue(createMockState());
    adapter = createHealthKitSyncAdapter();
  });

  // ─── isAvailable ───

  describe('isAvailable', () => {
    it('delegates to healthKitService.isAvailable and returns true', async () => {
      mockHealthKitService.isAvailable.mockResolvedValue(true);
      const result = await adapter.isAvailable();
      expect(result).toBe(true);
      expect(mockHealthKitService.isAvailable).toHaveBeenCalledTimes(1);
    });

    it('delegates to healthKitService.isAvailable and returns false', async () => {
      mockHealthKitService.isAvailable.mockResolvedValue(false);
      const result = await adapter.isAvailable();
      expect(result).toBe(false);
    });
  });

  // ─── getPlatformName ───

  describe('getPlatformName', () => {
    it('returns apple_health', () => {
      expect(adapter.getPlatformName()).toBe('apple_health');
    });
  });

  // ─── connect ───

  describe('connect', () => {
    it('on success sets isConnected true and returns granted permissions', async () => {
      mockHealthKitService.requestAuthorization.mockResolvedValue({ success: true });
      const state = setupState();

      const result = await adapter.connect();

      expect(mockHealthKitService.requestAuthorization).toHaveBeenCalledTimes(1);
      expect(state.setIsConnected).toHaveBeenCalledWith(true);
      expect(result).toEqual({
        granted: ['read:apple_health', 'write:apple_health'],
        denied: [],
      });
    });

    it('on failure returns denied permissions and does not set connected', async () => {
      mockHealthKitService.requestAuthorization.mockResolvedValue({
        success: false,
        error: 'HealthKit is not available',
      });
      const state = setupState();

      const result = await adapter.connect();

      expect(state.setIsConnected).not.toHaveBeenCalled();
      expect(result).toEqual({
        granted: [],
        denied: ['read:apple_health', 'write:apple_health'],
      });
    });
  });

  // ─── disconnect ───

  describe('disconnect', () => {
    it('sets isConnected to false', async () => {
      const state = setupState({ isConnected: true });

      await adapter.disconnect();

      expect(state.setIsConnected).toHaveBeenCalledWith(false);
    });
  });

  // ─── isConnected ───

  describe('isConnected', () => {
    it('returns true when state.isConnected is true', () => {
      setupState({ isConnected: true });
      expect(adapter.isConnected()).toBe(true);
    });

    it('returns false when state.isConnected is false', () => {
      setupState({ isConnected: false });
      expect(adapter.isConnected()).toBe(false);
    });
  });

  // ─── writeNutrition ───

  describe('writeNutrition', () => {
    const nutritionParams = {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 80,
      timestamp: '2025-06-15T12:00:00.000Z',
      localRecordId: 'rec-1',
      localRecordType: 'log_entry' as const,
    };

    it('returns success no-op when not connected', async () => {
      setupState({ isConnected: false, syncNutrition: true });

      const result = await adapter.writeNutrition(nutritionParams);

      expect(result).toEqual({ success: true });
      expect(mockSyncDailyNutrition).not.toHaveBeenCalled();
    });

    it('returns success no-op when syncNutrition is off', async () => {
      setupState({ isConnected: true, syncNutrition: false });

      const result = await adapter.writeNutrition(nutritionParams);

      expect(result).toEqual({ success: true });
      expect(mockSyncDailyNutrition).not.toHaveBeenCalled();
    });

    it('calls syncDailyNutritionToHealthKit with correct params on success path', async () => {
      setupState({ isConnected: true, syncNutrition: true });
      mockSyncDailyNutrition.mockResolvedValue({ success: true });

      const result = await adapter.writeNutrition(nutritionParams);

      expect(result).toEqual({ success: true, error: undefined });
      expect(mockSyncDailyNutrition).toHaveBeenCalledWith({
        date: expect.any(Date),
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 80,
      });
      // Verify the date was constructed from the timestamp
      const callArg = mockSyncDailyNutrition.mock.calls[0][0];
      expect(callArg.date.toISOString()).toBe('2025-06-15T12:00:00.000Z');
    });

    it('propagates error from syncDailyNutritionToHealthKit', async () => {
      setupState({ isConnected: true, syncNutrition: true });
      mockSyncDailyNutrition.mockResolvedValue({ success: false, error: 'HealthKit write failed' });

      const result = await adapter.writeNutrition(nutritionParams);

      expect(result).toEqual({ success: false, error: 'HealthKit write failed' });
    });
  });

  // ─── writeWeight ───

  describe('writeWeight', () => {
    const weightParams = {
      weightKg: 75.5,
      timestamp: '2025-06-15T08:00:00.000Z',
      localRecordId: 'w-1',
      localRecordType: 'weight_entry' as const,
    };

    it('returns success no-op when not connected', async () => {
      setupState({ isConnected: false, writeWeight: true });

      const result = await adapter.writeWeight(weightParams);

      expect(result).toEqual({ success: true });
      expect(mockSyncWeight).not.toHaveBeenCalled();
    });

    it('returns success no-op when writeWeight toggle is off', async () => {
      setupState({ isConnected: true, writeWeight: false });

      const result = await adapter.writeWeight(weightParams);

      expect(result).toEqual({ success: true });
      expect(mockSyncWeight).not.toHaveBeenCalled();
    });

    it('calls syncWeightToHealthKit with correct params on success path', async () => {
      setupState({ isConnected: true, writeWeight: true });
      mockSyncWeight.mockResolvedValue({ success: true });

      const result = await adapter.writeWeight(weightParams);

      expect(result).toEqual({ success: true, error: undefined });
      expect(mockSyncWeight).toHaveBeenCalledWith(75.5, expect.any(Date));
      const callDate = mockSyncWeight.mock.calls[0][1] as Date;
      expect(callDate.toISOString()).toBe('2025-06-15T08:00:00.000Z');
    });

    it('propagates error from syncWeightToHealthKit', async () => {
      setupState({ isConnected: true, writeWeight: true });
      mockSyncWeight.mockResolvedValue({ success: false, error: 'Invalid weight value' });

      const result = await adapter.writeWeight(weightParams);

      expect(result).toEqual({ success: false, error: 'Invalid weight value' });
    });
  });

  // ─── writeWater ───

  describe('writeWater', () => {
    const waterParams = {
      milliliters: 500,
      timestamp: '2025-06-15T14:00:00.000Z',
      localRecordId: 'water-1',
      localRecordType: 'water_entry' as const,
    };

    it('returns success no-op when not connected', async () => {
      setupState({ isConnected: false, syncWater: true });

      const result = await adapter.writeWater(waterParams);

      expect(result).toEqual({ success: true });
      expect(mockSyncWater).not.toHaveBeenCalled();
    });

    it('returns success no-op when syncWater toggle is off', async () => {
      setupState({ isConnected: true, syncWater: false });

      const result = await adapter.writeWater(waterParams);

      expect(result).toEqual({ success: true });
      expect(mockSyncWater).not.toHaveBeenCalled();
    });

    it('calls syncWaterToHealthKit with correct params on success path', async () => {
      setupState({ isConnected: true, syncWater: true });
      mockSyncWater.mockResolvedValue({ success: true });

      const result = await adapter.writeWater(waterParams);

      expect(result).toEqual({ success: true, error: undefined });
      expect(mockSyncWater).toHaveBeenCalledWith({
        date: expect.any(Date),
        milliliters: 500,
      });
      const callArg = mockSyncWater.mock.calls[0][0];
      expect(callArg.date.toISOString()).toBe('2025-06-15T14:00:00.000Z');
    });

    it('propagates error from syncWaterToHealthKit', async () => {
      setupState({ isConnected: true, syncWater: true });
      mockSyncWater.mockResolvedValue({ success: false, error: 'Failed to sync water to HealthKit' });

      const result = await adapter.writeWater(waterParams);

      expect(result).toEqual({ success: false, error: 'Failed to sync water to HealthKit' });
    });
  });

  // ─── readWeightChanges ───

  describe('readWeightChanges', () => {
    it('returns empty array when no latest weight', async () => {
      mockGetWeight.mockResolvedValue(null);

      const result = await adapter.readWeightChanges('2025-06-01T00:00:00.000Z');

      expect(result).toEqual([]);
    });

    it('returns empty array when latest weight is before since date', async () => {
      mockGetWeight.mockResolvedValue({
        kg: 75.5,
        date: new Date('2025-05-30T10:00:00.000Z'),
      });

      const result = await adapter.readWeightChanges('2025-06-01T00:00:00.000Z');

      expect(result).toEqual([]);
    });

    it('returns empty array when latest weight is exactly at since date', async () => {
      const sinceDate = '2025-06-01T00:00:00.000Z';
      mockGetWeight.mockResolvedValue({
        kg: 75.5,
        date: new Date(sinceDate),
      });

      const result = await adapter.readWeightChanges(sinceDate);

      expect(result).toEqual([]);
    });

    it('returns mapped sample when latest weight is after since date', async () => {
      const weightDate = new Date('2025-06-15T08:30:00.000Z');
      mockGetWeight.mockResolvedValue({
        kg: 74.2,
        date: weightDate,
      });

      const result = await adapter.readWeightChanges('2025-06-01T00:00:00.000Z');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        valueKg: 74.2,
        timestamp: weightDate.toISOString(),
        externalId: `apple_health:${weightDate.toISOString()}`,
        sourceBundle: undefined,
      });
    });

    it('prefixes externalId with apple_health:', async () => {
      const weightDate = new Date('2025-06-15T08:30:00.000Z');
      mockGetWeight.mockResolvedValue({
        kg: 80,
        date: weightDate,
      });

      const result = await adapter.readWeightChanges('2025-06-01T00:00:00.000Z');

      expect(result[0].externalId).toBe(`apple_health:${weightDate.toISOString()}`);
    });
  });

  // ─── readActiveCalories ───

  describe('readActiveCalories', () => {
    it('delegates to getActiveCaloriesFromHealthKit with parsed Date', async () => {
      mockGetActiveCalories.mockResolvedValue(450);

      const result = await adapter.readActiveCalories('2025-06-15T00:00:00.000Z', '2025-06-15T23:59:59.000Z');

      expect(result).toBe(450);
      expect(mockGetActiveCalories).toHaveBeenCalledWith(expect.any(Date));
      const callDate = mockGetActiveCalories.mock.calls[0][0] as Date;
      expect(callDate.toISOString()).toBe('2025-06-15T00:00:00.000Z');
    });

    it('returns 0 when no calories', async () => {
      mockGetActiveCalories.mockResolvedValue(0);

      const result = await adapter.readActiveCalories('2025-06-15T00:00:00.000Z', '2025-06-15T23:59:59.000Z');

      expect(result).toBe(0);
    });
  });

  // ─── readSteps ───

  describe('readSteps', () => {
    it('returns 0 (not implemented)', async () => {
      const result = await adapter.readSteps('2025-06-15T00:00:00.000Z', '2025-06-15T23:59:59.000Z');
      expect(result).toBe(0);
    });
  });

  // ─── getLastSyncTime ───

  describe('getLastSyncTime', () => {
    it('delegates to getLastSyncTimestamp with apple_health, read, weight', async () => {
      mockGetLastSyncTimestamp.mockResolvedValue('2025-06-15T08:00:00.000Z');

      const result = await adapter.getLastSyncTime();

      expect(result).toBe('2025-06-15T08:00:00.000Z');
      expect(mockGetLastSyncTimestamp).toHaveBeenCalledWith('apple_health', 'read', 'weight');
    });

    it('returns null when no sync has occurred', async () => {
      mockGetLastSyncTimestamp.mockResolvedValue(null);

      const result = await adapter.getLastSyncTime();

      expect(result).toBeNull();
    });
  });
});
