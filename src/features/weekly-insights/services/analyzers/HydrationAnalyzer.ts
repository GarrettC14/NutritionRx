/**
 * Hydration Analyzer
 * Q-HYD-01: Water intake analysis
 */

import { coefficientOfVariation, clamp } from '../../utils/statisticsUtils';
import type {
  WeeklyCollectedData,
  HydrationAnalysis,
} from '../../types/weeklyInsights.types';

export class HydrationAnalyzer {
  /**
   * Q-HYD-01: How was my water intake this week?
   */
  static analyzeHydration(data: WeeklyCollectedData): HydrationAnalysis {
    const daysWithWater = data.days.filter((d) => d.water > 0);

    if (daysWithWater.length < 3) {
      return {
        questionId: 'Q-HYD-01',
        avgWater: 0,
        waterTarget: data.waterTarget,
        avgWaterPct: 0,
        daysMetTarget: 0,
        loggedDays: daysWithWater.length,
        bestDay: '',
        bestDayAmount: 0,
        worstDay: '',
        worstDayAmount: 0,
        consistency: 0,
        interestingnessScore: 0,
      };
    }

    const avgWater = Math.round(
      daysWithWater.reduce((sum, d) => sum + d.water, 0) / daysWithWater.length
    );

    const avgWaterPct =
      data.waterTarget > 0 ? Math.round((avgWater / data.waterTarget) * 100) : 0;

    const daysMetTarget = daysWithWater.filter((d) => d.water >= data.waterTarget).length;

    // Best and worst days
    const sorted = [...daysWithWater].sort((a, b) => b.water - a.water);
    const bestDay = sorted[0].dayName;
    const bestDayAmount = Math.round(sorted[0].water);
    const worstDay = sorted[sorted.length - 1].dayName;
    const worstDayAmount = Math.round(sorted[sorted.length - 1].water);

    const consistency = coefficientOfVariation(daysWithWater.map((d) => d.water));

    // Interestingness
    let score = 0.3;
    if (avgWaterPct < 70) score = 0.6;
    if (consistency > 30) score = Math.max(score, 0.5);

    // Check for weekday/weekend pattern
    const weekdayWater = daysWithWater.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
    const weekendWater = daysWithWater.filter((d) => d.dayOfWeek === 0 || d.dayOfWeek === 6);
    if (weekdayWater.length > 0 && weekendWater.length > 0) {
      const weekdayAvg = weekdayWater.reduce((s, d) => s + d.water, 0) / weekdayWater.length;
      const weekendAvg = weekendWater.reduce((s, d) => s + d.water, 0) / weekendWater.length;
      if (Math.abs(weekdayAvg - weekendAvg) / weekdayAvg > 0.2) {
        score = Math.max(score, 0.6);
      }
    }

    score = clamp(score, 0.2, 0.7);

    return {
      questionId: 'Q-HYD-01',
      avgWater,
      waterTarget: data.waterTarget,
      avgWaterPct,
      daysMetTarget,
      loggedDays: daysWithWater.length,
      bestDay,
      bestDayAmount,
      worstDay,
      worstDayAmount,
      consistency,
      interestingnessScore: score,
    };
  }
}
