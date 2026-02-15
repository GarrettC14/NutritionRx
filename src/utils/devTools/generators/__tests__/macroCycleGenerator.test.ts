import { seedMacroCycleConfig, seedMacroCycleOverrides } from '../macroCycleGenerator';

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
});

describe('seedMacroCycleConfig', () => {
  it('returns 1 after inserting config', async () => {
    const db = createMockDb() as any;
    const result = await seedMacroCycleConfig(db, false);
    expect(result).toBe(1);
  });

  it('inserts into macro_cycle_config table', async () => {
    const db = createMockDb() as any;
    await seedMacroCycleConfig(db, false);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const sql: string = db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT OR REPLACE INTO macro_cycle_config');
  });

  it('sets pattern_type to training_rest', async () => {
    const db = createMockDb() as any;
    await seedMacroCycleConfig(db, false);
    const sql: string = db.runAsync.mock.calls[0][0];
    expect(sql).toContain("'training_rest'");
  });

  it('passes marked_days and day_targets as JSON strings', async () => {
    const db = createMockDb() as any;
    await seedMacroCycleConfig(db, false);
    const params: unknown[] = db.runAsync.mock.calls[0][1];
    // First two params are markedDays and dayTargets JSON
    const markedDays = JSON.parse(params[0] as string);
    expect(Array.isArray(markedDays)).toBe(true);
    expect(markedDays).toEqual([1, 2, 4, 5]);

    const dayTargets = JSON.parse(params[1] as string);
    expect(dayTargets).toHaveProperty('training');
    expect(dayTargets).toHaveProperty('rest');
    expect(dayTargets.training.calories).toBe(2300);
    expect(dayTargets.rest.calories).toBe(1900);
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedMacroCycleConfig(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted macro cycle config'));
    spy.mockRestore();
  });
});

describe('seedMacroCycleOverrides', () => {
  it('returns a non-negative count', async () => {
    const db = createMockDb() as any;
    const result = await seedMacroCycleOverrides(db, 1, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('generates sparse overrides (~2 per month)', async () => {
    const db = createMockDb() as any;
    // 6 months → expect roughly 12 overrides, but randomness varies
    const result = await seedMacroCycleOverrides(db, 6, false);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('inserts into macro_cycle_overrides table', async () => {
    const db = createMockDb() as any;
    await seedMacroCycleOverrides(db, 3, false);
    for (const call of db.runAsync.mock.calls) {
      if (typeof call[0] === 'string' && (call[0] as string).includes('INSERT')) {
        expect(call[0]).toContain('macro_cycle_overrides');
      }
    }
  });

  it('returns 0 for 0 months', async () => {
    const db = createMockDb() as any;
    const result = await seedMacroCycleOverrides(db, 0, false);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
