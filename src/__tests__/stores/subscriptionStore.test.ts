/**
 * Subscription Store Tests
 * Tests for subscription/purchase state management including RevenueCat
 * integration, premium status, purchase flow, restore, and dev toggle.
 */

import { useSubscriptionStore } from '@/stores/subscriptionStore';
import Purchases from 'react-native-purchases';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getOfferings: jest.fn(),
    getCustomerInfo: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    invalidateCustomerInfoCache: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
  },
}));

jest.mock('@/config/revenuecat', () => ({
  REVENUECAT_CONFIG: {
    entitlements: { CASCADE_BUNDLE: 'cascade_bundle' },
    offerings: { NUTRITIONRX_DEFAULT: 'nutritionrx_default', CASCADE_BUNDLE_DEFAULT: 'cascade_bundle_default' },
  },
  APP_ENTITLEMENT: 'premium',
}));

describe('useSubscriptionStore', () => {
  const mockPurchases = Purchases as jest.Mocked<typeof Purchases>;

  const initialState = {
    isPremium: false,
    isLoading: false,
    customerInfo: null,
    currentOffering: null,
    expirationDate: null,
    willRenew: false,
    hasBundle: false,
    isDevPremium: false,
    error: null,
  };

  const makeCustomerInfo = (entitlements: Record<string, any> = {}) => ({
    entitlements: {
      active: entitlements,
      all: entitlements,
    },
    activeSubscriptions: [] as string[],
    allPurchasedProductIdentifiers: [] as string[],
    latestExpirationDate: null,
    firstSeen: '2024-01-01',
    originalAppUserId: 'user-123',
    requestDate: '2024-01-15',
    originalApplicationVersion: null,
    originalPurchaseDate: null,
    managementURL: null,
    nonSubscriptionTransactions: [],
    allExpirationDates: {},
    allPurchaseDates: {},
  }) as any;

  const premiumEntitlement = {
    identifier: 'premium',
    isActive: true,
    willRenew: true,
    expirationDate: '2025-01-15T00:00:00Z',
    productIdentifier: 'nutritionrx_premium_monthly',
    isSandbox: false,
    periodType: 'normal',
    latestPurchaseDate: '2024-01-15T00:00:00Z',
    originalPurchaseDate: '2024-01-15T00:00:00Z',
    ownershipType: 'PURCHASED',
    store: 'APP_STORE',
    unsubscribeDetectedAt: null,
    billingIssueDetectedAt: null,
  };

  const bundleEntitlement = {
    ...premiumEntitlement,
    identifier: 'cascade_bundle',
    productIdentifier: 'cascade_bundle_monthly',
    willRenew: false,
    expirationDate: '2025-06-15T00:00:00Z',
  };

  const mockOffering = {
    identifier: 'default',
    serverDescription: 'Default offering',
    metadata: {},
    availablePackages: [],
    lifetime: null,
    annual: null,
    sixMonth: null,
    threeMonth: null,
    twoMonth: null,
    monthly: null,
    weekly: null,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    useSubscriptionStore.setState(initialState);
  });

  // ============================================================
  // initialize
  // ============================================================

  describe('initialize', () => {
    it('fetches offerings and customer info on init', async () => {
      const customerInfo = makeCustomerInfo();
      mockPurchases.getOfferings.mockResolvedValue({ current: mockOffering, all: {} } as any);
      mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo);
      mockPurchases.addCustomerInfoUpdateListener.mockReturnValue({ remove: jest.fn() } as any);

      await useSubscriptionStore.getState().initialize();

      expect(mockPurchases.getOfferings).toHaveBeenCalled();
      expect(mockPurchases.getCustomerInfo).toHaveBeenCalled();
    });

    it('sets isPremium true when app entitlement is active', async () => {
      const customerInfo = makeCustomerInfo({ premium: premiumEntitlement });
      mockPurchases.getOfferings.mockResolvedValue({ current: mockOffering, all: {} } as any);
      mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo);
      mockPurchases.addCustomerInfoUpdateListener.mockReturnValue({ remove: jest.fn() } as any);

      await useSubscriptionStore.getState().initialize();

      const state = useSubscriptionStore.getState();
      expect(state.isPremium).toBe(true);
      expect(state.willRenew).toBe(true);
      expect(state.expirationDate).toBe('2025-01-15T00:00:00Z');
      expect(state.isLoading).toBe(false);
    });

    it('sets isPremium true when bundle entitlement is active', async () => {
      const customerInfo = makeCustomerInfo({ cascade_bundle: bundleEntitlement });
      mockPurchases.getOfferings.mockResolvedValue({ current: mockOffering, all: {} } as any);
      mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo);
      mockPurchases.addCustomerInfoUpdateListener.mockReturnValue({ remove: jest.fn() } as any);

      await useSubscriptionStore.getState().initialize();

      const state = useSubscriptionStore.getState();
      expect(state.isPremium).toBe(true);
      expect(state.hasBundle).toBe(true);
    });

    it('prefers bundle entitlement over app entitlement', async () => {
      const customerInfo = makeCustomerInfo({
        premium: premiumEntitlement,
        cascade_bundle: bundleEntitlement,
      });
      mockPurchases.getOfferings.mockResolvedValue({ current: mockOffering, all: {} } as any);
      mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo);
      mockPurchases.addCustomerInfoUpdateListener.mockReturnValue({ remove: jest.fn() } as any);

      await useSubscriptionStore.getState().initialize();

      const state = useSubscriptionStore.getState();
      // Bundle entitlement takes precedence for expiration/willRenew
      expect(state.expirationDate).toBe('2025-06-15T00:00:00Z');
      expect(state.willRenew).toBe(false); // bundle's willRenew
      expect(state.hasBundle).toBe(true);
    });

    it('resolves premium via isDevBuild when no entitlements are active', async () => {
      const customerInfo = makeCustomerInfo({});
      mockPurchases.getOfferings.mockResolvedValue({ current: mockOffering, all: {} } as any);
      mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo);
      mockPurchases.addCustomerInfoUpdateListener.mockReturnValue({ remove: jest.fn() } as any);

      await useSubscriptionStore.getState().initialize();

      const state = useSubscriptionStore.getState();
      // In dev builds (__DEV__=true), isPremium defaults to true via isDevBuild
      expect(state.isPremium).toBe(true);
      expect(state.expirationDate).toBeNull();
      expect(state.hasBundle).toBe(false);
    });

    it('sets up customer info update listener', async () => {
      const customerInfo = makeCustomerInfo();
      mockPurchases.getOfferings.mockResolvedValue({ current: mockOffering, all: {} } as any);
      mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo);
      mockPurchases.addCustomerInfoUpdateListener.mockReturnValue({ remove: jest.fn() } as any);

      await useSubscriptionStore.getState().initialize();

      expect(mockPurchases.addCustomerInfoUpdateListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('listener updates state when customer info changes', async () => {
      const customerInfo = makeCustomerInfo();
      mockPurchases.getOfferings.mockResolvedValue({ current: mockOffering, all: {} } as any);
      mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo);

      let listenerCallback: ((info: any) => void) | undefined;
      mockPurchases.addCustomerInfoUpdateListener.mockImplementation((cb: any) => {
        listenerCallback = cb;
        return { remove: jest.fn() } as any;
      });

      await useSubscriptionStore.getState().initialize();

      // In dev builds, isPremium is true via isDevBuild even without entitlements
      expect(useSubscriptionStore.getState().isPremium).toBe(true);

      // Simulate customer info update with premium entitlement
      const updatedInfo = makeCustomerInfo({ premium: premiumEntitlement });
      listenerCallback!(updatedInfo);

      expect(useSubscriptionStore.getState().isPremium).toBe(true);
      expect(useSubscriptionStore.getState().willRenew).toBe(true);
    });

    it('handles initialization errors', async () => {
      mockPurchases.getOfferings.mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await useSubscriptionStore.getState().initialize();

      const state = useSubscriptionStore.getState();
      expect(state.isLoading).toBe(false);
      // In dev builds, errors don't block premium and error state is suppressed
      expect(state.error).toBeNull();

      consoleSpy.mockRestore();
    });

    it('stores the current offering', async () => {
      const customerInfo = makeCustomerInfo();
      mockPurchases.getOfferings.mockResolvedValue({ current: mockOffering, all: {} } as any);
      mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo);
      mockPurchases.addCustomerInfoUpdateListener.mockReturnValue({ remove: jest.fn() } as any);

      await useSubscriptionStore.getState().initialize();

      expect(useSubscriptionStore.getState().currentOffering).toEqual(mockOffering);
    });
  });

  // ============================================================
  // refreshStatus
  // ============================================================

  describe('refreshStatus', () => {
    it('invalidates cache and fetches fresh customer info', async () => {
      const customerInfo = makeCustomerInfo({ premium: premiumEntitlement });
      mockPurchases.invalidateCustomerInfoCache.mockResolvedValue(undefined as any);
      mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo);

      await useSubscriptionStore.getState().refreshStatus();

      expect(mockPurchases.invalidateCustomerInfoCache).toHaveBeenCalled();
      expect(mockPurchases.getCustomerInfo).toHaveBeenCalled();
      expect(useSubscriptionStore.getState().isPremium).toBe(true);
    });

    it('handles refresh errors silently', async () => {
      mockPurchases.invalidateCustomerInfoCache.mockRejectedValue(new Error('Refresh failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await useSubscriptionStore.getState().refreshStatus();

      // Should not set error state for refresh failures
      expect(useSubscriptionStore.getState().error).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  // ============================================================
  // purchasePackage
  // ============================================================

  describe('purchasePackage', () => {
    const mockPackage = { identifier: 'monthly', product: {} } as any;

    it('returns true and sets premium on successful purchase', async () => {
      const customerInfo = makeCustomerInfo({ premium: premiumEntitlement });
      mockPurchases.purchasePackage.mockResolvedValue({ customerInfo } as any);

      const result = await useSubscriptionStore.getState().purchasePackage(mockPackage);

      expect(result).toBe(true);
      const state = useSubscriptionStore.getState();
      expect(state.isPremium).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('returns false when purchase succeeds but no entitlement granted', async () => {
      const customerInfo = makeCustomerInfo({});
      mockPurchases.purchasePackage.mockResolvedValue({ customerInfo } as any);

      const result = await useSubscriptionStore.getState().purchasePackage(mockPackage);

      expect(result).toBe(false);
      expect(useSubscriptionStore.getState().isPremium).toBe(false);
      expect(useSubscriptionStore.getState().isLoading).toBe(false);
    });

    it('returns false on user cancel without setting error', async () => {
      const cancelError = { userCancelled: true, message: 'User cancelled' };
      mockPurchases.purchasePackage.mockRejectedValue(cancelError);

      const result = await useSubscriptionStore.getState().purchasePackage(mockPackage);

      expect(result).toBe(false);
      expect(useSubscriptionStore.getState().error).toBeNull();
      expect(useSubscriptionStore.getState().isLoading).toBe(false);
    });

    it('returns false and sets error on purchase failure', async () => {
      mockPurchases.purchasePackage.mockRejectedValue(new Error('Payment declined'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await useSubscriptionStore.getState().purchasePackage(mockPackage);

      expect(result).toBe(false);
      expect(useSubscriptionStore.getState().error).toBe('Purchase failed. Please try again.');
      expect(useSubscriptionStore.getState().isLoading).toBe(false);

      consoleSpy.mockRestore();
    });

    it('sets isLoading true during purchase', async () => {
      let loadingDuringPurchase = false;
      mockPurchases.purchasePackage.mockImplementation(async () => {
        loadingDuringPurchase = useSubscriptionStore.getState().isLoading;
        return { customerInfo: makeCustomerInfo() } as any;
      });

      await useSubscriptionStore.getState().purchasePackage(mockPackage);

      expect(loadingDuringPurchase).toBe(true);
    });
  });

  // ============================================================
  // restorePurchases
  // ============================================================

  describe('restorePurchases', () => {
    it('returns true and sets premium when subscription found', async () => {
      const customerInfo = makeCustomerInfo({ premium: premiumEntitlement });
      mockPurchases.restorePurchases.mockResolvedValue(customerInfo);

      const result = await useSubscriptionStore.getState().restorePurchases();

      expect(result).toBe(true);
      const state = useSubscriptionStore.getState();
      expect(state.isPremium).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('returns false and sets error when no subscription found', async () => {
      const customerInfo = makeCustomerInfo({});
      mockPurchases.restorePurchases.mockResolvedValue(customerInfo);

      const result = await useSubscriptionStore.getState().restorePurchases();

      expect(result).toBe(false);
      expect(useSubscriptionStore.getState().error).toBe('No active subscription found.');
      expect(useSubscriptionStore.getState().isLoading).toBe(false);
    });

    it('returns false and sets error on restore failure', async () => {
      mockPurchases.restorePurchases.mockRejectedValue(new Error('Restore network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await useSubscriptionStore.getState().restorePurchases();

      expect(result).toBe(false);
      expect(useSubscriptionStore.getState().error).toBe(
        "Couldn't restore purchases. Please try again or contact support."
      );

      consoleSpy.mockRestore();
    });

    it('sets bundle info when bundle entitlement found on restore', async () => {
      const customerInfo = makeCustomerInfo({ cascade_bundle: bundleEntitlement });
      mockPurchases.restorePurchases.mockResolvedValue(customerInfo);

      await useSubscriptionStore.getState().restorePurchases();

      const state = useSubscriptionStore.getState();
      expect(state.hasBundle).toBe(true);
      expect(state.expirationDate).toBe('2025-06-15T00:00:00Z');
    });
  });

  // ============================================================
  // clearError
  // ============================================================

  describe('clearError', () => {
    it('clears the error state', () => {
      useSubscriptionStore.setState({ error: 'Some error' });

      useSubscriptionStore.getState().clearError();

      expect(useSubscriptionStore.getState().error).toBeNull();
    });
  });

  // ============================================================
  // toggleDevPremium
  // ============================================================

  describe('toggleDevPremium', () => {
    it('enables dev premium and sets isPremium true', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      useSubscriptionStore.getState().toggleDevPremium();

      const state = useSubscriptionStore.getState();
      expect(state.isDevPremium).toBe(true);
      expect(state.isPremium).toBe(true);

      consoleSpy.mockRestore();
    });

    it('disables dev premium and sets isPremium false', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      useSubscriptionStore.setState({ isDevPremium: true, isPremium: true });

      useSubscriptionStore.getState().toggleDevPremium();

      const state = useSubscriptionStore.getState();
      expect(state.isDevPremium).toBe(false);
      expect(state.isPremium).toBe(false);

      consoleSpy.mockRestore();
    });

    it('toggles back and forth correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // First toggle: off -> on
      useSubscriptionStore.getState().toggleDevPremium();
      expect(useSubscriptionStore.getState().isDevPremium).toBe(true);
      expect(useSubscriptionStore.getState().isPremium).toBe(true);

      // Second toggle: on -> off
      useSubscriptionStore.getState().toggleDevPremium();
      expect(useSubscriptionStore.getState().isDevPremium).toBe(false);
      expect(useSubscriptionStore.getState().isPremium).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});
