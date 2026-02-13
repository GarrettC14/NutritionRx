import { useCallback, useEffect, useRef } from 'react';
import { useTooltip, createTooltip } from './useTooltip';
import { useOnboardingStore } from '@/stores';
import { TOOLTIP_IDS } from '@/constants/tooltipIds';

export interface ProgressiveTooltipTriggers {
  checkDashboardCustomize: () => boolean;
  checkMealCollapseTip: () => boolean;
  checkQuickAddDiscovery: () => boolean;
  checkWeeklySummary: () => boolean;
  checkBarcodeScannerIntro: () => boolean;
  checkServingSizeTip: () => boolean;
}

interface UseProgressiveTooltipsOptions {
  /**
   * Whether to automatically check and show tooltips on mount
   * @default false
   */
  autoCheck?: boolean;
  /**
   * Delay before auto-checking tooltips (ms)
   * @default 500
   */
  autoCheckDelay?: number;
}

/**
 * Hook for managing progressive discovery tooltips
 * Shows contextual tips based on user progress and actions
 */
export function useProgressiveTooltips(
  options: UseProgressiveTooltipsOptions = {}
): ProgressiveTooltipTriggers {
  const { autoCheck = false, autoCheckDelay = 500 } = options;

  const { showTooltipIfNotSeen, hasSeen } = useTooltip();
  const { totalFoodsLogged, daysTracked, firstFoodLoggedAt } = useOnboardingStore();

  const hasAutoChecked = useRef(false);

  /**
   * Dashboard Customize
   * Trigger: No gate — shows as the first unseen tooltip in the queue
   */
  const checkDashboardCustomize = useCallback((): boolean => {
    if (hasSeen(TOOLTIP_IDS.DASHBOARD_CUSTOMIZE)) return false;

    return showTooltipIfNotSeen(
      createTooltip(TOOLTIP_IDS.DASHBOARD_CUSTOMIZE,
        'Tap Edit to rearrange, add, or remove your dashboard widgets.',
        {
          icon: 'create-outline',
          position: 'center',
          actions: [{ label: 'Got it!', onPress: () => {}, primary: true }],
        }
      )
    );
  }, [hasSeen, showTooltipIfNotSeen]);

  /**
   * Meal Collapse Tip
   * Trigger: User has logged 5+ foods AND hasn't seen this tooltip
   */
  const checkMealCollapseTip = useCallback((): boolean => {
    if (hasSeen(TOOLTIP_IDS.MEAL_COLLAPSE)) return false;
    if (totalFoodsLogged < 5) return false;

    return showTooltipIfNotSeen(
      createTooltip(TOOLTIP_IDS.MEAL_COLLAPSE,
        'Pro tip: Tap on a meal header to collapse or expand it. This helps keep your diary organized!',
        {
          icon: 'clipboard-outline',
          position: 'center',
          actions: [{ label: 'Nice!', onPress: () => {}, primary: true }],
        }
      )
    );
  }, [hasSeen, showTooltipIfNotSeen, totalFoodsLogged]);

  /**
   * Quick Add Discovery
   * Trigger: User has logged 10+ foods AND hasn't seen this tooltip
   */
  const checkQuickAddDiscovery = useCallback((): boolean => {
    if (hasSeen(TOOLTIP_IDS.QUICK_ADD)) return false;
    if (totalFoodsLogged < 10) return false;

    return showTooltipIfNotSeen(
      createTooltip(TOOLTIP_IDS.QUICK_ADD,
        'Speed up your logging! Long-press the + button to quickly add calories without searching for a specific food.',
        {
          icon: 'flash-outline',
          position: 'center',
          actions: [{ label: 'Cool!', onPress: () => {}, primary: true }],
        }
      )
    );
  }, [hasSeen, showTooltipIfNotSeen, totalFoodsLogged]);

  /**
   * Weekly Summary
   * Trigger: User has tracked for 7+ days AND hasn't seen this tooltip
   */
  const checkWeeklySummary = useCallback((): boolean => {
    if (hasSeen(TOOLTIP_IDS.WEEKLY_SUMMARY)) return false;
    if (daysTracked < 7) return false;

    return showTooltipIfNotSeen(
      createTooltip(TOOLTIP_IDS.WEEKLY_SUMMARY,
        "You've been tracking for a week! Check out your weekly summary in the Progress tab to see your trends.",
        {
          icon: 'bar-chart-outline',
          position: 'center',
          actions: [{ label: 'View Progress', onPress: () => {}, primary: true }],
        }
      )
    );
  }, [hasSeen, showTooltipIfNotSeen, daysTracked]);

  /**
   * Barcode Scanner Introduction
   * Trigger: First food log AND hasn't seen this tooltip
   */
  const checkBarcodeScannerIntro = useCallback((): boolean => {
    if (hasSeen(TOOLTIP_IDS.BARCODE_SCANNER)) return false;
    if (!firstFoodLoggedAt) return false;

    return showTooltipIfNotSeen(
      createTooltip(TOOLTIP_IDS.BARCODE_SCANNER,
        'Did you know? You can scan barcodes to quickly add packaged foods. Just tap the camera icon when adding food!',
        {
          icon: 'camera-outline',
          position: 'center',
          actions: [{ label: 'Got it!', onPress: () => {}, primary: true }],
        }
      )
    );
  }, [hasSeen, showTooltipIfNotSeen, firstFoodLoggedAt]);

  /**
   * Serving Size Tip
   * Trigger: User has logged 3+ foods AND hasn't seen this tooltip
   */
  const checkServingSizeTip = useCallback((): boolean => {
    if (hasSeen(TOOLTIP_IDS.SERVING_SIZE)) return false;
    if (totalFoodsLogged < 3) return false;

    return showTooltipIfNotSeen(
      createTooltip(TOOLTIP_IDS.SERVING_SIZE,
        'Tip: You can adjust serving sizes by tapping on a logged food. Accurate portions lead to better tracking!',
        {
          icon: 'restaurant-outline',
          position: 'center',
          actions: [{ label: 'Thanks!', onPress: () => {}, primary: true }],
        }
      )
    );
  }, [hasSeen, showTooltipIfNotSeen, totalFoodsLogged]);

  // Auto-check tooltips on mount if enabled
  useEffect(() => {
    if (!autoCheck || hasAutoChecked.current) return;

    const timer = setTimeout(() => {
      hasAutoChecked.current = true;

      // Check tooltips in priority order - stop if one is shown
      if (checkDashboardCustomize()) return;
      if (checkMealCollapseTip()) return;
      if (checkQuickAddDiscovery()) return;
      if (checkWeeklySummary()) return;
    }, autoCheckDelay);

    return () => clearTimeout(timer);
  }, [
    autoCheck,
    autoCheckDelay,
    checkDashboardCustomize,
    checkMealCollapseTip,
    checkQuickAddDiscovery,
    checkWeeklySummary,
  ]);

  return {
    checkDashboardCustomize,
    checkMealCollapseTip,
    checkQuickAddDiscovery,
    checkWeeklySummary,
    checkBarcodeScannerIntro,
    checkServingSizeTip,
  };
}
