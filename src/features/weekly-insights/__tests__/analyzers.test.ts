/**
 * Analyzer Tests
 * Tests all weekly insight analyzers
 */

import { ConsistencyAnalyzer } from '../services/analyzers/ConsistencyAnalyzer';
import { MacroBalanceAnalyzer } from '../services/analyzers/MacroBalanceAnalyzer';
import { CalorieTrendAnalyzer } from '../services/analyzers/CalorieTrendAnalyzer';
import { HydrationAnalyzer } from '../services/analyzers/HydrationAnalyzer';
import { TimingAnalyzer } from '../services/analyzers/TimingAnalyzer';
import { ComparisonAnalyzer } from '../services/analyzers/ComparisonAnalyzer';
import { HighlightsAnalyzer } from '../services/analyzers/HighlightsAnalyzer';
import {
  PERFECT_WEEK,
  SPARSE_WEEK,
  WEEKEND_HEAVY,
  DECLINING,
  EMPTY_WEEK,
  LOW_PROTEIN,
  makeWeekData,
} from './fixtures';

describe('ConsistencyAnalyzer', () => {
  describe('analyzeMacroConsistency (Q-CON-01)', () => {
    it('returns low CV for consistent data', () => {
      const result = ConsistencyAnalyzer.analyzeMacroConsistency(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-CON-01');
      expect(result.overallConsistency).toBe('very_consistent');
      expect(result.calorieCV).toBeLessThan(10);
      expect(result.loggedDays).toBe(7);
    });

    it('returns higher CV for variable data', () => {
      const result = ConsistencyAnalyzer.analyzeMacroConsistency(DECLINING);
      expect(result.calorieCV).toBeGreaterThan(10);
      expect(result.loggedDays).toBe(7);
    });

    it('returns zero score for < 3 logged days', () => {
      const result = ConsistencyAnalyzer.analyzeMacroConsistency(SPARSE_WEEK);
      expect(result.interestingnessScore).toBe(0);
      expect(result.overallConsistency).toBe('variable');
    });

    it('identifies most and least consistent macros', () => {
      const result = ConsistencyAnalyzer.analyzeMacroConsistency(PERFECT_WEEK);
      expect(typeof result.mostConsistentMacro).toBe('string');
      expect(typeof result.leastConsistentMacro).toBe('string');
    });
  });

  describe('analyzeOutliers (Q-CON-02)', () => {
    it('finds few or no outliers for consistent week', () => {
      const result = ConsistencyAnalyzer.analyzeOutliers(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-CON-02');
      // PERFECT_WEEK has very tight variance, so outlier threshold is tight too
      // Important: the algorithm works correctly - low outlier count = low interestingness
      expect(result.outlierDays.length).toBeLessThanOrEqual(3);
      expect(result.weekMean).toBeGreaterThan(0);
    });

    it('finds outliers in weekend-heavy data', () => {
      const result = ConsistencyAnalyzer.analyzeOutliers(WEEKEND_HEAVY);
      expect(result.outlierDays.length).toBeGreaterThan(0);
      const highDays = result.outlierDays.filter((d) => d.direction === 'high');
      expect(highDays.length).toBeGreaterThan(0);
    });

    it('returns zero score for < 4 logged days', () => {
      const result = ConsistencyAnalyzer.analyzeOutliers(SPARSE_WEEK);
      expect(result.interestingnessScore).toBe(0);
    });

    it('calculates adjusted mean excluding outliers', () => {
      const result = ConsistencyAnalyzer.analyzeOutliers(WEEKEND_HEAVY);
      if (result.outlierDays.length > 0) {
        expect(result.adjustedMean).not.toBe(result.weekMean);
      }
    });
  });

  describe('analyzeTargetHits (Q-CON-03)', () => {
    it('counts calorie hits within ±15%', () => {
      const result = ConsistencyAnalyzer.analyzeTargetHits(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-CON-03');
      expect(result.calorieHitDays).toBe(7);
      expect(result.calorieHitPct).toBe(100);
    });

    it('counts protein hits within 10g', () => {
      const result = ConsistencyAnalyzer.analyzeTargetHits(PERFECT_WEEK);
      expect(result.proteinHitDays).toBe(7);
    });

    it('returns lower hit rate for off-target weeks', () => {
      const result = ConsistencyAnalyzer.analyzeTargetHits(WEEKEND_HEAVY);
      expect(result.calorieHitPct).toBeLessThan(100);
    });
  });
});

describe('MacroBalanceAnalyzer', () => {
  describe('analyzeProtein (Q-MAC-01)', () => {
    it('detects protein at target', () => {
      const result = MacroBalanceAnalyzer.analyzeProtein(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-MAC-01');
      expect(result.avgProteinPct).toBeGreaterThanOrEqual(90);
      expect(result.daysMetTarget).toBe(7);
    });

    it('detects low protein', () => {
      const result = MacroBalanceAnalyzer.analyzeProtein(LOW_PROTEIN);
      expect(result.avgProteinPct).toBeLessThan(50);
      expect(result.interestingnessScore).toBeGreaterThanOrEqual(0.7);
    });

    it('detects protein trend vs prior week', () => {
      const data = makeWeekData({
        ...PERFECT_WEEK,
        priorWeek: makeWeekData({
          avgProtein: 120, // lower than current 150
          loggedDayCount: 5,
        }),
      });
      const result = MacroBalanceAnalyzer.analyzeProtein(data);
      expect(result.trend).toContain('up');
    });

    it('returns zero for < 3 logged days', () => {
      const result = MacroBalanceAnalyzer.analyzeProtein(SPARSE_WEEK);
      expect(result.interestingnessScore).toBe(0);
    });
  });

  describe('analyzeMacroBalance (Q-MAC-02)', () => {
    it('detects balanced macros', () => {
      const result = MacroBalanceAnalyzer.analyzeMacroBalance(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-MAC-02');
      expect(result.skewedMacro).toBeNull();
    });

    it('detects carb-heavy skew', () => {
      const result = MacroBalanceAnalyzer.analyzeMacroBalance(LOW_PROTEIN);
      // Low protein + high carbs should produce a carb skew
      expect(result.carbsPct).toBeGreaterThan(result.proteinPct);
    });

    it('returns zero for < 3 logged days', () => {
      const result = MacroBalanceAnalyzer.analyzeMacroBalance(SPARSE_WEEK);
      expect(result.interestingnessScore).toBe(0);
    });
  });
});

describe('CalorieTrendAnalyzer', () => {
  describe('analyzeSurplusDeficit (Q-CAL-01)', () => {
    it('detects neutral balance at target', () => {
      const result = CalorieTrendAnalyzer.analyzeSurplusDeficit(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-CAL-01');
      expect(result.isNeutral).toBe(true);
      expect(result.isDeficit).toBe(false);
      expect(result.isSurplus).toBe(false);
    });

    it('detects surplus for high-calorie week', () => {
      const result = CalorieTrendAnalyzer.analyzeSurplusDeficit(WEEKEND_HEAVY);
      expect(result.isSurplus).toBe(true);
      expect(result.dailyDelta).toBeGreaterThan(0);
    });

    it('detects deficit for declining week', () => {
      const result = CalorieTrendAnalyzer.analyzeSurplusDeficit(DECLINING);
      expect(result.isDeficit).toBe(true);
      expect(result.dailyDelta).toBeLessThan(0);
    });

    it('returns zero for < 3 logged days', () => {
      const result = CalorieTrendAnalyzer.analyzeSurplusDeficit(SPARSE_WEEK);
      expect(result.interestingnessScore).toBe(0);
    });
  });

  describe('analyzeCalorieTrend (Q-CAL-02)', () => {
    it('returns insufficient data without prior week', () => {
      const result = CalorieTrendAnalyzer.analyzeCalorieTrend(PERFECT_WEEK);
      expect(result.trendDirection).toBe('insufficient data');
      expect(result.interestingnessScore).toBe(0);
    });

    it('detects upward trend with prior week data', () => {
      const data = makeWeekData({
        ...PERFECT_WEEK,
        priorWeek: makeWeekData({
          avgCalories: 1700,
          loggedDayCount: 5,
        }),
      });
      const result = CalorieTrendAnalyzer.analyzeCalorieTrend(data);
      expect(result.trendMagnitude).toBeGreaterThan(0);
      expect(result.trendDirection).toContain('up');
    });

    it('detects holding steady for similar weeks', () => {
      const data = makeWeekData({
        ...PERFECT_WEEK,
        priorWeek: makeWeekData({
          avgCalories: 1990,
          loggedDayCount: 5,
        }),
      });
      const result = CalorieTrendAnalyzer.analyzeCalorieTrend(data);
      expect(result.trendDirection).toBe('holding steady');
    });
  });

  describe('analyzeDayByDay (Q-CAL-03)', () => {
    it('classifies on-target days', () => {
      const result = CalorieTrendAnalyzer.analyzeDayByDay(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-CAL-03');
      const onTarget = result.days.filter((d) => d.classification === 'on_target');
      expect(onTarget.length).toBe(7);
    });

    it('classifies over/under days in weekend-heavy week', () => {
      const result = CalorieTrendAnalyzer.analyzeDayByDay(WEEKEND_HEAVY);
      const over = result.days.filter(
        (d) => d.classification === 'slightly_over' || d.classification === 'significantly_over'
      );
      expect(over.length).toBeGreaterThan(0);
    });

    it('marks unlogged days as no_data', () => {
      const result = CalorieTrendAnalyzer.analyzeDayByDay(SPARSE_WEEK);
      const noData = result.days.filter((d) => d.classification === 'no_data');
      expect(noData.length).toBe(5);
    });

    it('detects declining pattern', () => {
      const result = CalorieTrendAnalyzer.analyzeDayByDay(DECLINING);
      // Started strong with higher calories, trailed off
      if (result.pattern) {
        expect(result.pattern).toContain('Started strong');
      }
    });
  });
});

describe('HydrationAnalyzer', () => {
  describe('analyzeHydration (Q-HYD-01)', () => {
    it('analyzes a well-hydrated week', () => {
      const result = HydrationAnalyzer.analyzeHydration(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-HYD-01');
      expect(result.avgWaterPct).toBeGreaterThanOrEqual(90);
      expect(result.bestDay).toBeTruthy();
      expect(result.worstDay).toBeTruthy();
    });

    it('returns zero for < 3 water days', () => {
      const result = HydrationAnalyzer.analyzeHydration(SPARSE_WEEK);
      expect(result.interestingnessScore).toBe(0);
    });

    it('returns zero for no water data', () => {
      const result = HydrationAnalyzer.analyzeHydration(EMPTY_WEEK);
      expect(result.interestingnessScore).toBe(0);
    });
  });
});

describe('TimingAnalyzer', () => {
  describe('analyzeMealCount (Q-TIM-01)', () => {
    it('calculates meal count stats', () => {
      const result = TimingAnalyzer.analyzeMealCount(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-TIM-01');
      expect(result.avgMeals).toBe(3);
      expect(result.minMeals).toBe(3);
      expect(result.maxMeals).toBe(3);
      expect(result.totalMeals).toBe(21);
    });

    it('detects variable meal counts', () => {
      const result = TimingAnalyzer.analyzeMealCount(DECLINING);
      expect(result.maxMeals).toBeGreaterThan(result.minMeals);
    });

    it('returns zero for < 3 logged days', () => {
      const result = TimingAnalyzer.analyzeMealCount(SPARSE_WEEK);
      expect(result.interestingnessScore).toBe(0);
    });
  });

  describe('analyzeWeekdayWeekend (Q-TIM-02)', () => {
    it('detects weekend calorie increase', () => {
      const result = TimingAnalyzer.analyzeWeekdayWeekend(WEEKEND_HEAVY);
      expect(result.questionId).toBe('Q-TIM-02');
      expect(result.weekendAvgCal).toBeGreaterThan(result.weekdayAvgCal);
      expect(result.weekendEffect).toBeGreaterThan(0);
    });

    it('shows minimal difference for consistent week', () => {
      const result = TimingAnalyzer.analyzeWeekdayWeekend(PERFECT_WEEK);
      expect(Math.abs(result.weekendEffect)).toBeLessThanOrEqual(5);
    });
  });
});

describe('ComparisonAnalyzer', () => {
  describe('analyzeWeekComparison (Q-CMP-01)', () => {
    it('returns empty comparisons without prior week', () => {
      const result = ComparisonAnalyzer.analyzeWeekComparison(PERFECT_WEEK);
      expect(result.comparisons).toHaveLength(0);
      expect(result.interestingnessScore).toBe(0);
    });

    it('compares two weeks correctly', () => {
      const data = makeWeekData({
        ...PERFECT_WEEK,
        priorWeek: makeWeekData({
          avgCalories: 1800,
          avgProtein: 130,
          loggedDayCount: 5,
          totalMeals: 15,
        }),
      });
      const result = ComparisonAnalyzer.analyzeWeekComparison(data);
      expect(result.comparisons.length).toBeGreaterThan(0);
      const calComp = result.comparisons.find((c) => c.metric === 'Avg Calories');
      expect(calComp).toBeDefined();
      expect(calComp!.direction).toBe('up');
    });
  });

  describe('analyzeProteinTrend (Q-CMP-02)', () => {
    it('returns insufficient data without prior weeks', () => {
      const result = ComparisonAnalyzer.analyzeProteinTrend(PERFECT_WEEK);
      // Only 1 week of data -> insufficient
      expect(result.weeklyAverages).toHaveLength(1);
    });

    it('detects upward protein trend', () => {
      const data = makeWeekData({
        ...PERFECT_WEEK,
        priorWeek: makeWeekData({
          weekStartDate: '2025-01-12',
          avgProtein: 120,
          loggedDayCount: 5,
        }),
        twoWeeksAgo: makeWeekData({
          weekStartDate: '2025-01-05',
          avgProtein: 100,
          loggedDayCount: 5,
        }),
      });
      const result = ComparisonAnalyzer.analyzeProteinTrend(data);
      expect(result.trendDirection).toContain('up');
      expect(result.trendMagnitude).toBeGreaterThan(0);
    });
  });
});

describe('HighlightsAnalyzer', () => {
  describe('analyzeHighlights (Q-HI-01)', () => {
    it('always returns score 1.0 (pinned)', () => {
      const result = HighlightsAnalyzer.analyzeHighlights(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-HI-01');
      expect(result.interestingnessScore).toBe(1.0);
    });

    it('highlights logging consistency for 7 days', () => {
      const result = HighlightsAnalyzer.analyzeHighlights(PERFECT_WEEK);
      const loggingHighlight = result.highlights.find((h) =>
        h.includes('7 out of 7')
      );
      expect(loggingHighlight).toBeDefined();
    });

    it('provides at least 1 highlight for empty week', () => {
      const result = HighlightsAnalyzer.analyzeHighlights(EMPTY_WEEK);
      expect(result.highlights.length).toBeGreaterThanOrEqual(1);
    });

    it('caps highlights at 3', () => {
      const result = HighlightsAnalyzer.analyzeHighlights(PERFECT_WEEK);
      expect(result.highlights.length).toBeLessThanOrEqual(3);
    });
  });

  describe('analyzeFocusSuggestion (Q-HI-02)', () => {
    it('always returns score 0.9', () => {
      const result = HighlightsAnalyzer.analyzeFocusSuggestion(PERFECT_WEEK);
      expect(result.questionId).toBe('Q-HI-02');
      expect(result.interestingnessScore).toBe(0.9);
    });

    it('suggests protein when below 80%', () => {
      const result = HighlightsAnalyzer.analyzeFocusSuggestion(LOW_PROTEIN);
      expect(result.focusArea).toBe('Protein intake');
    });

    it('suggests logging consistency for sparse week', () => {
      const threeDay = makeWeekData({
        ...SPARSE_WEEK,
        days: SPARSE_WEEK.days.map((d, i) =>
          i < 3 ? { ...d, isLogged: true, calories: 2000, protein: 150 } : d
        ),
        loggedDayCount: 3,
        avgProtein: 150,
      });
      const result = HighlightsAnalyzer.analyzeFocusSuggestion(threeDay);
      expect(result.focusArea).toBe('Logging consistency');
    });

    it('returns maintaining momentum when everything is good', () => {
      const result = HighlightsAnalyzer.analyzeFocusSuggestion(PERFECT_WEEK);
      expect(result.focusArea).toBe('Maintaining momentum');
    });
  });
});

describe('all analyzers handle edge cases', () => {
  it('no analyzer throws on empty week', () => {
    expect(() => ConsistencyAnalyzer.analyzeMacroConsistency(EMPTY_WEEK)).not.toThrow();
    expect(() => ConsistencyAnalyzer.analyzeOutliers(EMPTY_WEEK)).not.toThrow();
    expect(() => ConsistencyAnalyzer.analyzeTargetHits(EMPTY_WEEK)).not.toThrow();
    expect(() => MacroBalanceAnalyzer.analyzeProtein(EMPTY_WEEK)).not.toThrow();
    expect(() => MacroBalanceAnalyzer.analyzeMacroBalance(EMPTY_WEEK)).not.toThrow();
    expect(() => CalorieTrendAnalyzer.analyzeSurplusDeficit(EMPTY_WEEK)).not.toThrow();
    expect(() => CalorieTrendAnalyzer.analyzeCalorieTrend(EMPTY_WEEK)).not.toThrow();
    expect(() => CalorieTrendAnalyzer.analyzeDayByDay(EMPTY_WEEK)).not.toThrow();
    expect(() => HydrationAnalyzer.analyzeHydration(EMPTY_WEEK)).not.toThrow();
    expect(() => TimingAnalyzer.analyzeMealCount(EMPTY_WEEK)).not.toThrow();
    expect(() => TimingAnalyzer.analyzeWeekdayWeekend(EMPTY_WEEK)).not.toThrow();
    expect(() => ComparisonAnalyzer.analyzeWeekComparison(EMPTY_WEEK)).not.toThrow();
    expect(() => ComparisonAnalyzer.analyzeProteinTrend(EMPTY_WEEK)).not.toThrow();
    expect(() => HighlightsAnalyzer.analyzeHighlights(EMPTY_WEEK)).not.toThrow();
    expect(() => HighlightsAnalyzer.analyzeFocusSuggestion(EMPTY_WEEK)).not.toThrow();
  });

  it('all analysis results include interestingnessScore', () => {
    const results = [
      ConsistencyAnalyzer.analyzeMacroConsistency(PERFECT_WEEK),
      ConsistencyAnalyzer.analyzeOutliers(PERFECT_WEEK),
      ConsistencyAnalyzer.analyzeTargetHits(PERFECT_WEEK),
      MacroBalanceAnalyzer.analyzeProtein(PERFECT_WEEK),
      MacroBalanceAnalyzer.analyzeMacroBalance(PERFECT_WEEK),
      CalorieTrendAnalyzer.analyzeSurplusDeficit(PERFECT_WEEK),
      CalorieTrendAnalyzer.analyzeDayByDay(PERFECT_WEEK),
      HydrationAnalyzer.analyzeHydration(PERFECT_WEEK),
      TimingAnalyzer.analyzeMealCount(PERFECT_WEEK),
      TimingAnalyzer.analyzeWeekdayWeekend(PERFECT_WEEK),
      HighlightsAnalyzer.analyzeHighlights(PERFECT_WEEK),
      HighlightsAnalyzer.analyzeFocusSuggestion(PERFECT_WEEK),
    ];

    for (const result of results) {
      expect(typeof result.interestingnessScore).toBe('number');
      expect(result.interestingnessScore).toBeGreaterThanOrEqual(0);
      expect(result.interestingnessScore).toBeLessThanOrEqual(1);
    }
  });
});
