/**
 * Hook for accessing daily nutrition data
 * Wraps foodLogStore to provide a clean interface for dashboard widgets
 */

import { useFoodLogStore } from '@/stores';
import { DailyTotals, LogEntry } from '@/types/domain';
import { MealType } from '@/constants/mealTypes';

interface DailyNutritionData {
  totals: DailyTotals;
  entriesByMeal: Record<MealType, LogEntry[]>;
  isLoading: boolean;
  isLoaded: boolean;
}

export function useDailyNutrition(): DailyNutritionData {
  const dailyTotals = useFoodLogStore((state) => state.dailyTotals);
  const getEntriesByMeal = useFoodLogStore((state) => state.getEntriesByMeal);
  const isLoading = useFoodLogStore((state) => state.isLoading);
  const isLoaded = useFoodLogStore((state) => state.isLoaded);

  return {
    totals: dailyTotals,
    entriesByMeal: getEntriesByMeal(),
    isLoading,
    isLoaded,
  };
}
