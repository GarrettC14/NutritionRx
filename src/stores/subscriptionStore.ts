import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import * as Sentry from '@sentry/react-native';
import { REVENUECAT_CONFIG, APP_ENTITLEMENT } from '@/config/revenuecat';
import { isExpectedError } from '@/utils/sentryHelpers';

const isDevBuild =
  (globalThis as { __DEV__?: boolean }).__DEV__ ?? process.env.NODE_ENV !== 'production';

interface SubscriptionState {
  // Core state
  isPremium: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;

  // Subscription details
  expirationDate: string | null;
  willRenew: boolean;
  hasBundle: boolean;

  // Dev/testing state
  isDevPremium: boolean;

  // Error state
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  clearError: () => void;
  toggleDevPremium: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // Initial state — in dev builds, default to premium for testing
      isPremium: isDevBuild,
      isLoading: true,
      customerInfo: null,
      currentOffering: null,
      expirationDate: null,
      willRenew: false,
      hasBundle: false,
      isDevPremium: false,
      error: null,

      initialize: async () => {
        set({ isLoading: true, error: null });

        try {
          // Fetch offerings
          const offerings = await Purchases.getOfferings();
          const currentOffering = offerings.current;

          // Fetch customer info
          const customerInfo = await Purchases.getCustomerInfo();

          // Check entitlements
          const appEntitlement = customerInfo.entitlements.active[APP_ENTITLEMENT];
          const bundleEntitlement =
            customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.BUNDLE_PREMIUM];

          const isPremium = !!appEntitlement || !!bundleEntitlement;
          const activeEntitlement = bundleEntitlement || appEntitlement;

          const resolvedPremium = isDevBuild || isPremium;
          set({
            isPremium: resolvedPremium,
            customerInfo,
            currentOffering,
            expirationDate: activeEntitlement?.expirationDate || null,
            willRenew: activeEntitlement?.willRenew || false,
            hasBundle: !!bundleEntitlement,
            isLoading: false,
          });

          Sentry.setTag('subscription_tier', resolvedPremium ? 'premium' : 'free');

          // Set up listener for future updates
          Purchases.addCustomerInfoUpdateListener((info) => {
            const appEnt = info.entitlements.active[APP_ENTITLEMENT];
            const bundleEnt =
              info.entitlements.active[REVENUECAT_CONFIG.entitlements.BUNDLE_PREMIUM];
            const isPrem = !!appEnt || !!bundleEnt;
            const activeEnt = bundleEnt || appEnt;

            set({
              isPremium: isPrem,
              customerInfo: info,
              expirationDate: activeEnt?.expirationDate || null,
              willRenew: activeEnt?.willRenew || false,
              hasBundle: !!bundleEnt,
            });
          });
        } catch (error) {
          Sentry.captureException(error, { tags: { feature: 'subscription', action: 'init' } });
          if (__DEV__) console.error('Failed to initialize purchases:', error);
          set({
            isPremium: isDevBuild,
            isLoading: false,
            error: isDevBuild ? null : 'Failed to load subscription status',
          });
        }
      },

      refreshStatus: async () => {
        try {
          // Invalidate cache and fetch fresh
          await Purchases.invalidateCustomerInfoCache();
          const customerInfo = await Purchases.getCustomerInfo();

          const appEntitlement = customerInfo.entitlements.active[APP_ENTITLEMENT];
          const bundleEntitlement =
            customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.BUNDLE_PREMIUM];

          const isPremium = !!appEntitlement || !!bundleEntitlement;
          const activeEntitlement = bundleEntitlement || appEntitlement;

          set({
            isPremium,
            customerInfo,
            expirationDate: activeEntitlement?.expirationDate || null,
            willRenew: activeEntitlement?.willRenew || false,
            hasBundle: !!bundleEntitlement,
          });
        } catch (error) {
          Sentry.captureException(error, { tags: { feature: 'subscription', action: 'refresh' } });
          if (__DEV__) console.error('Failed to refresh status:', error);
        }
      },

      purchasePackage: async (pkg: PurchasesPackage) => {
        set({ isLoading: true, error: null });

        try {
          const { customerInfo } = await Purchases.purchasePackage(pkg);

          const appEntitlement = customerInfo.entitlements.active[APP_ENTITLEMENT];
          const bundleEntitlement =
            customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.BUNDLE_PREMIUM];

          const isPremium = !!appEntitlement || !!bundleEntitlement;

          if (isPremium) {
            const activeEntitlement = bundleEntitlement || appEntitlement;
            set({
              isPremium: true,
              customerInfo,
              expirationDate: activeEntitlement?.expirationDate || null,
              willRenew: activeEntitlement?.willRenew || false,
              hasBundle: !!bundleEntitlement,
              isLoading: false,
            });
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error: any) {
          // User cancelled is not an error
          if (error.userCancelled) {
            set({ isLoading: false });
            return false;
          }

          if (!isExpectedError(error)) {
            Sentry.captureException(error, { tags: { feature: 'subscription', action: 'purchase' } });
          }
          if (__DEV__) console.error('Purchase failed:', error);
          set({
            isLoading: false,
            error: 'Purchase failed. Please try again.',
          });
          return false;
        }
      },

      restorePurchases: async () => {
        set({ isLoading: true, error: null });

        try {
          const customerInfo = await Purchases.restorePurchases();

          const appEntitlement = customerInfo.entitlements.active[APP_ENTITLEMENT];
          const bundleEntitlement =
            customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.BUNDLE_PREMIUM];

          const isPremium = !!appEntitlement || !!bundleEntitlement;

          if (isPremium) {
            const activeEntitlement = bundleEntitlement || appEntitlement;
            set({
              isPremium: true,
              customerInfo,
              expirationDate: activeEntitlement?.expirationDate || null,
              willRenew: activeEntitlement?.willRenew || false,
              hasBundle: !!bundleEntitlement,
              isLoading: false,
            });
            return true;
          }

          set({
            isLoading: false,
            error: 'No active subscription found.',
          });
          return false;
        } catch (error) {
          if (!isExpectedError(error)) {
            Sentry.captureException(error, { tags: { feature: 'subscription', action: 'restore' } });
          }
          if (__DEV__) console.error('Restore failed:', error);
          set({
            isLoading: false,
            error: "Couldn't restore purchases. Please try again or contact support.",
          });
          return false;
        }
      },

      clearError: () => set({ error: null }),

      toggleDevPremium: () => {
        const { isDevPremium } = get();
        const newDevPremium = !isDevPremium;
        set({
          isDevPremium: newDevPremium,
          isPremium: newDevPremium, // Override isPremium when dev mode is enabled
        });
        if (__DEV__) console.log(`[Dev] Premium ${newDevPremium ? 'enabled' : 'disabled'} for testing`);
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist minimal state for offline access
        isPremium: state.isPremium,
        expirationDate: state.expirationDate,
        hasBundle: state.hasBundle,
        isDevPremium: state.isDevPremium,
      }),
    }
  )
);
