/**
 * Derived Nutrition Insights
 * 7 deterministic rules that run locally (no LLM).
 * Injected into the prompt so the LLM expands on verified facts.
 */

import type { RawNutritionData } from './nutritionContextQueries';
import type { UnifiedNutritionContext } from './nutritionContextBuilder';

export interface DerivedInsight {
  id: string;
  category: 'protein' | 'calories' | 'consistency' | 'balance' | 'timing' | 'weight' | 'fiber';
  message: string;
  confidence: number; // 0-1
  priority: number; // 1 = highest
}

export function computeDerivedInsights(
  rawData: RawNutritionData,
  metrics: UnifiedNutritionContext['metrics'],
  goalType: string | null,
): DerivedInsight[] {
  const insights: DerivedInsight[] = [];

  insights.push(...detectProteinPatterns(rawData, metrics));
  insights.push(...detectCalorieConsistency(rawData, metrics));
  insights.push(...detectMealImbalance(metrics));
  insights.push(...detectWeekendWeekdayDrift(rawData));
  insights.push(...detectFiberIntake(metrics));
  insights.push(...detectWeightCalorieAlignment(metrics, goalType));
  insights.push(...detectLoggingDropoff(metrics));

  return insights
    .filter((i) => i.confidence >= 0.5)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);
}

// ============================================================
// Rule 1: Protein Patterns
// ============================================================

function detectProteinPatterns(
  rawData: RawNutritionData,
  metrics: UnifiedNutritionContext['metrics'],
): DerivedInsight[] {
  const results: DerivedInsight[] = [];
  const { weeklyTrends, todayProgress, mealDistribution } = metrics;

  if (rawData.dailyLogs.length < 3) return results;

  // Check overall protein adherence
  if (weeklyTrends.proteinAdherence < 60) {
    const avgProtein = weeklyTrends.avgProtein;
    const target = rawData.macroTargets.protein;
    results.push({
      id: 'protein-low-adherence',
      category: 'protein',
      message: `Protein intake is below target on most days. Average: ${avgProtein}g vs target: ${target}g.`,
      confidence: 0.8,
      priority: 1,
    });
  }

  // Check if breakfast is protein-light
  if (
    mealDistribution.breakfastFrequency >= 3 &&
    mealDistribution.calorieDistribution.breakfast > 0
  ) {
    const breakfastProportion = mealDistribution.calorieDistribution.breakfast / 100;
    const expectedProtein = rawData.macroTargets.protein * breakfastProportion;
    // If breakfast typically provides <15% of protein target
    if (expectedProtein < rawData.macroTargets.protein * 0.15 && breakfastProportion > 0.1) {
      results.push({
        id: 'protein-low-breakfast',
        category: 'protein',
        message: `Breakfast meals tend to be lower in protein — this meal could be a leverage point for hitting your target.`,
        confidence: 0.65,
        priority: 3,
      });
    }
  }

  return results;
}

// ============================================================
// Rule 2: Calorie Consistency
// ============================================================

function detectCalorieConsistency(
  rawData: RawNutritionData,
  metrics: UnifiedNutritionContext['metrics'],
): DerivedInsight[] {
  const results: DerivedInsight[] = [];
  const logs = rawData.dailyLogs;

  if (logs.length < 3) return results;

  const calories = logs.map((d) => d.calories);
  const target = rawData.macroTargets.calories;
  const mean = calories.reduce((s, c) => s + c, 0) / calories.length;
  const stdDev = Math.sqrt(
    calories.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / calories.length,
  );

  // High variance check: stddev > 25% of target
  if (stdDev > target * 0.25) {
    const min = Math.min(...calories);
    const max = Math.max(...calories);
    results.push({
      id: 'calorie-high-variance',
      category: 'calories',
      message: `Daily calorie intake varies significantly (range: ${min}-${max}). Consistency may help progress.`,
      confidence: 0.75,
      priority: 2,
    });
  }

  // Consecutive over/under by >15%
  let streak = 1;
  let streakDirection: 'over' | 'under' | null = null;
  for (let i = 1; i < logs.length; i++) {
    const diff = (logs[i].calories - target) / target;
    const prevDiff = (logs[i - 1].calories - target) / target;

    if (diff > 0.15 && prevDiff > 0.15) {
      if (streakDirection === 'over') streak++;
      else { streak = 2; streakDirection = 'over'; }
    } else if (diff < -0.15 && prevDiff < -0.15) {
      if (streakDirection === 'under') streak++;
      else { streak = 2; streakDirection = 'under'; }
    } else {
      streak = 1;
      streakDirection = null;
    }
  }

  if (streak >= 3 && streakDirection) {
    results.push({
      id: 'calorie-consecutive-drift',
      category: 'calories',
      message: `Calorie intake has been consistently ${streakDirection} target for ${streak} days.`,
      confidence: 0.8,
      priority: 2,
    });
  }

  return results;
}

