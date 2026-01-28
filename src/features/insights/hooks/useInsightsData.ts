/**
 * useInsightsData Hook
 * Gathers all data needed for LLM insight generation
 */

import { useCallback, useMemo } from 'react';
import { logEntryRepository } from '@/repositories';
import { useFoodLogStore } from '@/stores/foodLogStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGoalStore } from '@/stores/goalStore';
import { useWaterStore } from '@/stores/waterStore';
import type { InsightInputData } from '../types/insights.types';

// Default fiber target (not tracked separately in settings)
const DEFAULT_FIBER_TARGET = 28;

/**
 * Get date string in YYYY-MM-DD format
 */
function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days ago
 */
function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Calculate hash of input data for caching
 */
export function calculateInputHash(data: InsightInputData): string {
  const hashInput = JSON.stringify({
    todayCalories: data.todayCalories,
    todayProtein: data.todayProtein,
    todayCarbs: data.todayCarbs,
    todayFat: data.todayFat,
    todayFoods: data.todayFoods.sort(),
    todayMealCount: data.todayMealCount,
  });
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

export function useInsightsData() {
  const { entries, quickAddEntries, dailyTotals, streak, selectedDate } = useFoodLogStore();
  const { settings } = useSettingsStore();
  const { activeGoal } = useGoalStore();
  const { todayLog, goalGlasses, glassSizeMl } = useWaterStore();

  /**
   * Get 7-day averages from logged data
   */
  const get7DayAverages = useCallback(async () => {
    const endDate = getDateString();
    const startDate = getDateString(getDateDaysAgo(6)); // 7 days including today

    try {
      const dailyData = await logEntryRepository.getDailyTotalsForRange(startDate, endDate);

      if (dailyData.length === 0) {
        return {
          avgCalories7d: 0,
          avgProtein7d: 0,
          daysWithData: 0,
        };
      }

      const totalCalories = dailyData.reduce((sum, d) => sum + d.totals.calories, 0);
      const totalProtein = dailyData.reduce((sum, d) => sum + d.totals.protein, 0);

      return {
        avgCalories7d: Math.round(totalCalories / dailyData.length),
        avgProtein7d: Math.round(totalProtein / dailyData.length),
        daysWithData: dailyData.length,
      };
    } catch (error) {
      console.error('Error getting 7-day averages:', error);
      return {
        avgCalories7d: 0,
        avgProtein7d: 0,
        daysWithData: 0,
      };
    }
  }, []);

  /**
   * Calculate calorie streak (days meeting calorie target)
   */
  const getCalorieStreak = useCallback(async () => {
    const endDate = getDateString();
    const startDate = getDateString(getDateDaysAgo(29)); // Last 30 days

    try {
      const dailyData = await logEntryRepository.getDailyTotalsForRange(startDate, endDate);
      const calorieTarget = settings.dailyCalorieGoal;
      const tolerance = calorieTarget * 0.1; // 10% tolerance

      let streak = 0;
      const today = getDateString();

      // Sort by date descending
      const sortedData = dailyData.sort((a, b) => b.date.localeCompare(a.date));

      for (const day of sortedData) {
        const diff = Math.abs(day.totals.calories - calorieTarget);
        if (diff <= tolerance) {
          streak++;
        } else if (day.date !== today) {
          // Break streak if not today (give today a pass)
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating calorie streak:', error);
      return 0;
    }
  }, [settings.dailyCalorieGoal]);

  /**
   * Calculate protein streak (days meeting protein target)
   */
  const getProteinStreak = useCallback(async () => {
    const endDate = getDateString();
    const startDate = getDateString(getDateDaysAgo(29));

    try {
      const dailyData = await logEntryRepository.getDailyTotalsForRange(startDate, endDate);
      const proteinTarget = settings.dailyProteinGoal;
      const tolerance = proteinTarget * 0.1;

      let streak = 0;
      const today = getDateString();

      const sortedData = dailyData.sort((a, b) => b.date.localeCompare(a.date));

      for (const day of sortedData) {
        const diff = Math.abs(day.totals.protein - proteinTarget);
        if (diff <= tolerance || day.totals.protein >= proteinTarget) {
          streak++;
        } else if (day.date !== today) {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating protein streak:', error);
      return 0;
    }
  }, [settings.dailyProteinGoal]);

  /**
   * Get first log date to calculate days using app
   */
  const getDaysUsingApp = useCallback(async () => {
    try {
      const dates = await logEntryRepository.getDatesWithLogs();
      if (dates.length === 0) return 0;

      // dates are sorted descending, so last is earliest
      const earliestDate = dates[dates.length - 1];
      const earliest = new Date(earliestDate + 'T12:00:00');
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - earliest.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      console.error('Error getting days using app:', error);
      return 0;
    }
  }, []);

  /**
   * Extract unique food names from today's entries
   */
  const todayFoods = useMemo(() => {
    const foodNames = entries.map((e) => e.foodName).filter(Boolean);
    const quickAddDescriptions = quickAddEntries.map((e) => e.description).filter(Boolean);
    return [...new Set([...foodNames, ...quickAddDescriptions])];
  }, [entries, quickAddEntries]);

  /**
   * Calculate today's meal count
   */
  const todayMealCount = useMemo(() => {
    const mealsWithFood = new Set<string>();
    entries.forEach((e) => mealsWithFood.add(e.mealType));
    quickAddEntries.forEach((e) => mealsWithFood.add(e.mealType));
    return mealsWithFood.size;
  }, [entries, quickAddEntries]);

  /**
   * Get user goal type from active goal
   */
  const userGoal = useMemo((): 'lose' | 'maintain' | 'gain' => {
    if (!activeGoal) return 'maintain';
    return activeGoal.type as 'lose' | 'maintain' | 'gain';
  }, [activeGoal]);

  /**
   * Calculate today's water intake in ml
   */
  const todayWater = useMemo(() => {
    return (todayLog?.glasses ?? 0) * glassSizeMl;
  }, [todayLog, glassSizeMl]);

  /**
   * Calculate water target in ml
   */
  const waterTarget = useMemo(() => {
    return goalGlasses * glassSizeMl;
  }, [goalGlasses, glassSizeMl]);

  /**
   * Gather all insight input data
   */
  const gatherInsightData = useCallback(async (): Promise<InsightInputData> => {
    const [averages, calorieStreak, proteinStreak, daysUsingApp] = await Promise.all([
      get7DayAverages(),
      getCalorieStreak(),
      getProteinStreak(),
      getDaysUsingApp(),
    ]);

    return {
      // Today's data
      todayCalories: dailyTotals.calories,
      todayProtein: dailyTotals.protein,
      todayCarbs: dailyTotals.carbs,
      todayFat: dailyTotals.fat,
      todayFiber: 0, // Fiber tracking not yet implemented
      todayWater,
      todayMealCount,
      todayFoods,

      // Targets
      calorieTarget: settings.dailyCalorieGoal,
      proteinTarget: settings.dailyProteinGoal,
      carbTarget: settings.dailyCarbsGoal,
      fatTarget: settings.dailyFatGoal,
      fiberTarget: DEFAULT_FIBER_TARGET,
      waterTarget,

      // Trends
      avgCalories7d: averages.avgCalories7d,
      avgProtein7d: averages.avgProtein7d,
      calorieStreak,
      proteinStreak,
      loggingStreak: streak,

      // User context
      userGoal,
      daysUsingApp,
    };
  }, [
    dailyTotals,
    todayWater,
    todayMealCount,
    todayFoods,
    settings,
    waterTarget,
    streak,
    userGoal,
    get7DayAverages,
    getCalorieStreak,
    getProteinStreak,
    getDaysUsingApp,
  ]);

  /**
   * Check if we have enough data for insights
   */
  const hasEnoughData = useMemo(() => {
    return entries.length > 0 || quickAddEntries.length > 0;
  }, [entries, quickAddEntries]);

  return {
    gatherInsightData,
    hasEnoughData,
    todayFoods,
    todayMealCount,
    todayWater,
    selectedDate,
  };
}
