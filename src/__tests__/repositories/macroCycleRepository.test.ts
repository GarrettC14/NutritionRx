/**
 * Macro Cycle Repository Tests
 * Tests for macro cycling configuration, overrides, redistribution, and day targeting
 */

import {
  macroCycleRepository,
  DEFAULT_MACRO_CYCLE_CONFIG,
} from '@/repositories/macroCycleRepository';
import { MacroCycleConfig, DayTargets } from '@/types/planning';

// Mock the database module
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();
const mockExecAsync = jest.fn();

const mockDb = {
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
  runAsync: mockRunAsync,
  execAsync: mockExecAsync,
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-uuid-macro'),
}));

// ============================================================
// Helpers
// ============================================================

const NOW_ISO = '2024-01-15T12:00:00.000Z';

function makeConfigRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    enabled: 1,
    pattern_type: 'training_rest',
    marked_days: '[1,3,5]',
    day_targets: '{}',
    locked_days: '[]',
    redistribution_start_day: 0,
    created_at: NOW_ISO,
    last_modified: NOW_ISO,
    ...overrides,
  };
}

function makeOverrideRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'override-1',
    date: '2024-01-15',
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 67,
    created_at: NOW_ISO,
    ...overrides,
  };
}

const baseTargets: DayTargets = {
  calories: 2200,
  protein: 165,
  carbs: 220,
  fat: 73,
};

// ============================================================
// Tests
// ============================================================

