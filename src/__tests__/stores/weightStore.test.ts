/**
 * Weight Store Tests
 * Tests for weight tracking state management
 */

// Mock repositories
jest.mock('@/repositories', () => ({
  weightRepository: {
    getRecent: jest.fn(),
    findByDateRange: jest.fn(),
    getLatest: jest.fn(),
    getEarliestDate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByDate: jest.fn(),
  },
}));

// Mock HealthKit sync functions (used indirectly via coordinator)
jest.mock('@/services/healthkit/healthKitNutritionSync', () => ({
  syncWeightToHealthKit: jest.fn().mockResolvedValue({ success: true }),
  getWeightFromHealthKit: jest.fn(),
}));

// Mock HealthKit store
jest.mock('@/stores/healthKitStore', () => ({
  useHealthKitStore: {
    getState: jest.fn(() => ({
      isConnected: false,
      readWeight: false,
      writeWeight: false,
    })),
  },
}));

// Mock Health Connect store
jest.mock('@/stores/healthConnectStore', () => ({
  useHealthConnectStore: {
    getState: jest.fn(() => ({
      readWeightEnabled: false,
    })),
  },
}));

// Mock health sync service
const mockService = {
  isConnected: jest.fn().mockReturnValue(false),
  getPlatformName: jest.fn().mockReturnValue('apple_health' as const),
  readWeightChanges: jest.fn().mockResolvedValue([]),
  writeWeight: jest.fn(),
  writeNutrition: jest.fn(),
  writeWater: jest.fn(),
  readActiveCalories: jest.fn(),
  readSteps: jest.fn(),
};
jest.mock('@/services/healthSyncService', () => ({
  getHealthSyncService: jest.fn(() => mockService),
}));

// Mock health sync repository
jest.mock('@/repositories/healthSyncRepository', () => ({
  getLastSyncTimestamp: jest.fn().mockResolvedValue(null),
  hasExternalId: jest.fn().mockResolvedValue(false),
  logHealthSync: jest.fn().mockResolvedValue(undefined),
}));

// Mock write coordinator
jest.mock('@/services/healthSyncWriteCoordinator', () => ({
  syncWeightToHealthPlatform: jest.fn().mockResolvedValue(undefined),
}));

// Mock database
jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => ({
    getFirstAsync: jest.fn().mockResolvedValue(null),
  })),
}));

import { useWeightStore } from '@/stores/weightStore';
import { weightRepository } from '@/repositories';
import { useHealthKitStore } from '@/stores/healthKitStore';
import { WeightEntry } from '@/types/domain';
import { getHealthSyncService } from '@/services/healthSyncService';
import { getLastSyncTimestamp, hasExternalId, logHealthSync } from '@/repositories/healthSyncRepository';
import { syncWeightToHealthPlatform } from '@/services/healthSyncWriteCoordinator';
import { getDatabase } from '@/db/database';

const mockWeightRepo = weightRepository as jest.Mocked<typeof weightRepository>;
const mockHealthKitStore = useHealthKitStore as unknown as {
  getState: jest.MockedFunction<() => {
    isConnected: boolean;
    readWeight: boolean;
    writeWeight: boolean;
  }>;
};
const mockGetHealthSyncService = getHealthSyncService as jest.MockedFunction<typeof getHealthSyncService>;
const mockGetLastSyncTimestamp = getLastSyncTimestamp as jest.MockedFunction<typeof getLastSyncTimestamp>;
const mockHasExternalId = hasExternalId as jest.MockedFunction<typeof hasExternalId>;
const mockLogHealthSync = logHealthSync as jest.MockedFunction<typeof logHealthSync>;
const mockSyncWeightToHealthPlatform = syncWeightToHealthPlatform as jest.MockedFunction<typeof syncWeightToHealthPlatform>;
const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

const mockWeightEntry: WeightEntry = {
  id: 'weight-1',
  date: '2024-01-15',
  weightKg: 80.5,
  notes: 'Morning weigh-in',
  createdAt: new Date('2024-01-15T07:00:00'),
  updatedAt: new Date('2024-01-15T07:00:00'),
};

const mockEntries: WeightEntry[] = [
  mockWeightEntry,
  {
    id: 'weight-2',
    date: '2024-01-14',
    weightKg: 80.8,
    notes: undefined,
    createdAt: new Date('2024-01-14T07:00:00'),
    updatedAt: new Date('2024-01-14T07:00:00'),
  },
  {
    id: 'weight-3',
    date: '2024-01-13',
    weightKg: 81.0,
    notes: undefined,
    createdAt: new Date('2024-01-13T07:00:00'),
    updatedAt: new Date('2024-01-13T07:00:00'),
  },
];

