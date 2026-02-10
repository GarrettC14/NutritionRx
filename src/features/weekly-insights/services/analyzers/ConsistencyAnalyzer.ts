/**
 * Consistency Analyzer
 * Q-CON-01: Macro consistency
 * Q-CON-02: Outlier days
 * Q-CON-03: Target hits
 */

import {
  coefficientOfVariation,
  standardDeviation,
  mean,
  clamp,
} from '../../utils/statisticsUtils';
import type {
  WeeklyCollectedData,
  ConsistencyAnalysis,
  OutlierAnalysis,
  TargetHitAnalysis,
} from '../../types/weeklyInsights.types';

export class ConsistencyAnalyzer {
  /**
   * Q-CON-01: How consistent were my macros this week?
   */
  static analyzeMacroConsistency(data: WeeklyCollectedData): ConsistencyAnalysis {
    const logged = data.days.filter((d) => d.isLogged);

    if (logged.length < 3) {
      return {
        questionId: 'Q-CON-01',
        calorieCV: 0,
        proteinCV: 0,
        carbCV: 0,
        fatCV: 0,
        mostConsistentMacro: 'Calories',
        leastConsistentMacro: 'Calories',
        overallConsistency: 'variable',
        loggedDays: logged.length,
        interestingnessScore: 0,
      };
    }

    const calorieCV = coefficientOfVariation(logged.map((d) => d.calories));
    const proteinCV = coefficientOfVariation(logged.map((d) => d.protein));
    const carbCV = coefficientOfVariation(logged.map((d) => d.carbs));
    const fatCV = coefficientOfVariation(logged.map((d) => d.fat));

    const cvs: Record<string, number> = {
      Calories: calorieCV,
      Protein: proteinCV,
      Carbs: carbCV,
      Fat: fatCV,
    };

    const entries = Object.entries(cvs);
    const mostConsistentMacro = entries.reduce((a, b) => (a[1] < b[1] ? a : b))[0];
    const leastConsistentMacro = entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];

    const avgCV = (calorieCV + proteinCV + carbCV + fatCV) / 4;
    const overallConsistency: ConsistencyAnalysis['overallConsistency'] =
      avgCV < 10
        ? 'very_consistent'
        : avgCV < 20
          ? 'fairly_consistent'
          : avgCV < 35
            ? 'variable'
            : 'quite_variable';

    // Interestingness: higher when CVs differ from each other
    const cvRange = Math.max(...Object.values(cvs)) - Math.min(...Object.values(cvs));
    let score = 0.3 + (cvRange / 100) * 0.5;
    if (logged.length >= 5) score += 0.2;
    score = clamp(score, 0.3, 1.0);

    return {
      questionId: 'Q-CON-01',
      calorieCV,
      proteinCV,
      carbCV,
      fatCV,
      mostConsistentMacro,
      leastConsistentMacro,
      overallConsistency,
      loggedDays: logged.length,
      interestingnessScore: score,
    };
  }

  /**
   * Q-CON-02: Which days threw off my averages?
   */
  static analyzeOutliers(data: WeeklyCollectedData): OutlierAnalysis {
    const logged = data.days.filter((d) => d.isLogged);

    if (logged.length < 4) {
      return {
        questionId: 'Q-CON-02',
        weekMean: 0,
        weekStdDev: 0,
        outlierDays: [],
        adjustedMean: 0,
        interestingnessScore: 0,
      };
    }

    const cals = logged.map((d) => d.calories);
    const weekMean = mean(cals);
    const weekStdDev = standardDeviation(cals);
    const threshold = 1.5 * weekStdDev;

    const outlierDays = logged
      .filter((d) => Math.abs(d.calories - weekMean) > threshold)
      .map((d) => ({
        date: d.date,
        dayName: d.dayName,
        calories: Math.round(d.calories),
        deviationPct: Math.round(((d.calories - weekMean) / weekMean) * 100),
        direction: (d.calories > weekMean ? 'high' : 'low') as 'high' | 'low',
      }));

    const nonOutlierCals = logged
      .filter((d) => Math.abs(d.calories - weekMean) <= threshold)
      .map((d) => d.calories);

    const adjustedMean =
      nonOutlierCals.length > 0 ? mean(nonOutlierCals) : weekMean;

    // Interestingness: 1-2 outliers = best narrative
    let score: number;
    if (outlierDays.length === 1 || outlierDays.length === 2) {
      score = 0.8;
    } else if (outlierDays.length >= 3) {
      score = 0.5;
    } else {
      score = 0.1; // 0 outliers = boring
    }

    return {
      questionId: 'Q-CON-02',
      weekMean: Math.round(weekMean),
      weekStdDev: Math.round(weekStdDev),
      outlierDays,
      adjustedMean: Math.round(adjustedMean),
      interestingnessScore: score,
    };
  }

  /**
   * Q-CON-03: How many days did I hit my targets?
   */
  static analyzeTargetHits(data: WeeklyCollectedData): TargetHitAnalysis {
    const logged = data.days.filter((d) => d.isLogged);

    const calorieHitDays = logged.filter(
      (d) =>
        d.calories >= data.calorieTarget * 0.85 &&
        d.calories <= data.calorieTarget * 1.15
    ).length;

    const proteinHitDays = logged.filter(
      (d) => d.protein >= data.proteinTarget - 10
    ).length;

    let score = 0.5;
    if (calorieHitDays === logged.length && logged.length >= 5) score = 0.9;
    else if (calorieHitDays >= 5) score = 0.7;
    if (logged.length < 4) score = 0.2;

    return {
      questionId: 'Q-CON-03',
      loggedDays: logged.length,
      calorieHitDays,
      proteinHitDays,
      calorieHitPct:
        logged.length > 0 ? Math.round((calorieHitDays / logged.length) * 100) : 0,
      proteinHitPct:
        logged.length > 0 ? Math.round((proteinHitDays / logged.length) * 100) : 0,
      interestingnessScore: score,
    };
  }
}
