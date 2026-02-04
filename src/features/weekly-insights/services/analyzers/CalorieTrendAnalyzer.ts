/**
 * Calorie Trend Analyzer
 * Q-CAL-01: Surplus/deficit
 * Q-CAL-02: Multi-week trend
 * Q-CAL-03: Day-by-day pattern
 */

import { linearRegression, clamp } from '../../utils/statisticsUtils';
import type {
  WeeklyCollectedData,
  SurplusDeficitAnalysis,
  CalorieTrendAnalysis,
  DayByDayAnalysis,
} from '../../types/weeklyInsights.types';

export class CalorieTrendAnalyzer {
  /**
   * Q-CAL-01: Am I in a caloric surplus or deficit this week?
   */
  static analyzeSurplusDeficit(data: WeeklyCollectedData): SurplusDeficitAnalysis {
    const logged = data.days.filter((d) => d.isLogged);

    if (logged.length < 3) {
      return {
        questionId: 'Q-CAL-01',
        totalIntake: 0,
        totalTarget: 0,
        dailyAvgIntake: 0,
        dailyAvgTarget: data.calorieTarget,
        weeklyDelta: 0,
        dailyDelta: 0,
        deltaPct: 0,
        isDeficit: false,
        isSurplus: false,
        isNeutral: true,
        alignsWithGoal: true,
        loggedDays: logged.length,
        interestingnessScore: 0,
      };
    }

    const totalIntake = logged.reduce((sum, d) => sum + d.calories, 0);
    const dailyAvgIntake = totalIntake / logged.length;
    const dailyDelta = dailyAvgIntake - data.calorieTarget;
    const weeklyDelta = dailyDelta * 7;
    const deltaPct =
      data.calorieTarget > 0
        ? Math.round((dailyDelta / data.calorieTarget) * 100)
        : 0;

    const isNeutral = Math.abs(deltaPct) <= 3;
    const isDeficit = !isNeutral && dailyDelta < 0;
    const isSurplus = !isNeutral && dailyDelta > 0;

    // We don't have explicit goal type, infer alignment
    const alignsWithGoal = isNeutral;

    // Interestingness
    let score = 0.5;
    if (Math.abs(deltaPct) > 10) score = 0.8;
    if (Math.abs(deltaPct) > 20) score = 1.0;
    score = clamp(score, 0.4, 1.0);

    return {
      questionId: 'Q-CAL-01',
      totalIntake: Math.round(totalIntake),
      totalTarget: Math.round(data.calorieTarget * logged.length),
      dailyAvgIntake: Math.round(dailyAvgIntake),
      dailyAvgTarget: data.calorieTarget,
      weeklyDelta: Math.round(weeklyDelta),
      dailyDelta: Math.round(dailyDelta),
      deltaPct,
      isDeficit,
      isSurplus,
      isNeutral,
      alignsWithGoal,
      loggedDays: logged.length,
      interestingnessScore: score,
    };
  }

  /**
   * Q-CAL-02: Is my calorie intake trending up or down?
   */
  static analyzeCalorieTrend(data: WeeklyCollectedData): CalorieTrendAnalysis {
    const currentWeekAvg = Math.round(data.avgCalories);
    const priorWeekAvg = data.priorWeek ? Math.round(data.priorWeek.avgCalories) : 0;
    const twoWeeksAgoAvg = data.twoWeeksAgo ? Math.round(data.twoWeeksAgo.avgCalories) : null;

    if (!data.priorWeek || data.priorWeek.loggedDayCount < 3) {
      return {
        questionId: 'Q-CAL-02',
        currentWeekAvg,
        priorWeekAvg: 0,
        twoWeeksAgoAvg: null,
        trendDirection: 'insufficient data',
        trendMagnitude: 0,
        trendStrength: 'none',
        interestingnessScore: 0,
      };
    }

    // Build weekly averages for regression
    const weeklyAvgs: number[] = [];
    if (twoWeeksAgoAvg != null && data.twoWeeksAgo && data.twoWeeksAgo.loggedDayCount >= 3) {
      weeklyAvgs.push(twoWeeksAgoAvg);
    }
    weeklyAvgs.push(priorWeekAvg);
    weeklyAvgs.push(currentWeekAvg);

    const regression = linearRegression(weeklyAvgs);
    const trendMagnitude = Math.round(regression.slope);

    let trendDirection: string;
    if (Math.abs(trendMagnitude) < 50) {
      trendDirection = 'holding steady';
    } else if (trendMagnitude > 0) {
      trendDirection = `trending up ~${trendMagnitude} cal/week`;
    } else {
      trendDirection = `trending down ~${Math.abs(trendMagnitude)} cal/week`;
    }

    const trendStrength =
      regression.rSquared > 0.7
        ? 'strong'
        : regression.rSquared > 0.3
          ? 'moderate'
          : 'weak';

    // Interestingness
    let score = 0.3;
    if (regression.rSquared > 0.3 && Math.abs(trendMagnitude) > 50) score = 0.7;
    if (regression.rSquared > 0.5 && Math.abs(trendMagnitude) > 100) score = 0.9;
    score = clamp(score, 0.2, 0.9);

    return {
      questionId: 'Q-CAL-02',
      currentWeekAvg,
      priorWeekAvg,
      twoWeeksAgoAvg,
      trendDirection,
      trendMagnitude,
      trendStrength,
      interestingnessScore: score,
    };
  }

  /**
   * Q-CAL-03: What does my calorie pattern look like day by day?
   */
  static analyzeDayByDay(data: WeeklyCollectedData): DayByDayAnalysis {
    const target = data.calorieTarget;

    const days = data.days.map((d) => {
      if (!d.isLogged) {
        return {
          dayName: d.dayName,
          calories: 0,
          classification: 'no_data' as const,
          percent: 0,
        };
      }

      const percent = target > 0 ? (d.calories / target) * 100 : 0;
      let classification: DayByDayAnalysis['days'][number]['classification'];

      if (percent >= 85 && percent <= 115) classification = 'on_target';
      else if (percent > 130) classification = 'significantly_over';
      else if (percent > 115) classification = 'slightly_over';
      else if (percent < 70) classification = 'significantly_under';
      else classification = 'slightly_under';

      return {
        dayName: d.dayName,
        calories: Math.round(d.calories),
        classification,
        percent: Math.round(percent),
      };
    });

    // Detect patterns
    const logged = days.filter((d) => d.classification !== 'no_data');
    let pattern: string | null = null;

    if (logged.length >= 5) {
      const firstHalf = logged.slice(0, Math.ceil(logged.length / 2));
      const secondHalf = logged.slice(Math.ceil(logged.length / 2));

      const firstOnTarget = firstHalf.filter((d) => d.classification === 'on_target').length;
      const secondOnTarget = secondHalf.filter((d) => d.classification === 'on_target').length;

      if (firstOnTarget > secondOnTarget + 1) {
        pattern = 'Started strong, trailed off later';
      } else if (secondOnTarget > firstOnTarget + 1) {
        pattern = 'Built momentum as the week went on';
      }
    }

    // Interestingness: baseline 0.6
    let score = 0.6;
    if (pattern) score = 0.8;
    score = clamp(score, 0.5, 0.8);

    return {
      questionId: 'Q-CAL-03',
      days,
      calorieTarget: target,
      pattern,
      interestingnessScore: score,
    };
  }
}
