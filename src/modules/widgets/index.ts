/**
 * Widgets Module
 * Native widget integration for iOS (WidgetKit) and Android (Jetpack Glance)
 */

// Types
export * from './types';

// Services
export { widgetDataService, formatDate, createDefaultNutritionData, createDefaultWaterData } from './widgetDataService';

// Hooks
export { useWidgetSync, useFoodLogWidgetSync, useWaterWidgetSync } from './useWidgetSync';

// Pin-to-Widget
export {
  pinToWidgetService,
  createPinnableItem,
  MAX_PINNED_ITEMS,
} from './pinToWidget';
export type { PinnedItem, PinResult } from './pinToWidget';

export {
  usePinToWidget,
  usePinStatus,
} from './usePinToWidget';
