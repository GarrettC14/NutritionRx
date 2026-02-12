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
    const needsRefresh = shouldRefreshData();
    if (__DEV__) console.log(`[LLM:useDailyInsightData] Mount — shouldRefresh=${needsRefresh}`);
    if (needsRefresh) {
      if (__DEV__) console.log('[LLM:useDailyInsightData] Triggering refreshData on mount');
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
        const stale = !cache || Date.now() - cache.lastDataUpdate > 30000;
        if (__DEV__) console.log(`[LLM:useDailyInsightData] Food log changed — stale=${stale}, lastUpdate=${cache ? ((Date.now() - cache.lastDataUpdate) / 1000).toFixed(0) + 's ago' : 'none'}`);
        if (stale) {
          if (__DEV__) console.log('[LLM:useDailyInsightData] Triggering refreshData due to food log change');
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
        const stale = !cache || Date.now() - cache.lastDataUpdate > 30000;
        if (__DEV__) console.log(`[LLM:useDailyInsightData] Water log changed — stale=${stale}`);
        if (stale) {
          if (__DEV__) console.log('[LLM:useDailyInsightData] Triggering refreshData due to water change');
          refreshData();
        }
      }
    });
    return unsub;
  }, [refreshData]);

  const isLoaded = cache?.date === new Date().toISOString().split('T')[0];
  if (__DEV__) console.log(`[LLM:useDailyInsightData] Render — isLoaded=${isLoaded}, hasData=${!!cache?.data}, cacheDate=${cache?.date}`);

  return {
    data: cache?.data ?? null,
    headline: getHeadline(),
    suggestedQuestions: getSuggestedQuestions(),
    isLoaded,
  };
}
