/**
 * Nutrition Context Queries Tests
 * Tests for raw SQLite queries that feed Stage 1 of the context pipeline.
 */

import { getDatabase } from '@/db/database';
import { getRawNutritionData, RawNutritionData } from '@/services/context/nutritionContextQueries';

jest.mock('@/db/database', () => ({
  getDatabase: jest.fn(),
}));

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

function makeMockDb() {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue(undefined),
  };
}

describe('getRawNutritionData', () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = makeMockDb();
    mockedGetDatabase.mockReturnValue(mockDb as any);
  });

  // ---------------------------------------------------------------------------
  // 1. Happy path: returns all fields with correct shape
  // ---------------------------------------------------------------------------
  it('returns all fields with correct shape when DB has data', async () => {
    // queryDailyLogs (call index 0) - daily nutrition totals
    const dailyLogRows = [
      {
        date: '2026-02-14',
        total_calories: 2100,
        total_protein: 150,
        total_carbs: 220,
        total_fat: 70,
        total_fiber: 28,
        meals_logged: 3,
      },
      {
        date: '2026-02-13',
        total_calories: 1950,
        total_protein: 140,
        total_carbs: 200,
        total_fat: 65,
        total_fiber: 25,
        meals_logged: 2,
      },
    ];

    // queryWeeklyAverages (call index 1) - daily rows for the 28-day window
    const weeklyDailyRows = [
      {
        date: '2026-02-14',
        total_calories: 2100,
        total_protein: 150,
        total_carbs: 220,
        total_fat: 70,
        total_fiber: 28,
      },
      {
        date: '2026-02-13',
        total_calories: 1950,
        total_protein: 140,
        total_carbs: 200,
        total_fat: 65,
        total_fiber: 25,
      },
    ];

    // queryFrequentFoods (call index 3)
    const frequentFoodRows = [
      { food_name: 'Chicken Breast', times_logged: 15, avg_calories: 250 },
      { food_name: 'Brown Rice', times_logged: 12, avg_calories: 200 },
    ];

    // queryMealPatterns (call index 4)
    const mealPatternRows = [
      { meal_type: 'breakfast', avg_calories: 400, distinct_days: 10 },
      { meal_type: 'lunch', avg_calories: 600, distinct_days: 12 },
      { meal_type: 'dinner', avg_calories: 700, distinct_days: 14 },
    ];

    // queryWeightTrend (call index 5)
    const weightRows = [
      { date: '2026-02-10', weight_kg: 80.5 },
      { date: '2026-02-14', weight_kg: 80.2 },
    ];

    // queryMacroTargets - goal row (getFirstAsync call index 0)
    const goalRow = {
      type: 'lose',
      current_target_calories: 2000,
      current_protein_g: 150,
      current_carbs_g: 200,
      current_fat_g: 65,
    };

    // queryProfile (getFirstAsync call index 1)
    const profileRow = {
      activity_level: 'moderately_active',
      eating_style: 'balanced',
      protein_priority: 'high',
    };

    // queryWeightUnit (getFirstAsync call index 2)
    const weightUnitRow = { value: 'kg' };

    // Set up getAllAsync: called for dailyLogs, weeklyAverages, frequentFoods,
    // mealPatterns, weightTrend (and also the fallback in queryMacroTargets if
    // no goal, but here we have a goal so that branch is skipped).
    mockDb.getAllAsync
      .mockResolvedValueOnce(dailyLogRows)       // queryDailyLogs
      .mockResolvedValueOnce(weeklyDailyRows)     // queryWeeklyAverages
      .mockResolvedValueOnce(frequentFoodRows)    // queryFrequentFoods
      .mockResolvedValueOnce(mealPatternRows)     // queryMealPatterns
      .mockResolvedValueOnce(weightRows);         // queryWeightTrend

    // Set up getFirstAsync: called for queryMacroTargets (goal), queryProfile, queryWeightUnit
    mockDb.getFirstAsync
      .mockResolvedValueOnce(goalRow)       // queryMacroTargets - goal
      .mockResolvedValueOnce(profileRow)    // queryProfile
      .mockResolvedValueOnce(weightUnitRow); // queryWeightUnit

    const result = await getRawNutritionData();

    // Verify overall shape
    expect(result).toHaveProperty('dailyLogs');
    expect(result).toHaveProperty('weeklyAverages');
    expect(result).toHaveProperty('macroTargets');
    expect(result).toHaveProperty('frequentFoods');
    expect(result).toHaveProperty('mealPatterns');
    expect(result).toHaveProperty('weightTrend');
    expect(result).toHaveProperty('goal');
    expect(result).toHaveProperty('profile');
    expect(result).toHaveProperty('weightUnit');

    // Verify types
    expect(Array.isArray(result.dailyLogs)).toBe(true);
    expect(Array.isArray(result.weeklyAverages)).toBe(true);
    expect(Array.isArray(result.frequentFoods)).toBe(true);
    expect(Array.isArray(result.mealPatterns)).toBe(true);
    expect(Array.isArray(result.weightTrend)).toBe(true);
    expect(typeof result.macroTargets).toBe('object');

    // Verify daily logs mapped correctly
    expect(result.dailyLogs).toHaveLength(2);
    expect(result.dailyLogs[0]).toEqual({
      date: '2026-02-14',
      calories: 2100,
      protein: 150,
      carbs: 220,
      fat: 70,
      fiber: 28,
      mealsLogged: 3,
    });

    // Verify goal data
    expect(result.goal).toEqual({
      type: 'lose',
      targetCalories: 2000,
      targetProtein: 150,
      targetCarbs: 200,
      targetFat: 65,
    });

    // Verify macro targets match goal
    expect(result.macroTargets).toEqual({
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
    });

    // Verify profile
    expect(result.profile).toEqual({
      activityLevel: 'moderately_active',
      eatingStyle: 'balanced',
      proteinPriority: 'high',
    });

    // Verify weight unit
    expect(result.weightUnit).toBe('kg');

    // Verify frequent foods mapped
    expect(result.frequentFoods).toHaveLength(2);
    expect(result.frequentFoods[0]).toEqual({
      name: 'Chicken Breast',
      timesLogged: 15,
      avgCalories: 250,
    });

    // Verify weight trend mapped
    expect(result.weightTrend).toHaveLength(2);
    expect(result.weightTrend[0]).toEqual({
      date: '2026-02-10',
      weightKg: 80.5,
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Returns default macro targets when no active goal and no user_settings
  // ---------------------------------------------------------------------------
  it('returns default macro targets when no active goal and no user_settings', async () => {
    // getFirstAsync: goal query returns null, profile returns null, weightUnit returns null
    mockDb.getFirstAsync
      .mockResolvedValueOnce(null)  // queryMacroTargets - no active goal
      .mockResolvedValueOnce(null)  // queryProfile - no profile
      .mockResolvedValueOnce(null); // queryWeightUnit - no weight unit setting

    // getAllAsync: all return empty except the user_settings fallback in queryMacroTargets
    // queryDailyLogs, queryWeeklyAverages, queryMacroTargets fallback (user_settings), frequentFoods, mealPatterns, weightTrend
    mockDb.getAllAsync
      .mockResolvedValueOnce([])  // queryDailyLogs
      .mockResolvedValueOnce([])  // queryWeeklyAverages
      .mockResolvedValueOnce([])  // queryMacroTargets fallback - empty user_settings
      .mockResolvedValueOnce([])  // queryFrequentFoods
      .mockResolvedValueOnce([])  // queryMealPatterns
      .mockResolvedValueOnce([]); // queryWeightTrend

    const result = await getRawNutritionData();

    expect(result.macroTargets).toEqual({
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
    });
    expect(result.goal).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 3. Returns goal data when active goal exists
  // ---------------------------------------------------------------------------
  it('returns goal data when active goal exists', async () => {
    const goalRow = {
      type: 'gain',
      current_target_calories: 2800,
      current_protein_g: 180,
      current_carbs_g: 300,
      current_fat_g: 85,
    };

    mockDb.getFirstAsync
      .mockResolvedValueOnce(goalRow)  // queryMacroTargets - active goal found
      .mockResolvedValueOnce(null)     // queryProfile
      .mockResolvedValueOnce(null);    // queryWeightUnit

    mockDb.getAllAsync.mockResolvedValue([]);

    const result = await getRawNutritionData();

    expect(result.goal).toEqual({
      type: 'gain',
      targetCalories: 2800,
      targetProtein: 180,
      targetCarbs: 300,
      targetFat: 85,
    });
    expect(result.macroTargets).toEqual({
      calories: 2800,
      protein: 180,
      carbs: 300,
      fat: 85,
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Falls back to user_settings when no active goal
  // ---------------------------------------------------------------------------
  it('falls back to user_settings when no active goal', async () => {
    const settingsRows = [
      { key: 'daily_calorie_goal', value: '2200' },
      { key: 'daily_protein_goal', value: '160' },
      { key: 'daily_carbs_goal', value: '250' },
      { key: 'daily_fat_goal', value: '75' },
    ];

    mockDb.getFirstAsync.mockResolvedValue(null);

    // Use implementation to match SQL content since Promise.all ordering is non-deterministic
    mockDb.getAllAsync.mockImplementation((sql: string) => {
      if (typeof sql === 'string' && sql.includes('user_settings')) {
        return Promise.resolve(settingsRows);
      }
      return Promise.resolve([]);
    });

    const result = await getRawNutritionData();

    expect(result.goal).toBeNull();
    expect(result.macroTargets).toEqual({
      calories: 2200,
      protein: 160,
      carbs: 250,
      fat: 75,
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Returns empty arrays for empty tables
  // ---------------------------------------------------------------------------
  it('returns empty arrays for empty tables', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(null);

    const result = await getRawNutritionData();

    expect(result.dailyLogs).toEqual([]);
    expect(result.weeklyAverages).toEqual([]);
    expect(result.frequentFoods).toEqual([]);
    expect(result.mealPatterns).toEqual([]);
    expect(result.weightTrend).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // 6. Returns proper weight unit (default 'lbs')
  // ---------------------------------------------------------------------------
  it('returns default weight unit of lbs when no setting exists', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    // All getFirstAsync return null (no goal, no profile, no weight_unit setting)
    mockDb.getFirstAsync.mockResolvedValue(null);

    const result = await getRawNutritionData();

    expect(result.weightUnit).toBe('lbs');
  });

  it('returns kg when weight_unit setting is kg', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync
      .mockResolvedValueOnce(null)            // queryMacroTargets - no goal
      .mockResolvedValueOnce(null)            // queryProfile
      .mockResolvedValueOnce({ value: 'kg' }); // queryWeightUnit

    const result = await getRawNutritionData();

    expect(result.weightUnit).toBe('kg');
  });

  // ---------------------------------------------------------------------------
  // 7. Correctly maps daily log rows to DailyNutritionLog format
  // ---------------------------------------------------------------------------
  it('correctly maps daily log rows to DailyNutritionLog format', async () => {
    const rawRows = [
      {
        date: '2026-02-14',
        total_calories: 2150.7,
        total_protein: 148.3,
        total_carbs: 215.9,
        total_fat: 72.1,
        total_fiber: 27.6,
        meals_logged: 4,
      },
    ];

    mockDb.getAllAsync
      .mockResolvedValueOnce(rawRows) // queryDailyLogs
      .mockResolvedValueOnce([])      // queryWeeklyAverages
      .mockResolvedValueOnce([])      // queryMacroTargets fallback (user_settings)
      .mockResolvedValueOnce([])      // queryFrequentFoods
      .mockResolvedValueOnce([])      // queryMealPatterns
      .mockResolvedValueOnce([]);     // queryWeightTrend

    mockDb.getFirstAsync
      .mockResolvedValueOnce(null)  // queryMacroTargets - no goal
      .mockResolvedValueOnce(null)  // queryProfile
      .mockResolvedValueOnce(null); // queryWeightUnit

    const result = await getRawNutritionData();

    expect(result.dailyLogs).toHaveLength(1);
    const log = result.dailyLogs[0];

    // Values should be rounded via Math.round
    expect(log.date).toBe('2026-02-14');
    expect(log.calories).toBe(2151);
    expect(log.protein).toBe(148);
    expect(log.carbs).toBe(216);
    expect(log.fat).toBe(72);
    expect(log.fiber).toBe(28);
    expect(log.mealsLogged).toBe(4);

    // Verify all values are integers (Math.round applied)
    expect(Number.isInteger(log.calories)).toBe(true);
    expect(Number.isInteger(log.protein)).toBe(true);
    expect(Number.isInteger(log.carbs)).toBe(true);
    expect(Number.isInteger(log.fat)).toBe(true);
    expect(Number.isInteger(log.fiber)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 8. Correctly computes weekly averages from daily rows
  // ---------------------------------------------------------------------------
  it('correctly computes weekly averages from daily rows', async () => {
    // Use fake timers to control "today"
    const fakeNow = new Date('2026-02-15T12:00:00Z');
    jest.useFakeTimers().setSystemTime(fakeNow);

    // Create daily rows that fall within the current week window (Feb 9 - Feb 15)
    const weeklyDailyRows = [
      {
        date: '2026-02-14',
        total_calories: 2000,
        total_protein: 150,
        total_carbs: 200,
        total_fat: 60,
        total_fiber: 25,
      },
      {
        date: '2026-02-13',
        total_calories: 1800,
        total_protein: 130,
        total_carbs: 180,
        total_fat: 55,
        total_fiber: 22,
      },
      {
        date: '2026-02-12',
        total_calories: 2200,
        total_protein: 160,
        total_carbs: 240,
        total_fat: 70,
        total_fiber: 30,
      },
    ];

    mockDb.getAllAsync
      .mockResolvedValueOnce([])             // queryDailyLogs
      .mockResolvedValueOnce(weeklyDailyRows) // queryWeeklyAverages
      .mockResolvedValueOnce([])             // queryMacroTargets fallback (user_settings)
      .mockResolvedValueOnce([])             // queryFrequentFoods
      .mockResolvedValueOnce([])             // queryMealPatterns
      .mockResolvedValueOnce([]);            // queryWeightTrend

    mockDb.getFirstAsync
      .mockResolvedValueOnce(null)  // queryMacroTargets - no goal
      .mockResolvedValueOnce(null)  // queryProfile
      .mockResolvedValueOnce(null); // queryWeightUnit

    const result = await getRawNutritionData();

    // The current week (w=0) spans from Feb 9 to Feb 15.
    // All 3 rows fall in this window.
    expect(result.weeklyAverages.length).toBeGreaterThanOrEqual(1);

    const currentWeek = result.weeklyAverages[0];
    expect(currentWeek.daysLogged).toBe(3);
    // avg calories = (2000 + 1800 + 2200) / 3 = 2000
    expect(currentWeek.avgCalories).toBe(2000);
    // avg protein = (150 + 130 + 160) / 3 ~= 147
    expect(currentWeek.avgProtein).toBe(147);
    // avg carbs = (200 + 180 + 240) / 3 ~= 207
    expect(currentWeek.avgCarbs).toBe(207);
    // avg fat = (60 + 55 + 70) / 3 ~= 62
    expect(currentWeek.avgFat).toBe(62);
    // avg fiber = (25 + 22 + 30) / 3 ~= 26
    expect(currentWeek.avgFiber).toBe(26);

    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // 9. Returns null profile when no user_profile row exists
  // ---------------------------------------------------------------------------
  it('returns null profile when no user_profile row exists', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(null);

    const result = await getRawNutritionData();

    expect(result.profile).toBeNull();
  });

  it('returns profile data when user_profile row exists', async () => {
    const profileRow = {
      activity_level: 'very_active',
      eating_style: 'keto',
      protein_priority: 'moderate',
    };

    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync
      .mockResolvedValueOnce(null)       // queryMacroTargets - no goal
      .mockResolvedValueOnce(profileRow) // queryProfile
      .mockResolvedValueOnce(null);      // queryWeightUnit

    const result = await getRawNutritionData();

    expect(result.profile).toEqual({
      activityLevel: 'very_active',
      eatingStyle: 'keto',
      proteinPriority: 'moderate',
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Frequent foods query returns mapped results
  // ---------------------------------------------------------------------------
  it('frequent foods query returns mapped results', async () => {
    const foodRows = [
      { food_name: 'Greek Yogurt', times_logged: 20, avg_calories: 150 },
      { food_name: 'Oatmeal', times_logged: 18, avg_calories: 300 },
      { food_name: 'Salmon', times_logged: 10, avg_calories: 350 },
    ];

    mockDb.getFirstAsync.mockResolvedValue(null);

    // Use implementation to match SQL content since Promise.all ordering is non-deterministic
    mockDb.getAllAsync.mockImplementation((sql: string) => {
      if (typeof sql === 'string' && sql.includes('food_items fi')) {
        return Promise.resolve(foodRows);
      }
      return Promise.resolve([]);
    });

    const result = await getRawNutritionData();

    expect(result.frequentFoods).toHaveLength(3);
    expect(result.frequentFoods[0]).toEqual({
      name: 'Greek Yogurt',
      timesLogged: 20,
      avgCalories: 150,
    });
    expect(result.frequentFoods[1]).toEqual({
      name: 'Oatmeal',
      timesLogged: 18,
      avgCalories: 300,
    });
    expect(result.frequentFoods[2]).toEqual({
      name: 'Salmon',
      timesLogged: 10,
      avgCalories: 350,
    });

    // Verify the fields are mapped from DB column names to interface names
    // food_name -> name, times_logged -> timesLogged, avg_calories -> avgCalories
    result.frequentFoods.forEach((food) => {
      expect(food).toHaveProperty('name');
      expect(food).toHaveProperty('timesLogged');
      expect(food).toHaveProperty('avgCalories');
      expect(food).not.toHaveProperty('food_name');
      expect(food).not.toHaveProperty('times_logged');
      expect(food).not.toHaveProperty('avg_calories');
    });
  });
});