// ============================================================
// Rule 3: Meal Distribution Balance
// ============================================================

function detectMealImbalance(
  metrics: UnifiedNutritionContext['metrics'],
): DerivedInsight[] {
  const results: DerivedInsight[] = [];
  const { mealDistribution } = metrics;

  if (mealDistribution.avgMealsPerDay < 1) return results;

  const dist = mealDistribution.calorieDistribution;

  // One meal >50% of calories
  const meals: Array<[string, number]> = [
    ['Breakfast', dist.breakfast],
    ['Lunch', dist.lunch],
    ['Dinner', dist.dinner],
  ];

  for (const [name, pct] of meals) {
    if (pct > 50) {
      results.push({
        id: `meal-heavy-${name.toLowerCase()}`,
        category: 'balance',
        message: `${name} accounts for ~${pct}% of daily calories. Spreading intake may improve energy.`,
        confidence: 0.7,
        priority: 3,
      });
      break;
    }
  }

  // Snacks >30% of calories
  if (dist.snack > 30) {
    results.push({
      id: 'meal-heavy-snacks',
      category: 'balance',
      message: `Snacking accounts for ~${dist.snack}% of daily intake, which is higher than typical.`,
      confidence: 0.65,
      priority: 4,
    });
  }

  // Skipped meal (frequency < 3 days/week out of 7)
  const mealFreqs: Array<[string, number]> = [
    ['Breakfast', mealDistribution.breakfastFrequency],
    ['Lunch', mealDistribution.lunchFrequency],
    ['Dinner', mealDistribution.dinnerFrequency],
  ];

  for (const [name, freq] of mealFreqs) {
    if (freq > 0 && freq < 3.5) {
      results.push({
        id: `meal-skipped-${name.toLowerCase()}`,
        category: 'timing',
        message: `${name} is only logged ${freq.toFixed(1)} days/week. Regular meals support consistent nutrition.`,
        confidence: 0.6,
        priority: 4,
      });
      break;
    }
  }

  return results;
}

// ============================================================
// Rule 4: Weekend vs Weekday Drift
// ============================================================

function detectWeekendWeekdayDrift(rawData: RawNutritionData): DerivedInsight[] {
  const results: DerivedInsight[] = [];
  const logs = rawData.dailyLogs;

  if (logs.length < 7) return results;

  const weekday: number[] = [];
  const weekend: number[] = [];
  const weekdayProtein: number[] = [];
  const weekendProtein: number[] = [];

  for (const log of logs) {
    const day = new Date(log.date + 'T00:00:00').getDay();
    if (day === 0 || day === 6) {
      weekend.push(log.calories);
      weekendProtein.push(log.protein);
    } else {
      weekday.push(log.calories);
      weekdayProtein.push(log.protein);
    }
  }

  if (weekend.length < 2 || weekday.length < 3) return results;

  const avgWeekend = Math.round(weekend.reduce((s, c) => s + c, 0) / weekend.length);
  const avgWeekday = Math.round(weekday.reduce((s, c) => s + c, 0) / weekday.length);
  const calDiff = avgWeekend - avgWeekday;

  if (calDiff > avgWeekday * 0.2) {
    results.push({
      id: 'weekend-calorie-drift',
      category: 'calories',
      message: `Weekend calories average ${avgWeekend} vs weekday ${avgWeekday} — a ${calDiff} calorie difference.`,
      confidence: 0.75,
      priority: 2,
    });
  }

  const avgWeekendProtein = Math.round(weekendProtein.reduce((s, c) => s + c, 0) / weekendProtein.length);
  const avgWeekdayProtein = Math.round(weekdayProtein.reduce((s, c) => s + c, 0) / weekdayProtein.length);

  if (avgWeekdayProtein > 0 && avgWeekendProtein < avgWeekdayProtein * 0.85) {
    results.push({
      id: 'weekend-protein-drop',
      category: 'protein',
      message: `Protein intake tends to drop on weekends (${avgWeekendProtein}g vs ${avgWeekdayProtein}g weekday).`,
      confidence: 0.7,
      priority: 3,
    });
  }

  return results;
}

