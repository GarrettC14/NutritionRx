import { seedWaterLog } from '../waterGenerator';

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
});

describe('seedWaterLog', () => {
  it('returns a non-negative count', async () => {
    const db = createMockDb() as any;
    const result = await seedWaterLog(db, 1, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('generates more entries for more months', async () => {
    const db1 = createMockDb() as any;
    const db6 = createMockDb() as any;
    const count1 = await seedWaterLog(db1, 1, false);
    const count6 = await seedWaterLog(db6, 6, false);
    // 6 months should generally produce more entries than 1 month
    // (though randomness means this isn't guaranteed, it should be true on average)
    expect(count6).toBeGreaterThanOrEqual(count1);
  });

  it('inserts into water_log table', async () => {
    const db = createMockDb() as any;
    await seedWaterLog(db, 2, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('water_log');
    }
  });

  it('returns 0 or more for 0 months', async () => {
    const db = createMockDb() as any;
    const result = await seedWaterLog(db, 0, false);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('logs count when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedWaterLog(db, 1, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('water log'));
    spy.mockRestore();
  });
});