describe('useWeightStore', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useWeightStore.setState({
      entries: [],
      latestEntry: null,
      trendWeight: null,
      isLoading: false,
      error: null,
    });
    // Default: HealthKit not connected
    mockHealthKitStore.getState.mockReturnValue({
      isConnected: false,
      readWeight: false,
      writeWeight: false,
    });
    // Default: service not connected
    mockGetHealthSyncService.mockReturnValue(mockService as any);
    mockService.isConnected.mockReturnValue(false);
    mockService.readWeightChanges.mockResolvedValue([]);
    mockGetLastSyncTimestamp.mockResolvedValue(null);
    mockHasExternalId.mockResolvedValue(false);
    mockLogHealthSync.mockResolvedValue(undefined);
    mockSyncWeightToHealthPlatform.mockResolvedValue(undefined);
    // Re-set database mock after resetAllMocks clears it
    mockGetDatabase.mockReturnValue({
      getFirstAsync: jest.fn().mockResolvedValue(null),
    } as any);
  });

  describe('initial state', () => {
    it('has empty entries and null latestEntry', () => {
      const state = useWeightStore.getState();
      expect(state.entries).toEqual([]);
      expect(state.latestEntry).toBeNull();
    });

    it('has null trendWeight', () => {
      expect(useWeightStore.getState().trendWeight).toBeNull();
    });

    it('has isLoading false and null error', () => {
      const state = useWeightStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadEntries', () => {
    it('calls getRecent with default limit of 30', async () => {
      mockWeightRepo.getRecent.mockResolvedValue(mockEntries);

      await useWeightStore.getState().loadEntries();

      expect(mockWeightRepo.getRecent).toHaveBeenCalledWith(30);
      expect(useWeightStore.getState().entries).toEqual(mockEntries);
      expect(useWeightStore.getState().isLoading).toBe(false);
    });

    it('calls getRecent with custom limit', async () => {
      mockWeightRepo.getRecent.mockResolvedValue(mockEntries);

      await useWeightStore.getState().loadEntries(10);

      expect(mockWeightRepo.getRecent).toHaveBeenCalledWith(10);
    });

    it('sets error on failure', async () => {
      mockWeightRepo.getRecent.mockRejectedValue(new Error('Load failed'));

      await useWeightStore.getState().loadEntries();

      const state = useWeightStore.getState();
      expect(state.error).toBe('Load failed');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadEntriesForRange', () => {
    it('calls findByDateRange with start and end dates', async () => {
      mockWeightRepo.findByDateRange.mockResolvedValue(mockEntries);

      await useWeightStore.getState().loadEntriesForRange('2024-01-01', '2024-01-31');

      expect(mockWeightRepo.findByDateRange).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
      expect(useWeightStore.getState().entries).toEqual(mockEntries);
    });

    it('sets error on failure', async () => {
      mockWeightRepo.findByDateRange.mockRejectedValue(new Error('Range query failed'));

      await useWeightStore.getState().loadEntriesForRange('2024-01-01', '2024-01-31');

      expect(useWeightStore.getState().error).toBe('Range query failed');
    });
  });

  describe('loadLatest', () => {
    it('loads the latest weight entry', async () => {
      mockWeightRepo.getLatest.mockResolvedValue(mockWeightEntry);

      await useWeightStore.getState().loadLatest();

      expect(mockWeightRepo.getLatest).toHaveBeenCalledTimes(1);
      expect(useWeightStore.getState().latestEntry).toEqual(mockWeightEntry);
      expect(useWeightStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockWeightRepo.getLatest.mockRejectedValue(new Error('Latest failed'));

      await useWeightStore.getState().loadLatest();

      expect(useWeightStore.getState().error).toBe('Latest failed');
    });
  });

  describe('loadTrendWeight', () => {
    it('uses stored trendWeightKg from latest entry', async () => {
      const entryWithTrend = { ...mockWeightEntry, trendWeightKg: 80.6 };
      useWeightStore.setState({ latestEntry: entryWithTrend });

      await useWeightStore.getState().loadTrendWeight();

      expect(useWeightStore.getState().trendWeight).toBe(80.6);
    });

    it('falls back to getLatest when latestEntry is null', async () => {
      const entryWithTrend = { ...mockWeightEntry, trendWeightKg: 80.3 };
      mockWeightRepo.getLatest.mockResolvedValue(entryWithTrend);

      await useWeightStore.getState().loadTrendWeight();

      expect(useWeightStore.getState().trendWeight).toBe(80.3);
    });

    it('sets trendWeight to null when no stored trend available', async () => {
      mockWeightRepo.getLatest.mockResolvedValue(null);

      await useWeightStore.getState().loadTrendWeight();

      expect(useWeightStore.getState().trendWeight).toBeNull();
    });

    it('sets error on failure', async () => {
      mockWeightRepo.getLatest.mockRejectedValue(new Error('Trend failed'));

      await useWeightStore.getState().loadTrendWeight();

      expect(useWeightStore.getState().error).toBe('Trend failed');
    });
  });

  describe('addEntry', () => {
    const createInput = {
      date: '2024-01-16',
      weightKg: 80.2,
      notes: 'New entry',
    };

    beforeEach(() => {
      mockWeightRepo.getRecent.mockResolvedValue(mockEntries);
      mockWeightRepo.getLatest.mockResolvedValue({ ...mockWeightEntry, trendWeightKg: 80.6 });
      mockWeightRepo.getEarliestDate.mockResolvedValue('2024-01-13');
    });

    it('creates entry and cascades refresh to loadEntries, loadLatest, loadTrendWeight', async () => {
      const newEntry = { ...mockWeightEntry, id: 'weight-new', date: '2024-01-16', weightKg: 80.2 };
      mockWeightRepo.create.mockResolvedValue(newEntry);

      const result = await useWeightStore.getState().addEntry(createInput);

      expect(mockWeightRepo.create).toHaveBeenCalledWith(createInput);
      expect(result).toEqual(newEntry);
      expect(mockWeightRepo.getRecent).toHaveBeenCalledWith(30);
      expect(mockWeightRepo.getLatest).toHaveBeenCalled();
    });

    it('fires health platform sync after successful create', async () => {
      const newEntry = { ...mockWeightEntry, id: 'weight-new', date: '2024-01-16', weightKg: 80.2 };
      mockWeightRepo.create.mockResolvedValue(newEntry);

      await useWeightStore.getState().addEntry(createInput);

      expect(mockSyncWeightToHealthPlatform).toHaveBeenCalledWith(
        expect.objectContaining({ weightKg: 80.2, localRecordId: 'weight-new' })
      );
    });

    it('does not sync to health platform when skipHealthSync is true', async () => {
      const newEntry = { ...mockWeightEntry, id: 'weight-new' };
      mockWeightRepo.create.mockResolvedValue(newEntry);

      await useWeightStore.getState().addEntry(createInput, { skipHealthSync: true });

      expect(mockSyncWeightToHealthPlatform).not.toHaveBeenCalled();
    });

    it('sets error and throws on create failure', async () => {
      mockWeightRepo.create.mockRejectedValue(new Error('Create failed'));

      await expect(
        useWeightStore.getState().addEntry(createInput)
      ).rejects.toThrow('Create failed');

      expect(useWeightStore.getState().error).toBe('Create failed');
      expect(useWeightStore.getState().isLoading).toBe(false);
    });
  });

  describe('updateEntry', () => {
    beforeEach(() => {
      useWeightStore.setState({ entries: [mockWeightEntry], latestEntry: mockWeightEntry });
    });

    it('updates entry in repository and in state', async () => {
      const updatedEntry = { ...mockWeightEntry, weightKg: 79.5 };
      mockWeightRepo.update.mockResolvedValue(updatedEntry);

      const result = await useWeightStore.getState().updateEntry('weight-1', 79.5, 'Updated');

      expect(mockWeightRepo.update).toHaveBeenCalledWith('weight-1', {
        weightKg: 79.5,
        notes: 'Updated',
      });
      expect(result.weightKg).toBe(79.5);
      expect(useWeightStore.getState().entries[0].weightKg).toBe(79.5);
    });

    it('updates latestEntry if it matches the updated id', async () => {
      const updatedEntry = { ...mockWeightEntry, weightKg: 79.5 };
      mockWeightRepo.update.mockResolvedValue(updatedEntry);

      await useWeightStore.getState().updateEntry('weight-1', 79.5);

      expect(useWeightStore.getState().latestEntry?.weightKg).toBe(79.5);
    });

    it('refreshes trend weight after update', async () => {
      const updatedEntry = { ...mockWeightEntry, weightKg: 79.5, trendWeightKg: 79.8 };
      mockWeightRepo.update.mockResolvedValue(updatedEntry);

      await useWeightStore.getState().updateEntry('weight-1', 79.5);

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(useWeightStore.getState().trendWeight).toBe(79.8);
    });

    it('sets error and throws on failure', async () => {
      mockWeightRepo.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        useWeightStore.getState().updateEntry('weight-1', 79.5)
      ).rejects.toThrow('Update failed');

      expect(useWeightStore.getState().error).toBe('Update failed');
    });
  });

  describe('deleteEntry', () => {
    beforeEach(() => {
      mockWeightRepo.getRecent.mockResolvedValue([]);
      mockWeightRepo.getLatest.mockResolvedValue(null);
      mockWeightRepo.getEarliestDate.mockResolvedValue(null);
    });

    it('deletes entry and refreshes all data', async () => {
      mockWeightRepo.delete.mockResolvedValue(undefined);

      await useWeightStore.getState().deleteEntry('weight-1');

      expect(mockWeightRepo.delete).toHaveBeenCalledWith('weight-1');
      expect(mockWeightRepo.getRecent).toHaveBeenCalled();
      expect(mockWeightRepo.getLatest).toHaveBeenCalled();
    });

    it('sets error and throws on failure', async () => {
      mockWeightRepo.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(
        useWeightStore.getState().deleteEntry('weight-1')
      ).rejects.toThrow('Delete failed');

      expect(useWeightStore.getState().error).toBe('Delete failed');
    });
  });

  describe('getEntryByDate', () => {
    it('returns entry for a given date', async () => {
      mockWeightRepo.findByDate.mockResolvedValue(mockWeightEntry);

      const result = await useWeightStore.getState().getEntryByDate('2024-01-15');

      expect(mockWeightRepo.findByDate).toHaveBeenCalledWith('2024-01-15');
      expect(result).toEqual(mockWeightEntry);
    });

    it('returns null when no entry exists for the date', async () => {
      mockWeightRepo.findByDate.mockResolvedValue(null);

      const result = await useWeightStore.getState().getEntryByDate('2024-02-01');

      expect(result).toBeNull();
    });

    it('returns null on error instead of throwing', async () => {
      mockWeightRepo.findByDate.mockRejectedValue(new Error('Query failed'));

      const result = await useWeightStore.getState().getEntryByDate('2024-01-15');

      expect(result).toBeNull();
    });
  });

  describe('importFromHealthKit', () => {
    beforeEach(() => {
      mockWeightRepo.getRecent.mockResolvedValue([]);
      mockWeightRepo.getLatest.mockResolvedValue(null);
      mockWeightRepo.getEarliestDate.mockResolvedValue(null);
    });

    it('returns imported false when service is not connected', async () => {
      mockService.isConnected.mockReturnValue(false);

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: false });
      expect(mockService.readWeightChanges).not.toHaveBeenCalled();
    });

    it('returns imported false when readWeight is disabled', async () => {
      mockService.isConnected.mockReturnValue(true);
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: false,
        writeWeight: false,
      });

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: false });
    });

    it('returns imported false when no samples returned', async () => {
      mockService.isConnected.mockReturnValue(true);
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      mockService.readWeightChanges.mockResolvedValue([]);

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: false, weight: undefined });
    });

    it('imports sample and creates entry via addEntry with skipHealthSync', async () => {
      mockService.isConnected.mockReturnValue(true);
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      mockService.readWeightChanges.mockResolvedValue([
        { valueKg: 79.0, timestamp: '2024-01-20T08:00:00Z', externalId: 'ext-1' },
      ]);
      mockWeightRepo.create.mockResolvedValue({
        ...mockWeightEntry,
        id: 'weight-imported',
        weightKg: 79.0,
      });

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: true, weight: 79.0 });
      expect(mockWeightRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ weightKg: 79.0, notes: 'Imported from health platform' })
      );
      expect(mockLogHealthSync).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'read', data_type: 'weight', status: 'success' })
      );
    });

    it('skips sample with already-imported external ID (layer 2)', async () => {
      mockService.isConnected.mockReturnValue(true);
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      mockService.readWeightChanges.mockResolvedValue([
        { valueKg: 79.0, timestamp: '2024-01-20T08:00:00Z', externalId: 'ext-1' },
      ]);
      mockHasExternalId.mockResolvedValue(true);

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: false, weight: undefined });
      expect(mockWeightRepo.create).not.toHaveBeenCalled();
      expect(mockLogHealthSync).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'skipped_duplicate' })
      );
    });

    it('returns imported false on error and does not throw', async () => {
      mockService.isConnected.mockReturnValue(true);
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      mockService.readWeightChanges.mockRejectedValue(new Error('HealthKit error'));

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: false });
    });

    it('refreshes all data after successful import', async () => {
      mockService.isConnected.mockReturnValue(true);
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      mockService.readWeightChanges.mockResolvedValue([
        { valueKg: 79.0, timestamp: '2024-01-20T08:00:00Z', externalId: 'ext-2' },
      ]);
      mockWeightRepo.create.mockResolvedValue({
        ...mockWeightEntry,
        id: 'weight-imported',
        weightKg: 79.0,
      });

      await useWeightStore.getState().importFromHealthKit();

      expect(mockWeightRepo.getRecent).toHaveBeenCalled();
      expect(mockWeightRepo.getLatest).toHaveBeenCalled();
    });
  });
});
