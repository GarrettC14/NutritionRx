/**
 * Weight Repository Tests
 * Tests for weight entry data access
 */

import { weightRepository } from '@/repositories/weightRepository';

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
  generateId: jest.fn(() => 'test-uuid-1234'),
}));

describe('weightRepository', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
  });

  const mockWeightRow = {
    id: 'weight-1',
    date: '2024-01-15',
    weight_kg: 80.5,
    notes: 'Morning weight',
    created_at: '2024-01-15T07:00:00.000Z',
    updated_at: '2024-01-15T07:00:00.000Z',
  };

  describe('findById', () => {
    it('returns weight entry when found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockWeightRow);

      const result = await weightRepository.findById('weight-1');

      expect(result).not.toBeNull();
      expect(result!.weightKg).toBe(80.5);
      expect(result!.notes).toBe('Morning weight');
    });

    it('returns null when not found', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await weightRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByDate', () => {
    it('returns weight entry for specific date', async () => {
      mockGetFirstAsync.mockResolvedValue(mockWeightRow);

      const result = await weightRepository.findByDate('2024-01-15');

      expect(result).not.toBeNull();
      expect(result!.date).toBe('2024-01-15');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE date = ?'),
        ['2024-01-15']
      );
    });
  });

  describe('findByDateRange', () => {
    it('returns entries within date range', async () => {
      mockGetAllAsync.mockResolvedValue([
        mockWeightRow,
        { ...mockWeightRow, id: 'weight-2', date: '2024-01-16', weight_kg: 80.3 },
      ]);

      const result = await weightRepository.findByDateRange('2024-01-15', '2024-01-20');

      expect(result).toHaveLength(2);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('BETWEEN ? AND ?'),
        ['2024-01-15', '2024-01-20']
      );
    });
  });

  describe('getAll', () => {
    it('returns all weight entries ordered by date', async () => {
      mockGetAllAsync.mockResolvedValue([
        { ...mockWeightRow, date: '2024-01-20' },
        mockWeightRow,
      ]);

      const result = await weightRepository.getAll();

      expect(result).toHaveLength(2);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY date DESC')
      );
    });
  });

  describe('getRecent', () => {
    it('returns limited number of recent entries', async () => {
      mockGetAllAsync.mockResolvedValue(Array(10).fill(mockWeightRow));

      const result = await weightRepository.getRecent(10);

      expect(result).toHaveLength(10);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [10]
      );
    });

    it('uses default limit of 30', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      await weightRepository.getRecent();

      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [30]
      );
    });
  });

  describe('getLatest', () => {
    it('returns most recent entry', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockWeightRow,
        date: '2024-01-20',
      });

      const result = await weightRepository.getLatest();

      expect(result).not.toBeNull();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY date DESC LIMIT 1')
      );
    });

    it('returns null when no entries exist', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await weightRepository.getLatest();

      expect(result).toBeNull();
    });
  });

  describe('getTrendWeight', () => {
    it('calculates exponential moving average', async () => {
      mockGetAllAsync.mockResolvedValue([
        { weight_kg: 80.0 },
        { weight_kg: 80.5 },
        { weight_kg: 81.0 },
        { weight_kg: 80.2 },
      ]);

      const result = await weightRepository.getTrendWeight('2024-01-15', 7);

      expect(result).not.toBeNull();
      expect(typeof result).toBe('number');
    });

    it('returns null when no weight entries', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await weightRepository.getTrendWeight('2024-01-15');

      expect(result).toBeNull();
    });
  });

  describe('getDaysWeighedInRange', () => {
    it('returns count of unique days', async () => {
      mockGetFirstAsync.mockResolvedValue({ days_weighed: 5 });

      const result = await weightRepository.getDaysWeighedInRange('2024-01-01', '2024-01-07');

      expect(result).toBe(5);
    });

    it('returns 0 when no entries', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await weightRepository.getDaysWeighedInRange('2024-01-01', '2024-01-07');

      expect(result).toBe(0);
    });
  });

  describe('create', () => {
    it('creates new weight entry', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // no existing entry
        .mockResolvedValueOnce(mockWeightRow); // return created
      mockRunAsync.mockResolvedValue(undefined);

      const result = await weightRepository.create({
        date: '2024-01-15',
        weightKg: 80.5,
        notes: 'Morning weight',
      });

      expect(result).not.toBeNull();
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO weight_entries'),
        expect.arrayContaining(['test-uuid-1234', '2024-01-15', 80.5, 'Morning weight'])
      );
    });

    it('updates existing entry for same date', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(mockWeightRow) // existing entry
        .mockResolvedValueOnce(mockWeightRow) // findById in update
        .mockResolvedValueOnce({ ...mockWeightRow, weight_kg: 80.0 }); // return updated
      mockRunAsync.mockResolvedValue(undefined);

      const result = await weightRepository.create({
        date: '2024-01-15',
        weightKg: 80.0,
      });

      expect(result).not.toBeNull();
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE weight_entries'),
        expect.any(Array)
      );
    });

    it('throws error when creation fails', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // findByDate returns no existing
        .mockResolvedValueOnce(null); // findById after insert fails
      mockRunAsync.mockResolvedValue(undefined);

      await expect(
        weightRepository.create({ date: '2024-01-15', weightKg: 80.5 })
      ).rejects.toThrow('Failed to create weight entry');
    });
  });

  describe('update', () => {
    it('updates weight entry', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...mockWeightRow, weight_kg: 79.5 });
      mockRunAsync.mockResolvedValue(undefined);

      const result = await weightRepository.update('weight-1', { weightKg: 79.5 });

      expect(result.weightKg).toBe(79.5);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE weight_entries'),
        expect.arrayContaining([79.5, 'weight-1'])
      );
    });

    it('updates notes', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...mockWeightRow,
        notes: 'Updated notes',
      });
      mockRunAsync.mockResolvedValue(undefined);

      const result = await weightRepository.update('weight-1', { notes: 'Updated notes' });

      expect(result.notes).toBe('Updated notes');
    });

    it('throws error when entry not found', async () => {
      mockRunAsync.mockResolvedValue(undefined);
      mockGetFirstAsync.mockResolvedValue(null);

      await expect(
        weightRepository.update('non-existent', { weightKg: 80 })
      ).rejects.toThrow('Weight entry not found');
    });
  });

  describe('delete', () => {
    it('deletes entry by id', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await weightRepository.delete('weight-1');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM weight_entries WHERE id = ?',
        ['weight-1']
      );
    });
  });

  describe('deleteByDate', () => {
    it('deletes entry by date', async () => {
      mockRunAsync.mockResolvedValue(undefined);

      await weightRepository.deleteByDate('2024-01-15');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM weight_entries WHERE date = ?',
        ['2024-01-15']
      );
    });
  });

  describe('exists', () => {
    it('returns true when entry exists', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 1 });

      const result = await weightRepository.exists('weight-1');

      expect(result).toBe(true);
    });

    it('returns false when entry does not exist', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 0 });

      const result = await weightRepository.exists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('existsByDate', () => {
    it('returns true when entry exists for date', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 1 });

      const result = await weightRepository.existsByDate('2024-01-15');

      expect(result).toBe(true);
    });

    it('returns false when no entry for date', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 0 });

      const result = await weightRepository.existsByDate('2024-01-20');

      expect(result).toBe(false);
    });
  });
});
