/**
 * Daily Data Collector
 * Single source of truth for all data needed by daily insights.
 * Pulls from existing stores and repositories, cached 15 minutes.
 */

import { logEntryRepository, waterRepository, macroCycleRepository } from '@/repositories';
import { useGoalStore } from '@/stores/goalStore';
import { useWaterStore } from '@/stores/waterStore';
import { useMacroCycleStore } from '@/stores/macroCycleStore';
import type { DailyInsightData, FoodEntry, MealWithTimestamp, WeeklyDailyTotal } from '../../types/dailyInsights.types';
import type { DeficiencyCheck } from '../../types/insights.types';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function safePercent(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((value / target) * 100);
}

function computeLoggingStreak(weeklyTotals: WeeklyDailyTotal[]): number {
  let streak = 0;
  for (let i = 0; i < weeklyTotals.length; i++) {
    if (weeklyTotals[i].logged) {
      streak++;
    } else if (i === 0) {
      // Today might not have data yet if it's early
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function computeCalorieStreak(weeklyTotals: WeeklyDailyTotal[], calorieTarget: number): number {
  return weeklyTotals.filter(
    (d) => d.logged && Math.abs(d.calories - calorieTarget) / Math.max(1, calorieTarget) <= 0.1
  ).length;
}

export async function collectDailyInsightData(): Promise<DailyInsightData> {
  if (__DEV__) console.log('[LLM:DataCollector] collectDailyInsightData() — START');
  const collectStart = Date.now();
  const today = getTodayDateString();
  const now = new Date();
  const currentHour = now.getHours();
  if (__DEV__) console.log(`[LLM:DataCollector] today=${today}, currentHour=${currentHour}`);

  // 1. Fetch data in parallel
  const sevenDaysAgo = getDateString(6);
  if (__DEV__) console.log(`[LLM:DataCollector] Fetching data for range ${sevenDaysAgo} → ${today}...`);
  const fetchStart = Date.now();
  const [todayTotals, weeklyRawTotals, todayEntries, datesWithLogs] = await Promise.all([
    logEntryRepository.getDailyTotals(today),
    logEntryRepository.getDailyTotalsForRange(sevenDaysAgo, today),
    logEntryRepository.findByDate(today),
    logEntryRepository.getDatesWithLogs(),
  ]);
  if (__DEV__) console.log(`[LLM:DataCollector] Data fetched in ${Date.now() - fetchStart}ms — todayEntries=${todayEntries.length}, weeklyDays=${weeklyRawTotals.length}, datesWithLogs=${datesWithLogs.length}`);

  // 2. Build food entries
  const todayFoods: FoodEntry[] = todayEntries.map((entry) => ({
    name: entry.foodName || 'Unknown',
    calories: entry.calories || 0,
    protein: entry.protein || 0,
    carbs: entry.carbs || 0,
    fat: entry.fat || 0,
  }));

  // 3. Group by meal
  const mealGroups = new Map<string, { foods: typeof todayEntries; firstTime: string }>();
  for (const entry of todayEntries) {
    const mealLabel = entry.mealType || 'Snack';
    if (!mealGroups.has(mealLabel)) {
      const timeStr = entry.createdAt instanceof Date ? entry.createdAt.toISOString() : '';
      mealGroups.set(mealLabel, { foods: [], firstTime: timeStr });
    }
    const group = mealGroups.get(mealLabel)!;
    group.foods.push(entry);
    const entryTime = entry.createdAt instanceof Date ? entry.createdAt.toISOString() : '';
    if (entryTime && entryTime < group.firstTime) {
      group.firstTime = entryTime;
    }
  }

  const mealsWithTimestamps: MealWithTimestamp[] = Array.from(mealGroups.entries()).map(
    ([label, group]) => ({
      mealLabel: label,
      totalCalories: group.foods.reduce((s, f) => s + (f.calories || 0), 0),
      totalProtein: group.foods.reduce((s, f) => s + (f.protein || 0), 0),
      totalCarbs: group.foods.reduce((s, f) => s + (f.carbs || 0), 0),
      totalFat: group.foods.reduce((s, f) => s + (f.fat || 0), 0),
      firstLogTime: group.firstTime,
      foods: group.foods.map((f) => ({
        name: f.foodName || 'Unknown',
        calories: f.calories || 0,
        protein: f.protein || 0,
        carbs: f.carbs || 0,
        fat: f.fat || 0,
      })),
    })
  );

  // 4. Macro totals
  const todayCalories = todayTotals.calories || 0;
  const todayProtein = todayTotals.protein || 0;
  const todayCarbs = todayTotals.carbs || 0;
  const todayFat = todayTotals.fat || 0;
  const todayFiber = 0; // Placeholder — fiber tracking not yet available
  if (__DEV__) console.log(`[LLM:DataCollector] Today's macros — cal=${todayCalories}, prot=${todayProtein}g, carbs=${todayCarbs}g, fat=${todayFat}g, meals=${mealsWithTimestamps.length}`);

  // 5. Targets — resolve via macro cycling if active, else fall back to goal store
  const goalState = useGoalStore.getState();
  const activeGoal = goalState.activeGoal;
  const baseCalorieTarget = activeGoal?.currentTargetCalories || activeGoal?.initialTargetCalories || 2000;
  const baseProteinTarget = activeGoal?.currentProteinG || activeGoal?.initialProteinG || 150;
  const baseCarbTarget = goalState.carbGoal || computeCarbTarget(baseCalorieTarget, baseProteinTarget, goalState.fatGoal);
  const baseFatTarget = goalState.fatGoal || computeFatTarget(baseCalorieTarget, baseProteinTarget);
  const userGoal = activeGoal?.type || 'maintain';

  const cycleConfig = useMacroCycleStore.getState().config;
  let calorieTarget = baseCalorieTarget;
  let proteinTarget = baseProteinTarget;
  let carbTarget = baseCarbTarget;
  let fatTarget = baseFatTarget;

  if (cycleConfig?.enabled) {
    try {
      const baseTargets = { calories: baseCalorieTarget, protein: baseProteinTarget, carbs: baseCarbTarget, fat: baseFatTarget };
      const resolved = await macroCycleRepository.getTargetsForDate(today, baseTargets);
      calorieTarget = resolved.calories;
      proteinTarget = resolved.protein;
      carbTarget = resolved.carbs;
      fatTarget = resolved.fat;
    } catch {
      // Fall back to base targets on error
    }
  }
  if (__DEV__) console.log(`[LLM:DataCollector] Targets — cal=${calorieTarget}, prot=${proteinTarget}g, carbs=${carbTarget}g, fat=${fatTarget}g, goal=${userGoal}, hasActiveGoal=${!!activeGoal}`);

  // 6. Water
  const waterState = useWaterStore.getState();
  const waterTarget = waterState.goalGlasses * waterState.glassSizeMl;
  const todayWater = (waterState.todayLog?.glasses ?? 0) * waterState.glassSizeMl;
  if (__DEV__) console.log(`[LLM:DataCollector] Water — today=${todayWater}ml, target=${waterTarget}ml, glasses=${waterState.todayLog?.glasses ?? 0}/${waterState.goalGlasses}`);

  // 7. Weekly totals
  const weeklyDailyTotals: WeeklyDailyTotal[] = [];
  for (let i = 0; i < 7; i++) {
    const date = getDateString(i);
    const dayData = weeklyRawTotals.find((d) => d.date === date);
    weeklyDailyTotals.push({
      date,
      logged: dayData ? dayData.totals.calories > 0 : false,
      calories: dayData?.totals.calories || 0,
      protein: dayData?.totals.protein || 0,
      carbs: dayData?.totals.carbs || 0,
      fat: dayData?.totals.fat || 0,
    });
  }

  // 8. 7-day averages
  const daysWithData = weeklyDailyTotals.filter((d) => d.logged);
  const avgCalories7d =
    daysWithData.length > 0
      ? Math.round(daysWithData.reduce((sum, d) => sum + d.calories, 0) / daysWithData.length)
      : 0;
  const avgProtein7d =
    daysWithData.length > 0
      ? Math.round(daysWithData.reduce((sum, d) => sum + d.protein, 0) / daysWithData.length)
      : 0;

  // 9. Streaks
  const loggingStreak = computeLoggingStreak(weeklyDailyTotals);
  const calorieStreak = computeCalorieStreak(weeklyDailyTotals, calorieTarget);

  // 10. Days using app
  const firstLogDate = datesWithLogs.length > 0 ? datesWithLogs[datesWithLogs.length - 1] : today;
  const daysSinceFirstLog = Math.floor(
    (new Date(today).getTime() - new Date(firstLogDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysUsingApp = Math.max(1, daysSinceFirstLog + 1);

  // 11. Computed percentages
  const caloriePercent = safePercent(todayCalories, calorieTarget);
  const proteinPercent = safePercent(todayProtein, proteinTarget);
  const carbPercent = safePercent(todayCarbs, carbTarget);
  const fatPercent = safePercent(todayFat, fatTarget);
  const waterPercent = safePercent(todayWater, waterTarget);

  // 12. Day progress (6am-10pm = 16 waking hours)
  const wakingStart = 6;
  const wakingEnd = 22;
  const dayProgress = Math.max(0, Math.min(1, (currentHour - wakingStart) / (wakingEnd - wakingStart)));

  // 13. Deficiency alerts — empty for now, will be populated when micronutrient tracking matures
  const activeAlerts: DeficiencyCheck[] = [];

  if (__DEV__) console.log(`[LLM:DataCollector] Streaks — logging=${loggingStreak}, calorie=${calorieStreak}, daysUsingApp=${daysUsingApp}`);
  if (__DEV__) console.log(`[LLM:DataCollector] 7d averages — cal=${avgCalories7d}, prot=${avgProtein7d}g (from ${daysWithData.length} days with data)`);
  if (__DEV__) console.log(`[LLM:DataCollector] Percentages — cal=${caloriePercent}%, prot=${proteinPercent}%, carbs=${carbPercent}%, fat=${fatPercent}%, water=${waterPercent}%`);
  if (__DEV__) console.log(`[LLM:DataCollector] Day progress — ${(dayProgress * 100).toFixed(0)}% of waking hours, dayProgress=${dayProgress.toFixed(2)}`);
  if (__DEV__) console.log(`[LLM:DataCollector] collectDailyInsightData() — DONE in ${Date.now() - collectStart}ms`);

  return {
    todayCalories,
    todayProtein,
    todayCarbs,
    todayFat,
    todayFiber,
    calorieTarget,
    proteinTarget,
    carbTarget,
    fatTarget,
    waterTarget,
    todayWater,
    todayMealCount: mealsWithTimestamps.length,
    todayFoods,
    mealsWithTimestamps,
    avgCalories7d,
    avgProtein7d,
    loggingStreak,
    calorieStreak,
    userGoal,
    daysUsingApp,
    caloriePercent,
    proteinPercent,
    carbPercent,
    fatPercent,
    waterPercent,
    currentHour,
    dayProgress,
    activeAlerts,
    weeklyDailyTotals,
  };
}

function computeCarbTarget(calorieTarget: number, proteinTarget: number, fatGoal: number | null): number {
  const proteinCal = proteinTarget * 4;
  const fatCal = (fatGoal || computeFatTarget(calorieTarget, proteinTarget)) * 9;
  const remainingCal = Math.max(0, calorieTarget - proteinCal - fatCal);
  return Math.round(remainingCal / 4);
}

function computeFatTarget(calorieTarget: number, proteinTarget: number): number {
  // Default: 25% of calories from fat
  return Math.round((calorieTarget * 0.25) / 9);
}
