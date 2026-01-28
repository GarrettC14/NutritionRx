/**
 * useShortcuts Hook
 * Handles Siri Shortcut donations for frequently used actions
 */

import { useCallback } from 'react';
import { Platform, NativeModules } from 'react-native';
import {
  ShortcutType,
  ShortcutDonation,
  ShortcutDonationData,
} from '@/types/voiceAssistant';
import { MealType } from '@/constants/mealTypes';
import { getCurrentMealPeriod } from '@/services/voiceAssistant';

const { ShortcutsBridge } = NativeModules;

/**
 * Main shortcuts hook
 */
export function useShortcuts() {
  /**
   * Donate a shortcut to Siri
   * Only works on iOS 16+
   */
  const donateShortcut = useCallback(
    async <T extends ShortcutType>(
      donation: ShortcutDonation<T>
    ): Promise<boolean> => {
      // Only available on iOS
      if (Platform.OS !== 'ios') {
        return false;
      }

      // Check if native module is available
      if (!ShortcutsBridge?.donateShortcut) {
        console.warn('ShortcutsBridge not available');
        return false;
      }

      try {
        const result = await ShortcutsBridge.donateShortcut(
          donation.type,
          donation.data
        );
        return result?.success ?? false;
      } catch (error) {
        console.error('Shortcut donation failed:', error);
        return false;
      }
    },
    []
  );

  return { donateShortcut };
}

/**
 * Hook for water logging shortcuts
 */
export function useWaterShortcutDonation() {
  const { donateShortcut } = useShortcuts();

  const donateAfterWaterLog = useCallback(
    async (amount: number = 1) => {
      await donateShortcut({
        type: 'LOG_WATER',
        data: { amount },
      });
    },
    [donateShortcut]
  );

  return { donateAfterWaterLog };
}

/**
 * Hook for quick add shortcuts
 */
export function useQuickAddShortcutDonation() {
  const { donateShortcut } = useShortcuts();

  const donateAfterQuickAdd = useCallback(
    async (calories: number, meal?: MealType | string) => {
      await donateShortcut({
        type: 'QUICK_ADD',
        data: {
          calories,
          meal: meal || getCurrentMealPeriod(),
        },
      });
    },
    [donateShortcut]
  );

  return { donateAfterQuickAdd };
}

/**
 * Hook for calorie query shortcuts
 */
export function useCalorieQueryShortcutDonation() {
  const { donateShortcut } = useShortcuts();

  const donateAfterCalorieQuery = useCallback(async () => {
    await donateShortcut({
      type: 'QUERY_CALORIES',
      data: {},
    });
  }, [donateShortcut]);

  return { donateAfterCalorieQuery };
}

/**
 * Hook for macro query shortcuts
 */
export function useMacroQueryShortcutDonation() {
  const { donateShortcut } = useShortcuts();

  const donateAfterMacroQuery = useCallback(
    async (macroType: 'protein' | 'carbs' | 'fat') => {
      await donateShortcut({
        type: 'QUERY_MACROS',
        data: { macroType },
      });
    },
    [donateShortcut]
  );

  return { donateAfterMacroQuery };
}

/**
 * Hook for weight logging shortcuts
 */
export function useWeightShortcutDonation() {
  const { donateShortcut } = useShortcuts();

  const donateAfterWeightLog = useCallback(
    async (weight: number, unit: 'pounds' | 'kilograms') => {
      await donateShortcut({
        type: 'LOG_WEIGHT',
        data: { weight, unit },
      });
    },
    [donateShortcut]
  );

  return { donateAfterWeightLog };
}

/**
 * Hook for food logging shortcuts (donated after logging same food 3+ times)
 */
export function useFoodLogShortcutDonation() {
  const { donateShortcut } = useShortcuts();

  const donateFrequentFoodShortcut = useCallback(
    async (foodId: string, foodName: string) => {
      await donateShortcut({
        type: 'LOG_FOOD',
        data: { foodId, foodName },
      });
    },
    [donateShortcut]
  );

  return { donateFrequentFoodShortcut };
}
