/**
 * Comparison Analyzer
 * Q-CMP-01: Week-over-week comparison
 * Q-CMP-02: Protein trend over weeks
 */

import { linearRegression, clamp } from '../../utils/statisticsUtils';
import type {
  WeeklyCollectedData,
  WeekComparisonAnalysis,
  ProteinTrendAnalysis,
} from '../../types/weeklyInsights.types';
import { formatWeekRange } from '../../utils/weekUtils';

export class ComparisonAnalyzer {
  /**
   * Q-CMP-01: How does this week compare to last week?
   */
  static analyzeWeekComparison(data: WeeklyCollectedData): WeekComparisonAnalysis {
    console.log(`[LLM:Analyzer:CMP-01] analyzeWeekComparison() — loggedDays=${data.loggedDayCount}, priorLogged=${data.priorWeek?.loggedDayCount ?? 0}`);
    if (!data.priorWeek || data.priorWeek.loggedDayCount < 4 || data.loggedDayCount < 4) {
      return {
        questionId: 'Q-CMP-01',
        comparisons: [],
        biggestImprovement: '',
        biggestChange: '',
        interestingnessScore: 0,
      };
    }

    const prior = data.priorWeek;

    const makeComparison = (metric: string, thisWeek: number, lastWeek: number) => {
      const changePct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
      const direction: 'up' | 'down' | 'same' =
        changePct > 3 ? 'up' : changePct < -3 ? 'down' : 'same';
      return { metric, thisWeek: Math.round(thisWeek), lastWeek: Math.round(lastWeek), changePct, direction };
    };

    const comparisons = [
      makeComparison('Avg Calories', data.avgCalories, prior.avgCalories),
      makeComparison('Avg Protein', data.avgProtein, prior.avgProtein),
      makeComparison('Logged Days', data.loggedDayCount, prior.loggedDayCount),
      makeComparison('Total Meals', data.totalMeals, prior.totalMeals),
    ];

    if (data.avgWater > 0 && prior.avgWater > 0) {
      comparisons.push(makeComparison('Avg Water', data.avgWater, prior.avgWater));
    }

    // Find biggest improvement (positive direction for logging, protein)
    const improvements = comparisons.filter((c) => {
      if (c.metric === 'Avg Calories') return false; // Calorie direction is ambiguous
      return c.direction === 'up';
    });
    const biggestImprovement = improvements.length > 0
      ? improvements.reduce((a, b) => (Math.abs(a.changePct) > Math.abs(b.changePct) ? a : b)).metric
      : '';

    const biggestChange = comparisons.reduce((a, b) =>
      Math.abs(a.changePct) > Math.abs(b.changePct) ? a : b
    ).metric;

    // Interestingness: baseline 0.6
    let score = 0.6;
    const maxChange = Math.max(...comparisons.map((c) => Math.abs(c.changePct)));
    if (maxChange > 10) score = 0.8;
    if (data.loggedDayCount > prior.loggedDayCount) score += 0.1;
    score = clamp(score, 0.5, 1.0);

    console.log(`[LLM:Analyzer:CMP-01] Result — comparisons=${comparisons.length}, biggestChange=${biggestChange}, biggestImprovement=${biggestImprovement}, score=${score.toFixed(2)}`);
    return {
      questionId: 'Q-CMP-01',
      comparisons,
      biggestImprovement,
      biggestChange,
      interestingnessScore: score,
    };
  }

  /**
   * Q-CMP-02: Is my protein intake trending up or down over recent weeks?
   */
  static analyzeProteinTrend(data: WeeklyCollectedData): ProteinTrendAnalysis {
    console.log(`[LLM:Analyzer:CMP-02] analyzeProteinTrend() — avgProtein=${Math.round(data.avgProtein)}, target=${data.proteinTarget}`);
    const weeklyAverages: ProteinTrendAnalysis['weeklyAverages'] = [];

    if (data.twoWeeksAgo && data.twoWeeksAgo.loggedDayCount >= 4) {
      weeklyAverages.push({
        weekLabel: formatWeekRange(data.twoWeeksAgo.weekStartDate),
        avgProtein: Math.round(data.twoWeeksAgo.avgProtein),
      });
    }

    if (data.priorWeek && data.priorWeek.loggedDayCount >= 4) {
      weeklyAverages.push({
        weekLabel: formatWeekRange(data.priorWeek.weekStartDate),
        avgProtein: Math.round(data.priorWeek.avgProtein),
      });
    }

    weeklyAverages.push({
      weekLabel: formatWeekRange(data.weekStartDate),
      avgProtein: Math.round(data.avgProtein),
    });

    if (weeklyAverages.length < 2) {
      return {
        questionId: 'Q-CMP-02',
        weeklyAverages,
        trendDirection: 'insufficient data',
        trendMagnitude: 0,
        proteinTarget: data.proteinTarget,
        interestingnessScore: 0,
      };
    }

    const values = weeklyAverages.map((w) => w.avgProtein);
    const regression = linearRegression(values);
    const trendMagnitude = Math.round(regression.slope);

    let trendDirection: string;
    if (Math.abs(trendMagnitude) < 3) {
      trendDirection = 'holding steady';
    } else if (trendMagnitude > 0) {
      trendDirection = 'trending up';
    } else {
      trendDirection = 'trending down';
    }

    // Interestingness
    let score = 0.3;
    if (Math.abs(trendMagnitude) > 5) score = 0.6;
    if (Math.abs(trendMagnitude) > 10) score = 0.8;

    // Boost if protein trend diverges from calorie trend
    if (data.priorWeek) {
      const calChange = data.avgCalories - data.priorWeek.avgCalories;
      const proChange = data.avgProtein - data.priorWeek.avgProtein;
      if ((calChange > 0 && proChange < 0) || (calChange < 0 && proChange > 0)) {
        score += 0.2;
      }
    }

    score = clamp(score, 0.2, 0.8);

    return {
      questionId: 'Q-CMP-02',
      weeklyAverages,
      trendDirection,
      trendMagnitude,
      proteinTarget: data.proteinTarget,
      interestingnessScore: score,
    };
  }
}
