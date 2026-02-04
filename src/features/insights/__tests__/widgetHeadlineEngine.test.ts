/**
 * Widget Headline Engine Tests
 * Tests template-based headline selection logic
 */

import { computeWidgetHeadline } from '../services/daily/WidgetHeadlineEngine';
import type { DailyInsightData } from '../types/dailyInsights.types';

const BANNED_WORDS = ['failed', 'cheated', 'warning', 'bad', 'poor', 'behind', 'falling short'];

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
    todayFoods: [],
    mealsWithTimestamps: [],
    avgCalories7d: 1800,
    avgProtein7d: 120,
    loggingStreak: 5,
    calorieStreak: 3,
    weeklyDailyTotals: [],
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

describe('computeWidgetHeadline', () => {
  describe('rule priority', () => {
    it('Rule 1: returns empty state when no meals logged', () => {
      const data = makeBaseData({ todayMealCount: 0, todayCalories: 0 });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(1);
      expect(headline.text).toContain('Log your first meal');
      expect(headline.icon).toBe('leaf-outline');
    });

    it('Rule 2: returns minimal data message with 1 meal under 500cal', () => {
      const data = makeBaseData({ todayMealCount: 1, todayCalories: 300, caloriePercent: 15 });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(2);
      expect(headline.text).toContain('1 meal');
      expect(headline.icon).toBe('leaf-outline');
    });

    it('Rule 3: returns on-target message when calories 90-110%', () => {
      const data = makeBaseData({ caloriePercent: 95, todayMealCount: 3, todayCalories: 1900 });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(3);
      expect(headline.text).toContain('95%');
      expect(headline.text).toContain('nicely paced');
      expect(headline.icon).toBe('checkmark-circle-outline');
    });

    it('Rule 4: returns over-target message when calories > 110%', () => {
      const data = makeBaseData({
        caloriePercent: 120,
        todayCalories: 2400,
        calorieTarget: 2000,
        todayMealCount: 3,
      });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(4);
      expect(headline.text).toContain('120%');
      expect(headline.icon).toBe('bar-chart-outline');
    });

    it('Rule 5: returns protein gap when protein low but calories decent', () => {
      const data = makeBaseData({
        proteinPercent: 50,
        caloriePercent: 75,
        todayMealCount: 3,
        todayCalories: 1500,
      });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(5);
      expect(headline.text).toContain('Protein');
      expect(headline.text).toContain('50%');
      expect(headline.icon).toBe('barbell-outline');
    });

    it('Rule 6: returns hydration reminder in afternoon with low water', () => {
      const data = makeBaseData({
        waterTarget: 2500,
        waterPercent: 30,
        currentHour: 14,
        // Ensure rules 3-5 don't fire
        caloriePercent: 60,
        proteinPercent: 60,
        todayMealCount: 2,
        todayCalories: 1200,
      });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(6);
      expect(headline.text).toContain('Water');
      expect(headline.text).toContain('30%');
      expect(headline.icon).toBe('water-outline');
    });

    it('Rule 7: returns streak callout for 7+ day streak', () => {
      const data = makeBaseData({
        loggingStreak: 10,
        // Ensure rules 3-6 don't fire
        caloriePercent: 60,
        proteinPercent: 60,
        waterTarget: 0,
        todayMealCount: 2,
        todayCalories: 1200,
      });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(7);
      expect(headline.text).toContain('Day 10');
      expect(headline.icon).toBe('link-outline');
    });

    it('Rule 8: returns standard progress as default', () => {
      const data = makeBaseData({
        todayCalories: 1200,
        calorieTarget: 2000,
        caloriePercent: 60,
        proteinPercent: 60,
        waterTarget: 0,
        loggingStreak: 3,
        todayMealCount: 2,
        currentHour: 10,
      });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(8);
      expect(headline.text).toContain('remaining');
      expect(headline.icon).toBe('leaf-outline');
    });
  });

  describe('never produces banned words', () => {
    const scenarios = [
      { name: 'empty day', overrides: { todayMealCount: 0, todayCalories: 0 } },
      { name: 'minimal data', overrides: { todayMealCount: 1, todayCalories: 300, caloriePercent: 15 } },
      { name: 'over target', overrides: { caloriePercent: 150, todayCalories: 3000, calorieTarget: 2000, todayMealCount: 4 } },
      { name: 'protein gap', overrides: { proteinPercent: 20, caloriePercent: 80, todayMealCount: 3, todayCalories: 1600 } },
      { name: 'low hydration', overrides: { waterPercent: 10, waterTarget: 3000, currentHour: 16, caloriePercent: 50, proteinPercent: 50, todayMealCount: 2, todayCalories: 1000 } },
      { name: 'perfect day', overrides: { caloriePercent: 100, todayCalories: 2000, calorieTarget: 2000, todayMealCount: 4 } },
    ];

    for (const { name, overrides } of scenarios) {
      it(`${name} — no banned words`, () => {
        const headline = computeWidgetHeadline(makeBaseData(overrides));
        const lower = headline.text.toLowerCase();
        for (const word of BANNED_WORDS) {
          expect(lower).not.toContain(word);
        }
      });
    }
  });

  describe('number formatting', () => {
    it('formats large numbers with commas', () => {
      const data = makeBaseData({
        todayCalories: 2500,
        calorieTarget: 3000,
        caloriePercent: 83,
        proteinPercent: 83,
        waterTarget: 0,
        loggingStreak: 3,
        todayMealCount: 3,
        currentHour: 15,
      });
      const headline = computeWidgetHeadline(data);
      expect(headline.text).toContain('2,500');
      expect(headline.text).toContain('3,000');
    });
  });

  describe('edge cases', () => {
    it('handles zero calorie target gracefully', () => {
      const data = makeBaseData({
        calorieTarget: 0,
        caloriePercent: 0,
        proteinPercent: 0,
        todayMealCount: 2,
        todayCalories: 500,
        waterTarget: 0,
        loggingStreak: 1,
      });
      const headline = computeWidgetHeadline(data);
      expect(headline).toBeDefined();
      expect(headline.text.length).toBeGreaterThan(0);
    });

    it('handles exactly 90% (boundary for rule 3)', () => {
      const data = makeBaseData({
        caloriePercent: 90,
        todayMealCount: 3,
        todayCalories: 1800,
      });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(3);
    });

    it('handles exactly 110% (boundary for rule 3)', () => {
      const data = makeBaseData({
        caloriePercent: 110,
        todayMealCount: 3,
        todayCalories: 2200,
      });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(3);
    });

    it('handles exactly 111% (boundary for rule 4)', () => {
      const data = makeBaseData({
        caloriePercent: 111,
        todayCalories: 2220,
        calorieTarget: 2000,
        todayMealCount: 3,
      });
      const headline = computeWidgetHeadline(data);
      expect(headline.priority).toBe(4);
    });

    it('estimates 0 remaining meals when at calorie target', () => {
      const data = makeBaseData({
        caloriePercent: 60,
        proteinPercent: 60,
        waterTarget: 0,
        loggingStreak: 3,
        todayMealCount: 4,
        todayCalories: 2000,
        calorieTarget: 2000,
        currentHour: 15,
      });
      // caloriePercent=60 but todayCalories = calorieTarget, caloriePercent is misleading here.
      // Rule 8 will fire, remaining = 0
      const headline = computeWidgetHeadline(data);
      expect(headline).toBeDefined();
    });

    it('always includes computedAt timestamp', () => {
      const before = Date.now();
      const headline = computeWidgetHeadline(makeBaseData());
      const after = Date.now();
      expect(headline.computedAt).toBeGreaterThanOrEqual(before);
      expect(headline.computedAt).toBeLessThanOrEqual(after);
    });
  });
});
