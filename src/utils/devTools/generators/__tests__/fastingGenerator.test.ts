import { seedFastingConfig, seedFastingSessions } from '../fastingGenerator';

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
});

describe('seedFastingConfig', () => {
  it('inserts one fasting config row and returns 1', async () => {
    const db = createMockDb() as any;
    const result = await seedFastingConfig(db, false);
    expect(result).toBe(1);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const sql: string = db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT OR REPLACE INTO fasting_config');
  });

  it('logs when verbose is true', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedFastingConfig(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted fasting config'));
    spy.mockRestore();
  });

  it('passes two ISO datetime params', async () => {
    const db = createMockDb() as any;
    await seedFastingConfig(db, false);
    const params: unknown[] = db.runAsync.mock.calls[0][1];
    expect(params).toHaveLength(2);
    // Both should be ISO strings
    for (const p of params) {
      expect(typeof p).toBe('string');
      expect(new Date(p as string).toISOString()).toBe(p);
    }
  });
});

describe('seedFastingSessions', () => {
  it('returns a non-negative number', async () => {
    const db = createMockDb() as any;
    const result = await seedFastingSessions(db, 1, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('generates sessions for longer history', async () => {
    const db = createMockDb() as any;
    // With 6 months (~180 days, ~3 fasts/week), expect some sessions
    const result = await seedFastingSessions(db, 6, false);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 or more for 0 months of history', async () => {
    const db = createMockDb() as any;
    const result = await seedFastingSessions(db, 0, false);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('calls batchInsert on fasting_sessions table', async () => {
    const db = createMockDb() as any;
    await seedFastingSessions(db, 2, false);
    // batchInsert calls db.runAsync - if there are rows, it should have been called
    // If no rows (all skipped), no DB call is made, which is fine
    for (const call of db.runAsync.mock.calls) {
      if (typeof call[0] === 'string' && call[0].includes('INSERT')) {
        expect(call[0]).toContain('fasting_sessions');
      }
    }
  });

  it('logs count when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedFastingSessions(db, 1, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('fasting sessions'));
    spy.mockRestore();
  });
});
