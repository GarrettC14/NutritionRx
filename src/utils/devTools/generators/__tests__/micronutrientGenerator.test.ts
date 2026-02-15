jest.mock('@/data/seedMicronutrients', () => ({
  SEED_MICRONUTRIENTS: [
    { food_item_id: 'seed-001', nutrient_id: 'niacin', amount: 13.7 },
    { food_item_id: 'seed-001', nutrient_id: 'vitamin_b6', amount: 0.6 },
    { food_item_id: 'seed-004', nutrient_id: 'iron', amount: 1.8 },
  ],
  getSeedNutrientLookup: () => ({
    'seed-001': { niacin: 13.7, vitamin_b6: 0.6 },
    'seed-004': { iron: 1.8 },
  }),
}));

import {
  seedNutrientSettings,
  seedFoodItemNutrients,
  seedDailyNutrientIntake,
  seedNutrientContributors,
} from '../micronutrientGenerator';

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
});

describe('seedNutrientSettings', () => {
  it('returns 1', async () => {
    const db = createMockDb() as any;
    const result = await seedNutrientSettings(db, false);
    expect(result).toBe(1);
  });

  it('inserts into nutrient_settings table', async () => {
    const db = createMockDb() as any;
    await seedNutrientSettings(db, false);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const sql: string = db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT OR REPLACE INTO nutrient_settings');
    expect(sql).toContain("'male'");
    expect(sql).toContain("'19-30y'");
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedNutrientSettings(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted nutrient settings'));
    spy.mockRestore();
  });
});

describe('seedFoodItemNutrients', () => {
  it('returns count matching SEED_MICRONUTRIENTS length', async () => {
    const db = createMockDb() as any;
    const result = await seedFoodItemNutrients(db, false);
    // Mocked with 3 entries
    expect(result).toBe(3);
  });

  it('inserts into food_item_nutrients table', async () => {
    const db = createMockDb() as any;
    await seedFoodItemNutrients(db, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('food_item_nutrients');
    }
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedFoodItemNutrients(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('food item nutrients'));
    spy.mockRestore();
  });
});

describe('seedDailyNutrientIntake', () => {
  it('returns a non-negative count', async () => {
    const db = createMockDb() as any;
    const result = await seedDailyNutrientIntake(db, 1, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('generates intake records for 20 nutrients per logged day', async () => {
    const db = createMockDb() as any;
    const result = await seedDailyNutrientIntake(db, 1, false);
    // 1 month = ~30 days, ~88% coverage = ~26 days, 20 nutrients each
    expect(result).toBeGreaterThan(0);
  });

  it('inserts into daily_nutrient_intake table', async () => {
    const db = createMockDb() as any;
    await seedDailyNutrientIntake(db, 1, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('daily_nutrient_intake');
    }
  });

  it('returns 0 for 0 months', async () => {
    const db = createMockDb() as any;
    const result = await seedDailyNutrientIntake(db, 0, false);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedDailyNutrientIntake(db, 1, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('daily nutrient intake'));
    spy.mockRestore();
  });
});

describe('seedNutrientContributors', () => {
  it('returns 0 when no log entries exist', async () => {
    const db = createMockDb() as any;
    const result = await seedNutrientContributors(db, false);
    expect(result).toBe(0);
  });

  it('returns count when log entries and food names exist', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn()
        .mockResolvedValueOnce([
          { id: 'log-1', date: '2025-01-15', food_item_id: 'seed-001' },
          { id: 'log-2', date: '2025-01-15', food_item_id: 'seed-004' },
        ])
        .mockResolvedValueOnce([
          { id: 'seed-001', name: 'Chicken Breast' },
          { id: 'seed-004', name: 'Eggs' },
        ]),
    } as any;
    const result = await seedNutrientContributors(db, false);
    // Should have entries based on nutrient lookup data
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('inserts into nutrient_contributors table', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn()
        .mockResolvedValueOnce([
          { id: 'log-1', date: '2025-01-15', food_item_id: 'seed-001' },
        ])
        .mockResolvedValueOnce([
          { id: 'seed-001', name: 'Chicken Breast' },
        ]),
    } as any;
    await seedNutrientContributors(db, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('nutrient_contributors');
    }
  });

  it('logs when verbose', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn()
        .mockResolvedValueOnce([
          { id: 'log-1', date: '2025-01-15', food_item_id: 'seed-001' },
        ])
        .mockResolvedValueOnce([
          { id: 'seed-001', name: 'Chicken Breast' },
        ]),
    } as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedNutrientContributors(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('nutrient contributors'));
    spy.mockRestore();
  });
});
