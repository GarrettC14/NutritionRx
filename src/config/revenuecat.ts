import { Platform } from 'react-native';

/**
 * RevenueCat Configuration for NutritionRx
 * Part of Cascade Fitness Suite
 */

export const REVENUECAT_CONFIG = {
  // Replace with actual API keys from RevenueCat dashboard
  apiKey: Platform.select({
    ios: '__REVENUECAT_IOS_API_KEY__',
    android: '__REVENUECAT_ANDROID_API_KEY__',
  }) as string,

  // Entitlement identifiers (same across both apps)
  entitlements: {
    GYMRX_PREMIUM: 'gymrx_premium',
    NUTRITIONRX_PREMIUM: 'nutritionrx_premium',
    BUNDLE_PREMIUM: 'bundle_premium', // Unlocks both apps
  },

  // Offering identifier
  defaultOffering: 'default',
} as const;

// App identifier for this app
export const APP_ID = 'nutritionrx' as const;

// Which entitlement this app uses
export const APP_ENTITLEMENT = REVENUECAT_CONFIG.entitlements.NUTRITIONRX_PREMIUM;
