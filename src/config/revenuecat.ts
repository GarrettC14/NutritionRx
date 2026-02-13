import { Platform } from 'react-native';

/**
 * RevenueCat Configuration for NutritionRx
 * Part of Cascade Fitness Suite
 */

export const REVENUECAT_CONFIG = {
  apiKey: Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  }) as string,

  // Entitlement identifiers (same across both apps)
  entitlements: {
    GYMRX_PREMIUM: 'gymrx_premium',
    NUTRITIONRX_PREMIUM: 'nutritionrx_premium',
    CASCADE_BUNDLE: 'cascade_bundle', // Unlocks both apps
  },

  // Offering identifiers
  offerings: {
    NUTRITIONRX_DEFAULT: 'nutritionrx_default',
    CASCADE_BUNDLE_DEFAULT: 'cascade_bundle_default',
  },

  defaultOffering: 'default',
} as const;

// App identifier for this app
export const APP_ID = 'nutritionrx' as const;

// Which entitlement this app uses
export const APP_ENTITLEMENT = REVENUECAT_CONFIG.entitlements.NUTRITIONRX_PREMIUM;
