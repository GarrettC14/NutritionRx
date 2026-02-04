/**
 * Timing Analyzer
 * Q-TIM-01: Meal count analysis
 * Q-TIM-02: Weekday vs weekend comparison
 */

import { coefficientOfVariation, mean, clamp } from '../../utils/statisticsUtils';
import type {
  WeeklyCollectedData,
  MealCountAnalysis,
  WeekdayWeekendAnalysis,
} from '../../types/weeklyInsights.types';

export class TimingAnalyzer {
  /**
   * Q-TIM-01: How many meals am I eating per day?
   */
  static analyzeMealCount(data: WeeklyCollectedData): MealCountAnalysis {
    const logged = data.days.filter((d) => d.isLogged);

    if (logged.length < 3) {
      return {
        questionId: 'Q-TIM-01',
        avgMeals: 0,
        minMeals: 0,
        maxMeals: 0,
        totalMeals: 0,
        mealCalCorrelation: null,
        interestingnessScore: 0,
      };
    }

    const mealCounts = logged.map((d) => d.mealCount);
    const avgMeals = mean(mealCounts);
    const minMeals = Math.min(...mealCounts);
    const maxMeals = Math.max(...mealCounts);
    const totalMeals = mealCounts.reduce((a, b) => a + b, 0);

    // Check if more meals correlate with higher calories
    let mealCalCorrelation: string | null = null;
    if (logged.length >= 4) {
      const highMealDays = logged.filter((d) => d.mealCount > avgMeals);
      const lowMealDays = logged.filter((d) => d.mealCount <= avgMeals);

      if (highMealDays.length > 0 && lowMealDays.length > 0) {
        const highMealAvgCal = mean(highMealDays.map((d) => d.calories));
        const lowMealAvgCal = mean(lowMealDays.map((d) => d.calories));
        const diff = ((highMealAvgCal - lowMealAvgCal) / lowMealAvgCal) * 100;

        if (diff > 10) {
          mealCalCorrelation = 'higher';
        } else if (diff < -10) {
          mealCalCorrelation = 'lower';
        }
      }
    }

    // Interestingness
    const cv = coefficientOfVariation(mealCounts);
    let score = 0.3;
    if (cv > 25) score = 0.5;
    if (mealCalCorrelation) score += 0.2;
    score = clamp(score, 0.2, 0.7);

    return {
      questionId: 'Q-TIM-01',
      avgMeals: Math.round(avgMeals * 10) / 10,
      minMeals,
      maxMeals,
      totalMeals,
      mealCalCorrelation,
      interestingnessScore: score,
    };
  }

  /**
   * Q-TIM-02: Are weekdays and weekends different for me?
   */
  static analyzeWeekdayWeekend(data: WeeklyCollectedData): WeekdayWeekendAnalysis {
    // Weekdays = Mon-Fri (1-5), Weekends = Sat-Sun (0, 6)
    const weekdays = data.days.filter(
      (d) => d.isLogged && d.dayOfWeek >= 1 && d.dayOfWeek <= 5
    );
    const weekends = data.days.filter(
      (d) => d.isLogged && (d.dayOfWeek === 0 || d.dayOfWeek === 6)
    );

    if (weekdays.length < 3 || weekends.length < 1) {
      return {
        questionId: 'Q-TIM-02',
        weekdayAvgCal: 0,
        weekendAvgCal: 0,
        weekendEffect: 0,
        weekdayAvgProtein: 0,
        weekendAvgProtein: 0,
        weekdayAvgMeals: 0,
        weekendAvgMeals: 0,
        interestingnessScore: 0,
      };
    }

    const weekdayAvgCal = Math.round(mean(weekdays.map((d) => d.calories)));
    const weekendAvgCal = Math.round(mean(weekends.map((d) => d.calories)));
    const weekendEffect =
      weekdayAvgCal > 0
        ? Math.round(((weekendAvgCal - weekdayAvgCal) / weekdayAvgCal) * 100)
        : 0;

    const weekdayAvgProtein = Math.round(mean(weekdays.map((d) => d.protein)));
    const weekendAvgProtein = Math.round(mean(weekends.map((d) => d.protein)));
    const weekdayAvgMeals = Math.round(mean(weekdays.map((d) => d.mealCount)) * 10) / 10;
    const weekendAvgMeals = Math.round(mean(weekends.map((d) => d.mealCount)) * 10) / 10;

    // Interestingness: higher when weekend differs by >15%
    let score = 0.3;
    if (Math.abs(weekendEffect) > 15) score = 0.7;
    if (Math.abs(weekendEffect) > 25) score = 0.9;
    score = clamp(score, 0.2, 0.9);

    return {
      questionId: 'Q-TIM-02',
      weekdayAvgCal,
      weekendAvgCal,
      weekendEffect,
      weekdayAvgProtein,
      weekendAvgProtein,
      weekdayAvgMeals,
      weekendAvgMeals,
      interestingnessScore: score,
    };
  }
}
