/**
 * Weekly Data Collector
 * Gathers all data needed for weekly analysis from existing repositories/stores
 */

import { logEntryRepository, waterRepository } from '@/repositories';
import { useGoalStore } from '@/stores/goalStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWaterStore } from '@/stores/waterStore';
import { useFoodLogStore } from '@/stores/foodLogStore';
import type { DayData, WeeklyCollectedData } from '../types/weeklyInsights.types';
import { addDays, getWeekEnd, getDayName, getDayOfWeek } from '../utils/weekUtils';
import { mean } from '../utils/statisticsUtils';

export class WeeklyDataCollector {
  /**
   * Collect all data for a given week. Full collection includes
   * meal counts, food names, water, and prior week data.
   */
  static async collect(weekStartDate: string): Promise<WeeklyCollectedData> {
    console.log(`[LLM:WeeklyData] collect() called — weekStart=${weekStartDate}`);
    const weekEndDate = getWeekEnd(weekStartDate);

    // Gather targets from stores
    const { calorieGoal, proteinGoal } = useGoalStore.getState();
    const settings = useSettingsStore.getState().settings;
    const { goalGlasses, glassSizeMl } = useWaterStore.getState();
    const { streak } = useFoodLogStore.getState();

    const calorieTarget = calorieGoal ?? settings.dailyCalorieGoal ?? 2000;
    const proteinTarget = proteinGoal ?? settings.dailyProteinGoal ?? 150;
    const waterTargetMl = goalGlasses * glassSizeMl;
    console.log(`[LLM:WeeklyData] Targets — cal=${calorieTarget}, protein=${proteinTarget}, waterMl=${waterTargetMl}`);

    // Fetch data from repositories
    const [dailyTotalsRange, logEntries, waterLogs] = await Promise.all([
      logEntryRepository.getDailyTotalsForRange(weekStartDate, weekEndDate),
      logEntryRepository.findByDateRange(weekStartDate, weekEndDate),
      waterRepository.getLogsByDateRange(weekStartDate, weekEndDate),
    ]);

    // Build a map of daily totals by date
    const totalsMap = new Map(dailyTotalsRange.map((dt) => [dt.date, dt.totals]));

    // Build a map of entries by date for meal counts and food names
    const entriesByDate = new Map<string, typeof logEntries>();
    for (const entry of logEntries) {
      const existing = entriesByDate.get(entry.date) ?? [];
      existing.push(entry);
      entriesByDate.set(entry.date, existing);
    }

    // Build a map of water by date
    const waterByDate = new Map(waterLogs.map((w) => [w.date, w]));

    // Build day-by-day data
    const days: DayData[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStartDate, i);
      const dayOfWeek = getDayOfWeek(date);
      const totals = totalsMap.get(date);
      const dateEntries = entriesByDate.get(date) ?? [];
      const waterLog = waterByDate.get(date);
      const mealCount = dateEntries.length;
      const waterMl = waterLog ? waterLog.glasses * glassSizeMl : 0;

      const foods: string[] = [];
      for (const entry of dateEntries) {
        if (entry.foodItemId) {
          foods.push(entry.foodItemId);
        }
      }

      days.push({
        date,
        dayOfWeek,
        dayName: getDayName(dayOfWeek),
        isLogged: mealCount > 0,
        isComplete: mealCount >= 2,
        calories: totals?.calories ?? 0,
        protein: totals?.protein ?? 0,
        carbs: totals?.carbs ?? 0,
        fat: totals?.fat ?? 0,
        fiber: 0, // Not available in current data pipeline
        water: waterMl,
        mealCount,
        foods,
      });
    }

    const loggedDays = days.filter((d) => d.isLogged);
    const loggedDayCount = loggedDays.length;
    console.log(`[LLM:WeeklyData] Built ${days.length} days, ${loggedDayCount} logged, ${days.filter((d) => d.isComplete).length} complete`);

    // Compute averages from logged days only
    const avgCalories = mean(loggedDays.map((d) => d.calories));
    const avgProtein = mean(loggedDays.map((d) => d.protein));
    const avgCarbs = mean(loggedDays.map((d) => d.carbs));
    const avgFat = mean(loggedDays.map((d) => d.fat));
    const avgWater = mean(loggedDays.map((d) => d.water));
    const avgMealCount = mean(loggedDays.map((d) => d.mealCount));
    const totalMeals = loggedDays.reduce((sum, d) => sum + d.mealCount, 0);

