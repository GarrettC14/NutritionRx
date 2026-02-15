jest.mock('../generators/progressPhotoGenerator', () => ({
  clearSeedProgressPhotos: jest.fn().mockResolvedValue(undefined),
}));

import { clearAllData } from '../clearDatabase';
import { clearSeedProgressPhotos } from '../generators/progressPhotoGenerator';

const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
});

describe('clearAllData', () => {
  beforeEach(() => {
    (clearSeedProgressPhotos as jest.Mock).mockClear();
  });

  it('calls clearSeedProgressPhotos before clearing tables', async () => {
    const db = createMockDb() as any;
    await clearAllData(db, false);
    expect(clearSeedProgressPhotos).toHaveBeenCalledWith(db, false);
  });

  it('executes DELETE statements on all expected tables', async () => {
    const db = createMockDb() as any;
    await clearAllData(db, false);

    const sqlStatements = db.runAsync.mock.calls.map((call: unknown[]) => call[0] as string);

    // Should delete from various tables
    const expectedTables = [
      'nutrient_contributors',
      'daily_nutrient_intake',
      'food_item_nutrients',
      'custom_nutrient_targets',
      'nutrient_settings',
      'photo_comparisons',
      'progress_photos',
      'planned_meals',
      'meal_plan_settings',
      'fasting_sessions',
      'fasting_config',
      'macro_cycle_overrides',
      'macro_cycle_config',
      'user_restaurant_usage',
      'restaurant_food_logs',
      'water_log',
      'favorite_foods',
      'health_sync_log',
      'backup_metadata',
      'weekly_reflections',
      'daily_metabolism',
      'goals',
      'weight_entries',
      'quick_add_entries',
      'log_entries',
    ];

    for (const table of expectedTables) {
      const found = sqlStatements.some((sql: string) => sql.includes(table));
      expect(found).toBe(true);
    }
  });

  it('preserves bundled food_items (only deletes user source)', async () => {
    const db = createMockDb() as any;
    await clearAllData(db, false);

    const sqlStatements = db.runAsync.mock.calls.map((call: unknown[]) => call[0] as string);
    const foodItemDelete = sqlStatements.find(
      (sql: string) => sql.includes('food_items') && sql.includes('DELETE') && sql.includes("source = 'user'")
    );
    expect(foodItemDelete).toBeDefined();
  });

  it('resets food_items usage tracking', async () => {
    const db = createMockDb() as any;
    await clearAllData(db, false);

    const sqlStatements = db.runAsync.mock.calls.map((call: unknown[]) => call[0] as string);
    const usageReset = sqlStatements.find(
      (sql: string) => sql.includes('UPDATE food_items') && sql.includes('usage_count = 0')
    );
    expect(usageReset).toBeDefined();
  });

  it('resets user_profile to defaults', async () => {
    const db = createMockDb() as any;
    await clearAllData(db, false);

    const sqlStatements = db.runAsync.mock.calls.map((call: unknown[]) => call[0] as string);
    const profileReset = sqlStatements.find(
      (sql: string) => sql.includes('UPDATE user_profile') && sql.includes("id = 'singleton'")
    );
    expect(profileReset).toBeDefined();
  });

  it('continues when a table does not exist', async () => {
    const db = createMockDb() as any;
    // Make the first few calls fail
    db.runAsync.mockRejectedValueOnce(new Error('no such table'))
      .mockResolvedValue(undefined);
    // Should not throw
    await expect(clearAllData(db, false)).resolves.not.toThrow();
  });

  it('logs progress when verbose', async () => {
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await clearAllData(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[clear]'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('All user data cleared'));
    spy.mockRestore();
  });

  it('logs warnings for skipped tables when verbose', async () => {
    const db = createMockDb() as any;
    db.runAsync.mockRejectedValueOnce(new Error('no such table'))
      .mockResolvedValue(undefined);
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    await clearAllData(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[clear] Skipped'));
    spy.mockRestore();
  });

  it('handles clearSeedProgressPhotos failure gracefully', async () => {
    (clearSeedProgressPhotos as jest.Mock).mockRejectedValueOnce(new Error('photo cleanup failed'));
    const db = createMockDb() as any;
    // Should not throw
    await expect(clearAllData(db, false)).resolves.not.toThrow();
  });

  it('warns when photo cleanup fails and verbose', async () => {
    (clearSeedProgressPhotos as jest.Mock).mockRejectedValueOnce(new Error('cleanup failed'));
    const db = createMockDb() as any;
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    await clearAllData(db, true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[clear] Could not clean up'));
    spy.mockRestore();
  });
});
