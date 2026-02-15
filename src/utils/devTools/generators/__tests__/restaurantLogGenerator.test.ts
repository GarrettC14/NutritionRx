import { seedRestaurantFoodLogs, seedUserRestaurantUsage } from '../restaurantLogGenerator';

const MOCK_RESTAURANT_FOODS = [
  { id: 'rf-1', restaurant_id: 'r-1', name: 'Burger', calories: 550, protein: 25, carbohydrates: 40, fat: 30 },
  { id: 'rf-2', restaurant_id: 'r-1', name: 'Fries', calories: 400, protein: 5, carbohydrates: 50, fat: 20 },
  { id: 'rf-3', restaurant_id: 'r-2', name: 'Salad', calories: 250, protein: 15, carbohydrates: 20, fat: 12 },
];

const MOCK_RESTAURANTS = [
  { id: 'r-1', name: 'Burger Place' },
  { id: 'r-2', name: 'Salad Shop' },
];

describe('seedRestaurantFoodLogs', () => {
  const createMockDb = () => ({
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn()
      .mockResolvedValueOnce(MOCK_RESTAURANT_FOODS)
      .mockResolvedValueOnce(MOCK_RESTAURANTS),
  });

  it('returns a non-negative count', async () => {
    const db = createMockDb() as any;
    const result = await seedRestaurantFoodLogs(db, 1, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 when no restaurant foods exist', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as any;
    const result = await seedRestaurantFoodLogs(db, 1, false);
    expect(result).toBe(0);
  });

  it('queries restaurant_foods and restaurants', async () => {
    const db = createMockDb() as any;
    await seedRestaurantFoodLogs(db, 1, false);
    expect(db.getAllAsync).toHaveBeenCalledTimes(2);
    const sql1: string = db.getAllAsync.mock.calls[0][0];
    expect(sql1).toContain('restaurant_foods');
    const sql2: string = db.getAllAsync.mock.calls[1][0];
    expect(sql2).toContain('restaurants');
  });

  it('inserts into restaurant_food_logs table', async () => {
    const db = createMockDb() as any;
    await seedRestaurantFoodLogs(db, 2, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('restaurant_food_logs');
    }
  });

  it('logs when verbose and no foods', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedRestaurantFoodLogs(db, 1, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('skipping restaurant logs'));
    spy.mockRestore();
  });

  it('logs count when verbose and foods exist', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedRestaurantFoodLogs(db, 1, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('restaurant food logs'));
    spy.mockRestore();
  });
});

describe('seedUserRestaurantUsage', () => {
  it('returns 0 when no food logs exist', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as any;
    const result = await seedUserRestaurantUsage(db, false);
    expect(result).toBe(0);
  });

  it('returns count based on aggregated restaurant usage', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn()
        .mockResolvedValueOnce([
          { restaurant_food_id: 'rf-1', cnt: 5, last: '2025-01-15T12:00:00.000Z' },
          { restaurant_food_id: 'rf-3', cnt: 2, last: '2025-01-10T12:00:00.000Z' },
        ])
        .mockResolvedValueOnce([
          { id: 'rf-1', restaurant_id: 'r-1' },
          { id: 'rf-3', restaurant_id: 'r-2' },
        ]),
    } as any;
    const result = await seedUserRestaurantUsage(db, false);
    expect(result).toBe(2);
  });

  it('inserts into user_restaurant_usage table', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn()
        .mockResolvedValueOnce([
          { restaurant_food_id: 'rf-1', cnt: 3, last: '2025-01-15T12:00:00.000Z' },
        ])
        .mockResolvedValueOnce([
          { id: 'rf-1', restaurant_id: 'r-1' },
        ]),
    } as any;
    await seedUserRestaurantUsage(db, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('user_restaurant_usage');
    }
  });

  it('logs when verbose', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn()
        .mockResolvedValueOnce([
          { restaurant_food_id: 'rf-1', cnt: 1, last: '2025-01-15T12:00:00.000Z' },
        ])
        .mockResolvedValueOnce([
          { id: 'rf-1', restaurant_id: 'r-1' },
        ]),
    } as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedUserRestaurantUsage(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('restaurant usage'));
    spy.mockRestore();
  });
});