// ============================================================
// Rule 5: Fiber Intake
// ============================================================

function detectFiberIntake(
  metrics: UnifiedNutritionContext['metrics'],
): DerivedInsight[] {
  const results: DerivedInsight[] = [];
  const { weeklyTrends } = metrics;

  if (weeklyTrends.avgFiber === undefined || weeklyTrends.daysLoggedThisWeek < 3) return results;

  if (weeklyTrends.avgFiber < 20) {
    results.push({
      id: 'fiber-low',
      category: 'fiber',
      message: `Average fiber intake is ${weeklyTrends.avgFiber}g/day. The general recommendation is 25-30g.`,
      confidence: 0.7,
      priority: 3,
    });
  }

  return results;
}

// ============================================================
// Rule 6: Weight vs Calorie Alignment
// ============================================================

function detectWeightCalorieAlignment(
  metrics: UnifiedNutritionContext['metrics'],
  goalType: string | null,
): DerivedInsight[] {
  const results: DerivedInsight[] = [];
  const { weightTrend, weeklyTrends } = metrics;

  if (!weightTrend || !goalType) return results;
  if (weightTrend.direction === 'insufficient_data') return results;

  if (goalType === 'lose' && weightTrend.direction === 'gaining' && weeklyTrends.calorieAdherence > 80) {
    results.push({
      id: 'weight-calorie-mismatch-cut',
      category: 'weight',
      message: `Weight is trending up despite hitting calorie targets. The targets may need re-evaluation.`,
      confidence: 0.7,
      priority: 1,
    });
  }

  if (goalType === 'gain' && weightTrend.direction === 'losing') {
    results.push({
      id: 'weight-calorie-mismatch-bulk',
      category: 'weight',
      message: `Weight is trending down despite a surplus goal. Consider whether the calorie target is sufficient.`,
      confidence: 0.7,
      priority: 1,
    });
  }

  if (goalType === 'maintain' && weightTrend.weightChange30d !== null) {
    const absChange = Math.abs(weightTrend.weightChange30d);
    if (absChange > 0.9) { // ~2 lbs in kg
      const direction = weightTrend.weightChange30d > 0 ? 'up' : 'down';
      results.push({
        id: 'weight-maintenance-drift',
        category: 'weight',
        message: `Weight has shifted ${direction} by ${absChange.toFixed(1)}kg over 30 days. Minor adjustments may help maintain.`,
        confidence: 0.65,
        priority: 2,
      });
    }
  }

  return results;
}

// ============================================================
// Rule 7: Logging Dropoff
// ============================================================

function detectLoggingDropoff(
  metrics: UnifiedNutritionContext['metrics'],
): DerivedInsight[] {
  const results: DerivedInsight[] = [];
  const { consistency } = metrics;

  // Recent dropoff: 7d rate much lower than 30d
  if (
    consistency.loggingRate30d > 0 &&
    consistency.loggingRate7d < consistency.loggingRate30d - 20
  ) {
    results.push({
      id: 'logging-dropoff',
      category: 'consistency',
      message: `Logging has dropped off this week (${consistency.loggingRate7d}% vs your 30-day average of ${consistency.loggingRate30d}%).`,
      confidence: 0.8,
      priority: 2,
    });
  }

  // Excellent consistency
  if (consistency.loggingRate30d >= 90 && consistency.loggingRate7d >= 85) {
    results.push({
      id: 'logging-excellent',
      category: 'consistency',
      message: `Excellent logging consistency at ${consistency.loggingRate30d}%. This level of tracking supports accurate insights.`,
      confidence: 0.9,
      priority: 5,
    });
  }

  return results;
}
