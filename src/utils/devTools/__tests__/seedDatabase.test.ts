jest.mock('@/db/database', () => ({
  getDatabase: jest.fn().mockReturnValue({
    runAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('../clearDatabase', () => ({
  clearAllData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../generators/profileGenerator', () => ({
  seedProfile: jest.fn().mockResolvedValue(1),
  seedUserSettings: jest.fn().mockResolvedValue(7),
  seedGoals: jest.fn().mockResolvedValue({ count: 2, activeGoalId: 'goal-active-test' }),
}));

jest.mock('../generators/weightGenerator', () => ({
  seedWeightEntries: jest.fn().mockResolvedValue(50),
  seedDailyMetabolism: jest.fn().mockResolvedValue(40),
}));

jest.mock('../generators/foodLogGenerator', () => ({
  seedLogEntries: jest.fn().mockResolvedValue(200),
  seedQuickAddEntries: jest.fn().mockResolvedValue(10),
}));

jest.mock('../generators/waterGenerator', () => ({
  seedWaterLog: jest.fn().mockResolvedValue(30),
}));

jest.mock('../generators/fastingGenerator', () => ({
  seedFastingConfig: jest.fn().mockResolvedValue(1),
  seedFastingSessions: jest.fn().mockResolvedValue(20),
}));

jest.mock('../generators/mealPlanGenerator', () => ({
  seedMealPlanSettings: jest.fn().mockResolvedValue(1),
  seedPlannedMeals: jest.fn().mockResolvedValue(50),
}));

jest.mock('../generators/macroCycleGenerator', () => ({
  seedMacroCycleConfig: jest.fn().mockResolvedValue(1),
  seedMacroCycleOverrides: jest.fn().mockResolvedValue(5),
}));

jest.mock('../generators/restaurantLogGenerator', () => ({
  seedRestaurantFoodLogs: jest.fn().mockResolvedValue(15),
  seedUserRestaurantUsage: jest.fn().mockResolvedValue(3),
}));

jest.mock('../generators/favoriteGenerator', () => ({
  seedFavoriteFoods: jest.fn().mockResolvedValue(8),
}));

jest.mock('../generators/micronutrientGenerator', () => ({
  seedNutrientSettings: jest.fn().mockResolvedValue(1),
  seedFoodItemNutrients: jest.fn().mockResolvedValue(100),
  seedDailyNutrientIntake: jest.fn().mockResolvedValue(500),
  seedNutrientContributors: jest.fn().mockResolvedValue(80),
}));

jest.mock('../generators/progressPhotoGenerator', () => ({
  seedProgressPhotos: jest.fn().mockResolvedValue(12),
  seedPhotoComparisons: jest.fn().mockResolvedValue(4),
  clearSeedProgressPhotos: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../generators/reflectionGenerator', () => ({
  seedWeeklyReflections: jest.fn().mockResolvedValue(25),
  seedHealthSyncLog: jest.fn().mockResolvedValue(11),
}));

import { seedDatabase } from '../seedDatabase';
import { clearAllData } from '../clearDatabase';
import { seedProfile } from '../generators/profileGenerator';
import { seedWeightEntries } from '../generators/weightGenerator';

describe('seedDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a successful result with default options', async () => {
    const result = await seedDatabase();
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('clears existing data when clearExisting is true (default)', async () => {
    await seedDatabase();
    expect(clearAllData).toHaveBeenCalledTimes(1);
  });

  it('skips clearing when clearExisting is false', async () => {
    await seedDatabase({ clearExisting: false });
    expect(clearAllData).not.toHaveBeenCalled();
  });

  it('calls all generator steps', async () => {
    const result = await seedDatabase();
    expect(result.counts).toHaveProperty('User Profile');
    expect(result.counts).toHaveProperty('User Settings');
    expect(result.counts).toHaveProperty('Goals');
    expect(result.counts).toHaveProperty('Weight Entries');
    expect(result.counts).toHaveProperty('Food Log Entries');
    expect(result.counts).toHaveProperty('Water Log');
    expect(result.counts).toHaveProperty('Fasting Config');
    expect(result.counts).toHaveProperty('Fasting Sessions');
    expect(result.counts).toHaveProperty('Macro Cycle Config');
    expect(result.counts).toHaveProperty('Planned Meals');
    expect(result.counts).toHaveProperty('Restaurant Food Logs');
    expect(result.counts).toHaveProperty('Nutrient Settings');
    expect(result.counts).toHaveProperty('Progress Photos');
    expect(result.counts).toHaveProperty('Health Sync Log');
  });

  it('passes options through to generators', async () => {
    await seedDatabase({ monthsOfHistory: 3, verboseLogging: true });
    expect(seedProfile).toHaveBeenCalledWith(expect.anything(), true);
    expect(seedWeightEntries).toHaveBeenCalledWith(
      expect.anything(), 3, expect.any(Boolean), true
    );
  });

  it('invokes progress callback at each step', async () => {
    const onProgress = jest.fn();
    await seedDatabase({}, onProgress);
    // Should be called for clearing + each step + complete
    expect(onProgress).toHaveBeenCalled();
    // Last call should have phase "Complete"
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall.phase).toBe('Complete');
  });

  it('handles generator failures gracefully', async () => {
    (seedProfile as jest.Mock).mockRejectedValueOnce(new Error('profile fail'));
    // Mock __DEV__
    (global as any).__DEV__ = true;
    const spy = jest.spyOn(console, 'error').mockImplementation();

    const result = await seedDatabase();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('User Profile');

    spy.mockRestore();
  });

  it('returns success: false when errors occur', async () => {
    (seedProfile as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    (global as any).__DEV__ = true;
    const spy = jest.spyOn(console, 'error').mockImplementation();

    const result = await seedDatabase();
    expect(result.success).toBe(false);

    spy.mockRestore();
  });

  it('uses default options when none provided', async () => {
    const result = await seedDatabase();
    expect(result.success).toBe(true);
    // Default is 6 months
    expect(seedWeightEntries).toHaveBeenCalledWith(
      expect.anything(), 6, false, false
    );
  });

  it('merges partial options with defaults', async () => {
    await seedDatabase({ monthsOfHistory: 12 });
    // Should use 12 months but default verboseLogging = false
    expect(seedWeightEntries).toHaveBeenCalledWith(
      expect.anything(), 12, false, false
    );
  });
});
