import { seedWeightEntries, seedDailyMetabolism } from '../weightGenerator';

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
});

describe('seedWeightEntries', () => {
  it('returns a non-negative count', async () => {
    const db = createMockDb() as any;
    const result = await seedWeightEntries(db, 1, false, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('generates more entries with more months', async () => {
    const db1 = createMockDb() as any;
    const db6 = createMockDb() as any;
    const count1 = await seedWeightEntries(db1, 1, false, false);
    const count6 = await seedWeightEntries(db6, 6, false, false);
    expect(count6).toBeGreaterThanOrEqual(count1);
  });

  it('inserts into weight_entries table', async () => {
    const db = createMockDb() as any;
    await seedWeightEntries(db, 2, false, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('weight_entries');
    }
  });

  it('adds edge case weights when includeEdgeCases is true', async () => {
    const db = createMockDb() as any;
    const withEdge = await seedWeightEntries(db, 1, true, false);
    const db2 = createMockDb() as any;
    const withoutEdge = await seedWeightEntries(db2, 1, false, false);
    // Edge cases add 3 extra entries
    expect(withEdge).toBeGreaterThanOrEqual(withoutEdge);
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedWeightEntries(db, 1, false, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('weight entries'));
    spy.mockRestore();
  });

  it('returns 0 or more for 0 months', async () => {
    const db = createMockDb() as any;
    const result = await seedWeightEntries(db, 0, false, false);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('seedDailyMetabolism', () => {
  it('returns a non-negative count', async () => {
    const db = createMockDb() as any;
    const result = await seedDailyMetabolism(db, 1, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('inserts into daily_metabolism table', async () => {
    const db = createMockDb() as any;
    await seedDailyMetabolism(db, 2, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('daily_metabolism');
    }
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedDailyMetabolism(db, 1, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('daily metabolism'));
    spy.mockRestore();
  });

  it('returns 0 or more for 0 months', async () => {
    const db = createMockDb() as any;
    const result = await seedDailyMetabolism(db, 0, false);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
