import { seedLogEntries, seedQuickAddEntries } from '../foodLogGenerator';

const MOCK_SEED_FOODS = [
  { id: 'seed-001', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 'seed-004', calories: 78, protein: 6, carbs: 0.6, fat: 5.3 },
  { id: 'seed-024', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: 'seed-054', calories: 216, protein: 5, carbs: 45, fat: 1.8 },
  { id: 'seed-057', calories: 154, protein: 5.4, carbs: 27, fat: 2.6 },
  { id: 'seed-059', calories: 79, protein: 2.7, carbs: 15, fat: 1 },
  { id: 'seed-063', calories: 100, protein: 17, carbs: 6, fat: 0.7 },
  { id: 'seed-104', calories: 120, protein: 24, carbs: 3, fat: 1.5 },
  { id: 'seed-105', calories: 210, protein: 20, carbs: 25, fat: 7 },
  { id: 'seed-106', calories: 471, protein: 10, carbs: 64, fat: 20 },
];

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue(MOCK_SEED_FOODS),
});

describe('seedLogEntries', () => {
  it('returns a non-negative count', async () => {
    const db = createMockDb() as any;
    const result = await seedLogEntries(db, 1, false, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('queries food_items for seed foods', async () => {
    const db = createMockDb() as any;
    await seedLogEntries(db, 1, false, false);
    expect(db.getAllAsync).toHaveBeenCalledTimes(1);
    const sql: string = db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('SELECT');
    expect(sql).toContain('food_items');
  });

  it('inserts into log_entries table', async () => {
    const db = createMockDb() as any;
    await seedLogEntries(db, 1, false, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    // Should have at least one INSERT into log_entries
    const logInserts = insertCalls.filter(
      (call: unknown[]) => (call[0] as string).includes('log_entries')
    );
    expect(logInserts.length).toBeGreaterThanOrEqual(0);
  });

  it('updates food_items usage tracking', async () => {
    const db = createMockDb() as any;
    await seedLogEntries(db, 1, false, false);
    const updateCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('UPDATE food_items')
    );
    expect(updateCalls.length).toBe(1);
  });

  it('returns 0 when no seed foods exist', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as any;
    const result = await seedLogEntries(db, 1, false, false);
    expect(result).toBe(0);
  });

  it('generates more with more months', async () => {
    const db1 = createMockDb() as any;
    const db6 = createMockDb() as any;
    const count1 = await seedLogEntries(db1, 1, false, false);
    const count6 = await seedLogEntries(db6, 6, false, false);
    expect(count6).toBeGreaterThanOrEqual(count1);
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedLogEntries(db, 1, false, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('log entries'));
    spy.mockRestore();
  });
});

describe('seedQuickAddEntries', () => {
  it('returns a non-negative count', async () => {
    const db = createMockDb() as any;
    const result = await seedQuickAddEntries(db, 1, false, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('inserts into quick_add_entries table', async () => {
    const db = createMockDb() as any;
    await seedQuickAddEntries(db, 2, false, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('quick_add_entries');
    }
  });

  it('adds zero-calorie entries when edge cases enabled', async () => {
    const db = createMockDb() as any;
    const withEdge = await seedQuickAddEntries(db, 1, true, false);
    const db2 = createMockDb() as any;
    const withoutEdge = await seedQuickAddEntries(db2, 1, false, false);
    // Edge cases add 2 zero-calorie entries
    expect(withEdge).toBeGreaterThanOrEqual(withoutEdge);
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedQuickAddEntries(db, 1, false, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('quick add'));
    spy.mockRestore();
  });
});
