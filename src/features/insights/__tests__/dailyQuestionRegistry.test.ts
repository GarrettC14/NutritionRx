/**
 * Daily Question Registry Tests
 * Tests question availability gates and relevance scoring
 */

import { questionRegistry } from '../constants/dailyQuestionRegistry';
import type { DailyInsightData } from '../types/dailyInsights.types';

function makeBaseData(overrides: Partial<DailyInsightData> = {}): DailyInsightData {
  return {
    todayCalories: 1500,
    todayProtein: 100,
    todayCarbs: 180,
    todayFat: 50,
    todayFiber: 15,
    calorieTarget: 2000,
    proteinTarget: 150,
    carbTarget: 250,
    fatTarget: 65,
    waterTarget: 2500,
    todayWater: 1500,
    todayMealCount: 3,
    todayFoods: [
      { name: 'Chicken Breast', calories: 300, protein: 50, carbs: 0, fat: 7 },
      { name: 'Rice', calories: 400, protein: 8, carbs: 90, fat: 1 },
      { name: 'Broccoli', calories: 100, protein: 7, carbs: 20, fat: 1 },
    ],
    mealsWithTimestamps: [
      {
        mealLabel: 'Breakfast',
        totalCalories: 500,
        totalProtein: 30,
        totalCarbs: 60,
        totalFat: 15,
        firstLogTime: '2025-01-15T08:00:00Z',
        foods: [{ name: 'Oatmeal', calories: 500, protein: 30, carbs: 60, fat: 15 }],
      },
      {
        mealLabel: 'Lunch',
        totalCalories: 600,
        totalProtein: 40,
        totalCarbs: 70,
        totalFat: 20,
        firstLogTime: '2025-01-15T12:00:00Z',
        foods: [{ name: 'Chicken Breast', calories: 600, protein: 40, carbs: 70, fat: 20 }],
      },
      {
        mealLabel: 'Dinner',
        totalCalories: 400,
        totalProtein: 30,
        totalCarbs: 50,
        totalFat: 15,
        firstLogTime: '2025-01-15T18:00:00Z',
        foods: [{ name: 'Rice', calories: 400, protein: 30, carbs: 50, fat: 15 }],
      },
    ],
    avgCalories7d: 1800,
    avgProtein7d: 120,
    loggingStreak: 5,
    calorieStreak: 3,
    weeklyDailyTotals: [
      { date: '2025-01-15', logged: true, calories: 1500, protein: 100, carbs: 180, fat: 50 },
      { date: '2025-01-14', logged: true, calories: 1800, protein: 120, carbs: 200, fat: 55 },
      { date: '2025-01-13', logged: true, calories: 1900, protein: 130, carbs: 210, fat: 60 },
      { date: '2025-01-12', logged: true, calories: 2000, protein: 140, carbs: 220, fat: 65 },
      { date: '2025-01-11', logged: true, calories: 1700, protein: 110, carbs: 190, fat: 50 },
      { date: '2025-01-10', logged: false, calories: 0, protein: 0, carbs: 0, fat: 0 },
      { date: '2025-01-09', logged: true, calories: 1600, protein: 105, carbs: 185, fat: 52 },
    ],
    userGoal: 'maintain',
    daysUsingApp: 30,
    caloriePercent: 75,
    proteinPercent: 67,
    carbPercent: 72,
    fatPercent: 77,
    waterPercent: 60,
    currentHour: 14,
    dayProgress: 0.5,
    activeAlerts: [],
    ...overrides,
  };
}

