import { useMemo } from 'react';
import { DEFAULT_MEAL_CONFIGS, MealTypeConfig } from '@/constants/mealTypes';
import { useSettingsStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';

/**
 * Returns an ordered array of meal type configs:
 * 4 default meal types + any active custom meal types, sorted by sortOrder.
 */
export function useMealTypes(): MealTypeConfig[] {
  const customMealTypes = useSettingsStore(
    useShallow((s) => s.customMealTypes),
  );

  return useMemo(() => {
    const all: MealTypeConfig[] = [
      ...DEFAULT_MEAL_CONFIGS,
      ...customMealTypes
        .filter((c) => c.isActive)
        .map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon || '🍽',
          sortOrder: c.sortOrder,
          isDefault: false,
          isActive: true,
        })),
    ];
    return all.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [customMealTypes]);
}
