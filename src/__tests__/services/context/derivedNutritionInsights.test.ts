import { computeDerivedInsights, type DerivedInsight } from '@/services/context/derivedNutritionInsights';
import type { RawNutritionData } from '@/services/context/nutritionContextQueries';
import type { UnifiedNutritionContext } from '@/services/context/nutritionContextBuilder';

type Metrics = UnifiedNutritionContext['metrics'];

function makeRawData(overrides: Partial<RawNutritionData> = {}): RawNutritionData {
  return {
    dailyLogs: [],
    weeklyAverages: [],
    macroTargets: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    frequentFoods: [],
    mealPatterns: [],
    weightTrend: [],
    goal: null,
    profile: null,
    weightUnit: 'lbs',
    ...overrides,
  };
}

function makeMetrics(overrides: Partial<Metrics> = {}): Metrics {
  return {
    todayProgress: {
      calories: { consumed: 0, target: 2000, remaining: 2000, percentComplete: 0 },
      protein: { consumed: 0, target: 150, remaining: 150, percentComplete: 0 },
      carbs: { consumed: 0, target: 200, remaining: 200, percentComplete: 0 },
      fat: { consumed: 0, target: 65, remaining: 65, percentComplete: 0 },
      fiber: { consumed: 0, target: 28, remaining: 28 },
      mealsLoggedToday: 0,
    },
    weeklyTrends: {
      avgCalories: 2000,
      avgProtein: 150,
      avgCarbs: 200,
      avgFat: 65,
      avgFiber: 25,
      calorieAdherence: 80,
      proteinAdherence: 80,
      daysLoggedThisWeek: 7,
      daysLoggedLastWeek: 7,
      calorieDirection: 'stable',
      proteinDirection: 'stable',
    },
    consistency: {
      currentStreak: 7,
      longestStreak: 14,
      loggingRate7d: 100,
      loggingRate30d: 90,
    },
    mealDistribution: {
      breakfastFrequency: 5,
      lunchFrequency: 6,
      dinnerFrequency: 7,
      snackFrequency: 4,
      avgMealsPerDay: 3.5,
      largestMealType: 'Dinner',
      calorieDistribution: { breakfast: 25, lunch: 30, dinner: 35, snack: 10 },
    },
    weightTrend: null,
    ...overrides,
  };
}

