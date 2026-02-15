import { seedMicronutrientData, clearSeedData } from '@/services/seedDataService';

// ── Mocks ──

const mockDb = {
  runAsync: jest.fn().mockResolvedValue(undefined),
  getFirstAsync: jest.fn().mockResolvedValue({
    calories: 200,
    protein: 20,
    carbs: 30,
    fat: 8,
  }),
  getAllAsync: jest.fn().mockResolvedValue([]),
};

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(() => mockDb),
}));

jest.mock('@/utils/generateId', () => ({
  generateId: jest.fn(() => 'test-id'),
}));

jest.mock('@/constants/mealTypes', () => ({
  MealType: {
    Breakfast: 'breakfast',
    Lunch: 'lunch',
    Dinner: 'dinner',
    Snack: 'snack',
  },
}));

jest.mock('@/data/seedMicronutrients', () => ({
  SEED_MICRONUTRIENTS: [
    { food_item_id: 'seed-001', nutrient_id: 'vitamin_c', amount: 10 },
    { food_item_id: 'seed-002', nutrient_id: 'iron', amount: 5 },
  ],
  getSeedFoodIds: jest.fn(() => ['seed-001', 'seed-002']),
}));

// ── Setup ──

beforeEach(() => {
  jest.clearAllMocks();
  // Restore default happy-path behaviour
  mockDb.runAsync.mockResolvedValue(undefined);
  mockDb.getFirstAsync.mockResolvedValue({
    calories: 200,
    protein: 20,
    carbs: 30,
    fat: 8,
  });
  mockDb.getAllAsync.mockResolvedValue([]);
});

// ── Tests ──

describe('seedMicronutrientData', () => {
  it('returns {success: true} on success', async () => {
    const result = await seedMicronutrientData();
    expect(result).toEqual({ success: true });
  });

  it('inserts micronutrient data via runAsync with INSERT OR REPLACE', async () => {
    await seedMicronutrientData();

    // The first runAsync calls should be for micronutrient insertion
    const insertCall = mockDb.runAsync.mock.calls[0];
    expect(insertCall[0]).toContain('INSERT OR REPLACE INTO food_item_nutrients');
  });

  it('queries food data for each unique food in sample logs', async () => {
    await seedMicronutrientData();

    // getFirstAsync is called with SELECT ... FROM food_items for each unique foodId
    const foodQueries = mockDb.getFirstAsync.mock.calls.filter(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('food_items'),
    );

    // There should be at least one query per unique food referenced in SAMPLE_LOG_ENTRIES
    expect(foodQueries.length).toBeGreaterThan(0);
    expect(foodQueries[0][0]).toContain('SELECT calories, protein, carbs, fat FROM food_items');
  });

  it('inserts log entries for each sample entry', async () => {
    await seedMicronutrientData();

    // Find runAsync calls that insert into log_entries
    const logInserts = mockDb.runAsync.mock.calls.filter(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO log_entries'),
    );

    // The source has SAMPLE_LOG_ENTRIES with many entries; each should produce an INSERT
    // when food data is found (our mock always returns food data)
    expect(logInserts.length).toBeGreaterThan(0);

    // Verify the SQL shape
    expect(logInserts[0][0]).toContain('INSERT INTO log_entries');
    expect(logInserts[0][0]).toContain('food_item_id');
  });

  it('skips log entries when food data not found', async () => {
    // Return null for all food queries -> no log inserts
    mockDb.getFirstAsync.mockResolvedValue(null);

    await seedMicronutrientData();

    const logInserts = mockDb.runAsync.mock.calls.filter(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO log_entries'),
    );

    expect(logInserts.length).toBe(0);
  });

  it('returns {success: false, error} on database error', async () => {
    mockDb.runAsync.mockRejectedValueOnce(new Error('SQLITE_ERROR'));

    const result = await seedMicronutrientData();

    expect(result.success).toBe(false);
    expect(result.error).toBe('SQLITE_ERROR');
  });
});

describe('clearSeedData', () => {
  it('returns {success: true} on success', async () => {
    const result = await clearSeedData();
    expect(result).toEqual({ success: true });
  });

  it('deletes from food_item_nutrients for seed food IDs', async () => {
    await clearSeedData();

    const deleteCalls = mockDb.runAsync.mock.calls.filter(
      (call: any[]) =>
        typeof call[0] === 'string' &&
        call[0].includes('DELETE FROM food_item_nutrients'),
    );

    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0][0]).toContain('food_item_id IN');
    // The placeholder count should match the seed food IDs
    expect(deleteCalls[0][1]).toEqual(['seed-001', 'seed-002']);
  });

  it('deletes from log_entries for seed food IDs', async () => {
    await clearSeedData();

    const deleteCalls = mockDb.runAsync.mock.calls.filter(
      (call: any[]) =>
        typeof call[0] === 'string' &&
        call[0].includes('DELETE FROM log_entries'),
    );

    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0][0]).toContain('food_item_id IN');
    expect(deleteCalls[0][1]).toEqual(['seed-001', 'seed-002']);
  });

  it('returns {success: false, error} on database error', async () => {
    mockDb.runAsync.mockRejectedValueOnce(new Error('DB locked'));

    const result = await clearSeedData();

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB locked');
  });
});