    // Fetch prior weeks for comparison
    const priorWeekStart = addDays(weekStartDate, -7);
    const twoWeeksAgoStart = addDays(weekStartDate, -14);

    const [priorWeek, twoWeeksAgo] = await Promise.all([
      WeeklyDataCollector.collectBasic(priorWeekStart),
      WeeklyDataCollector.collectBasic(twoWeeksAgoStart),
    ]);
    console.log(`[LLM:WeeklyData] Prior weeks — priorWeek=${priorWeek ? `${priorWeek.loggedDayCount} days` : 'null'}, twoWeeksAgo=${twoWeeksAgo ? `${twoWeeksAgo.loggedDayCount} days` : 'null'}`);
    console.log(`[LLM:WeeklyData] Averages — cal=${Math.round(avgCalories)}, protein=${Math.round(avgProtein)}, carbs=${Math.round(avgCarbs)}, fat=${Math.round(avgFat)}, water=${Math.round(avgWater)}, meals=${avgMealCount.toFixed(1)}, totalMeals=${totalMeals}`);

    return {
      weekStartDate,
      weekEndDate,
      days,
      loggedDayCount,
      completeDayCount: days.filter((d) => d.isComplete).length,
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      avgFiber: 0,
      avgWater,
      avgMealCount,
      totalMeals,
      calorieTarget,
      proteinTarget,
      waterTarget: waterTargetMl,
      priorWeek,
      twoWeeksAgo,
      deficiencyAlerts: [],
      dataConfidence: loggedDayCount / 7,
      loggingStreak: streak ?? 0,
    };
  }

  /**
   * Lightweight collection for prior weeks - only daily totals, no individual entries.
   * Returns null if no data found.
   */
  static async collectBasic(weekStartDate: string): Promise<WeeklyCollectedData | null> {
    console.log(`[LLM:WeeklyData] collectBasic() called — weekStart=${weekStartDate}`);
    const weekEndDate = getWeekEnd(weekStartDate);

    const { calorieGoal, proteinGoal } = useGoalStore.getState();
    const settings = useSettingsStore.getState().settings;
    const { goalGlasses, glassSizeMl } = useWaterStore.getState();

    const calorieTarget = calorieGoal ?? settings.dailyCalorieGoal ?? 2000;
    const proteinTarget = proteinGoal ?? settings.dailyProteinGoal ?? 150;
    const waterTargetMl = goalGlasses * glassSizeMl;

    const dailyTotalsRange = await logEntryRepository.getDailyTotalsForRange(
      weekStartDate,
      weekEndDate
    );

    const totalsMap = new Map(dailyTotalsRange.map((dt) => [dt.date, dt.totals]));

    const days: DayData[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStartDate, i);
      const dayOfWeek = getDayOfWeek(date);
      const totals = totalsMap.get(date);
      const hasData = totals != null && (totals.calories > 0 || totals.protein > 0);

      days.push({
        date,
        dayOfWeek,
        dayName: getDayName(dayOfWeek),
        isLogged: hasData,
        isComplete: hasData,
        calories: totals?.calories ?? 0,
        protein: totals?.protein ?? 0,
        carbs: totals?.carbs ?? 0,
        fat: totals?.fat ?? 0,
        fiber: 0,
        water: 0,
        mealCount: hasData ? 1 : 0, // Approximation for basic collection
        foods: [],
      });
    }

    const loggedDays = days.filter((d) => d.isLogged);
    const loggedDayCount = loggedDays.length;

    if (loggedDayCount === 0) {
      console.log(`[LLM:WeeklyData] collectBasic → null (no logged days for ${weekStartDate})`);
      return null;
    }

    return {
      weekStartDate,
      weekEndDate,
      days,
      loggedDayCount,
      completeDayCount: loggedDayCount,
      avgCalories: mean(loggedDays.map((d) => d.calories)),
      avgProtein: mean(loggedDays.map((d) => d.protein)),
      avgCarbs: mean(loggedDays.map((d) => d.carbs)),
      avgFat: mean(loggedDays.map((d) => d.fat)),
      avgFiber: 0,
      avgWater: 0,
      avgMealCount: 0,
      totalMeals: 0,
      calorieTarget,
      proteinTarget,
      waterTarget: waterTargetMl,
      priorWeek: null,
      twoWeeksAgo: null,
      deficiencyAlerts: [],
      dataConfidence: loggedDayCount / 7,
      loggingStreak: 0,
    };
  }
}
