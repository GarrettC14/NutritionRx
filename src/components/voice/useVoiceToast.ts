/**
 * useVoiceToast Hook
 * Manages toast state for voice command feedback
 *
 * Follows "Nourished Calm" design philosophy with
 * soft cream background, sage green icons, terracotta accents
 */

import { useState, useCallback, useRef } from 'react';
import { VoiceToastState, VoiceToastData, WeightUnit } from '@/types/voiceAssistant';
import { capitalizeFirst } from '@/services/voiceAssistant';

const INITIAL_STATE: VoiceToastState = {
  visible: false,
  icon: '',
  title: '',
  subtitle: undefined,
};

export function useVoiceToast() {
  const [toastState, setToastState] = useState<VoiceToastState>(INITIAL_STATE);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Show a toast with custom content
   */
  const showToast = useCallback((data: VoiceToastData) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToastState({
      visible: true,
      icon: data.icon,
      title: data.title,
      subtitle: data.subtitle,
    });
  }, []);

  /**
   * Hide the toast
   */
  const hideToast = useCallback(() => {
    setToastState((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  /**
   * Show water added toast
   * Icon: 💧
   * Title: "+1 Water" or "+3 Water"
   * Subtitle: "5 of 8"
   */
  const showWaterAddedToast = useCallback(
    (glassesAdded: number, totalGlasses: number, goal: number) => {
      showToast({
        icon: 'water-outline',
        title: `+${glassesAdded} Water`,
        subtitle: `${totalGlasses} of ${goal}`,
      });
    },
    [showToast]
  );

  /**
   * Show quick add toast
   * Icon: ✓
   * Title: "+400 cal"
   * Subtitle: "Lunch"
   */
  const showQuickAddToast = useCallback(
    (calories: number, meal: string) => {
      showToast({
        icon: 'checkmark-outline',
        title: `+${calories} cal`,
        subtitle: capitalizeFirst(meal),
      });
    },
    [showToast]
  );

  /**
   * Show weight logged toast
   * Icon: ⚖️
   * Title: "175 lbs" or "79.5 kg"
   * Subtitle: "Weight logged"
   */
  const showWeightLoggedToast = useCallback(
    (weight: number, unit: WeightUnit) => {
      const formattedWeight =
        unit === 'pounds' ? Math.round(weight).toString() : weight.toFixed(1);
      const unitLabel = unit === 'pounds' ? 'lbs' : 'kg';

      showToast({
        icon: 'scale-outline',
        title: `${formattedWeight} ${unitLabel}`,
        subtitle: 'Weight logged',
      });
    },
    [showToast]
  );

  /**
   * Show calorie query toast
   * Icon: 🔥
   * Title: "1,450 cal"
   * Subtitle: "Today"
   */
  const showCalorieQueryToast = useCallback(
    (calories: number) => {
      showToast({
        icon: 'flame-outline',
        title: `${calories.toLocaleString()} cal`,
        subtitle: 'Today',
      });
    },
    [showToast]
  );

  /**
   * Show macro query toast
   * Icon: 📊
   * Title: "85g protein"
   * Subtitle: "Today"
   */
  const showMacroQueryToast = useCallback(
    (macroType: string, amount: number) => {
      showToast({
        icon: 'bar-chart-outline',
        title: `${Math.round(amount)}g ${macroType}`,
        subtitle: 'Today',
      });
    },
    [showToast]
  );

  /**
   * Show water query toast
   * Icon: 💧
   * Title: "5 glasses"
   * Subtitle: "Today"
   */
  const showWaterQueryToast = useCallback(
    (glasses: number, goal: number) => {
      showToast({
        icon: 'water-outline',
        title: `${glasses} glasses`,
        subtitle: `${glasses} of ${goal}`,
      });
    },
    [showToast]
  );

  /**
   * Show error toast
   * Icon: ⚠️
   * Title: Error message
   */
  const showErrorToast = useCallback(
    (message: string) => {
      showToast({
        icon: 'alert-circle-outline',
        title: 'Error',
        subtitle: message,
      });
    },
    [showToast]
  );

  return {
    toastState,
    showToast,
    hideToast,
    showWaterAddedToast,
    showQuickAddToast,
    showWeightLoggedToast,
    showCalorieQueryToast,
    showMacroQueryToast,
    showWaterQueryToast,
    showErrorToast,
  };
}
