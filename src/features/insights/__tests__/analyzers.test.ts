/**
 * Analyzer Tests
 * Tests all 18 question analyzers for correct output
 */

import { questionAnalyzers } from '../services/daily/analyzers';
import type { DailyInsightData, DailyQuestionId } from '../types/dailyInsights.types';

const BANNED_WORDS = ['failed', 'cheated', 'warning', 'bad', 'poor', 'behind', 'falling short'];

function makeBaseData(overrides?: Partial<DailyInsightData>): DailyInsightData {
  const base: DailyInsightData = {
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
      { name: 'Eggs', calories: 200, protein: 14, carbs: 2, fat: 12 },
      { name: 'Yogurt', calories: 150, protein: 10, carbs: 20, fat: 5 },
    ],
    mealsWithTimestamps: [
      {
        mealLabel: 'Breakfast',
        totalCalories: 400,
        totalProtein: 25,
        totalCarbs: 50,
        totalFat: 15,
        firstLogTime: '2025-01-15T08:00:00Z',
        foods: [{ name: 'Oatmeal', calories: 400, protein: 25, carbs: 50, fat: 15 }],
      },
      {
        mealLabel: 'Lunch',
        totalCalories: 600,
        totalProtein: 45,
        totalCarbs: 70,
        totalFat: 20,
        firstLogTime: '2025-01-15T12:30:00Z',
        foods: [{ name: 'Chicken', calories: 600, protein: 45, carbs: 70, fat: 20 }],
      },
      {
        mealLabel: 'Dinner',
        totalCalories: 500,
        totalProtein: 30,
        totalCarbs: 60,
        totalFat: 15,
        firstLogTime: '2025-01-15T18:30:00Z',
        foods: [{ name: 'Rice Bowl', calories: 500, protein: 30, carbs: 60, fat: 15 }],
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
      { date: '2025-01-10', logged: true, calories: 1600, protein: 105, carbs: 185, fat: 52 },
      { date: '2025-01-09', logged: true, calories: 1500, protein: 100, carbs: 180, fat: 48 },
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
  };
  if (overrides) {
    return Object.assign({}, base, overrides);
  }
  return base;
}

describe('questionAnalyzers', () => {
  it('has an analyzer for all 18 question IDs', () => {
    const ids: DailyQuestionId[] = [
      'macro_overview', 'calorie_pacing', 'macro_ratio', 'remaining_budget',
      'protein_status', 'protein_per_meal', 'protein_remaining',
      'meal_distribution', 'meal_timing', 'meal_variety',
      'hydration_status', 'hydration_pacing',
      'vs_weekly_avg', 'consistency_check', 'trend_direction',
      'nutrient_overview', 'fiber_check', 'micronutrient_status',
    ];
    for (const id of ids) {
      expect(questionAnalyzers[id]).toBeDefined();
    }
  });

  describe('all analyzers return valid structure', () => {
    // Use data with alerts so nutrient analyzers have data cards
    const mockAlert = {
      nutrientId: 'iron', nutrientName: 'Iron', averageIntake: 5, rdaTarget: 18,
      percentOfRDA: 28, severity: 'concern' as const, message: 'Low', foodSuggestions: ['spinach'], tier: 1 as const,
    };
    const data = makeBaseData({ activeAlerts: [mockAlert] });
    const ids = Object.keys(questionAnalyzers) as DailyQuestionId[];

    for (const id of ids) {
      it(`${id} returns complete QuestionAnalysis`, () => {
        const result = questionAnalyzers[id](data);
        expect(result.questionId).toBe(id);
        expect(typeof result.dataBlock).toBe('string');
        expect(result.dataBlock.length).toBeGreaterThan(0);
        expect(typeof result.fallbackText).toBe('string');
        expect(result.fallbackText.length).toBeGreaterThan(0);
        expect(Array.isArray(result.dataCards)).toBe(true);
        expect(result.dataCards.length).toBeGreaterThan(0);
        expect(typeof result.computedAt).toBe('number');
      });
    }
  });

  describe('fallback texts never contain banned words', () => {
    const scenarios: { name: string; overrides: Partial<DailyInsightData> }[] = [
      { name: 'normal day', overrides: {} },
      { name: 'low protein', overrides: { todayProtein: 30, proteinPercent: 20 } },
      { name: 'over calories', overrides: { todayCalories: 2500, caloriePercent: 125 } },
      { name: 'no water', overrides: { todayWater: 0, waterPercent: 0 } },
      { name: 'zero data', overrides: { todayCalories: 0, todayProtein: 0, todayCarbs: 0, todayFat: 0, todayFiber: 0 } },
    ];

    const ids = Object.keys(questionAnalyzers) as DailyQuestionId[];

    for (const { name, overrides } of scenarios) {
      for (const id of ids) {
        it(`${id} (${name}) — no banned words`, () => {
          const data = makeBaseData(overrides);
          const result = questionAnalyzers[id](data);
          const lower = result.fallbackText.toLowerCase();
          for (const word of BANNED_WORDS) {
            expect(lower).not.toContain(word);
          }
        });
      }
    }
  });

  describe('data cards have valid statuses', () => {
    const validStatuses = ['on_track', 'ahead', 'behind', 'neutral'];
    const ids = Object.keys(questionAnalyzers) as DailyQuestionId[];

    for (const id of ids) {
      it(`${id} data cards have valid status values`, () => {
        const result = questionAnalyzers[id](makeBaseData());
        for (const card of result.dataCards) {
          expect(validStatuses).toContain(card.status);
          expect(typeof card.label).toBe('string');
          expect(typeof card.value).toBe('string');
        }
      });
    }
  });
});

describe('macroAnalyzers', () => {
  describe('analyzeMacroOverview', () => {
    it('detects protein lagging behind calories', () => {
      const data = makeBaseData({ proteinPercent: 40, caloriePercent: 75 });
      const result = questionAnalyzers.macro_overview(data);
      expect(result.dataBlock).toContain('lagging');
      expect(result.fallbackText).toContain('protein-rich');
    });

    it('recognizes all macros above 80%', () => {
      const data = makeBaseData({ caloriePercent: 85, proteinPercent: 90, carbPercent: 82, fatPercent: 88 });
      const result = questionAnalyzers.macro_overview(data);
      expect(result.dataBlock).toContain('well balanced');
      expect(result.fallbackText).toContain('well balanced');
    });

    it('reports over-calorie status', () => {
      const data = makeBaseData({ caloriePercent: 120 });
      const result = questionAnalyzers.macro_overview(data);
      expect(result.dataBlock).toContain('above target');
    });
  });

  describe('analyzeCaloriePacing', () => {
    it('detects ahead of pace', () => {
      const data = makeBaseData({ caloriePercent: 80, dayProgress: 0.4, currentHour: 12 });
      const result = questionAnalyzers.calorie_pacing(data);
      expect(result.dataBlock).toContain('ahead of pace');
    });

    it('detects on pace', () => {
      const data = makeBaseData({ caloriePercent: 50, dayProgress: 0.5, currentHour: 14 });
      const result = questionAnalyzers.calorie_pacing(data);
      expect(result.dataBlock).toContain('on pace');
    });
  });

  describe('analyzeMacroRatio', () => {
    it('calculates correct percentages', () => {
      // 100g pro * 4 = 400, 180g carb * 4 = 720, 50g fat * 9 = 450 => total = 1570
      const data = makeBaseData();
      const result = questionAnalyzers.macro_ratio(data);
      expect(result.dataBlock).toContain('Protein:');
      expect(result.dataBlock).toContain('Carbs:');
      expect(result.dataBlock).toContain('Fat:');
    });
  });

  describe('analyzeRemainingBudget', () => {
    it('calculates remaining correctly', () => {
      const data = makeBaseData({ todayCalories: 1500, calorieTarget: 2000, todayProtein: 100, proteinTarget: 150 });
      const result = questionAnalyzers.remaining_budget(data);
      expect(result.dataBlock).toContain('Calories remaining: 500');
      expect(result.dataBlock).toContain('Protein remaining: 50g');
    });
  });
});

describe('proteinAnalyzers', () => {
  describe('analyzeProteinStatus', () => {
    it('reports lagging protein', () => {
      const data = makeBaseData({ proteinPercent: 40, caloriePercent: 75 });
      const result = questionAnalyzers.protein_status(data);
      expect(result.dataBlock).toContain('lagging');
    });

    it('reports good protein tracking', () => {
      const data = makeBaseData({ proteinPercent: 90, proteinTarget: 150, todayProtein: 135 });
      const result = questionAnalyzers.protein_status(data);
      expect(result.fallbackText).toContain('tracking well');
    });
  });

  describe('analyzeProteinPerMeal', () => {
    it('detects uneven distribution', () => {
      const data = makeBaseData({
        mealsWithTimestamps: [
          { mealLabel: 'Breakfast', totalCalories: 400, totalProtein: 5, totalCarbs: 60, totalFat: 15, firstLogTime: '2025-01-15T08:00:00Z', foods: [] },
          { mealLabel: 'Dinner', totalCalories: 800, totalProtein: 60, totalCarbs: 80, totalFat: 30, firstLogTime: '2025-01-15T18:00:00Z', foods: [] },
        ],
      });
      const result = questionAnalyzers.protein_per_meal(data);
      // Very uneven distribution (60g vs 5g) — ranges message fires first
      expect(result.fallbackText).toContain('ranges from');
    });

    it('detects well-distributed protein', () => {
      const data = makeBaseData({
        todayProtein: 90,
        mealsWithTimestamps: [
          { mealLabel: 'Breakfast', totalCalories: 400, totalProtein: 30, totalCarbs: 50, totalFat: 15, firstLogTime: '2025-01-15T08:00:00Z', foods: [] },
          { mealLabel: 'Lunch', totalCalories: 500, totalProtein: 30, totalCarbs: 60, totalFat: 20, firstLogTime: '2025-01-15T12:00:00Z', foods: [] },
          { mealLabel: 'Dinner', totalCalories: 500, totalProtein: 30, totalCarbs: 60, totalFat: 15, firstLogTime: '2025-01-15T18:00:00Z', foods: [] },
        ],
      });
      const result = questionAnalyzers.protein_per_meal(data);
      expect(result.fallbackText).toContain('well distributed');
    });
  });
});

describe('mealAnalyzers', () => {
  describe('analyzeMealDistribution', () => {
    it('detects one dominant meal', () => {
      const data = makeBaseData({
        todayCalories: 1000,
        mealsWithTimestamps: [
          { mealLabel: 'Lunch', totalCalories: 800, totalProtein: 40, totalCarbs: 100, totalFat: 30, firstLogTime: '2025-01-15T12:00:00Z', foods: [] },
          { mealLabel: 'Dinner', totalCalories: 200, totalProtein: 20, totalCarbs: 20, totalFat: 5, firstLogTime: '2025-01-15T18:00:00Z', foods: [] },
        ],
      });
      const result = questionAnalyzers.meal_distribution(data);
      expect(result.fallbackText).toContain('Lunch');
    });
  });

  describe('analyzeMealTiming', () => {
    it('detects large gaps', () => {
      const data = makeBaseData({
        mealsWithTimestamps: [
          { mealLabel: 'Breakfast', totalCalories: 400, totalProtein: 25, totalCarbs: 50, totalFat: 15, firstLogTime: '2025-01-15T07:00:00Z', foods: [] },
          { mealLabel: 'Dinner', totalCalories: 600, totalProtein: 40, totalCarbs: 70, totalFat: 20, firstLogTime: '2025-01-15T20:00:00Z', foods: [] },
        ],
      });
      const result = questionAnalyzers.meal_timing(data);
      expect(result.dataBlock).toContain('over 6 hours');
      expect(result.fallbackText).toContain('13-hour gap');
    });
  });

  describe('analyzeMealVariety', () => {
    it('detects many repeats', () => {
      const data = makeBaseData({
        todayFoods: [
          { name: 'Rice', calories: 200, protein: 5, carbs: 45, fat: 1 },
          { name: 'Rice', calories: 200, protein: 5, carbs: 45, fat: 1 },
          { name: 'Rice', calories: 200, protein: 5, carbs: 45, fat: 1 },
          { name: 'Rice', calories: 200, protein: 5, carbs: 45, fat: 1 },
          { name: 'Chicken', calories: 200, protein: 35, carbs: 0, fat: 5 },
        ],
      });
      const result = questionAnalyzers.meal_variety(data);
      // 2 unique out of 5 = 40% unique → repeatCount (3) > totalFoods*0.5 (2.5)
      expect(result.fallbackText).toContain('repetition');
    });

    it('detects good variety', () => {
      const result = questionAnalyzers.meal_variety(makeBaseData());
      expect(result.fallbackText).toContain('good variety');
    });
  });
});

describe('hydrationAnalyzers', () => {
  describe('analyzeHydrationStatus', () => {
    it('reports goal reached', () => {
      const data = makeBaseData({ todayWater: 2500, waterTarget: 2500, waterPercent: 100 });
      const result = questionAnalyzers.hydration_status(data);
      expect(result.fallbackText).toContain('reached your water goal');
    });

    it('reports low hydration', () => {
      const data = makeBaseData({ todayWater: 500, waterTarget: 2500, waterPercent: 20 });
      const result = questionAnalyzers.hydration_status(data);
      expect(result.fallbackText).toContain('20%');
    });
  });

  describe('analyzeHydrationPacing', () => {
    it('detects below-pace hydration', () => {
      const data = makeBaseData({ waterPercent: 20, dayProgress: 0.7, currentHour: 17 });
      const result = questionAnalyzers.hydration_pacing(data);
      expect(result.fallbackText).toContain('picking up the pace');
    });
  });
});

describe('trendAnalyzers', () => {
  describe('analyzeVsWeeklyAvg', () => {
    it('detects today close to average', () => {
      const data = makeBaseData({ todayCalories: 1800, avgCalories7d: 1800 });
      const result = questionAnalyzers.vs_weekly_avg(data);
      expect(result.fallbackText).toContain('consistent');
    });

    it('detects today above average', () => {
      const data = makeBaseData({ todayCalories: 2500, avgCalories7d: 1800 });
      const result = questionAnalyzers.vs_weekly_avg(data);
      expect(result.fallbackText).toContain('above');
    });
  });

  describe('analyzeConsistencyCheck', () => {
    it('celebrates long streak', () => {
      const data = makeBaseData({ loggingStreak: 14 });
      const result = questionAnalyzers.consistency_check(data);
      expect(result.fallbackText).toContain('14-day');
    });
  });

  describe('analyzeTrendDirection', () => {
    it('detects steady trend', () => {
      const data = makeBaseData({
        weeklyDailyTotals: Array.from({ length: 7 }, (_, i) => ({
          date: `2025-01-${String(9 + i).padStart(2, '0')}`,
          logged: true,
          calories: 1800,
          protein: 120,
          carbs: 200,
          fat: 55,
        })),
      });
      const result = questionAnalyzers.trend_direction(data);
      expect(result.fallbackText).toContain('steady');
    });

    it('detects upward trend', () => {
      // Ascending dates: earlier days have low calories, recent days have high
      const data = makeBaseData({
        weeklyDailyTotals: [
          { date: '2025-01-09', logged: true, calories: 1200, protein: 85, carbs: 150, fat: 42 },
          { date: '2025-01-10', logged: true, calories: 1300, protein: 90, carbs: 160, fat: 45 },
          { date: '2025-01-11', logged: true, calories: 1400, protein: 95, carbs: 170, fat: 48 },
          { date: '2025-01-12', logged: true, calories: 1500, protein: 100, carbs: 180, fat: 50 },
          { date: '2025-01-13', logged: true, calories: 2000, protein: 130, carbs: 230, fat: 65 },
          { date: '2025-01-14', logged: true, calories: 2100, protein: 135, carbs: 240, fat: 68 },
          { date: '2025-01-15', logged: true, calories: 2200, protein: 140, carbs: 250, fat: 70 },
        ],
        userGoal: 'gain',
      });
      const result = questionAnalyzers.trend_direction(data);
      expect(result.dataBlock).toContain('upward');
    });
  });
});

describe('nutrientAnalyzers', () => {
  const mockAlert = {
    nutrientId: 'iron',
    nutrientName: 'Iron',
    averageIntake: 5,
    rdaTarget: 18,
    percentOfRDA: 28,
    severity: 'concern' as const,
    message: 'Low iron',
    foodSuggestions: ['spinach', 'lentils'],
    tier: 1 as const,
  };

  describe('analyzeNutrientOverview', () => {
    it('reports top alert nutrient', () => {
      const data: DailyInsightData = { ...makeBaseData(), activeAlerts: [mockAlert] };
      const result = questionAnalyzers.nutrient_overview(data);
      expect(result.fallbackText).toContain('Iron');
      expect(result.fallbackText).toContain('28%');
    });

    it('suggests food sources', () => {
      const data: DailyInsightData = { ...makeBaseData(), activeAlerts: [mockAlert] };
      const result = questionAnalyzers.nutrient_overview(data);
      expect(result.fallbackText).toContain('spinach');
    });
  });

  describe('analyzeFiberCheck', () => {
    it('reports good fiber intake', () => {
      const base = makeBaseData();
      const data: DailyInsightData = { ...base, todayFiber: 25 };
      const result = questionAnalyzers.fiber_check(data);
      expect(result.fallbackText).toContain('tracking well');
    });

    it('reports zero fiber', () => {
      const base = makeBaseData();
      const data: DailyInsightData = { ...base, todayFiber: 0 };
      const result = questionAnalyzers.fiber_check(data);
      expect(result.fallbackText).toContain('No fiber tracked');
    });
  });

  describe('analyzeMicronutrientStatus', () => {
    it('highlights tier 1 nutrients', () => {
      const data: DailyInsightData = { ...makeBaseData(), activeAlerts: [mockAlert] };
      const result = questionAnalyzers.micronutrient_status(data);
      expect(result.fallbackText).toContain('Iron');
    });
  });
});

describe('zero/edge case handling', () => {
  it('all analyzers handle zero values without throwing', () => {
    const zeroData = makeBaseData({
      todayCalories: 0,
      todayProtein: 0,
      todayCarbs: 0,
      todayFat: 0,
      todayFiber: 0,
      todayWater: 0,
      caloriePercent: 0,
      proteinPercent: 0,
      carbPercent: 0,
      fatPercent: 0,
      waterPercent: 0,
      avgCalories7d: 0,
      avgProtein7d: 0,
    });
    const ids = Object.keys(questionAnalyzers) as DailyQuestionId[];
    for (const id of ids) {
      expect(() => questionAnalyzers[id](zeroData)).not.toThrow();
    }
  });

  it('all analyzers handle empty meals without throwing', () => {
    const emptyMeals = makeBaseData({
      mealsWithTimestamps: [],
      todayMealCount: 0,
      todayFoods: [],
    });
    const ids = Object.keys(questionAnalyzers) as DailyQuestionId[];
    for (const id of ids) {
      expect(() => questionAnalyzers[id](emptyMeals)).not.toThrow();
    }
  });
});
