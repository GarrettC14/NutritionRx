import { seedMealPlanSettings, seedPlannedMeals } from '../mealPlanGenerator';

const MOCK_SEED_FOODS = [
  { id: 'seed-001', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 'seed-004', name: 'Eggs', calories: 78, protein: 6, carbs: 0.6, fat: 5.3 },
  { id: 'seed-013', name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13 },
  { id: 'seed-024', name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: 'seed-054', name: 'Brown Rice', calories: 216, protein: 5, carbs: 45, fat: 1.8 },
  { id: 'seed-055', name: 'Quinoa', calories: 222, protein: 8.1, carbs: 39, fat: 3.6 },
  { id: 'seed-057', name: 'Oatmeal', calories: 154, protein: 5.4, carbs: 27, fat: 2.6 },
  { id: 'seed-058', name: 'Pasta', calories: 220, protein: 8, carbs: 43, fat: 1.3 },
  { id: 'seed-059', name: 'Whole Wheat Toast', calories: 79, protein: 2.7, carbs: 15, fat: 1 },
  { id: 'seed-104', name: 'Protein Shake', calories: 120, protein: 24, carbs: 3, fat: 1.5 },
];

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue(MOCK_SEED_FOODS),
});

describe('seedMealPlanSettings', () => {
  it('returns 1 after inserting settings', async () => {
    const db = createMockDb() as any;
    const result = await seedMealPlanSettings(db, false);
    expect(result).toBe(1);
  });

  it('inserts into meal_plan_settings table', async () => {
    const db = createMockDb() as any;
    await seedMealPlanSettings(db, false);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const sql: string = db.runAsync.mock.calls[0][0];
    expect(sql).toContain('INSERT OR REPLACE INTO meal_plan_settings');
  });

  it('sets enabled = 1 and show_on_today = 1', async () => {
    const db = createMockDb() as any;
    await seedMealPlanSettings(db, false);
    const sql: string = db.runAsync.mock.calls[0][0];
    expect(sql).toContain('1, 1, 1');
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedMealPlanSettings(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted meal plan settings'));
    spy.mockRestore();
  });
});

describe('seedPlannedMeals', () => {
  it('returns a non-negative count', async () => {
    const db = createMockDb() as any;
    const result = await seedPlannedMeals(db, 1, false);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('queries seed foods from DB', async () => {
    const db = createMockDb() as any;
    await seedPlannedMeals(db, 1, false);
    expect(db.getAllAsync).toHaveBeenCalledTimes(1);
    const sql: string = db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('SELECT');
    expect(sql).toContain('food_items');
  });

  it('inserts into planned_meals table', async () => {
    const db = createMockDb() as any;
    await seedPlannedMeals(db, 2, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('planned_meals');
    }
  });

  it('returns 0 when no seed foods exist', async () => {
    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as any;
    const result = await seedPlannedMeals(db, 1, false);
    expect(result).toBe(0);
  });

  it('logs when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedPlannedMeals(db, 1, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('planned meals'));
    spy.mockRestore();
  });
});
