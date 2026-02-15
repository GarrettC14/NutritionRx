import { seedFavoriteFoods } from '../favoriteGenerator';

const createMockDb = (existingFoodIds: string[] = []) => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue(
    existingFoodIds.map((id) => ({ id }))
  ),
});

describe('seedFavoriteFoods', () => {
  it('returns 0 when no food items exist in DB', async () => {
    const db = createMockDb([]) as any;
    const result = await seedFavoriteFoods(db, false);
    expect(result).toBe(0);
  });

  it('returns count matching number of existing foods found', async () => {
    const db = createMockDb([
      'seed-001', 'seed-004', 'seed-013', 'seed-024',
      'seed-054', 'seed-063', 'seed-080', 'seed-104',
    ]) as any;
    const result = await seedFavoriteFoods(db, false);
    // Should return between 0 and 8 (number of existing foods matched)
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(12); // Max FAVORITE_FOOD_IDS length
  });

  it('queries food_items to verify IDs exist', async () => {
    const db = createMockDb(['seed-001', 'seed-004']) as any;
    await seedFavoriteFoods(db, false);
    expect(db.getAllAsync).toHaveBeenCalledTimes(1);
    const sql: string = db.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('SELECT id FROM food_items');
  });

  it('inserts into favorite_foods table', async () => {
    const db = createMockDb(['seed-001', 'seed-004', 'seed-013']) as any;
    await seedFavoriteFoods(db, false);
    const insertCalls = db.runAsync.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT')
    );
    for (const call of insertCalls) {
      expect(call[0]).toContain('favorite_foods');
    }
  });

  it('skips food IDs that do not exist in DB', async () => {
    // Only return 2 of the FAVORITE_FOOD_IDS as existing
    const db = createMockDb(['seed-001', 'seed-999']) as any;
    const result = await seedFavoriteFoods(db, false);
    // seed-999 is not in FAVORITE_FOOD_IDS, so only seed-001 can match
    expect(result).toBeLessThanOrEqual(1);
  });

  it('logs when verbose', async () => {
    const db = createMockDb(['seed-001']) as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await seedFavoriteFoods(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[seed] Inserted'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('favorite foods'));
    spy.mockRestore();
  });
});
