/**
 * Macro Balance Analyzer
 * Q-MAC-01: Protein analysis
 * Q-MAC-02: Macro balance
 */

import { coefficientOfVariation, clamp } from '../../utils/statisticsUtils';
import type {
  WeeklyCollectedData,
  ProteinAnalysis,
  MacroBalanceAnalysis,
} from '../../types/weeklyInsights.types';

const CALORIES_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

export class MacroBalanceAnalyzer {
  /**
   * Q-MAC-01: Is my protein intake where it needs to be?
   */
  static analyzeProtein(data: WeeklyCollectedData): ProteinAnalysis {
    const logged = data.days.filter((d) => d.isLogged);

    if (logged.length < 3) {
      return {
        questionId: 'Q-MAC-01',
        avgProtein: 0,
        proteinTarget: data.proteinTarget,
        avgProteinPct: 0,
        daysMetTarget: 0,
        loggedDays: logged.length,
        proteinCalPct: 0,
        trend: null,
        interestingnessScore: 0,
      };
    }

    const avgProtein = Math.round(
      logged.reduce((sum, d) => sum + d.protein, 0) / logged.length
    );
    const avgProteinPct =
      data.proteinTarget > 0 ? Math.round((avgProtein / data.proteinTarget) * 100) : 0;
    const daysMetTarget = logged.filter((d) => d.protein >= data.proteinTarget - 10).length;

    // Protein as % of total calories
    const avgCalories =
      logged.reduce((sum, d) => sum + d.calories, 0) / logged.length;
    const proteinCalPct =
      avgCalories > 0
        ? Math.round(((avgProtein * CALORIES_PER_GRAM.protein) / avgCalories) * 100)
        : 0;

    // Trend vs prior week
    let trend: string | null = null;
    if (data.priorWeek && data.priorWeek.avgProtein > 0) {
      const change = avgProtein - data.priorWeek.avgProtein;
      if (Math.abs(change) > 5) {
        trend = change > 0 ? `up ${change}g from last week` : `down ${Math.abs(change)}g from last week`;
      }
    }

    // Interestingness: higher when protein is notably below target
    let score = 0.4;
    if (avgProteinPct < 85) score = 0.7;
    if (avgProteinPct < 70) score = 0.9;
    if (trend) score += 0.1;
    score = clamp(score, 0.4, 1.0);

    return {
      questionId: 'Q-MAC-01',
      avgProtein,
      proteinTarget: data.proteinTarget,
      avgProteinPct,
      daysMetTarget,
      loggedDays: logged.length,
      proteinCalPct,
      trend,
      interestingnessScore: score,
    };
  }

  /**
   * Q-MAC-02: How balanced are my macros across the week?
   */
  static analyzeMacroBalance(data: WeeklyCollectedData): MacroBalanceAnalysis {
    const logged = data.days.filter((d) => d.isLogged);

    if (logged.length < 3) {
      return {
        questionId: 'Q-MAC-02',
        avgProtein: 0,
        avgCarbs: 0,
        avgFat: 0,
        proteinPct: 0,
        carbsPct: 0,
        fatPct: 0,
        mostVariableMacro: 'Carbs',
        skewedMacro: null,
        skewDirection: null,
        interestingnessScore: 0,
      };
    }

    const avgProtein = logged.reduce((s, d) => s + d.protein, 0) / logged.length;
    const avgCarbs = logged.reduce((s, d) => s + d.carbs, 0) / logged.length;
    const avgFat = logged.reduce((s, d) => s + d.fat, 0) / logged.length;

    const totalCal =
      avgProtein * CALORIES_PER_GRAM.protein +
      avgCarbs * CALORIES_PER_GRAM.carbs +
      avgFat * CALORIES_PER_GRAM.fat;

    const proteinPct = totalCal > 0 ? Math.round((avgProtein * CALORIES_PER_GRAM.protein / totalCal) * 100) : 0;
    const carbsPct = totalCal > 0 ? Math.round((avgCarbs * CALORIES_PER_GRAM.carbs / totalCal) * 100) : 0;
    const fatPct = totalCal > 0 ? Math.round((avgFat * CALORIES_PER_GRAM.fat / totalCal) * 100) : 0;

    // Find most variable macro
    const proteinCV = coefficientOfVariation(logged.map((d) => d.protein));
    const carbCV = coefficientOfVariation(logged.map((d) => d.carbs));
    const fatCV = coefficientOfVariation(logged.map((d) => d.fat));

    const cvMap: Record<string, number> = { Protein: proteinCV, Carbs: carbCV, Fat: fatCV };
    const mostVariableMacro = Object.entries(cvMap).reduce((a, b) => (a[1] > b[1] ? a : b))[0];

    // Check for skewed macro (>50% of calories)
    let skewedMacro: string | null = null;
    let skewDirection: string | null = null;
    if (proteinPct > 50) { skewedMacro = 'Protein'; skewDirection = 'high'; }
    else if (carbsPct > 60) { skewedMacro = 'Carbs'; skewDirection = 'high'; }
    else if (fatPct > 45) { skewedMacro = 'Fat'; skewDirection = 'high'; }

    // Interestingness
    let score = 0.3;
    if (skewedMacro) score = 0.7;
    const maxCV = Math.max(proteinCV, carbCV, fatCV);
    if (maxCV > 30) score = Math.max(score, 0.6);
    score = clamp(score, 0.3, 0.9);

    return {
      questionId: 'Q-MAC-02',
      avgProtein: Math.round(avgProtein),
      avgCarbs: Math.round(avgCarbs),
      avgFat: Math.round(avgFat),
      proteinPct,
      carbsPct,
      fatPct,
      mostVariableMacro,
      skewedMacro,
      skewDirection,
      interestingnessScore: score,
    };
  }
}
