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
    getTrendWeight: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByDate: jest.fn(),
  },
}));

// Mock HealthKit sync functions
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

import { useWeightStore } from '@/stores/weightStore';
import { weightRepository } from '@/repositories';
import {
  syncWeightToHealthKit,
  getWeightFromHealthKit,
} from '@/services/healthkit/healthKitNutritionSync';
import { useHealthKitStore } from '@/stores/healthKitStore';
import { WeightEntry } from '@/types/domain';

const mockWeightRepo = weightRepository as jest.Mocked<typeof weightRepository>;
const mockSyncWeight = syncWeightToHealthKit as jest.MockedFunction<typeof syncWeightToHealthKit>;
const mockGetWeight = getWeightFromHealthKit as jest.MockedFunction<typeof getWeightFromHealthKit>;
const mockHealthKitStore = useHealthKitStore as unknown as {
  getState: jest.MockedFunction<() => {
    isConnected: boolean;
    readWeight: boolean;
    writeWeight: boolean;
  }>;
};

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
    jest.clearAllMocks();
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
    it('calls getTrendWeight with the provided date', async () => {
      mockWeightRepo.getTrendWeight.mockResolvedValue(80.6);

      await useWeightStore.getState().loadTrendWeight('2024-01-15');

      expect(mockWeightRepo.getTrendWeight).toHaveBeenCalledWith('2024-01-15');
      expect(useWeightStore.getState().trendWeight).toBe(80.6);
    });

    it('uses current date when no date is provided', async () => {
      mockWeightRepo.getTrendWeight.mockResolvedValue(80.6);
      const todayStr = new Date().toISOString().split('T')[0];

      await useWeightStore.getState().loadTrendWeight();

      expect(mockWeightRepo.getTrendWeight).toHaveBeenCalledWith(todayStr);
    });

    it('sets error on failure', async () => {
      mockWeightRepo.getTrendWeight.mockRejectedValue(new Error('Trend failed'));

      await useWeightStore.getState().loadTrendWeight('2024-01-15');

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
      // Set up default resolved values for the cascading refresh calls
      mockWeightRepo.getRecent.mockResolvedValue(mockEntries);
      mockWeightRepo.getLatest.mockResolvedValue(mockWeightEntry);
      mockWeightRepo.getTrendWeight.mockResolvedValue(80.6);
    });

    it('creates entry and cascades refresh to loadEntries, loadLatest, loadTrendWeight', async () => {
      const newEntry = { ...mockWeightEntry, id: 'weight-new', date: '2024-01-16', weightKg: 80.2 };
      mockWeightRepo.create.mockResolvedValue(newEntry);

      const result = await useWeightStore.getState().addEntry(createInput);

      expect(mockWeightRepo.create).toHaveBeenCalledWith(createInput);
      expect(result).toEqual(newEntry);
      expect(mockWeightRepo.getRecent).toHaveBeenCalledWith(30);
      expect(mockWeightRepo.getLatest).toHaveBeenCalledTimes(1);
      expect(mockWeightRepo.getTrendWeight).toHaveBeenCalledTimes(1);
    });

    it('syncs to HealthKit when writeWeight and isConnected are true', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: false,
        writeWeight: true,
      });
      const newEntry = { ...mockWeightEntry, id: 'weight-new', date: '2024-01-16', weightKg: 80.2 };
      mockWeightRepo.create.mockResolvedValue(newEntry);

      await useWeightStore.getState().addEntry(createInput);

      expect(mockSyncWeight).toHaveBeenCalledWith(80.2, expect.any(Date));
    });

    it('does not sync to HealthKit when not connected', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: false,
        readWeight: false,
        writeWeight: true,
      });
      const newEntry = { ...mockWeightEntry, id: 'weight-new' };
      mockWeightRepo.create.mockResolvedValue(newEntry);

      await useWeightStore.getState().addEntry(createInput);

      expect(mockSyncWeight).not.toHaveBeenCalled();
    });

    it('does not sync to HealthKit when writeWeight is false', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: false,
        writeWeight: false,
      });
      const newEntry = { ...mockWeightEntry, id: 'weight-new' };
      mockWeightRepo.create.mockResolvedValue(newEntry);

      await useWeightStore.getState().addEntry(createInput);

      expect(mockSyncWeight).not.toHaveBeenCalled();
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
      mockWeightRepo.getTrendWeight.mockResolvedValue(80.0);
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
      const updatedEntry = { ...mockWeightEntry, weightKg: 79.5 };
      mockWeightRepo.update.mockResolvedValue(updatedEntry);

      await useWeightStore.getState().updateEntry('weight-1', 79.5);

      // loadTrendWeight is called non-blocking, give it a tick
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockWeightRepo.getTrendWeight).toHaveBeenCalled();
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
      mockWeightRepo.getTrendWeight.mockResolvedValue(null);
    });

    it('deletes entry and refreshes all data', async () => {
      mockWeightRepo.delete.mockResolvedValue(undefined);

      await useWeightStore.getState().deleteEntry('weight-1');

      expect(mockWeightRepo.delete).toHaveBeenCalledWith('weight-1');
      expect(mockWeightRepo.getRecent).toHaveBeenCalled();
      expect(mockWeightRepo.getLatest).toHaveBeenCalled();
      expect(mockWeightRepo.getTrendWeight).toHaveBeenCalled();
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
      mockWeightRepo.getTrendWeight.mockResolvedValue(null);
    });

    it('returns imported false when not connected', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: false,
        readWeight: true,
        writeWeight: false,
      });

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: false });
      expect(mockGetWeight).not.toHaveBeenCalled();
    });

    it('returns imported false when readWeight is disabled', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: false,
        writeWeight: false,
      });

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: false });
      expect(mockGetWeight).not.toHaveBeenCalled();
    });

    it('returns imported false when no health data is available', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      mockGetWeight.mockResolvedValue(null);

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: false });
    });

    it('creates new entry when health data is newer and no local entry for that date', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      const healthDate = new Date('2024-01-20T08:00:00Z');
      mockGetWeight.mockResolvedValue({ kg: 79.0, date: healthDate });
      mockWeightRepo.getLatest.mockResolvedValueOnce({
        ...mockWeightEntry,
        date: '2024-01-15',
      });
      mockWeightRepo.findByDate.mockResolvedValue(null);
      mockWeightRepo.create.mockResolvedValue({
        ...mockWeightEntry,
        id: 'weight-imported',
        weightKg: 79.0,
      });

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: true, weight: 79.0 });
      expect(mockWeightRepo.create).toHaveBeenCalledWith({
        weightKg: 79.0,
        date: '2024-01-20',
        notes: 'Imported from Apple Health',
      });
    });

    it('updates existing entry when local entry exists for that date', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      const healthDate = new Date('2024-01-15T08:00:00Z');
      mockGetWeight.mockResolvedValue({ kg: 79.5, date: healthDate });
      // No latest local entry - so shouldImport is true
      mockWeightRepo.getLatest.mockResolvedValueOnce(null);
      // Existing entry for the same date
      mockWeightRepo.findByDate.mockResolvedValue(mockWeightEntry);
      mockWeightRepo.update.mockResolvedValue({
        ...mockWeightEntry,
        weightKg: 79.5,
      });

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: true, weight: 79.5 });
      expect(mockWeightRepo.update).toHaveBeenCalledWith(mockWeightEntry.id, {
        weightKg: 79.5,
        notes: 'Imported from Apple Health',
      });
    });

    it('does not import when local data is newer than health data', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      const healthDate = new Date('2024-01-10T08:00:00Z');
      mockGetWeight.mockResolvedValue({ kg: 81.0, date: healthDate });
      mockWeightRepo.getLatest.mockResolvedValueOnce({
        ...mockWeightEntry,
        date: '2024-01-15',
      });

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: false });
      expect(mockWeightRepo.create).not.toHaveBeenCalled();
      expect(mockWeightRepo.update).not.toHaveBeenCalled();
    });

    it('imports when no local data exists at all', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      const healthDate = new Date('2024-01-10T08:00:00Z');
      mockGetWeight.mockResolvedValue({ kg: 81.0, date: healthDate });
      mockWeightRepo.getLatest.mockResolvedValueOnce(null);
      mockWeightRepo.findByDate.mockResolvedValue(null);
      mockWeightRepo.create.mockResolvedValue({
        ...mockWeightEntry,
        id: 'weight-imported',
        weightKg: 81.0,
      });

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: true, weight: 81.0 });
    });

    it('returns imported false on error and does not throw', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      mockGetWeight.mockRejectedValue(new Error('HealthKit error'));

      const result = await useWeightStore.getState().importFromHealthKit();

      expect(result).toEqual({ imported: false });
    });

    it('refreshes all data after successful import', async () => {
      mockHealthKitStore.getState.mockReturnValue({
        isConnected: true,
        readWeight: true,
        writeWeight: false,
      });
      const healthDate = new Date('2024-01-20T08:00:00Z');
      mockGetWeight.mockResolvedValue({ kg: 79.0, date: healthDate });
      mockWeightRepo.getLatest.mockResolvedValueOnce(null);
      mockWeightRepo.findByDate.mockResolvedValue(null);
      mockWeightRepo.create.mockResolvedValue({
        ...mockWeightEntry,
        id: 'weight-imported',
        weightKg: 79.0,
      });

      await useWeightStore.getState().importFromHealthKit();

      // getRecent is called during refresh (loadEntries)
      expect(mockWeightRepo.getRecent).toHaveBeenCalled();
      // getLatest is called once during import check plus once during refresh
      expect(mockWeightRepo.getLatest).toHaveBeenCalled();
      // getTrendWeight is called during refresh
      expect(mockWeightRepo.getTrendWeight).toHaveBeenCalled();
    });
  });
});