describe('computeDerivedInsights', () => {
  describe('insufficient data', () => {
    it('returns empty array when fewer than 3 logs for protein patterns', () => {
      const rawData = makeRawData({
        dailyLogs: [
          { date: '2025-01-14', calories: 2000, protein: 50, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
          { date: '2025-01-15', calories: 2000, protein: 50, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
        ],
      });
      const metrics = makeMetrics({ weeklyTrends: { ...makeMetrics().weeklyTrends, proteinAdherence: 40 } });
      const result = computeDerivedInsights(rawData, metrics, 'lose');
      const proteinInsights = result.filter((i) => i.id === 'protein-low-adherence');
      expect(proteinInsights).toHaveLength(0);
    });
  });

  describe('Rule 1: Protein Patterns', () => {
    it('detects low protein adherence', () => {
      const rawData = makeRawData({
        dailyLogs: Array.from({ length: 7 }, (_, i) => ({
          date: `2025-01-${String(15 - i).padStart(2, '0')}`,
          calories: 2000, protein: 80, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3,
        })),
      });
      const metrics = makeMetrics({
        weeklyTrends: { ...makeMetrics().weeklyTrends, proteinAdherence: 40, avgProtein: 80 },
      });
      const result = computeDerivedInsights(rawData, metrics, 'lose');
      const insight = result.find((i) => i.id === 'protein-low-adherence');
      expect(insight).toBeDefined();
      expect(insight!.category).toBe('protein');
      expect(insight!.message).toContain('80g');
      expect(insight!.message).toContain('150g');
    });

    it('does not trigger low protein when adherence is above 60%', () => {
      const rawData = makeRawData({
        dailyLogs: Array.from({ length: 7 }, (_, i) => ({
          date: `2025-01-${String(15 - i).padStart(2, '0')}`,
          calories: 2000, protein: 140, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3,
        })),
      });
      const metrics = makeMetrics({
        weeklyTrends: { ...makeMetrics().weeklyTrends, proteinAdherence: 70, avgProtein: 140 },
      });
      const result = computeDerivedInsights(rawData, metrics, 'lose');
      expect(result.find((i) => i.id === 'protein-low-adherence')).toBeUndefined();
    });
  });

  describe('Rule 2: Calorie Consistency', () => {
    it('detects high calorie variance', () => {
      const rawData = makeRawData({
        dailyLogs: [
          { date: '2025-01-09', calories: 1200, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
          { date: '2025-01-10', calories: 3000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
          { date: '2025-01-11', calories: 1300, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
          { date: '2025-01-12', calories: 2800, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
          { date: '2025-01-13', calories: 1400, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
          { date: '2025-01-14', calories: 2700, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
          { date: '2025-01-15', calories: 1100, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
        ],
      });
      const metrics = makeMetrics();
      const result = computeDerivedInsights(rawData, metrics, 'lose');
      expect(result.find((i) => i.id === 'calorie-high-variance')).toBeDefined();
    });

    it('detects consecutive over-target streak', () => {
      const rawData = makeRawData({
        dailyLogs: [
          { date: '2025-01-10', calories: 2500, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
          { date: '2025-01-11', calories: 2600, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
          { date: '2025-01-12', calories: 2500, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
          { date: '2025-01-13', calories: 2600, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 },
        ],
      });
      const metrics = makeMetrics();
      const result = computeDerivedInsights(rawData, metrics, 'lose');
      const drift = result.find((i) => i.id === 'calorie-consecutive-drift');
      expect(drift).toBeDefined();
      expect(drift!.message).toContain('over');
    });
  });

  describe('Rule 3: Meal Distribution Balance', () => {
    it('detects heavy dinner (>50% of calories)', () => {
      const metrics = makeMetrics({
        mealDistribution: {
          ...makeMetrics().mealDistribution,
          calorieDistribution: { breakfast: 15, lunch: 20, dinner: 55, snack: 10 },
        },
      });
      const result = computeDerivedInsights(makeRawData({ dailyLogs: Array.from({ length: 7 }, (_, i) => ({ date: `2025-01-${String(15 - i).padStart(2, '0')}`, calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 })) }), metrics, null);
      expect(result.find((i) => i.id === 'meal-heavy-dinner')).toBeDefined();
    });

    it('detects heavy snacking (>30% of calories)', () => {
      const metrics = makeMetrics({
        mealDistribution: {
          ...makeMetrics().mealDistribution,
          calorieDistribution: { breakfast: 20, lunch: 20, dinner: 25, snack: 35 },
        },
      });
      const result = computeDerivedInsights(makeRawData({ dailyLogs: Array.from({ length: 7 }, (_, i) => ({ date: `2025-01-${String(15 - i).padStart(2, '0')}`, calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 })) }), metrics, null);
      expect(result.find((i) => i.id === 'meal-heavy-snacks')).toBeDefined();
    });

    it('detects skipped meal (frequency < 3.5 days/week)', () => {
      const metrics = makeMetrics({
        mealDistribution: {
          ...makeMetrics().mealDistribution,
          breakfastFrequency: 2,
          calorieDistribution: { breakfast: 10, lunch: 35, dinner: 45, snack: 10 },
        },
      });
      const result = computeDerivedInsights(makeRawData({ dailyLogs: Array.from({ length: 7 }, (_, i) => ({ date: `2025-01-${String(15 - i).padStart(2, '0')}`, calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 })) }), metrics, null);
      expect(result.find((i) => i.id === 'meal-skipped-breakfast')).toBeDefined();
    });

    it('returns nothing when avgMealsPerDay < 1', () => {
      const metrics = makeMetrics({
        mealDistribution: { ...makeMetrics().mealDistribution, avgMealsPerDay: 0.5 },
      });
      const result = computeDerivedInsights(makeRawData(), metrics, null);
      expect(result.filter((i) => i.category === 'balance')).toHaveLength(0);
    });
  });

  describe('Rule 4: Weekend vs Weekday Drift', () => {
    it('detects weekend calorie drift (>20% higher)', () => {
      // Hardcoded dates to avoid timezone issues between UTC/local
      // Jan 2025: Sat=4,11  Sun=5,12  (weekends)  Mon-Fri=others (weekdays)
      const weekdayDates = ['2025-01-02','2025-01-03','2025-01-06','2025-01-07','2025-01-08','2025-01-09','2025-01-10','2025-01-13','2025-01-14','2025-01-15'];
      const weekendDates = ['2025-01-04','2025-01-05','2025-01-11','2025-01-12'];
      const logs = [
        ...weekdayDates.map(date => ({ date, calories: 1800, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 })),
        ...weekendDates.map(date => ({ date, calories: 3000, protein: 100, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 })),
      ];
      const rawData = makeRawData({ dailyLogs: logs });
      const metrics = makeMetrics();
      const result = computeDerivedInsights(rawData, metrics, null);
      expect(result.find((i) => i.id === 'weekend-calorie-drift')).toBeDefined();
    });

    it('does not trigger with fewer than 7 days of data', () => {
      const rawData = makeRawData({
        dailyLogs: Array.from({ length: 5 }, (_, i) => ({
          date: `2025-01-${String(15 - i).padStart(2, '0')}`,
          calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3,
        })),
      });
      const result = computeDerivedInsights(rawData, makeMetrics(), null);
      expect(result.find((i) => i.id === 'weekend-calorie-drift')).toBeUndefined();
    });
  });

  describe('Rule 5: Fiber Intake', () => {
    it('detects low fiber (<20g)', () => {
      const metrics = makeMetrics({
        weeklyTrends: { ...makeMetrics().weeklyTrends, avgFiber: 15, daysLoggedThisWeek: 5 },
      });
      const result = computeDerivedInsights(makeRawData({ dailyLogs: Array.from({ length: 7 }, (_, i) => ({ date: `2025-01-${String(15 - i).padStart(2, '0')}`, calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 15, mealsLogged: 3 })) }), metrics, null);
      expect(result.find((i) => i.id === 'fiber-low')).toBeDefined();
    });

    it('does not trigger when avgFiber is undefined', () => {
      const metrics = makeMetrics({
        weeklyTrends: { ...makeMetrics().weeklyTrends, avgFiber: undefined as any, daysLoggedThisWeek: 5 },
      });
      const result = computeDerivedInsights(makeRawData(), metrics, null);
      expect(result.find((i) => i.id === 'fiber-low')).toBeUndefined();
    });

    it('does not trigger when fewer than 3 days logged this week', () => {
      const metrics = makeMetrics({
        weeklyTrends: { ...makeMetrics().weeklyTrends, avgFiber: 15, daysLoggedThisWeek: 2 },
      });
      const result = computeDerivedInsights(makeRawData(), metrics, null);
      expect(result.find((i) => i.id === 'fiber-low')).toBeUndefined();
    });
  });

  describe('Rule 6: Weight vs Calorie Alignment', () => {
    it('detects mismatch on cut: gaining weight despite high adherence', () => {
      const metrics = makeMetrics({
        weightTrend: { currentWeight: 80, weightChange7d: 0.5, weightChange30d: 1.5, direction: 'gaining' },
        weeklyTrends: { ...makeMetrics().weeklyTrends, calorieAdherence: 85 },
      });
      const result = computeDerivedInsights(makeRawData({ dailyLogs: Array.from({ length: 7 }, (_, i) => ({ date: `2025-01-${String(15 - i).padStart(2, '0')}`, calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 })) }), metrics, 'lose');
      expect(result.find((i) => i.id === 'weight-calorie-mismatch-cut')).toBeDefined();
    });

    it('detects mismatch on bulk: losing weight on gain goal', () => {
      const metrics = makeMetrics({
        weightTrend: { currentWeight: 70, weightChange7d: -0.3, weightChange30d: -1.0, direction: 'losing' },
      });
      const result = computeDerivedInsights(makeRawData({ dailyLogs: Array.from({ length: 7 }, (_, i) => ({ date: `2025-01-${String(15 - i).padStart(2, '0')}`, calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 })) }), metrics, 'gain');
      expect(result.find((i) => i.id === 'weight-calorie-mismatch-bulk')).toBeDefined();
    });

    it('detects maintenance drift (>0.9kg in 30 days)', () => {
      const metrics = makeMetrics({
        weightTrend: { currentWeight: 80, weightChange7d: 0.3, weightChange30d: 1.2, direction: 'gaining' },
      });
      const result = computeDerivedInsights(makeRawData({ dailyLogs: Array.from({ length: 7 }, (_, i) => ({ date: `2025-01-${String(15 - i).padStart(2, '0')}`, calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 })) }), metrics, 'maintain');
      expect(result.find((i) => i.id === 'weight-maintenance-drift')).toBeDefined();
    });

    it('returns nothing when no weight trend or goal', () => {
      const result = computeDerivedInsights(makeRawData(), makeMetrics(), null);
      expect(result.filter((i) => i.category === 'weight')).toHaveLength(0);
    });

    it('returns nothing when weight direction is insufficient_data', () => {
      const metrics = makeMetrics({
        weightTrend: { currentWeight: 80, weightChange7d: null, weightChange30d: 0.2, direction: 'insufficient_data' },
      });
      const result = computeDerivedInsights(makeRawData(), metrics, 'lose');
      expect(result.filter((i) => i.category === 'weight')).toHaveLength(0);
    });
  });

  describe('Rule 7: Logging Dropoff', () => {
    it('detects logging dropoff when 7d rate much lower than 30d', () => {
      const metrics = makeMetrics({
        consistency: { currentStreak: 2, longestStreak: 14, loggingRate7d: 40, loggingRate30d: 80 },
      });
      const result = computeDerivedInsights(makeRawData({ dailyLogs: Array.from({ length: 7 }, (_, i) => ({ date: `2025-01-${String(15 - i).padStart(2, '0')}`, calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 })) }), metrics, null);
      expect(result.find((i) => i.id === 'logging-dropoff')).toBeDefined();
    });

    it('detects excellent logging consistency', () => {
      const metrics = makeMetrics({
        consistency: { currentStreak: 14, longestStreak: 30, loggingRate7d: 100, loggingRate30d: 93 },
      });
      const result = computeDerivedInsights(makeRawData({ dailyLogs: Array.from({ length: 7 }, (_, i) => ({ date: `2025-01-${String(15 - i).padStart(2, '0')}`, calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25, mealsLogged: 3 })) }), metrics, null);
      expect(result.find((i) => i.id === 'logging-excellent')).toBeDefined();
    });
  });

  describe('filtering and sorting', () => {
    it('filters out insights with confidence below 0.5', () => {
      // All insights have confidence >= 0.55, so this is a sanity check
      const result = computeDerivedInsights(makeRawData(), makeMetrics(), null);
      result.forEach((i) => expect(i.confidence).toBeGreaterThanOrEqual(0.5));
    });

    it('returns at most 5 insights', () => {
      // Create conditions for many insights at once
      const logs = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date('2025-01-15');
        d.setDate(d.getDate() - i);
        const day = d.getDay();
        const isWeekend = day === 0 || day === 6;
        logs.push({
          date: d.toISOString().split('T')[0],
          calories: isWeekend ? 3000 : 1200,
          protein: isWeekend ? 50 : 80,
          carbs: 200, fat: 65, fiber: 10, mealsLogged: 1,
        });
      }
      const rawData = makeRawData({ dailyLogs: logs });
      const metrics = makeMetrics({
        weeklyTrends: { ...makeMetrics().weeklyTrends, proteinAdherence: 30, avgProtein: 70, avgFiber: 10, daysLoggedThisWeek: 5 },
        mealDistribution: {
          ...makeMetrics().mealDistribution,
          avgMealsPerDay: 2,
          breakfastFrequency: 1,
          calorieDistribution: { breakfast: 5, lunch: 20, dinner: 60, snack: 15 },
        },
        consistency: { currentStreak: 2, longestStreak: 14, loggingRate7d: 40, loggingRate30d: 80 },
      });
      const result = computeDerivedInsights(rawData, metrics, 'lose');
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('sorts by priority (1 = highest)', () => {
      const rawData = makeRawData({
        dailyLogs: Array.from({ length: 7 }, (_, i) => ({
          date: `2025-01-${String(15 - i).padStart(2, '0')}`,
          calories: 2000, protein: 70, carbs: 200, fat: 65, fiber: 10, mealsLogged: 3,
        })),
      });
      const metrics = makeMetrics({
        weeklyTrends: { ...makeMetrics().weeklyTrends, proteinAdherence: 30, avgProtein: 70, avgFiber: 10, daysLoggedThisWeek: 5 },
      });
      const result = computeDerivedInsights(rawData, metrics, null);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].priority).toBeGreaterThanOrEqual(result[i - 1].priority);
      }
    });
  });
});
