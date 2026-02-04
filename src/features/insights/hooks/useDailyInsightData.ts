/**
 * useDailyInsightData Hook
 * Keeps daily insight data fresh by subscribing to food/water changes.
 * Use in the widget and the daily insights screen.
 */

import { useEffect } from 'react';
import { useDailyInsightStore } from '../stores/dailyInsightStore';
import { useFoodLogStore } from '@/stores/foodLogStore';
import { useWaterStore } from '@/stores/waterStore';

export function useDailyInsightData() {
  const {
    refreshData,
    shouldRefreshData,
    cache,
    getHeadline,
    getSuggestedQuestions,
  } = useDailyInsightStore();

  // Refresh on mount if stale
  useEffect(() => {
    if (shouldRefreshData()) {
      refreshData();
    }
  }, []);

  // Subscribe to food log changes
  useEffect(() => {
    const unsub = useFoodLogStore.subscribe((state, prevState) => {
      if (
        state.entries !== prevState.entries ||
        state.dailyTotals !== prevState.dailyTotals
      ) {
        const { cache } = useDailyInsightStore.getState();
        if (!cache || Date.now() - cache.lastDataUpdate > 30000) {
          refreshData();
        }
      }
    });
    return unsub;
  }, [refreshData]);

  // Subscribe to water changes
  useEffect(() => {
    const unsub = useWaterStore.subscribe((state, prevState) => {
      if (state.todayLog !== prevState.todayLog) {
        const { cache } = useDailyInsightStore.getState();
        if (!cache || Date.now() - cache.lastDataUpdate > 30000) {
          refreshData();
        }
      }
    });
    return unsub;
  }, [refreshData]);

  return {
    data: cache?.data ?? null,
    headline: getHeadline(),
    suggestedQuestions: getSuggestedQuestions(),
    isLoaded: cache?.date === new Date().toISOString().split('T')[0],
  };
}
