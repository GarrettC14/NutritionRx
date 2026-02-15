import { seedWeeklyReflections, seedHealthSyncLog } from '../reflectionGenerator';

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
});

describe('seedWeeklyReflections', () => {
  it('returns a non-negative count', async () => {
    const db = createMockDb() as any;
    const result = await seedWeeklyReflections(db, 'goal-active-123', 1, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('generates reflections proportional to months', async () => {
    const db1 = createMockDb() as any;
    const db6 = createMockDb() as any;
    const count1 = await seedWeeklyReflections(db1, 'goal-1', 1, false);
    const count6 = await seedWeeklyReflections(db6, 'goal-1', 6, false);
    // 6 months should have more weeks than 1 month
    expect(count6).toBeGreaterThan(count1);
  });

  it('inserts into weekly_reflections table', async () => {
    const db = createMockDb() as any;
    await seedWeeklyReflections(db, 'goal-1', 2, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('weekly_reflections');
    }
  });

  it('associates reflections with the provided goal ID', async () => {
    const db = createMockDb() as any;
    const goalId = 'goal-test-abc';
    await seedWeeklyReflections(db, goalId, 1, false);
    // The goal_id is flattened into the batch insert values
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    if (insertCalls.length > 0) {
      const values: unknown[] = insertCalls[0][1];
      // goal_id should appear in the values
      expect(values).toContain(goalId);
    }
  });

  it('adds notes on specific weeks (3 and 7)', async () => {
    const db = createMockDb() as any;
    // Need at least 2 months (~8 weeks) to hit week 7
    await seedWeeklyReflections(db, 'goal-1', 3, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    if (insertCalls.length > 0) {
      const values: unknown[] = insertCalls[0][1];
      // Should contain at least one non-null note string
      const hasNote = values.some(
        (v) => typeof v === 'string' && (
          v.includes('Feeling good') || v.includes('Busy week')
        )
      );
      expect(hasNote).toBe(true);
    }
  });

  it('returns 0 for 0 months', async () => {
    const db = createMockDb() as any;
    const result = await seedWeeklyReflections(db, 'goal-1', 0, false);
    expect(result).toBe(0);
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedWeeklyReflections(db, 'goal-1', 1, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('weekly reflections'));
    spy.mockRestore();
  });
});

describe('seedHealthSyncLog', () => {
  it('returns 11 (fixed number of sync records)', async () => {
    const db = createMockDb() as any;
    const result = await seedHealthSyncLog(db, false);
    expect(result).toBe(11);
  });

  it('inserts into health_sync_log table', async () => {
    const db = createMockDb() as any;
    await seedHealthSyncLog(db, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    expect(insertCalls.length).toBeGreaterThan(0);
    for (const call of insertCalls) {
      expect(call[0]).toContain('health_sync_log');
    }
  });

  it('includes both healthkit and health_connect platforms', async () => {
    const db = createMockDb() as any;
    await seedHealthSyncLog(db, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    if (insertCalls.length > 0) {
      const values: unknown[] = insertCalls[0][1];
      expect(values).toContain('healthkit');
      expect(values).toContain('health_connect');
    }
  });

  it('includes one error record (index 5)', async () => {
    const db = createMockDb() as any;
    await seedHealthSyncLog(db, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    if (insertCalls.length > 0) {
      const values: unknown[] = insertCalls[0][1];
      expect(values).toContain('error');
      expect(values).toContain('Network timeout');
    }
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedHealthSyncLog(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('health sync log'));
    spy.mockRestore();
  });
});
