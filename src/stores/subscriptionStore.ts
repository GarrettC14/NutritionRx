import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { REVENUECAT_CONFIG, APP_ENTITLEMENT } from '@/config/revenuecat';

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
      // Initial state
      isPremium: false,
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

          set({
            isPremium,
            customerInfo,
            currentOffering,
            expirationDate: activeEntitlement?.expirationDate || null,
            willRenew: activeEntitlement?.willRenew || false,
            hasBundle: !!bundleEntitlement,
            isLoading: false,
          });

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
          console.error('Failed to initialize purchases:', error);
          set({
            isLoading: false,
            error: 'Failed to load subscription status',
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
          console.error('Failed to refresh status:', error);
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

          console.error('Purchase failed:', error);
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
          console.error('Restore failed:', error);
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
        console.log(`[Dev] Premium ${newDevPremium ? 'enabled' : 'disabled'} for testing`);
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
