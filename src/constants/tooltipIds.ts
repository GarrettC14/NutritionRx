// Tooltip IDs for tracking which tips the user has seen
// Stored in user_settings table with AsyncStorage backup for offline

export const TOOLTIP_IDS = {
  // First food logging
  BARCODE_SCANNER: 'onboarding.barcode.intro',
  SERVING_SIZE: 'onboarding.food.servingSize',

  // Progressive discovery
  WATER_TRACKING: 'discovery.waterTracking',
  MEAL_COLLAPSE: 'discovery.mealCollapse',
  QUICK_ADD: 'discovery.quickAdd',
  WEEKLY_SUMMARY: 'discovery.weeklySummary',
} as const;

export type TooltipId = (typeof TOOLTIP_IDS)[keyof typeof TOOLTIP_IDS];
