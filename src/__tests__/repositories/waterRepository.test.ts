/**
 * Water Repository Tests
 * Tests for water tracking data access
 */

import { waterRepository, DEFAULT_WATER_GOAL, DEFAULT_GLASS_SIZE_ML } from '@/repositories/waterRepository';

// Mock the database module
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();

const mockDb = {
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
  runAsync: mockRunAsync,
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

// Mock generateId
jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-uuid-water'),
}));

describe('waterRepository', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
  });

  const mockWaterRow = {
    id: 'water-1',
    date: '2024-01-15',
    glasses: 5,
    notes: 'Good hydration day',
    created_at: '2024-01-15T07:00:00.000Z',
    updated_at: '2024-01-15T18:00:00.000Z',
  };

  describe('constants', () => {
    it('exports default water goal', () => {
      expect(DEFAULT_WATER_GOAL).toBe(8);
    });

    it('exports default glass size in ml', () => {
      expect(DEFAULT_GLASS_SIZE_ML).toBe(250);
    });
  });

  describe('getByDate', () => {
    it('returns water log when found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockWaterRow);

      const result = await waterRepository.getByDate('2024-01-15');

      expect(result).not.toBeNull();
      expect(result!.glasses).toBe(5);
      expect(result!.notes).toBe('Good hydration day');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE date = ?'),
        ['2024-01-15']
      );
    });

    it('returns null when not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await waterRepository.getByDate('2024-01-20');

      expect(result).toBeNull();
    });
  });

  describe('getOrCreateByDate', () => {
    it('returns existing log if found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockWaterRow);

      const result = await waterRepository.getOrCreateByDate('2024-01-15');

      expect(result.glasses).toBe(5);
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('creates new log with 0 glasses if not found', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // getByDate returns null
        .mockResolvedValueOnce({ ...mockWaterRow, glasses: 0, notes: null }); // return created

      mockRunAsync.mockResolvedValue(undefined);

      const result = await waterRepository.getOrCreateByDate('2024-01-15');

      expect(result.glasses).toBe(0);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO water_log'),
        expect.arrayContaining(['test-uuid-water', '2024-01-15', 0])
      );
    });
  });

  describe('addGlass', () => {
    it('increments glasses count', async () => {
      // First call: getOrCreateByDate -> getByDate returns existing log
      mockGetFirstAsync
        .mockResolvedValueOnce(mockWaterRow) // getByDate in getOrCreateByDate
        .mockResolvedValueOnce(mockWaterRow) // getByDate in update's getOrCreateByDate
        .mockResolvedValueOnce({ ...mockWaterRow, glasses: 6 }); // getByDate after update

      mockRunAsync.mockResolvedValue(undefined);

      const result = await waterRepository.addGlass('2024-01-15');

      expect(result.glasses).toBe(6);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE water_log'),
        expect.arrayContaining([6]) // glasses = current (5) + 1
      );
    });
  });

  describe('removeGlass', () => {
    it('decrements glasses count', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockWaterRow) // getByDate in getOrCreateByDate
        .mockResolvedValueOnce(mockWaterRow) // getByDate in update's getOrCreateByDate
        .mockResolvedValueOnce({ ...mockWaterRow, glasses: 4 }); // getByDate after update

      mockRunAsync.mockResolvedValue(undefined);

      const result = await waterRepository.removeGlass('2024-01-15');

      expect(result.glasses).toBe(4);
    });

    it('does not go below 0', async () => {
      const zeroGlassRow = { ...mockWaterRow, glasses: 0 };
      mockGetFirstAsync
        .mockResolvedValueOnce(zeroGlassRow) // getByDate in getOrCreateByDate
        .mockResolvedValueOnce(zeroGlassRow) // getByDate in update's getOrCreateByDate
        .mockResolvedValueOnce(zeroGlassRow); // getByDate after update

      mockRunAsync.mockResolvedValue(undefined);

      const result = await waterRepository.removeGlass('2024-01-15');

      expect(result.glasses).toBe(0);
      // Should still update with 0 (max(0, 0-1) = 0)
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE water_log'),
        expect.arrayContaining([0])
      );
    });
  });

  describe('setGlasses', () => {
    it('sets glasses to specific value', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockWaterRow) // getByDate in update's getOrCreateByDate
        .mockResolvedValueOnce({ ...mockWaterRow, glasses: 8 }); // getByDate after update

      mockRunAsync.mockResolvedValue(undefined);

      const result = await waterRepository.setGlasses('2024-01-15', 8);

      expect(result.glasses).toBe(8);
    });

    it('enforces minimum of 0', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockWaterRow)
        .mockResolvedValueOnce({ ...mockWaterRow, glasses: 0 });

      mockRunAsync.mockResolvedValue(undefined);

      await waterRepository.setGlasses('2024-01-15', -5);

      // Should call with 0, not -5
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([0])
      );
    });
  });

  describe('getRecentLogs', () => {
    it('returns logs for specified limit', async () => {
      mockGetAllAsync.mockResolvedValue([
        mockWaterRow,
        { ...mockWaterRow, id: 'water-2', date: '2024-01-14', glasses: 6 },
        { ...mockWaterRow, id: 'water-3', date: '2024-01-13', glasses: 7 },
      ]);

      const result = await waterRepository.getRecentLogs(7);

      expect(result).toHaveLength(3);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY date DESC LIMIT ?'),
        [7]
      );
    });

    it('uses default limit of 7', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      await waterRepository.getRecentLogs();

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.anything(),
        [7]
      );
    });
  });

  describe('getLogsByDateRange', () => {
    it('returns logs within date range', async () => {
      mockGetAllAsync.mockResolvedValue([
        { ...mockWaterRow, date: '2024-01-13' },
        { ...mockWaterRow, date: '2024-01-14' },
        mockWaterRow,
      ]);

      const result = await waterRepository.getLogsByDateRange('2024-01-13', '2024-01-15');

      expect(result).toHaveLength(3);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE date >= ? AND date <= ?'),
        ['2024-01-13', '2024-01-15']
      );
    });
  });

  describe('getStats', () => {
    it('returns water statistics for specified days', async () => {
      mockGetAllAsync.mockResolvedValue([
        { date: '2024-01-15', glasses: 8 },
        { date: '2024-01-14', glasses: 6 },
        { date: '2024-01-13', glasses: 9 },
        { date: '2024-01-12', glasses: 7 },
      ]);

      const result = await waterRepository.getStats(7);

      expect(result.totalDaysTracked).toBe(4);
      expect(result.daysMetGoal).toBe(2); // 8 and 9 meet goal of 8
      expect(result.averageGlasses).toBeCloseTo(7.5);
    });

    it('returns zeros when no data', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await waterRepository.getStats(7);

      expect(result.totalDaysTracked).toBe(0);
      expect(result.averageGlasses).toBe(0);
      expect(result.daysMetGoal).toBe(0);
      expect(result.currentStreak).toBe(0);
    });

    it('calculates current streak correctly', async () => {
      mockGetAllAsync.mockResolvedValue([
        { date: '2024-01-15', glasses: 10 }, // met goal
        { date: '2024-01-14', glasses: 8 },  // met goal
        { date: '2024-01-13', glasses: 9 },  // met goal
        { date: '2024-01-12', glasses: 5 },  // didn't meet goal - breaks streak
      ]);

      const result = await waterRepository.getStats(7);

      expect(result.currentStreak).toBe(3);
    });
  });

  describe('deleteByDate', () => {
    it('deletes water log by date', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await waterRepository.deleteByDate('2024-01-15');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM water_log WHERE date = ?',
        ['2024-01-15']
      );
    });
  });
});
