/**
 * Nutrition Context Builder
 * Stage 2: Aggregate raw data into a single typed context object.
 * ALL statistics are computed in JavaScript — the LLM never does math.
 */

import { InteractionManager } from 'react-native';
import { getRawNutritionData, type RawNutritionData } from './nutritionContextQueries';
import { computeDataAvailability, type DataAvailabilityResult } from './dataAvailability';
import { computeDerivedInsights, type DerivedInsight } from './derivedNutritionInsights';

// ============================================================
// Types
// ============================================================

export interface MacroProgress {
  consumed: number;
  target: number;
  remaining: number;
  percentComplete: number;
}

export interface UnifiedNutritionContext {
  metrics: {
    todayProgress: {
      calories: MacroProgress;
      protein: MacroProgress;
      carbs: MacroProgress;
      fat: MacroProgress;
      fiber: { consumed: number; target: number; remaining: number };
      mealsLoggedToday: number;
    };
    weeklyTrends: {
      avgCalories: number;
      avgProtein: number;
      avgCarbs: number;
      avgFat: number;
      avgFiber: number;
      calorieAdherence: number;
      proteinAdherence: number;
      daysLoggedThisWeek: number;
      daysLoggedLastWeek: number;
      calorieDirection: 'increasing' | 'decreasing' | 'stable';
      proteinDirection: 'increasing' | 'decreasing' | 'stable';
    };
    consistency: {
      currentStreak: number;
      longestStreak: number;
      loggingRate7d: number;
      loggingRate30d: number;
    };
    mealDistribution: {
      breakfastFrequency: number;
      lunchFrequency: number;
      dinnerFrequency: number;
      snackFrequency: number;
      avgMealsPerDay: number;
      largestMealType: string;
      calorieDistribution: {
        breakfast: number;
        lunch: number;
        dinner: number;
        snack: number;
      };
    };
    weightTrend: {
      currentWeight: number | null;
      weightChange7d: number | null;
      weightChange30d: number | null;
      direction: 'gaining' | 'losing' | 'maintaining' | 'insufficient_data';
    } | null;
  };

  profile: {
    goal: string;
    activityLevel: string;
    weightUnit: 'lbs' | 'kg';
  };

  dataAvailability: DataAvailabilityResult;
  derivedInsights: DerivedInsight[];
  frequentFoods: { name: string; timesLogged: number; avgCalories: number }[];
}

// ============================================================
// Builder
// ============================================================

export async function buildUnifiedNutritionContext(): Promise<UnifiedNutritionContext> {
  // Defer heavy computation until after any pending animations/transitions complete
  await new Promise<void>((resolve) => InteractionManager.runAfterInteractions(() => resolve()));

  const rawData = await getRawNutritionData();

  const metrics = computeMetrics(rawData);
  const dataAvailability = computeDataAvailability(rawData);
  const derivedInsights = computeDerivedInsights(rawData, metrics, rawData.goal?.type ?? null);

  return {
    metrics,
    profile: {
      goal: rawData.goal?.type ?? 'maintain',
      activityLevel: rawData.profile?.activityLevel ?? 'moderately_active',
      weightUnit: rawData.weightUnit,
    },
    dataAvailability,
    derivedInsights,
    frequentFoods: rawData.frequentFoods.slice(0, 10),
  };
}

// ============================================================
// Metric Computation (ALL math happens here, NOT in the LLM)
// ============================================================

function computeMetrics(rawData: RawNutritionData): UnifiedNutritionContext['metrics'] {
  return {
    todayProgress: computeTodayProgress(rawData),
    weeklyTrends: computeWeeklyTrends(rawData),
    consistency: computeConsistency(rawData),
    mealDistribution: computeMealDistribution(rawData),
    weightTrend: computeWeightTrend(rawData),
  };
}

function computeTodayProgress(rawData: RawNutritionData): UnifiedNutritionContext['metrics']['todayProgress'] {
  const today = new Date().toISOString().split('T')[0];
  const todayLog = rawData.dailyLogs.find((d) => d.date === today);

  const targets = rawData.macroTargets;
  const fiberTarget = 28; // general recommendation

  const makeMacro = (consumed: number, target: number): MacroProgress => ({
    consumed: Math.round(consumed),
    target: Math.round(target),
    remaining: Math.max(0, Math.round(target - consumed)),
    percentComplete: target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0,
  });

  return {
    calories: makeMacro(todayLog?.calories ?? 0, targets.calories),
    protein: makeMacro(todayLog?.protein ?? 0, targets.protein),
    carbs: makeMacro(todayLog?.carbs ?? 0, targets.carbs),
    fat: makeMacro(todayLog?.fat ?? 0, targets.fat),
    fiber: {
      consumed: Math.round(todayLog?.fiber ?? 0),
      target: fiberTarget,
      remaining: Math.max(0, fiberTarget - Math.round(todayLog?.fiber ?? 0)),
    },
    mealsLoggedToday: todayLog?.mealsLogged ?? 0,
  };
}