describe('macroCycleRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(NOW_ISO);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ----------------------------------------------------------
  // DEFAULT_MACRO_CYCLE_CONFIG
  // ----------------------------------------------------------

  describe('DEFAULT_MACRO_CYCLE_CONFIG', () => {
    it('has expected default values', () => {
      expect(DEFAULT_MACRO_CYCLE_CONFIG).toEqual({
        enabled: false,
        patternType: 'training_rest',
        markedDays: [],
        dayTargets: {},
        lockedDays: [],
        redistributionStartDay: 0,
      });
    });
  });

  // ----------------------------------------------------------
  // getConfig
  // ----------------------------------------------------------

  describe('getConfig', () => {
    it('returns null when no config row exists', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await macroCycleRepository.getConfig();

      expect(result).toBeNull();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM macro_cycle_config WHERE id = 1'
      );
    });

    it('maps config row to domain object', async () => {
      mockGetFirstAsync.mockResolvedValue(makeConfigRow());

      const result = await macroCycleRepository.getConfig();

      expect(result).toEqual({
        enabled: true,
        patternType: 'training_rest',
        markedDays: [1, 3, 5],
        dayTargets: {},
        lockedDays: [],
        redistributionStartDay: 0,
        createdAt: NOW_ISO,
        lastModified: NOW_ISO,
      });
    });

    it('maps enabled=0 to false', async () => {
      mockGetFirstAsync.mockResolvedValue(makeConfigRow({ enabled: 0 }));

      const result = await macroCycleRepository.getConfig();

      expect(result!.enabled).toBe(false);
    });

    it('parses complex day_targets JSON', async () => {
      const dayTargets = {
        1: { calories: 2500, protein: 180, carbs: 280, fat: 80 },
        5: { calories: 1800, protein: 140, carbs: 160, fat: 60 },
      };
      mockGetFirstAsync.mockResolvedValue(
        makeConfigRow({ day_targets: JSON.stringify(dayTargets) })
      );

      const result = await macroCycleRepository.getConfig();

      expect(result!.dayTargets).toEqual(dayTargets);
    });

    it('defaults locked_days to empty array when null', async () => {
      mockGetFirstAsync.mockResolvedValue(
        makeConfigRow({ locked_days: null })
      );

      const result = await macroCycleRepository.getConfig();

      expect(result!.lockedDays).toEqual([]);
    });

    it('defaults redistribution_start_day to 0 when null', async () => {
      mockGetFirstAsync.mockResolvedValue(
        makeConfigRow({ redistribution_start_day: null })
      );

      const result = await macroCycleRepository.getConfig();

      expect(result!.redistributionStartDay).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // getOrCreateConfig
  // ----------------------------------------------------------

  describe('getOrCreateConfig', () => {
    it('returns existing config when it already exists', async () => {
      const row = makeConfigRow();
      mockGetFirstAsync.mockResolvedValue(row);

      const result = await macroCycleRepository.getOrCreateConfig();

      expect(result.patternType).toBe('training_rest');
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('creates config and returns it when none exists', async () => {
      // First call: getConfig() returns null (no config)
      // Second call: getConfig() after insert returns the new row
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // getConfig() → null
        .mockResolvedValueOnce(makeConfigRow({ enabled: 0, marked_days: '[]' })); // getConfig() after insert

      mockRunAsync.mockResolvedValue({ changes: 1 });

      const result = await macroCycleRepository.getOrCreateConfig();

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO macro_cycle_config'),
        [NOW_ISO, NOW_ISO]
      );
      expect(result.enabled).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // updateConfig
  // ----------------------------------------------------------

  describe('updateConfig', () => {
    it('updates enabled field', async () => {
      // getOrCreateConfig calls getConfig which returns a row
      const row = makeConfigRow();
      mockGetFirstAsync.mockResolvedValue(row);
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.updateConfig({ enabled: true });

      const updateCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toContain('enabled = ?');
      expect(updateCall![1]).toContain(1);
    });

    it('updates patternType field', async () => {
      mockGetFirstAsync.mockResolvedValue(makeConfigRow());
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.updateConfig({ patternType: 'high_low_carb' });

      const updateCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
      );
      expect(updateCall![0]).toContain('pattern_type = ?');
      expect(updateCall![1]).toContain('high_low_carb');
    });

    it('updates markedDays as JSON string', async () => {
      mockGetFirstAsync.mockResolvedValue(makeConfigRow());
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.updateConfig({ markedDays: [0, 2, 4, 6] });

      const updateCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
      );
      expect(updateCall![1]).toContain('[0,2,4,6]');
    });

    it('updates dayTargets as JSON string', async () => {
      const newTargets = { 1: { calories: 2500, protein: 180, carbs: 280, fat: 80 } };
      mockGetFirstAsync.mockResolvedValue(makeConfigRow());
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.updateConfig({ dayTargets: newTargets });

      const updateCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
      );
      expect(updateCall![1]).toContain(JSON.stringify(newTargets));
    });

    it('updates lockedDays as JSON string', async () => {
      mockGetFirstAsync.mockResolvedValue(makeConfigRow());
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.updateConfig({ lockedDays: [0, 6] });

      const updateCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
      );
      expect(updateCall![1]).toContain('[0,6]');
    });

    it('updates redistributionStartDay', async () => {
      mockGetFirstAsync.mockResolvedValue(makeConfigRow());
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.updateConfig({ redistributionStartDay: 3 });

      const updateCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
      );
      expect(updateCall![1]).toContain(3);
    });

    it('always sets last_modified', async () => {
      mockGetFirstAsync.mockResolvedValue(makeConfigRow());
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.updateConfig({ enabled: false });

      const updateCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
      );
      expect(updateCall![0]).toContain('last_modified = ?');
      expect(updateCall![1][0]).toBe(NOW_ISO);
    });

    it('updates multiple fields at once', async () => {
      mockGetFirstAsync.mockResolvedValue(makeConfigRow());
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.updateConfig({
        enabled: true,
        patternType: 'custom',
        markedDays: [1, 2],
      });

      const updateCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
      );
      expect(updateCall![0]).toContain('enabled = ?');
      expect(updateCall![0]).toContain('pattern_type = ?');
      expect(updateCall![0]).toContain('marked_days = ?');
    });
  });

  // ----------------------------------------------------------
  // disableCycling
  // ----------------------------------------------------------

  describe('disableCycling', () => {
    it('sets enabled to false via updateConfig', async () => {
      mockGetFirstAsync.mockResolvedValue(makeConfigRow());
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.disableCycling();

      const updateCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('UPDATE')
      );
      expect(updateCall![0]).toContain('enabled = ?');
      expect(updateCall![1]).toContain(0);
    });
  });

  // ----------------------------------------------------------
  // getDayType
  // ----------------------------------------------------------

  describe('getDayType', () => {
    const enabledConfig = (
      patternType: string,
      markedDays: number[] = [1, 3, 5]
    ): MacroCycleConfig => ({
      enabled: true,
      patternType: patternType as MacroCycleConfig['patternType'],
      markedDays,
      dayTargets: {},
      lockedDays: [],
      redistributionStartDay: 0,
      createdAt: NOW_ISO,
      lastModified: NOW_ISO,
    });

    it('returns null when config is disabled', () => {
      const config = enabledConfig('training_rest');
      config.enabled = false;

      expect(macroCycleRepository.getDayType(1, config)).toBeNull();
    });

    // training_rest
    it('returns "training" for marked day with training_rest pattern', () => {
      expect(macroCycleRepository.getDayType(1, enabledConfig('training_rest'))).toBe('training');
      expect(macroCycleRepository.getDayType(3, enabledConfig('training_rest'))).toBe('training');
      expect(macroCycleRepository.getDayType(5, enabledConfig('training_rest'))).toBe('training');
    });

    it('returns "rest" for unmarked day with training_rest pattern', () => {
      expect(macroCycleRepository.getDayType(0, enabledConfig('training_rest'))).toBe('rest');
      expect(macroCycleRepository.getDayType(2, enabledConfig('training_rest'))).toBe('rest');
      expect(macroCycleRepository.getDayType(4, enabledConfig('training_rest'))).toBe('rest');
      expect(macroCycleRepository.getDayType(6, enabledConfig('training_rest'))).toBe('rest');
    });

    // high_low_carb
    it('returns "high_carb" for marked day with high_low_carb pattern', () => {
      expect(macroCycleRepository.getDayType(1, enabledConfig('high_low_carb'))).toBe('high_carb');
    });

    it('returns "low_carb" for unmarked day with high_low_carb pattern', () => {
      expect(macroCycleRepository.getDayType(0, enabledConfig('high_low_carb'))).toBe('low_carb');
    });

    // even_distribution
    it('returns "even" for any day with even_distribution pattern', () => {
      const config = enabledConfig('even_distribution');
      for (let d = 0; d < 7; d++) {
        expect(macroCycleRepository.getDayType(d, config)).toBe('even');
      }
    });

    // custom
    it('returns "custom" for any day with custom pattern', () => {
      const config = enabledConfig('custom');
      expect(macroCycleRepository.getDayType(0, config)).toBe('custom');
      expect(macroCycleRepository.getDayType(6, config)).toBe('custom');
    });

    // redistribution
    it('returns "custom" for redistribution pattern', () => {
      const config = enabledConfig('redistribution');
      expect(macroCycleRepository.getDayType(3, config)).toBe('custom');
    });

    // Unknown pattern (defensive)
    it('returns null for unknown pattern type', () => {
      const config = enabledConfig('unknown_pattern');
      expect(macroCycleRepository.getDayType(0, config)).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // getTargetsForDate
  // ----------------------------------------------------------

  describe('getTargetsForDate', () => {
    it('returns override targets when an override exists for the date', async () => {
      const overrideRow = makeOverrideRow();
      mockGetFirstAsync.mockResolvedValue(overrideRow);

      const result = await macroCycleRepository.getTargetsForDate('2024-01-15', baseTargets);

      expect(result).toEqual({
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 67,
      });
    });

    it('returns base targets when no override and config is null', async () => {
      // First call: getOverrideByDate → null
      // Second call: getConfig → null
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // override
        .mockResolvedValueOnce(null); // config

      const result = await macroCycleRepository.getTargetsForDate('2024-01-15', baseTargets);

      expect(result).toEqual(baseTargets);
    });

    it('returns base targets when no override and config is disabled', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // override
        .mockResolvedValueOnce(makeConfigRow({ enabled: 0 })); // config disabled

      const result = await macroCycleRepository.getTargetsForDate('2024-01-15', baseTargets);

      expect(result).toEqual(baseTargets);
    });

    it('returns day-specific targets from config when available', async () => {
      // 2024-01-15 is a Monday (dayOfWeek = 1)
      const dayTargets = {
        1: { calories: 2500, protein: 180, carbs: 280, fat: 80 },
      };
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // override
        .mockResolvedValueOnce(
          makeConfigRow({
            enabled: 1,
            day_targets: JSON.stringify(dayTargets),
          })
        );

      const result = await macroCycleRepository.getTargetsForDate('2024-01-15', baseTargets);

      expect(result).toEqual(dayTargets[1]);
    });

    it('returns base targets when config is enabled but no targets for that day', async () => {
      // 2024-01-15 is Monday (dayOfWeek = 1), but we only have targets for day 3
      const dayTargets = {
        3: { calories: 1800, protein: 140, carbs: 160, fat: 60 },
      };
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // override
        .mockResolvedValueOnce(
          makeConfigRow({
            enabled: 1,
            day_targets: JSON.stringify(dayTargets),
          })
        );

      const result = await macroCycleRepository.getTargetsForDate('2024-01-15', baseTargets);

      expect(result).toEqual(baseTargets);
    });
  });

  // ----------------------------------------------------------
  // Override CRUD
  // ----------------------------------------------------------

  describe('getOverrideByDate', () => {
    it('returns null when no override exists', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await macroCycleRepository.getOverrideByDate('2024-01-15');

      expect(result).toBeNull();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM macro_cycle_overrides WHERE date = ?',
        ['2024-01-15']
      );
    });

    it('returns mapped override when row exists', async () => {
      mockGetFirstAsync.mockResolvedValue(makeOverrideRow());

      const result = await macroCycleRepository.getOverrideByDate('2024-01-15');

      expect(result).toEqual({
        id: 'override-1',
        date: '2024-01-15',
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 67,
        createdAt: NOW_ISO,
      });
    });
  });

  describe('setOverride', () => {
    const targets: DayTargets = {
      calories: 2500,
      protein: 180,
      carbs: 280,
      fat: 80,
    };

    it('deletes existing override then inserts new one', async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValue(
        makeOverrideRow({ id: 'test-uuid-macro', calories: 2500, protein: 180, carbs: 280, fat: 80 })
      );

      await macroCycleRepository.setOverride('2024-01-15', targets);

      // First call: DELETE
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM macro_cycle_overrides WHERE date = ?',
        ['2024-01-15']
      );

      // Second call: INSERT
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO macro_cycle_overrides'),
        ['test-uuid-macro', '2024-01-15', 2500, 180, 280, 80, NOW_ISO]
      );
    });

    it('returns the newly created override', async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValue(
        makeOverrideRow({ id: 'test-uuid-macro', calories: 2500, protein: 180, carbs: 280, fat: 80 })
      );

      const result = await macroCycleRepository.setOverride('2024-01-15', targets);

      expect(result.id).toBe('test-uuid-macro');
      expect(result.calories).toBe(2500);
    });
  });

  describe('clearOverride', () => {
    it('deletes override for the given date', async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.clearOverride('2024-01-15');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM macro_cycle_overrides WHERE date = ?',
        ['2024-01-15']
      );
    });
  });

  describe('getAllOverrides', () => {
    it('returns empty array when no overrides exist', async () => {
      mockGetAllAsync.mockResolvedValue([]);

      const result = await macroCycleRepository.getAllOverrides();

      expect(result).toEqual([]);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM macro_cycle_overrides ORDER BY date ASC'
      );
    });

    it('returns mapped overrides sorted by date', async () => {
      mockGetAllAsync.mockResolvedValue([
        makeOverrideRow({ id: 'o1', date: '2024-01-15' }),
        makeOverrideRow({ id: 'o2', date: '2024-01-16' }),
      ]);

      const result = await macroCycleRepository.getAllOverrides();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('o1');
      expect(result[1].id).toBe('o2');
      expect(result[0].date).toBe('2024-01-15');
      expect(result[1].date).toBe('2024-01-16');
    });
  });

  describe('clearAllOverrides', () => {
    it('deletes all overrides', async () => {
      mockRunAsync.mockResolvedValue({ changes: 5 });

      await macroCycleRepository.clearAllOverrides();

      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM macro_cycle_overrides');
    });
  });

  // ----------------------------------------------------------
  // saveRedistributionOverrides (transaction)
  // ----------------------------------------------------------

  describe('saveRedistributionOverrides', () => {
    const overrides = [
      { date: '2024-01-15', calories: 2000, protein: 150, carbs: 200, fat: 67 },
      { date: '2024-01-16', calories: 2400, protein: 170, carbs: 260, fat: 80 },
    ];

    it('wraps operations in a transaction and commits on success', async () => {
      mockExecAsync.mockResolvedValue(undefined);
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.saveRedistributionOverrides(overrides);

      // BEGIN
      expect(mockExecAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');

      // DELETE existing for those dates
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM macro_cycle_overrides WHERE date IN (?,?)',
        ['2024-01-15', '2024-01-16']
      );

      // Two INSERTs
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO macro_cycle_overrides'),
        ['test-uuid-macro', '2024-01-15', 2000, 150, 200, 67, NOW_ISO]
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO macro_cycle_overrides'),
        ['test-uuid-macro', '2024-01-16', 2400, 170, 260, 80, NOW_ISO]
      );

      // COMMIT
      expect(mockExecAsync).toHaveBeenCalledWith('COMMIT');

      // No ROLLBACK
      expect(mockExecAsync).not.toHaveBeenCalledWith('ROLLBACK');
    });

    it('rolls back transaction on error and rethrows', async () => {
      mockExecAsync.mockResolvedValue(undefined);
      // First runAsync (DELETE) succeeds, second (INSERT) fails
      mockRunAsync
        .mockResolvedValueOnce({ changes: 1 }) // DELETE
        .mockRejectedValueOnce(new Error('INSERT failed'));

      await expect(
        macroCycleRepository.saveRedistributionOverrides(overrides)
      ).rejects.toThrow('INSERT failed');

      expect(mockExecAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockExecAsync).toHaveBeenCalledWith('ROLLBACK');
      expect(mockExecAsync).not.toHaveBeenCalledWith('COMMIT');
    });

    it('handles single override', async () => {
      mockExecAsync.mockResolvedValue(undefined);
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.saveRedistributionOverrides([
        { date: '2024-01-15', calories: 2000, protein: 150, carbs: 200, fat: 67 },
      ]);

      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM macro_cycle_overrides WHERE date IN (?)',
        ['2024-01-15']
      );
      expect(mockExecAsync).toHaveBeenCalledWith('COMMIT');
    });

    it('handles empty overrides array', async () => {
      mockExecAsync.mockResolvedValue(undefined);
      mockRunAsync.mockResolvedValue({ changes: 0 });

      await macroCycleRepository.saveRedistributionOverrides([]);

      expect(mockExecAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockExecAsync).toHaveBeenCalledWith('COMMIT');
    });
  });

  // ----------------------------------------------------------
  // getRedistributionConfig
  // ----------------------------------------------------------

  describe('getRedistributionConfig', () => {
    it('returns defaults when no config exists', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await macroCycleRepository.getRedistributionConfig();

      expect(result).toEqual({
        lockedDays: [],
        redistributionStartDay: 0,
      });
    });

    it('returns lockedDays and redistributionStartDay from config', async () => {
      mockGetFirstAsync.mockResolvedValue(
        makeConfigRow({
          locked_days: '[0,6]',
          redistribution_start_day: 3,
        })
      );

      const result = await macroCycleRepository.getRedistributionConfig();

      expect(result).toEqual({
        lockedDays: [0, 6],
        redistributionStartDay: 3,
      });
    });
  });

  // ----------------------------------------------------------
  // setRedistributionConfig
  // ----------------------------------------------------------

  describe('setRedistributionConfig', () => {
    it('ensures config exists then updates locked_days and redistribution_start_day', async () => {
      // getOrCreateConfig → getConfig returns existing row
      mockGetFirstAsync.mockResolvedValue(makeConfigRow());
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.setRedistributionConfig({
        lockedDays: [2, 4],
        redistributionStartDay: 1,
      });

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE macro_cycle_config SET'),
        ['[2,4]', 1, NOW_ISO]
      );
    });

    it('creates config first if none exists', async () => {
      // First getConfig → null (triggers insert), then subsequent calls return the row
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // getOrCreateConfig → getConfig → null
        .mockResolvedValueOnce(makeConfigRow({ enabled: 0 })); // after insert, getConfig returns row

      mockRunAsync.mockResolvedValue({ changes: 1 });

      await macroCycleRepository.setRedistributionConfig({
        lockedDays: [],
        redistributionStartDay: 0,
      });

      // Should have INSERT (create) and then UPDATE (set redistribution)
      const insertCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
      );
      const updateCall = mockRunAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('UPDATE')
      );

      expect(insertCall).toBeDefined();
      expect(updateCall).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // calculateWeeklyAverage
  // ----------------------------------------------------------

  describe('calculateWeeklyAverage', () => {
    const makeConfig = (dayTargets: Record<number, DayTargets>): MacroCycleConfig => ({
      enabled: true,
      patternType: 'custom',
      markedDays: [],
      dayTargets,
      lockedDays: [],
      redistributionStartDay: 0,
      createdAt: NOW_ISO,
      lastModified: NOW_ISO,
    });

    it('returns zeros when no day targets exist', () => {
      const config = makeConfig({});

      const result = macroCycleRepository.calculateWeeklyAverage(config);

      expect(result).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it('returns exact values when only one day has targets', () => {
      const config = makeConfig({
        1: { calories: 2000, protein: 150, carbs: 200, fat: 67 },
      });

      const result = macroCycleRepository.calculateWeeklyAverage(config);

      expect(result).toEqual({ calories: 2000, protein: 150, carbs: 200, fat: 67 });
    });

    it('averages across multiple days with targets', () => {
      const config = makeConfig({
        0: { calories: 2000, protein: 150, carbs: 200, fat: 67 },
        1: { calories: 2500, protein: 180, carbs: 280, fat: 80 },
        2: { calories: 1800, protein: 140, carbs: 160, fat: 60 },
      });

      const result = macroCycleRepository.calculateWeeklyAverage(config);

      // (2000 + 2500 + 1800) / 3 = 2100
      expect(result.calories).toBe(Math.round((2000 + 2500 + 1800) / 3));
      // (150 + 180 + 140) / 3 ≈ 157
      expect(result.protein).toBe(Math.round((150 + 180 + 140) / 3));
      // (200 + 280 + 160) / 3 ≈ 213
      expect(result.carbs).toBe(Math.round((200 + 280 + 160) / 3));
      // (67 + 80 + 60) / 3 ≈ 69
      expect(result.fat).toBe(Math.round((67 + 80 + 60) / 3));
    });

    it('averages all 7 days when all have targets', () => {
      const targets: Record<number, DayTargets> = {};
      for (let d = 0; d < 7; d++) {
        targets[d] = { calories: 2000 + d * 100, protein: 150, carbs: 200, fat: 67 };
      }
      const config = makeConfig(targets);

      const result = macroCycleRepository.calculateWeeklyAverage(config);

      // Calories: (2000 + 2100 + 2200 + 2300 + 2400 + 2500 + 2600) / 7 = 2300
      expect(result.calories).toBe(2300);
      expect(result.protein).toBe(150);
      expect(result.carbs).toBe(200);
      expect(result.fat).toBe(67);
    });

    it('rounds the average values', () => {
      const config = makeConfig({
        0: { calories: 2001, protein: 151, carbs: 201, fat: 68 },
        1: { calories: 2002, protein: 152, carbs: 202, fat: 69 },
        2: { calories: 2000, protein: 150, carbs: 200, fat: 67 },
      });

      const result = macroCycleRepository.calculateWeeklyAverage(config);

      // Each should be Math.round of the division
      expect(result.calories).toBe(Math.round((2001 + 2002 + 2000) / 3));
      expect(result.protein).toBe(Math.round((151 + 152 + 150) / 3));
      expect(result.carbs).toBe(Math.round((201 + 202 + 200) / 3));
      expect(result.fat).toBe(Math.round((68 + 69 + 67) / 3));
    });
  });
});
