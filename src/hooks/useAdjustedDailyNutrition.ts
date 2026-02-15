/**
 * Adjusted Daily Nutrition Hook
 * Wraps useDailyNutrition to optionally recalculate calories from macros
 * based on the user's calorie calculation method setting.
 */

import { useMemo } from 'react';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useSettingsStore } from '@/stores/settingsStore';
import { calculateMacroCalories } from '@/utils/calculateMacroCalories';

export function useAdjustedDailyNutrition(
  ...args: Parameters<typeof useDailyNutrition>
): ReturnType<typeof useDailyNutrition> {
  const daily = useDailyNutrition(...args);
  const method = useSettingsStore((s) => s.settings.calorieCalculationMethod);

  return useMemo(() => {
    if (method === 'label') return daily;

    const allEntries = Object.values(daily.entriesByMeal ?? {}).flat();

    // Macro-calculated calories for log entries
    const macroCalories = allEntries.reduce(
      (sum, e) =>
        sum +
        calculateMacroCalories(
          e.protein ?? 0,
          e.carbs ?? 0,
          e.fat ?? 0,
          0 // fiber not available on entry types
        ),
      0
    );

    // Label calories from those same entries
    const labelCaloriesFromEntries = allEntries.reduce(
      (sum, e) => sum + (e.calories ?? 0),
      0
    );

    // Quick-add calories = totals minus individual entry label calories
    // These are user-provided and should NOT be recalculated
    const quickAddCalories = Math.max(
      0,
      (daily.totals?.calories ?? 0) - labelCaloriesFromEntries
    );

    return {
      ...daily,
      totals: {
        ...daily.totals,
        calories: macroCalories + quickAddCalories,
      },
    };
  }, [daily, method]);
}
