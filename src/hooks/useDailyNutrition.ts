/**
 * Hook for accessing daily nutrition data
 * Wraps foodLogStore to provide a clean interface for dashboard widgets
 */

import { useMemo } from 'react';
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
  const entries = useFoodLogStore((state) => state.entries);
  const quickAddEntries = useFoodLogStore((state) => state.quickAddEntries);
  const getEntriesByMeal = useFoodLogStore((state) => state.getEntriesByMeal);
  const isLoading = useFoodLogStore((state) => state.isLoading);
  const isLoaded = useFoodLogStore((state) => state.isLoaded);

  const entriesByMeal = useMemo(() => getEntriesByMeal(), [entries, quickAddEntries]);

  return useMemo(() => ({
    totals: dailyTotals,
    entriesByMeal,
    isLoading,
    isLoaded,
  }), [dailyTotals, entriesByMeal, isLoading, isLoaded]);
}
