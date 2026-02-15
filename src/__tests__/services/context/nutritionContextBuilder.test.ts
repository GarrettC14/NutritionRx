import { buildUnifiedNutritionContext, type MacroProgress, type UnifiedNutritionContext } from '@/services/context/nutritionContextBuilder';
import { getRawNutritionData } from '@/services/context/nutritionContextQueries';
import { computeDataAvailability } from '@/services/context/dataAvailability';
import { computeDerivedInsights } from '@/services/context/derivedNutritionInsights';
import type { RawNutritionData } from '@/services/context/nutritionContextQueries';
import type { DataAvailabilityResult } from '@/services/context/dataAvailability';
import type { DerivedInsight } from '@/services/context/derivedNutritionInsights';

jest.mock('@/services/context/nutritionContextQueries', () => ({
  getRawNutritionData: jest.fn(),
}));
jest.mock('@/services/context/dataAvailability', () => ({
  computeDataAvailability: jest.fn(),
}));
jest.mock('@/services/context/derivedNutritionInsights', () => ({
  computeDerivedInsights: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const todayStr = new Date().toISOString().split('T')[0];

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function makeDailyLog(date: string, overrides: Partial<RawNutritionData['dailyLogs'][0]> = {}) {
  return {
    date,
    calories: 2100,
    protein: 155,
    carbs: 210,
    fat: 68,
    fiber: 26,
    mealsLogged: 3,
    ...overrides,
  };
}

function makeRawData(overrides: Partial<RawNutritionData> = {}): RawNutritionData {
  // Build 14 daily logs: days 0 (today) through 13
  const dailyLogs = Array.from({ length: 14 }, (_, i) =>
    makeDailyLog(daysAgoStr(i), {
      calories: 1900 + i * 20,
      protein: 140 + i * 2,
      carbs: 190 + i * 3,
      fat: 60 + i,
      fiber: 22 + i,
      mealsLogged: i % 2 === 0 ? 3 : 4,
    }),
  );

  return {
    dailyLogs,
    weeklyAverages: [
      { weekStart: daysAgoStr(13), avgCalories: 2050, avgProtein: 148, avgCarbs: 205, avgFat: 66, avgFiber: 27, daysLogged: 7 },
      { weekStart: daysAgoStr(6), avgCalories: 1980, avgProtein: 145, avgCarbs: 198, avgFat: 63, avgFiber: 24, daysLogged: 7 },
    ],
    macroTargets: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    frequentFoods: Array.from({ length: 15 }, (_, i) => ({
      name: `Food ${i + 1}`,
      timesLogged: 20 - i,
      avgCalories: 300 + i * 10,
    })),
    mealPatterns: [
      { mealType: 'breakfast' as const, avgCalories: 450, frequency: 6 },
      { mealType: 'lunch' as const, avgCalories: 650, frequency: 7 },
      { mealType: 'dinner' as const, avgCalories: 750, frequency: 7 },
      { mealType: 'snack' as const, avgCalories: 200, frequency: 5 },
    ],
    weightTrend: Array.from({ length: 8 }, (_, i) => ({
      date: daysAgoStr(28 - i * 4),
      weightKg: 80 - i * 0.15,
    })),
    goal: { type: 'lose', targetCalories: 2000, targetProtein: 150, targetCarbs: 200, targetFat: 65 },
    profile: { activityLevel: 'very_active', eatingStyle: 'balanced', proteinPriority: 'high' },
    weightUnit: 'lbs' as const,
    ...overrides,
  };
}

const defaultDataAvailability: DataAvailabilityResult = {
  tier: 'high',
  daysLogged: 14,
  weeksWithData: 2,
  hasWeightData: true,
  hasMealTimingData: true,
  promptGuidance: 'DATA AVAILABILITY: HIGH',
};

const defaultDerivedInsights: DerivedInsight[] = [
  { id: 'protein-low-adherence', category: 'protein', message: 'Protein intake is below target.', confidence: 0.8, priority: 1 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildUnifiedNutritionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRawNutritionData as jest.Mock).mockResolvedValue(makeRawData());
    (computeDataAvailability as jest.Mock).mockReturnValue(defaultDataAvailability);
    (computeDerivedInsights as jest.Mock).mockReturnValue(defaultDerivedInsights);
  });

  // -----------------------------------------------------------------------
  // 1. Shape
  // -----------------------------------------------------------------------
  it('returns correct shape with all expected fields', async () => {
    const result = await buildUnifiedNutritionContext();

    // Top-level keys
    expect(result).toHaveProperty('metrics');
    expect(result).toHaveProperty('profile');
    expect(result).toHaveProperty('dataAvailability');
    expect(result).toHaveProperty('derivedInsights');
    expect(result).toHaveProperty('frequentFoods');

    // metrics sub-keys
    expect(result.metrics).toHaveProperty('todayProgress');
    expect(result.metrics).toHaveProperty('weeklyTrends');
    expect(result.metrics).toHaveProperty('consistency');
    expect(result.metrics).toHaveProperty('mealDistribution');
    expect(result.metrics).toHaveProperty('weightTrend');

    // todayProgress macro keys
    expect(result.metrics.todayProgress).toHaveProperty('calories');
    expect(result.metrics.todayProgress).toHaveProperty('protein');
    expect(result.metrics.todayProgress).toHaveProperty('carbs');
    expect(result.metrics.todayProgress).toHaveProperty('fat');
    expect(result.metrics.todayProgress).toHaveProperty('fiber');
    expect(result.metrics.todayProgress).toHaveProperty('mealsLoggedToday');

    // profile keys
    expect(result.profile).toHaveProperty('goal');
    expect(result.profile).toHaveProperty('activityLevel');
    expect(result.profile).toHaveProperty('weightUnit');

    // dataAvailability and derivedInsights come from mocks
    expect(result.dataAvailability).toEqual(defaultDataAvailability);
    expect(result.derivedInsights).toEqual(defaultDerivedInsights);
  });

  // -----------------------------------------------------------------------
  // 2. Profile defaults
  // -----------------------------------------------------------------------
  it('defaults goal to "maintain" when rawData.goal is null', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(makeRawData({ goal: null }));

    const result = await buildUnifiedNutritionContext();
    expect(result.profile.goal).toBe('maintain');
  });

  it('defaults activityLevel to "moderately_active" when rawData.profile is null', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(makeRawData({ profile: null }));

    const result = await buildUnifiedNutritionContext();
    expect(result.profile.activityLevel).toBe('moderately_active');
  });

  it('defaults activityLevel to "moderately_active" when profile.activityLevel is null', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({
        profile: { activityLevel: null, eatingStyle: 'balanced', proteinPriority: 'high' },
      }),
    );

    const result = await buildUnifiedNutritionContext();
    expect(result.profile.activityLevel).toBe('moderately_active');
  });

  // -----------------------------------------------------------------------
  // 3. frequentFoods sliced to max 10
  // -----------------------------------------------------------------------
  it('slices frequentFoods to a maximum of 10 entries', async () => {
    // Default makeRawData has 15 frequent foods
    const result = await buildUnifiedNutritionContext();
    expect(result.frequentFoods).toHaveLength(10);
    expect(result.frequentFoods[0].name).toBe('Food 1');
    expect(result.frequentFoods[9].name).toBe('Food 10');
  });

  it('returns all frequentFoods when fewer than 10', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({
        frequentFoods: [
          { name: 'Chicken', timesLogged: 10, avgCalories: 300 },
          { name: 'Rice', timesLogged: 8, avgCalories: 250 },
        ],
      }),
    );

    const result = await buildUnifiedNutritionContext();
    expect(result.frequentFoods).toHaveLength(2);
  });

  // -----------------------------------------------------------------------
  // 4. todayProgress: calculates MacroProgress correctly
  // -----------------------------------------------------------------------
  it('calculates MacroProgress correctly for today', async () => {
    const todayLog = makeDailyLog(todayStr, {
      calories: 1500,
      protein: 120,
      carbs: 180,
      fat: 50,
      fiber: 20,
      mealsLogged: 2,
    });

    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({ dailyLogs: [todayLog] }),
    );

    const result = await buildUnifiedNutritionContext();
    const { todayProgress } = result.metrics;

    // calories: consumed 1500, target 2000
    expect(todayProgress.calories.consumed).toBe(1500);
    expect(todayProgress.calories.target).toBe(2000);
    expect(todayProgress.calories.remaining).toBe(500);
    expect(todayProgress.calories.percentComplete).toBe(75);

    // protein: consumed 120, target 150
    expect(todayProgress.protein.consumed).toBe(120);
    expect(todayProgress.protein.target).toBe(150);
    expect(todayProgress.protein.remaining).toBe(30);
    expect(todayProgress.protein.percentComplete).toBe(80);

    // carbs: consumed 180, target 200
    expect(todayProgress.carbs.consumed).toBe(180);
    expect(todayProgress.carbs.target).toBe(200);
    expect(todayProgress.carbs.remaining).toBe(20);
    expect(todayProgress.carbs.percentComplete).toBe(90);

    // fat: consumed 50, target 65
    expect(todayProgress.fat.consumed).toBe(50);
    expect(todayProgress.fat.target).toBe(65);
    expect(todayProgress.fat.remaining).toBe(15);
    expect(todayProgress.fat.percentComplete).toBe(77);

    // fiber: consumed 20, target 28
    expect(todayProgress.fiber.consumed).toBe(20);
    expect(todayProgress.fiber.target).toBe(28);
    expect(todayProgress.fiber.remaining).toBe(8);

    expect(todayProgress.mealsLoggedToday).toBe(2);
  });

  it('caps percentComplete at 100 when consumed exceeds target', async () => {
    const todayLog = makeDailyLog(todayStr, {
      calories: 2500,
      protein: 200,
      carbs: 250,
      fat: 90,
      fiber: 35,
      mealsLogged: 4,
    });

    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({ dailyLogs: [todayLog] }),
    );

    const result = await buildUnifiedNutritionContext();
    const { todayProgress } = result.metrics;

    expect(todayProgress.calories.percentComplete).toBe(100);
    expect(todayProgress.protein.percentComplete).toBe(100);
    // remaining should be 0 when consumed exceeds target
    expect(todayProgress.calories.remaining).toBe(0);
    expect(todayProgress.protein.remaining).toBe(0);
  });

  // -----------------------------------------------------------------------
  // 5. todayProgress: returns zeros when no log for today
  // -----------------------------------------------------------------------
  it('returns zeros for todayProgress when no log exists for today', async () => {
    const yesterdayLog = makeDailyLog(daysAgoStr(1), { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 });

    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({ dailyLogs: [yesterdayLog] }),
    );

    const result = await buildUnifiedNutritionContext();
    const { todayProgress } = result.metrics;

    expect(todayProgress.calories.consumed).toBe(0);
    expect(todayProgress.calories.remaining).toBe(2000);
    expect(todayProgress.calories.percentComplete).toBe(0);
    expect(todayProgress.protein.consumed).toBe(0);
    expect(todayProgress.carbs.consumed).toBe(0);
    expect(todayProgress.fat.consumed).toBe(0);
    expect(todayProgress.fiber.consumed).toBe(0);
    expect(todayProgress.mealsLoggedToday).toBe(0);
  });

  // -----------------------------------------------------------------------
  // 6. weeklyTrends: computes averages, adherence, and direction
  // -----------------------------------------------------------------------
  it('computes weeklyTrends averages, adherence, and direction correctly', async () => {
    // 7 days this week (within 10% of 2000 = 1800-2200 for calorie adherence)
    const thisWeekLogs = [
      makeDailyLog(daysAgoStr(0), { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25 }),
      makeDailyLog(daysAgoStr(1), { calories: 1950, protein: 145, carbs: 195, fat: 63, fiber: 24 }),
      makeDailyLog(daysAgoStr(2), { calories: 2050, protein: 155, carbs: 205, fat: 67, fiber: 26 }),
      makeDailyLog(daysAgoStr(3), { calories: 1900, protein: 140, carbs: 190, fat: 60, fiber: 23 }),
      makeDailyLog(daysAgoStr(4), { calories: 2100, protein: 160, carbs: 210, fat: 70, fiber: 28 }),
      makeDailyLog(daysAgoStr(5), { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25 }),
      makeDailyLog(daysAgoStr(6), { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25 }),
    ];
    // 7 days prior week (lower calories to detect direction)
    const lastWeekLogs = [
      makeDailyLog(daysAgoStr(7), { calories: 1700, protein: 130, carbs: 170, fat: 55, fiber: 20 }),
      makeDailyLog(daysAgoStr(8), { calories: 1750, protein: 135, carbs: 175, fat: 57, fiber: 21 }),
      makeDailyLog(daysAgoStr(9), { calories: 1700, protein: 130, carbs: 170, fat: 55, fiber: 20 }),
      makeDailyLog(daysAgoStr(10), { calories: 1750, protein: 135, carbs: 175, fat: 57, fiber: 21 }),
      makeDailyLog(daysAgoStr(11), { calories: 1700, protein: 130, carbs: 170, fat: 55, fiber: 20 }),
      makeDailyLog(daysAgoStr(12), { calories: 1750, protein: 135, carbs: 175, fat: 57, fiber: 21 }),
      makeDailyLog(daysAgoStr(13), { calories: 1700, protein: 130, carbs: 170, fat: 55, fiber: 20 }),
    ];

    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({ dailyLogs: [...lastWeekLogs, ...thisWeekLogs] }),
    );

    const result = await buildUnifiedNutritionContext();
    const { weeklyTrends } = result.metrics;

    expect(weeklyTrends.daysLoggedThisWeek).toBe(7);
    expect(weeklyTrends.daysLoggedLastWeek).toBe(7);

    // Average calories this week: (2000+1950+2050+1900+2100+2000+2000)/7 = 14000/7 = 2000
    expect(weeklyTrends.avgCalories).toBe(2000);

    // All 7 days are within +-10% of 2000 (1800-2200), so 100% adherence
    expect(weeklyTrends.calorieAdherence).toBe(100);

    // Prior week avg calories: ~1721 → this week 2000 → pctChange = (2000-1721)/1721 * 100 ≈ 16.2% > 5%
    expect(weeklyTrends.calorieDirection).toBe('increasing');
  });

  // -----------------------------------------------------------------------
  // 7. weeklyTrends: direction is 'stable' when prior week avg is 0
  // -----------------------------------------------------------------------
  it('returns "stable" direction when prior week average is 0 (no prior week data)', async () => {
    // Only 7 days of data (no prior week)
    const thisWeekLogs = Array.from({ length: 7 }, (_, i) =>
      makeDailyLog(daysAgoStr(i), { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25 }),
    );

    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({ dailyLogs: thisWeekLogs }),
    );

    const result = await buildUnifiedNutritionContext();
    const { weeklyTrends } = result.metrics;

    expect(weeklyTrends.calorieDirection).toBe('stable');
    expect(weeklyTrends.proteinDirection).toBe('stable');
    expect(weeklyTrends.daysLoggedLastWeek).toBe(0);
  });

  // -----------------------------------------------------------------------
  // 8. consistency: calculates streaks and logging rates
  // -----------------------------------------------------------------------
  it('calculates consistency streaks and logging rates', async () => {
    // Create a streak: today, yesterday, day before (3 consecutive), then skip a day, then 2 more
    const logs = [
      makeDailyLog(daysAgoStr(0)),
      makeDailyLog(daysAgoStr(1)),
      makeDailyLog(daysAgoStr(2)),
      // gap at day 3
      makeDailyLog(daysAgoStr(4)),
      makeDailyLog(daysAgoStr(5)),
    ];

    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({ dailyLogs: logs }),
    );

    const result = await buildUnifiedNutritionContext();
    const { consistency } = result.metrics;

    // Current streak: today, yesterday, day before = 3 consecutive from today back
    expect(consistency.currentStreak).toBe(3);

    // Longest streak: 3 (days 0-2) — days 4-5 is only 2 consecutive
    expect(consistency.longestStreak).toBe(3);

    // loggingRate7d: 5 out of 7 days in last 7 days (days 0,1,2,4,5)
    expect(consistency.loggingRate7d).toBe(Math.round((5 / 7) * 100));

    // loggingRate30d: 5 out of 30 days
    expect(consistency.loggingRate30d).toBe(Math.round((5 / 30) * 100));
  });

  it('returns zero current streak when today has no log', async () => {
    const logs = [
      makeDailyLog(daysAgoStr(1)),
      makeDailyLog(daysAgoStr(2)),
      makeDailyLog(daysAgoStr(3)),
    ];

    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({ dailyLogs: logs }),
    );

    const result = await buildUnifiedNutritionContext();
    expect(result.metrics.consistency.currentStreak).toBe(0);
  });

  // -----------------------------------------------------------------------
  // 9. mealDistribution: computes calorie distribution percentages
  // -----------------------------------------------------------------------
  it('computes meal calorie distribution percentages', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({
        mealPatterns: [
          { mealType: 'breakfast', avgCalories: 400, frequency: 5 },
          { mealType: 'lunch', avgCalories: 600, frequency: 7 },
          { mealType: 'dinner', avgCalories: 800, frequency: 7 },
          { mealType: 'snack', avgCalories: 200, frequency: 4 },
        ],
      }),
    );

    const result = await buildUnifiedNutritionContext();
    const { mealDistribution } = result.metrics;

    // Total: 400+600+800+200 = 2000
    expect(mealDistribution.calorieDistribution.breakfast).toBe(20); // 400/2000*100
    expect(mealDistribution.calorieDistribution.lunch).toBe(30);     // 600/2000*100
    expect(mealDistribution.calorieDistribution.dinner).toBe(40);    // 800/2000*100
    expect(mealDistribution.calorieDistribution.snack).toBe(10);     // 200/2000*100

    expect(mealDistribution.largestMealType).toBe('Dinner');

    expect(mealDistribution.breakfastFrequency).toBe(5);
    expect(mealDistribution.lunchFrequency).toBe(7);
    expect(mealDistribution.dinnerFrequency).toBe(7);
    expect(mealDistribution.snackFrequency).toBe(4);
  });

  it('computes avgMealsPerDay from last 7 daily logs', async () => {
    const logs = Array.from({ length: 7 }, (_, i) =>
      makeDailyLog(daysAgoStr(i), { mealsLogged: 3 }),
    );

    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({ dailyLogs: logs }),
    );

    const result = await buildUnifiedNutritionContext();
    // All 7 days have 3 meals → avg = 3.0
    expect(result.metrics.mealDistribution.avgMealsPerDay).toBe(3);
  });

  // -----------------------------------------------------------------------
  // 10. weightTrend: returns null when fewer than 3 entries
  // -----------------------------------------------------------------------
  it('returns null weightTrend when fewer than 3 weight entries', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({
        weightTrend: [
          { date: daysAgoStr(10), weightKg: 80 },
          { date: daysAgoStr(5), weightKg: 79.5 },
        ],
      }),
    );

    const result = await buildUnifiedNutritionContext();
    expect(result.metrics.weightTrend).toBeNull();
  });

  it('returns null weightTrend when weight entries array is empty', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({ weightTrend: [] }),
    );

    const result = await buildUnifiedNutritionContext();
    expect(result.metrics.weightTrend).toBeNull();
  });

  // -----------------------------------------------------------------------
  // 11. weightTrend: direction based on 30d change
  // -----------------------------------------------------------------------
  it('returns "gaining" direction when 30d weight change > 0.5 kg', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({
        weightTrend: [
          { date: daysAgoStr(28), weightKg: 78 },
          { date: daysAgoStr(21), weightKg: 78.3 },
          { date: daysAgoStr(14), weightKg: 78.8 },
          { date: daysAgoStr(7), weightKg: 79.2 },
          { date: daysAgoStr(0), weightKg: 79.5 },
        ],
      }),
    );

    const result = await buildUnifiedNutritionContext();
    // 30d change: 79.5 - 78 = 1.5 > 0.5
    expect(result.metrics.weightTrend).not.toBeNull();
    expect(result.metrics.weightTrend!.direction).toBe('gaining');
    expect(result.metrics.weightTrend!.currentWeight).toBe(79.5);
    expect(result.metrics.weightTrend!.weightChange30d).toBe(1.5);
  });

  it('returns "losing" direction when 30d weight change < -0.5 kg', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({
        weightTrend: [
          { date: daysAgoStr(28), weightKg: 82 },
          { date: daysAgoStr(21), weightKg: 81.5 },
          { date: daysAgoStr(14), weightKg: 81 },
          { date: daysAgoStr(7), weightKg: 80.5 },
          { date: daysAgoStr(0), weightKg: 80 },
        ],
      }),
    );

    const result = await buildUnifiedNutritionContext();
    // 30d change: 80 - 82 = -2.0 < -0.5
    expect(result.metrics.weightTrend!.direction).toBe('losing');
    expect(result.metrics.weightTrend!.weightChange30d).toBe(-2);
  });

  it('returns "maintaining" direction when 30d weight change is between -0.5 and 0.5', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({
        weightTrend: [
          { date: daysAgoStr(28), weightKg: 80 },
          { date: daysAgoStr(21), weightKg: 80.1 },
          { date: daysAgoStr(14), weightKg: 79.9 },
          { date: daysAgoStr(7), weightKg: 80.1 },
          { date: daysAgoStr(0), weightKg: 80.2 },
        ],
      }),
    );

    const result = await buildUnifiedNutritionContext();
    // 30d change: 80.2 - 80 = 0.2, which is between -0.5 and 0.5
    expect(result.metrics.weightTrend!.direction).toBe('maintaining');
  });

  // -----------------------------------------------------------------------
  // 12. weightTrend: 'insufficient_data' direction when fewer than 5 entries
  // -----------------------------------------------------------------------
  it('returns "insufficient_data" direction when fewer than 5 weight entries', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({
        weightTrend: [
          { date: daysAgoStr(20), weightKg: 78 },
          { date: daysAgoStr(10), weightKg: 79 },
          { date: daysAgoStr(5), weightKg: 79.5 },
          { date: daysAgoStr(0), weightKg: 80 },
        ],
      }),
    );

    const result = await buildUnifiedNutritionContext();
    // 4 entries >= 3 so not null, but < 5 so direction is insufficient_data
    expect(result.metrics.weightTrend).not.toBeNull();
    expect(result.metrics.weightTrend!.direction).toBe('insufficient_data');
    expect(result.metrics.weightTrend!.currentWeight).toBe(80);
    expect(result.metrics.weightTrend!.weightChange30d).toBe(2);
  });

  it('returns "insufficient_data" direction with exactly 3 weight entries', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(
      makeRawData({
        weightTrend: [
          { date: daysAgoStr(20), weightKg: 78 },
          { date: daysAgoStr(10), weightKg: 79 },
          { date: daysAgoStr(0), weightKg: 80 },
        ],
      }),
    );

    const result = await buildUnifiedNutritionContext();
    expect(result.metrics.weightTrend).not.toBeNull();
    expect(result.metrics.weightTrend!.direction).toBe('insufficient_data');
  });

  // -----------------------------------------------------------------------
  // Mock wiring verification
  // -----------------------------------------------------------------------
  it('passes rawData to computeDataAvailability', async () => {
    const rawData = makeRawData();
    (getRawNutritionData as jest.Mock).mockResolvedValue(rawData);

    await buildUnifiedNutritionContext();

    expect(computeDataAvailability).toHaveBeenCalledTimes(1);
    expect(computeDataAvailability).toHaveBeenCalledWith(rawData);
  });

  it('passes rawData, computed metrics, and goal type to computeDerivedInsights', async () => {
    const rawData = makeRawData({ goal: { type: 'gain', targetCalories: 2500, targetProtein: 180, targetCarbs: 250, targetFat: 80 } });
    (getRawNutritionData as jest.Mock).mockResolvedValue(rawData);

    await buildUnifiedNutritionContext();

    expect(computeDerivedInsights).toHaveBeenCalledTimes(1);
    const [passedRawData, passedMetrics, passedGoalType] = (computeDerivedInsights as jest.Mock).mock.calls[0];
    expect(passedRawData).toBe(rawData);
    expect(passedGoalType).toBe('gain');
    // metrics should be a fully computed object
    expect(passedMetrics).toHaveProperty('todayProgress');
    expect(passedMetrics).toHaveProperty('weeklyTrends');
    expect(passedMetrics).toHaveProperty('consistency');
    expect(passedMetrics).toHaveProperty('mealDistribution');
    expect(passedMetrics).toHaveProperty('weightTrend');
  });

  it('passes null as goal type to computeDerivedInsights when goal is null', async () => {
    (getRawNutritionData as jest.Mock).mockResolvedValue(makeRawData({ goal: null }));

    await buildUnifiedNutritionContext();

    const [, , passedGoalType] = (computeDerivedInsights as jest.Mock).mock.calls[0];
    expect(passedGoalType).toBeNull();
  });
});
