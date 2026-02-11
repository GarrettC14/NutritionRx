/**
 * useWeeklyData Hook
 * Wraps WeeklyDataCollector, memoized by week start date
 */

import { useState, useEffect, useCallback } from 'react';
import type { WeeklyCollectedData } from '../types/weeklyInsights.types';
import { WeeklyDataCollector } from '../services/WeeklyDataCollector';
import { useWeeklyInsightsStore } from '../stores/weeklyInsightsStore';

interface UseWeeklyDataResult {
  data: WeeklyCollectedData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWeeklyData(): UseWeeklyDataResult {
  const weekStart = useWeeklyInsightsStore((s) => s.getEffectiveWeekStart());
  const [data, setData] = useState<WeeklyCollectedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const collected = await WeeklyDataCollector.collect(weekStart);
      setData(collected);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load weekly data';
      setError(message);
      if (__DEV__) console.error('[LLM:WeeklyHook] Error:', message);
    } finally {
      setIsLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}