describe('questionRegistry', () => {
  it('contains exactly 18 questions', () => {
    expect(questionRegistry).toHaveLength(18);
  });

  it('has unique IDs', () => {
    const ids = questionRegistry.map((q) => q.id);
    expect(new Set(ids).size).toBe(18);
  });

  it('covers all 6 categories', () => {
    const categories = new Set(questionRegistry.map((q) => q.category));
    expect(categories).toEqual(
      new Set(['macro_balance', 'protein_focus', 'meal_balance', 'hydration', 'trends', 'nutrient_gaps'])
    );
  });

  describe('availability gates', () => {
    it('macro_overview requires at least 1 meal', () => {
      const q = questionRegistry.find((q) => q.id === 'macro_overview')!;
      expect(q.isAvailable(makeBaseData({ todayMealCount: 0 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ todayMealCount: 1 }))).toBe(true);
    });

    it('macro_ratio requires at least 500 calories', () => {
      const q = questionRegistry.find((q) => q.id === 'macro_ratio')!;
      expect(q.isAvailable(makeBaseData({ todayCalories: 400 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ todayCalories: 500 }))).toBe(true);
    });

    it('remaining_budget requires >200 cal remaining', () => {
      const q = questionRegistry.find((q) => q.id === 'remaining_budget')!;
      expect(q.isAvailable(makeBaseData({ todayCalories: 1900, calorieTarget: 2000 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ todayCalories: 1700, calorieTarget: 2000 }))).toBe(true);
    });

    it('protein_per_meal requires at least 2 meals', () => {
      const q = questionRegistry.find((q) => q.id === 'protein_per_meal')!;
      expect(q.isAvailable(makeBaseData({ todayMealCount: 1 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ todayMealCount: 2 }))).toBe(true);
    });

    it('protein_remaining requires protein below target', () => {
      const q = questionRegistry.find((q) => q.id === 'protein_remaining')!;
      expect(q.isAvailable(makeBaseData({ todayProtein: 150, proteinTarget: 150 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ todayProtein: 100, proteinTarget: 150 }))).toBe(true);
    });

    it('meal_timing requires 2+ meals with timestamps', () => {
      const q = questionRegistry.find((q) => q.id === 'meal_timing')!;
      const oneTimestamp = makeBaseData({
        mealsWithTimestamps: [
          { mealLabel: 'Lunch', totalCalories: 600, totalProtein: 40, totalCarbs: 70, totalFat: 20, firstLogTime: '2025-01-15T12:00:00Z', foods: [] },
        ],
      });
      expect(q.isAvailable(oneTimestamp)).toBe(false);
      expect(q.isAvailable(makeBaseData())).toBe(true);
    });

    it('meal_variety requires 3+ foods', () => {
      const q = questionRegistry.find((q) => q.id === 'meal_variety')!;
      expect(q.isAvailable(makeBaseData({ todayFoods: [{ name: 'A', calories: 100, protein: 10, carbs: 10, fat: 5 }] }))).toBe(false);
      expect(q.isAvailable(makeBaseData())).toBe(true);
    });

    it('hydration_status requires water target > 0', () => {
      const q = questionRegistry.find((q) => q.id === 'hydration_status')!;
      expect(q.isAvailable(makeBaseData({ waterTarget: 0 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ waterTarget: 2500 }))).toBe(true);
    });

    it('hydration_pacing requires water target and hour >= 10', () => {
      const q = questionRegistry.find((q) => q.id === 'hydration_pacing')!;
      expect(q.isAvailable(makeBaseData({ waterTarget: 0, currentHour: 14 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ waterTarget: 2500, currentHour: 8 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ waterTarget: 2500, currentHour: 10 }))).toBe(true);
    });

    it('vs_weekly_avg requires 7d avg > 0 and 2+ meals', () => {
      const q = questionRegistry.find((q) => q.id === 'vs_weekly_avg')!;
      expect(q.isAvailable(makeBaseData({ avgCalories7d: 0 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ todayMealCount: 1 }))).toBe(false);
      expect(q.isAvailable(makeBaseData())).toBe(true);
    });

    it('consistency_check requires 3+ days using app', () => {
      const q = questionRegistry.find((q) => q.id === 'consistency_check')!;
      expect(q.isAvailable(makeBaseData({ daysUsingApp: 2 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ daysUsingApp: 3 }))).toBe(true);
    });

    it('trend_direction requires 5+ logged days in week', () => {
      const q = questionRegistry.find((q) => q.id === 'trend_direction')!;
      const onlyThreeLogged = makeBaseData({
        weeklyDailyTotals: [
          { date: '2025-01-15', logged: true, calories: 1500, protein: 100, carbs: 180, fat: 50 },
          { date: '2025-01-14', logged: true, calories: 1800, protein: 120, carbs: 200, fat: 55 },
          { date: '2025-01-13', logged: true, calories: 1900, protein: 130, carbs: 210, fat: 60 },
          { date: '2025-01-12', logged: false, calories: 0, protein: 0, carbs: 0, fat: 0 },
          { date: '2025-01-11', logged: false, calories: 0, protein: 0, carbs: 0, fat: 0 },
          { date: '2025-01-10', logged: false, calories: 0, protein: 0, carbs: 0, fat: 0 },
          { date: '2025-01-09', logged: false, calories: 0, protein: 0, carbs: 0, fat: 0 },
        ],
      });
      expect(q.isAvailable(onlyThreeLogged)).toBe(false);
      expect(q.isAvailable(makeBaseData())).toBe(true);
    });

    it('nutrient_overview requires active alerts', () => {
      const q = questionRegistry.find((q) => q.id === 'nutrient_overview')!;
      expect(q.isAvailable(makeBaseData({ activeAlerts: [] }))).toBe(false);
      expect(
        q.isAvailable(
          makeBaseData({
            activeAlerts: [
              { nutrientId: 'iron', nutrientName: 'Iron', averageIntake: 5, rdaTarget: 18, percentOfRDA: 28, severity: 'concern', message: 'Low iron', foodSuggestions: ['spinach'], tier: 1 },
            ],
          })
        )
      ).toBe(true);
    });

    it('micronutrient_status requires alerts and 7+ days using app', () => {
      const q = questionRegistry.find((q) => q.id === 'micronutrient_status')!;
      const alert = { nutrientId: 'iron', nutrientName: 'Iron', averageIntake: 5, rdaTarget: 18, percentOfRDA: 28, severity: 'concern' as const, message: 'Low iron', foodSuggestions: ['spinach'], tier: 1 as const };
      expect(q.isAvailable(makeBaseData({ activeAlerts: [alert], daysUsingApp: 5 }))).toBe(false);
      expect(q.isAvailable(makeBaseData({ activeAlerts: [alert], daysUsingApp: 7 }))).toBe(true);
    });

    it('brand new user empty day returns minimal available questions', () => {
      const emptyDay = makeBaseData({
        todayMealCount: 0,
        todayCalories: 0,
        todayProtein: 0,
        todayCarbs: 0,
        todayFat: 0,
        todayFiber: 0,
        todayFoods: [],
        mealsWithTimestamps: [],
        todayWater: 0,
        waterTarget: 0,
        avgCalories7d: 0,
        caloriePercent: 0,
        proteinPercent: 0,
        carbPercent: 0,
        fatPercent: 0,
        waterPercent: 0,
        activeAlerts: [],
        daysUsingApp: 1,
        loggingStreak: 0,
        calorieStreak: 0,
        calorieTarget: 0,
        proteinTarget: 0,
        weeklyDailyTotals: [],
      });
      const available = questionRegistry.filter((q) => q.isAvailable(emptyDay));
      // With zero targets and no data, almost nothing should be available
      const availableIds = available.map((q) => q.id);
      // remaining_budget: 0 - 0 = 0 > 200? No. protein_remaining: 0 < 0? No.
      // trend_direction: 0 logged days. consistency: daysUsingApp 1 < 3. No hydration (target 0).
      expect(available.length).toBe(0);
    });
  });

  describe('relevance scoring', () => {
    it('returns scores between 0 and 100', () => {
      const data = makeBaseData();
      for (const q of questionRegistry) {
        if (q.isAvailable(data)) {
          const score = q.computeRelevance(data);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      }
    });

    it('protein questions score higher when protein lags calories', () => {
      const lagging = makeBaseData({ proteinPercent: 40, caloriePercent: 75 });
      const balanced = makeBaseData({ proteinPercent: 75, caloriePercent: 75 });

      const q = questionRegistry.find((q) => q.id === 'protein_status')!;
      expect(q.computeRelevance(lagging)).toBeGreaterThan(q.computeRelevance(balanced));
    });

    it('calorie_pacing scores higher with large deviation from expected', () => {
      const onTrack = makeBaseData({ caloriePercent: 50, dayProgress: 0.5, currentHour: 14 });
      const wayAhead = makeBaseData({ caloriePercent: 90, dayProgress: 0.5, currentHour: 14 });

      const q = questionRegistry.find((q) => q.id === 'calorie_pacing')!;
      expect(q.computeRelevance(wayAhead)).toBeGreaterThan(q.computeRelevance(onTrack));
    });

    it('hydration_status scores higher when water is very low after noon', () => {
      const low = makeBaseData({ waterPercent: 20, currentHour: 14 });
      const ok = makeBaseData({ waterPercent: 70, currentHour: 14 });

      const q = questionRegistry.find((q) => q.id === 'hydration_status')!;
      expect(q.computeRelevance(low)).toBeGreaterThan(q.computeRelevance(ok));
    });

    it('vs_weekly_avg scores higher with large deviation from average', () => {
      const close = makeBaseData({ todayCalories: 1800, avgCalories7d: 1800 });
      const far = makeBaseData({ todayCalories: 2500, avgCalories7d: 1800 });

      const q = questionRegistry.find((q) => q.id === 'vs_weekly_avg')!;
      expect(q.computeRelevance(far)).toBeGreaterThan(q.computeRelevance(close));
    });
  });
});
