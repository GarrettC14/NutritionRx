/**
 * Reflection Repository Tests
 * Tests for weekly reflection data access
 */

import { reflectionRepository } from '@/repositories/reflectionRepository';

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

describe('reflectionRepository', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
    mockGetAllAsync.mockResolvedValue([]);
  });

  const mockReflectionRow = {
    id: 1,
    reflected_at: '2024-01-15',
    weight_kg: 80.5,
    weight_trend_kg: 80.2,
    sentiment: 'positive',
    previous_calories: 2000,
    previous_protein_g: 150,
    previous_carbs_g: 200,
    previous_fat_g: 67,
    new_calories: 1900,
    new_protein_g: 160,
    new_carbs_g: 190,
    new_fat_g: 63,
    weight_change_kg: -0.5,
    created_at: '2024-01-15T00:00:00.000Z',
  };

  describe('create', () => {
    it('returns lastInsertRowId on success', async () => {
      mockRunAsync.mockResolvedValue({ lastInsertRowId: 42 });

      const result = await reflectionRepository.create({
        reflectedAt: '2024-01-15',
        weightKg: 80.5,
        weightTrendKg: 80.2,
        sentiment: 'positive',
        previousCalories: 2000,
        previousProteinG: 150,
        previousCarbsG: 200,
        previousFatG: 67,
        newCalories: 1900,
        newProteinG: 160,
        newCarbsG: 190,
        newFatG: 63,
        weightChangeKg: -0.5,
      });

      expect(result).toBe(42);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reflections'),
        [
          '2024-01-15',
          80.5,
          80.2,
          'positive',
          2000,
          150,
          200,
          67,
          1900,
          160,
          190,
          63,
          -0.5,
        ]
      );
    });

    it('handles null optional fields (sentiment, weightTrendKg, weightChangeKg)', async () => {
      mockRunAsync.mockResolvedValue({ lastInsertRowId: 7 });

      const result = await reflectionRepository.create({
        reflectedAt: '2024-01-22',
        weightKg: 81.0,
        weightTrendKg: null,
        sentiment: null,
        previousCalories: 2100,
        previousProteinG: 155,
        previousCarbsG: 210,
        previousFatG: 70,
        newCalories: 2000,
        newProteinG: 160,
        newCarbsG: 200,
        newFatG: 67,
        weightChangeKg: null,
      });

      expect(result).toBe(7);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reflections'),
        [
          '2024-01-22',
          81.0,
          null,
          null,
          2100,
          155,
          210,
          70,
          2000,
          160,
          200,
          67,
          null,
        ]
      );
    });
  });

  describe('getLatest', () => {
    it('returns mapped reflection when found', async () => {
      mockGetFirstAsync.mockResolvedValue(mockReflectionRow);

      const result = await reflectionRepository.getLatest();

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.reflectedAt).toBe('2024-01-15');
      expect(result!.weightKg).toBe(80.5);
      expect(result!.weightTrendKg).toBe(80.2);
      expect(result!.sentiment).toBe('positive');
      expect(result!.previousCalories).toBe(2000);
      expect(result!.previousProteinG).toBe(150);
      expect(result!.previousCarbsG).toBe(200);
      expect(result!.previousFatG).toBe(67);
      expect(result!.newCalories).toBe(1900);
      expect(result!.newProteinG).toBe(160);
      expect(result!.newCarbsG).toBe(190);
      expect(result!.newFatG).toBe(63);
      expect(result!.weightChangeKg).toBe(-0.5);
      expect(result!.createdAt).toBe('2024-01-15T00:00:00.000Z');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY reflected_at DESC LIMIT 1')
      );
    });

    it('returns null when no reflections exist', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await reflectionRepository.getLatest();

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('returns all reflections without limit', async () => {
      mockGetAllAsync.mockResolvedValue([
        mockReflectionRow,
        { ...mockReflectionRow, id: 2, reflected_at: '2024-01-08' },
      ]);

      const result = await reflectionRepository.getAll();

      expect(result).toHaveLength(2);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY reflected_at DESC'),
        []
      );
      // Verify the SQL does NOT contain LIMIT when no limit is passed
      const sql = mockGetAllAsync.mock.calls[0][0] as string;
      expect(sql).not.toContain('LIMIT');
    });

    it('returns reflections with limit', async () => {
      mockGetAllAsync.mockResolvedValue([mockReflectionRow]);

      const result = await reflectionRepository.getAll(5);

      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [5]
      );
    });

    it('returns empty array when no reflections exist', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await reflectionRepository.getAll();

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  describe('getByDateRange', () => {
    it('returns reflections within date range', async () => {
      mockGetAllAsync.mockResolvedValue([
        mockReflectionRow,
        { ...mockReflectionRow, id: 2, reflected_at: '2024-01-22' },
      ]);

      const result = await reflectionRepository.getByDateRange('2024-01-01', '2024-01-31');

      expect(result).toHaveLength(2);
      expect(result[0].reflectedAt).toBe('2024-01-15');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('BETWEEN ? AND ?'),
        ['2024-01-01', '2024-01-31']
      );
    });

    it('returns empty array when no reflections in range', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await reflectionRepository.getByDateRange('2025-06-01', '2025-06-30');

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  describe('getRecentSentiments', () => {
    it('returns mapped sentiment and reflectedAt', async () => {
      mockGetAllAsync.mockResolvedValue([
        { sentiment: 'positive', reflected_at: '2024-01-15' },
        { sentiment: 'neutral', reflected_at: '2024-01-08' },
        { sentiment: null, reflected_at: '2024-01-01' },
      ]);

      const result = await reflectionRepository.getRecentSentiments(3);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ sentiment: 'positive', reflectedAt: '2024-01-15' });
      expect(result[1]).toEqual({ sentiment: 'neutral', reflectedAt: '2024-01-08' });
      expect(result[2]).toEqual({ sentiment: null, reflectedAt: '2024-01-01' });
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT sentiment, reflected_at FROM reflections'),
        [3]
      );
    });
  });

  describe('getCount', () => {
    it('returns reflection count', async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 12 });

      const result = await reflectionRepository.getCount();

      expect(result).toBe(12);
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)')
      );
    });

    it('returns 0 when no reflections exist', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await reflectionRepository.getCount();

      expect(result).toBe(0);
    });
  });

  describe('getLastReflectionDate', () => {
    it('returns the most recent reflection date', async () => {
      mockGetFirstAsync.mockResolvedValue({ reflected_at: '2024-01-15' });

      const result = await reflectionRepository.getLastReflectionDate();

      expect(result).toBe('2024-01-15');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY reflected_at DESC LIMIT 1')
      );
    });

    it('returns null when no reflections exist', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await reflectionRepository.getLastReflectionDate();

      expect(result).toBeNull();
    });
  });
});