function computeWeeklyTrends(rawData: RawNutritionData): UnifiedNutritionContext['metrics']['weeklyTrends'] {
  const last7 = rawData.dailyLogs.slice(-7);
  const prior7 = rawData.dailyLogs.slice(-14, -7);

  const daysLoggedThisWeek = last7.length;
  const daysLoggedLastWeek = prior7.length;

  const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0);

  const avgCalories = avg(last7.map((d) => d.calories));
  const avgProtein = avg(last7.map((d) => d.protein));
  const avgCarbs = avg(last7.map((d) => d.carbs));
  const avgFat = avg(last7.map((d) => d.fat));
  const avgFiber = avg(last7.map((d) => d.fiber));

  // Adherence: % of days within ±10% of target
  const targets = rawData.macroTargets;
  const calorieAdherence = last7.length > 0
    ? Math.round(
        (last7.filter((d) => Math.abs(d.calories - targets.calories) <= targets.calories * 0.1).length /
          last7.length) *
          100,
      )
    : 0;

  const proteinAdherence = last7.length > 0
    ? Math.round(
        (last7.filter((d) => d.protein >= targets.protein * 0.9).length / last7.length) * 100,
      )
    : 0;

  // Direction: compare this week's avg to prior week's avg
  const priorAvgCalories = avg(prior7.map((d) => d.calories));
  const priorAvgProtein = avg(prior7.map((d) => d.protein));

  const detectDirection = (current: number, prior: number): 'increasing' | 'decreasing' | 'stable' => {
    if (prior === 0) return 'stable';
    const pctChange = ((current - prior) / prior) * 100;
    if (pctChange > 5) return 'increasing';
    if (pctChange < -5) return 'decreasing';
    return 'stable';
  };

  return {
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    avgFiber,
    calorieAdherence,
    proteinAdherence,
    daysLoggedThisWeek,
    daysLoggedLastWeek,
    calorieDirection: detectDirection(avgCalories, priorAvgCalories),
    proteinDirection: detectDirection(avgProtein, priorAvgProtein),
  };
}

function computeConsistency(rawData: RawNutritionData): UnifiedNutritionContext['metrics']['consistency'] {
  const logs = rawData.dailyLogs;

  // Current streak: count consecutive days backward from today
  const today = new Date();
  let currentStreak = 0;
  for (let i = 0; i < 90; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    if (logs.some((d) => d.date === dateStr)) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Longest streak: scan all dates
  const dateSet = new Set(logs.map((d) => d.date));
  let longestStreak = 0;
  let tempStreak = 0;
  const sortedDates = Array.from(dateSet).sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1] + 'T00:00:00');
      const curr = new Date(sortedDates[i] + 'T00:00:00');
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Logging rates
  const last7Dates = new Set<string>();
  const last30Dates = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (dateSet.has(dateStr)) {
      last30Dates.add(dateStr);
      if (i < 7) last7Dates.add(dateStr);
    }
  }

  return {
    currentStreak,
    longestStreak,
    loggingRate7d: Math.round((last7Dates.size / 7) * 100),
    loggingRate30d: Math.round((last30Dates.size / 30) * 100),
  };
}

function computeMealDistribution(rawData: RawNutritionData): UnifiedNutritionContext['metrics']['mealDistribution'] {
  const patterns = rawData.mealPatterns;
  const get = (type: string) => patterns.find((p) => p.mealType === type);

  const breakfast = get('breakfast');
  const lunch = get('lunch');
  const dinner = get('dinner');
  const snack = get('snack');

  const totalCals = (breakfast?.avgCalories ?? 0) + (lunch?.avgCalories ?? 0) + (dinner?.avgCalories ?? 0) + (snack?.avgCalories ?? 0);
  const pct = (cal: number) => (totalCals > 0 ? Math.round((cal / totalCals) * 100) : 0);

  const calorieDistribution = {
    breakfast: pct(breakfast?.avgCalories ?? 0),
    lunch: pct(lunch?.avgCalories ?? 0),
    dinner: pct(dinner?.avgCalories ?? 0),
    snack: pct(snack?.avgCalories ?? 0),
  };

  // Determine largest meal
  const mealEntries: Array<[string, number]> = [
    ['Breakfast', breakfast?.avgCalories ?? 0],
    ['Lunch', lunch?.avgCalories ?? 0],
    ['Dinner', dinner?.avgCalories ?? 0],
    ['Snacks', snack?.avgCalories ?? 0],
  ];
  mealEntries.sort((a, b) => b[1] - a[1]);

  // Average meals per day from daily logs
  const last7 = rawData.dailyLogs.slice(-7);
  const avgMealsPerDay = last7.length > 0
    ? Math.round((last7.reduce((s, d) => s + d.mealsLogged, 0) / last7.length) * 10) / 10
    : 0;

  return {
    breakfastFrequency: breakfast?.frequency ?? 0,
    lunchFrequency: lunch?.frequency ?? 0,
    dinnerFrequency: dinner?.frequency ?? 0,
    snackFrequency: snack?.frequency ?? 0,
    avgMealsPerDay,
    largestMealType: mealEntries[0][0],
    calorieDistribution,
  };
}

function computeWeightTrend(rawData: RawNutritionData): UnifiedNutritionContext['metrics']['weightTrend'] {
  const entries = rawData.weightTrend;

  if (entries.length < 3) return null;

  const latest = entries[entries.length - 1];
  const currentWeight = latest.weightKg;

  // 7-day change
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDayStr = sevenDaysAgo.toISOString().split('T')[0];
  const oldEntry7 = entries.find((e) => e.date <= sevenDayStr);
  const weightChange7d = oldEntry7
    ? Math.round((currentWeight - oldEntry7.weightKg) * 100) / 100
    : null;

  // 30-day change (from the earliest entry within 30 days)
  const firstEntry = entries[0];
  const weightChange30d = Math.round((currentWeight - firstEntry.weightKg) * 100) / 100;

  // Direction
  let direction: 'gaining' | 'losing' | 'maintaining' | 'insufficient_data';
  if (entries.length < 5) {
    direction = 'insufficient_data';
  } else if (weightChange30d > 0.5) {
    direction = 'gaining';
  } else if (weightChange30d < -0.5) {
    direction = 'losing';
  } else {
    direction = 'maintaining';
  }

  return {
    currentWeight,
    weightChange7d,
    weightChange30d,
    direction,
  };
}
