/**
 * useInsightsData Hook
 * Collects and aggregates nutrition data for insight generation
 */

import { useCallback, useEffect, useState } from 'react';
import { logEntryRepository, waterRepository } from '@/repositories';
import { useGoalStore } from '@/stores/goalStore';
import { useWaterStore } from '@/stores/waterStore';
import type { InsightInputData, NutrientDailyData } from '../types/insights.types';

interface UseInsightsDataResult {
  data: InsightInputData | null;
  nutrientData: NutrientDailyData[];
  isLoading: boolean;
  error: string | null;
  daysUsingApp: number;
  daysSinceLastLog: number;
  refresh: () => Promise<void>;
}

function getDateString(daysAgo: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function calculateStreak(dailyData: { date: string; met: boolean }[]): number {
  let streak = 0;
  // Start from today or yesterday if today has no data
  for (let i = 0; i < dailyData.length; i++) {
    if (dailyData[i].met) {
      streak++;
    } else if (i === 0 && !dailyData[i].met) {
      // If today doesn't meet, check if it's just early in the day
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function useInsightsData(): UseInsightsDataResult {
  const [data, setData] = useState<InsightInputData | null>(null);
  const [nutrientData, setNutrientData] = useState<NutrientDailyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysUsingApp, setDaysUsingApp] = useState(0);
  const [daysSinceLastLog, setDaysSinceLastLog] = useState(0);

  const { activeGoal } = useGoalStore();
  const { goalGlasses, glassSizeMl, todayLog } = useWaterStore();

  const refresh = useCallback(async () => {
    if (!activeGoal) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const today = getDateString(0);
      const sevenDaysAgo = getDateString(6);

      // Fetch data in parallel
      const [todayTotals, weeklyTotals, todayEntries, datesWithLogs] = await Promise.all([
        logEntryRepository.getDailyTotals(today),
        logEntryRepository.getDailyTotalsForRange(sevenDaysAgo, today),
        logEntryRepository.findByDate(today),
        logEntryRepository.getDatesWithLogs(),
      ]);

      // Calculate days using app
      const firstLogDate = datesWithLogs.length > 0 ? datesWithLogs[datesWithLogs.length - 1] : today;
      const daysSinceFirstLog = Math.floor(
        (new Date(today).getTime() - new Date(firstLogDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      setDaysUsingApp(Math.max(1, daysSinceFirstLog + 1));

      // Calculate days since last log
      const lastLogDate = datesWithLogs.length > 0 ? datesWithLogs[0] : null;
      const daysSinceLast = lastLogDate
        ? Math.floor((new Date(today).getTime() - new Date(lastLogDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      setDaysSinceLastLog(daysSinceLast);

      // Get targets from active goal
      const calorieTarget = activeGoal.currentTargetCalories || activeGoal.initialTargetCalories;
      const proteinTarget = activeGoal.currentProteinG || activeGoal.initialProteinG;
      const userGoal = activeGoal.type;

      // Calculate 7-day averages
      const daysWithData = weeklyTotals.filter((d) => d.totals.calories > 0);
      const avgCalories7d =
        daysWithData.length > 0
          ? Math.round(daysWithData.reduce((sum, d) => sum + d.totals.calories, 0) / daysWithData.length)
          : 0;
      const avgProtein7d =
        daysWithData.length > 0
          ? Math.round(daysWithData.reduce((sum, d) => sum + d.totals.protein, 0) / daysWithData.length)
          : 0;

      // Calculate logging streak
      const loggingData = [];
      for (let i = 0; i < 7; i++) {
        const date = getDateString(i);
        const dayData = weeklyTotals.find((d) => d.date === date);
        loggingData.push({
          date,
          met: dayData ? dayData.totals.calories > 0 : false,
        });
      }
      const loggingStreak = calculateStreak(loggingData);

      // Calculate calorie streak (within 10% of target)
      const calorieData = [];
      for (let i = 0; i < 7; i++) {
        const date = getDateString(i);
        const dayData = weeklyTotals.find((d) => d.date === date);
        if (dayData && dayData.totals.calories > 0) {
          const withinTarget = Math.abs(dayData.totals.calories - calorieTarget) / calorieTarget <= 0.1;
          calorieData.push({ date, met: withinTarget });
        }
      }
      const calorieStreak = calorieData.filter((d) => d.met).length;

      // Get food names from today's entries
      const todayFoods = todayEntries
        .map((entry) => entry.foodName)
        .filter((name): name is string => typeof name === 'string' && name.length > 0);

      // Calculate water data
      const waterTarget = goalGlasses * glassSizeMl;
      const todayWater = (todayLog?.glasses ?? 0) * glassSizeMl;

      // Build nutrient daily data for deficiency calculations
      const nutrientDailyData: NutrientDailyData[] = weeklyTotals.map((d) => ({
        date: d.date,
        hasData: d.totals.calories > 0,
        nutrients: {
          // For now, we only have macro data from log entries
          // Micronutrient tracking would require additional database fields
          fiber: 0, // Placeholder - would need fiber tracking
        },
      }));
      setNutrientData(nutrientDailyData);

      const insightData: InsightInputData = {
        todayCalories: todayTotals.calories,
        todayProtein: todayTotals.protein,
        todayCarbs: todayTotals.carbs,
        todayFat: todayTotals.fat,
        todayFiber: 0, // Placeholder
        todayWater,
        todayMealCount: todayEntries.length,
        todayFoods: todayFoods.slice(0, 10),
        calorieTarget,
        proteinTarget,
        waterTarget,
        avgCalories7d,
        avgProtein7d,
        loggingStreak,
        calorieStreak,
        daysUsingApp: Math.max(1, daysSinceFirstLog + 1),
        userGoal,
      };

      setData(insightData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load insights data';
      setError(errorMessage);
      console.error('[useInsightsData] Error:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [activeGoal, goalGlasses, glassSizeMl, todayLog]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    nutrientData,
    isLoading,
    error,
    daysUsingApp,
    daysSinceLastLog,
    refresh,
  };
}
