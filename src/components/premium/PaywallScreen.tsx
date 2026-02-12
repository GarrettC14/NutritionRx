import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Purchases, {
  PurchasesPackage,
  PurchasesOffering,
  PURCHASES_ERROR_CODE,
  INTRO_ELIGIBILITY_STATUS,
} from 'react-native-purchases';
import { TestIDs } from '@/constants/testIDs';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useTheme } from '@/hooks/useTheme';
import { REVENUECAT_CONFIG } from '@/config/revenuecat';
import { PaywallCategory, PaywallSource, PaywallTab, PaywallPlan } from './analyticsEnums';
import { resolveCategory } from './upgradeContent';
import { PlanCard } from './PlanCard';
import { PaywallErrorBanner } from './PaywallErrorBanner';
import { trackPaywallEvent, generatePaywallSessionId } from '@/utils/paywallAnalytics';
import { getErrorMessage } from './purchaseErrorMap';
import { useReferralStore } from '@/stores/useReferralStore';
import * as Clipboard from 'expo-clipboard';

const GOLD = '#C9953C';
const GOLD_MUTED = 'rgba(201, 149, 60, 0.15)';
const SAGE_GREEN = '#7C9A7C';

// ============================================
// HELPERS
// ============================================

function formatMonthlyFromAnnual(annualPackage: PurchasesPackage): string {
  const { price, currencyCode } = annualPackage.product;
  const monthly = price / 12;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
  }).format(monthly);
}

function computeSavingsPercent(monthlyPrice: number, annualPrice: number): number {
  if (monthlyPrice <= 0) return 0;
  return Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
}

// ============================================
// COMPONENT
// ============================================

export function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ context?: string; showReferralInput?: string }>();

  const { currentOffering, bundleOffering, isPremium } = useSubscriptionStore();

  const [paywallSessionId] = useState(() => generatePaywallSessionId());
  const [openedAt] = useState(() => Date.now());
  const [selectedTab, setSelectedTab] = useState<PaywallTab>(PaywallTab.SINGLE_APP);
  const [selectedPlan, setSelectedPlan] = useState<PaywallPlan>(PaywallPlan.ANNUAL);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [priceLoadError, setPriceLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Referral state
  const {
    referralCode,
    isRedeemed,
    rewardGranted,
    rewardDetails,
    appliedCode,
    isLoading: referralLoading,
    error: referralError,
    fetchReferralStatus,
    generateCode,
    applyCode,
    shareReferralLink,
    pendingReferralCode,
    clearPendingReferralCode,
    clearError: clearReferralError,
  } = useReferralStore();

  const [referralInput, setReferralInput] = useState('');
  const [referralExpanded, setReferralExpanded] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Context validation
  const rawContext = params.context;
  const resolvedCategory = useMemo(() => {
    if (!rawContext) {
      trackPaywallEvent('paywall_context_missing', { paywallSessionId });
      return PaywallCategory.AI_INSIGHTS;
    }
    const valid = Object.values(PaywallCategory).includes(rawContext as PaywallCategory);
    if (!valid) {
      trackPaywallEvent('paywall_context_invalid', {
        paywallSessionId,
        receivedContext: rawContext,
      });
    }
    return resolveCategory(rawContext);
  }, [rawContext, paywallSessionId]);

  // Log view event
  useEffect(() => {
    trackPaywallEvent('paywall_viewed', {
      paywallSessionId,
      context: resolvedCategory,
      source: PaywallSource.SETTINGS_UPGRADE,
    });
  }, [paywallSessionId, resolvedCategory]);

  // Get packages from offerings
  const activeOffering: PurchasesOffering | null =
    selectedTab === PaywallTab.BUNDLE ? bundleOffering : currentOffering;

  const monthlyPackage = useMemo(
    () => activeOffering?.availablePackages.find((p) => p.packageType === 'MONTHLY'),
    [activeOffering],
  );
  const annualPackage = useMemo(
    () => activeOffering?.availablePackages.find((p) => p.packageType === 'ANNUAL'),
    [activeOffering],
  );

  const selectedPackage = selectedPlan === PaywallPlan.ANNUAL ? annualPackage : monthlyPackage;

  // Auto-retry offerings once after 3 seconds
  useEffect(() => {
    if (currentOffering) return;

    const timer = setTimeout(async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          useSubscriptionStore.getState().initialize();
        } else {
          setPriceLoadError(true);
          trackPaywallEvent('paywall_price_load_failed', {
            paywallSessionId,
            error: 'No offerings after auto-retry',
            retryCount: 1,
          });
        }
      } catch (error: any) {
        setPriceLoadError(true);
        trackPaywallEvent('paywall_price_load_failed', {
          paywallSessionId,
          error: error?.message ?? 'Unknown',
          retryCount: 1,
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentOffering, paywallSessionId]);

  // Check trial eligibility for the currently selected package
  useEffect(() => {
    if (!selectedPackage) {
      setTrialEligible(null);
      return;
    }

    let cancelled = false;
    setTrialEligible(null);

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setTrialEligible(false);
        trackPaywallEvent('trial_eligibility_check_result', {
          paywallSessionId,
          status: 'timeout',
          platform: Platform.OS,
        });
      }
    }, 5000);

    (async () => {
      try {
        let eligible = false;
        if (Platform.OS === 'ios') {
          const productId = selectedPackage.product.identifier;
          const result =
            await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
          eligible =
            result[productId]?.status ===
            INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
        } else {
          eligible = selectedPackage.product.introPrice != null;
        }
        if (!cancelled) {
          setTrialEligible(eligible);
          trackPaywallEvent('trial_eligibility_check_result', {
            paywallSessionId,
            status: eligible ? 'eligible' : 'ineligible',
            platform: Platform.OS,
          });
        }
      } catch {
        if (!cancelled) {
          setTrialEligible(false);
          trackPaywallEvent('trial_eligibility_check_result', {
            paywallSessionId,
            status: 'error',
            platform: Platform.OS,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [selectedPackage, paywallSessionId]);

  // Fetch referral status on mount
  useEffect(() => {
    fetchReferralStatus();
  }, [fetchReferralStatus]);

  // Consume pending referral code from deep link
  useEffect(() => {
    if (pendingReferralCode) {
      setReferralInput(pendingReferralCode);
      setReferralExpanded(true);
      clearPendingReferralCode();
    }
  }, [pendingReferralCode, clearPendingReferralCode]);

  // Auto-expand referral section from navigation param
  useEffect(() => {
    if (params.showReferralInput === 'true') {
      setReferralExpanded(true);
    }
  }, [params.showReferralInput]);

  // Savings calculations
  const annualSavings = useMemo(() => {
    if (!monthlyPackage || !annualPackage) return 0;
    return computeSavingsPercent(monthlyPackage.product.price, annualPackage.product.price);
  }, [monthlyPackage, annualPackage]);

  const monthlyFromAnnual = useMemo(
    () => (annualPackage ? formatMonthlyFromAnnual(annualPackage) : ''),
    [annualPackage],
  );

  // Bundle savings (bundle monthly vs single-app monthly)
  const singleMonthlyPackage = useMemo(
    () => currentOffering?.availablePackages.find((p) => p.packageType === 'MONTHLY'),
    [currentOffering],
  );

  const bundleMonthlyPackage = useMemo(
    () => bundleOffering?.availablePackages.find((p) => p.packageType === 'MONTHLY'),
    [bundleOffering],
  );

  const bundleAnnualPackage = useMemo(
    () => bundleOffering?.availablePackages.find((p) => p.packageType === 'ANNUAL'),
    [bundleOffering],
  );

  const bundleMonthlySavings = useMemo(() => {
    if (!singleMonthlyPackage || !bundleMonthlyPackage) return 0;
    // Bundle monthly vs 2x single-app monthly
    return computeSavingsPercent(
      singleMonthlyPackage.product.price * 2,
      bundleMonthlyPackage.product.price * 12,
    );
  }, [singleMonthlyPackage, bundleMonthlyPackage]);

  const bundleAnnualSavings = useMemo(() => {
    if (!singleMonthlyPackage || !bundleAnnualPackage) return 0;
    return computeSavingsPercent(
      singleMonthlyPackage.product.price * 2,
      bundleAnnualPackage.product.price,
    );
  }, [singleMonthlyPackage, bundleAnnualPackage]);

  const bundleMonthlyFromAnnual = useMemo(
    () => (bundleAnnualPackage ? formatMonthlyFromAnnual(bundleAnnualPackage) : ''),
    [bundleAnnualPackage],
  );

  // ── Handlers ──

  const handleDismiss = useCallback(() => {
    trackPaywallEvent('paywall_dismissed', {
      paywallSessionId,
      timeSpentMs: Date.now() - openedAt,
      source: PaywallSource.SETTINGS_UPGRADE,
      lastCategory: resolvedCategory,
    });
    router.back();
  }, [paywallSessionId, openedAt, resolvedCategory, router]);

  const handleTabSwitch = useCallback(
    (tab: PaywallTab) => {
      setSelectedTab(tab);
      setSelectedPlan(PaywallPlan.ANNUAL); // Reset to annual on tab switch
      trackPaywallEvent('paywall_tab_switched', { paywallSessionId, tab });
    },
    [paywallSessionId],
  );

  const handlePlanSelect = useCallback(
    (plan: PaywallPlan) => {
      if (plan === selectedPlan) return; // Dedupe same-plan tap
      setSelectedPlan(plan);
      const pkg = plan === PaywallPlan.ANNUAL ? annualPackage : monthlyPackage;
      trackPaywallEvent('plan_selected', {
        paywallSessionId,
        plan,
        tab: selectedTab,
        productId: pkg?.product.identifier ?? '',
        offeringId: activeOffering?.identifier ?? '',
      });
    },
    [selectedPlan, paywallSessionId, selectedTab, annualPackage, monthlyPackage, activeOffering],
  );

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage || isPurchasing) return;

    setIsPurchasing(true);
    setErrorMessage(null);

    trackPaywallEvent('purchase_initiated', {
      paywallSessionId,
      plan: selectedPlan,
      tab: selectedTab,
      productId: selectedPackage.product.identifier,
      offeringId: activeOffering?.identifier ?? '',
      trialEligible: trialEligible === true,
    });

    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      const hasPremium =
        customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.NUTRITIONRX_PREMIUM] !==
          undefined ||
        customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.CASCADE_BUNDLE] !==
          undefined;

      if (hasPremium) {
        trackPaywallEvent('purchase_completed', {
          paywallSessionId,
          plan: selectedPlan,
          tab: selectedTab,
          productId: selectedPackage.product.identifier,
          offeringId: activeOffering?.identifier ?? '',
          revenue: selectedPackage.product.price,
          currency: selectedPackage.product.currencyCode,
        });
        trackPaywallEvent('paywall_converted', {
          paywallSessionId,
          timeSpentMs: Date.now() - openedAt,
          source: PaywallSource.SETTINGS_UPGRADE,
          productId: selectedPackage.product.identifier,
          plan: selectedPlan,
          tab: selectedTab,
        });
        router.back();
        return;
      }

      setIsPurchasing(false);
    } catch (error: any) {
      if (
        error.userCancelled ||
        error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      ) {
        trackPaywallEvent('purchase_cancelled', {
          paywallSessionId,
          plan: selectedPlan,
          tab: selectedTab,
          productId: selectedPackage.product.identifier,
        });
        setIsPurchasing(false);
        return;
      }

      if (error.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
        await Purchases.syncPurchases();
        router.back();
        setIsPurchasing(false);
        return;
      }

      if (error.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
        router.back();
        setIsPurchasing(false);
        return;
      }

      if (error.code === PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR) {
        setIsPurchasing(false);
        return;
      }

      setErrorMessage(getErrorMessage(error.code));
      trackPaywallEvent('purchase_failed', {
        paywallSessionId,
        plan: selectedPlan,
        tab: selectedTab,
        productId: selectedPackage.product.identifier,
        error: error.message,
        errorCode: error.code,
        readableErrorCode: error.readableErrorCode,
      });
      setIsPurchasing(false);
    }
  }, [
    selectedPackage,
    isPurchasing,
    paywallSessionId,
    selectedPlan,
    selectedTab,
    activeOffering,
    trialEligible,
    openedAt,
    router,
  ]);

  const handleRestore = useCallback(async () => {
    if (isRestoring) return;
    setIsRestoring(true);

    trackPaywallEvent('restore_purchases_tapped', { paywallSessionId });

    try {
      const customerInfo = await Purchases.restoreTransactions();
      const entitlements = Object.keys(customerInfo.entitlements.active);

      trackPaywallEvent('restore_purchases_result', {
        paywallSessionId,
        success: entitlements.length > 0,
        entitlements,
      });

      if (entitlements.length > 0) {
        router.back();
      } else {
        setErrorMessage('No previous purchases found for this account.');
      }
    } catch {
      setErrorMessage("Couldn't check for purchases. Please check your connection.");
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring, paywallSessionId, router]);

  const handleRetryOfferings = useCallback(async () => {
    setPriceLoadError(false);
    setRetryCount((c) => c + 1);
    try {
      await useSubscriptionStore.getState().initialize();
    } catch (error: any) {
      setPriceLoadError(true);
      trackPaywallEvent('paywall_price_load_failed', {
        paywallSessionId,
        error: error?.message ?? 'Unknown',
        retryCount: retryCount + 1,
      });
    }
  }, [paywallSessionId, retryCount]);

  const handleApplyReferral = useCallback(async () => {
    const trimmed = referralInput.trim();
    if (!trimmed) return;
    const success = await applyCode(trimmed);
    if (success) {
      setReferralInput('');
    }
  }, [referralInput, applyCode]);

  const handleGenerateCode = useCallback(async () => {
    await generateCode();
  }, [generateCode]);

  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [referralCode]);

  // ── CTA logic ──

  const priceString = selectedPackage?.product.priceString;
  let ctaText = 'Loading...';
  let ctaDisabled = true;
  if (!selectedPackage) {
    ctaText = 'Loading...';
    ctaDisabled = true;
  } else if (trialEligible === null) {
    ctaText = 'Loading...';
    ctaDisabled = true;
  } else if (trialEligible) {
    ctaText = 'Start 14-Day Free Trial';
    ctaDisabled = false;
  } else if (priceString) {
    ctaText = `Subscribe \u{2014} ${priceString}/${selectedPlan === PaywallPlan.ANNUAL ? 'year' : 'month'}`;
    ctaDisabled = false;
  }

  let trustText = '';
  if (trialEligible === true && priceString) {
    trustText = `14-day free trial, then ${priceString}/${selectedPlan === PaywallPlan.ANNUAL ? 'year' : 'month'}. Cancel anytime.`;
  } else if (trialEligible === false && priceString) {
    trustText = `${priceString}/${selectedPlan === PaywallPlan.ANNUAL ? 'year' : 'month'}. Cancel anytime.`;
  }

  const legalText =
    Platform.OS === 'ios'
      ? 'Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless it is canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase. Any unused portion of a free trial period, if offered, will be forfeited when the user purchases a subscription to that publication, where applicable.'
      : 'Subscription automatically renews unless canceled at least 24 hours before the end of the current billing period. Manage subscriptions in Google Play Store settings.';

  // ── Render ──

  // Price load error state
  if (!currentOffering && priceLoadError) {
    return (
      <View testID={TestIDs.Paywall.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <TouchableOpacity
          testID={TestIDs.Paywall.CloseButton}
          style={[styles.closeButton, { top: insets.top + 8, backgroundColor: colors.bgSecondary }]}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Couldn&apos;t load pricing
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            Please check your connection.
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: GOLD }]}
            onPress={handleRetryOfferings}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Loading state
  if (!currentOffering) {
    return (
      <View testID={TestIDs.Paywall.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }]}>
        <TouchableOpacity
          testID={TestIDs.Paywall.CloseButton}
          style={[styles.closeButton, { top: insets.top + 8, backgroundColor: colors.bgSecondary }]}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View testID={TestIDs.Paywall.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Close Button */}
      <TouchableOpacity
        testID={TestIDs.Paywall.CloseButton}
        style={[styles.closeButton, { top: insets.top + 8, backgroundColor: colors.bgSecondary }]}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="close" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: GOLD_MUTED }]}>
            <Ionicons name="sparkles" size={32} color={GOLD} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
            Nourish Your Potential
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Everything you need to understand and enjoy your nutrition.
          </Text>
        </View>

        {/* Benefits */}
        <View style={[styles.benefitsCard, { backgroundColor: colors.bgSecondary }]}>
          {[
            { icon: '\u{1F9E0}', text: 'AI-powered nutrition insights' },
            { icon: '\u{1F4F8}', text: 'Photo food recognition' },
            { icon: '\u{1F52C}', text: 'Advanced micronutrient tracking' },
            { icon: '\u{1F4C5}', text: 'Unlimited history & data export' },
          ].map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>{b.icon}</Text>
              <Text style={[styles.benefitText, { color: colors.textPrimary }]}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* Tab Selector */}
        <View
          style={[styles.tabContainer, { backgroundColor: colors.bgSecondary }]}
          accessibilityRole="tablist"
        >
          <Pressable
            style={[
              styles.tab,
              selectedTab === PaywallTab.SINGLE_APP && [styles.tabActive, { backgroundColor: SAGE_GREEN }],
            ]}
            onPress={() => handleTabSwitch(PaywallTab.SINGLE_APP)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedTab === PaywallTab.SINGLE_APP }}
          >
            <Text
              style={[
                styles.tabText,
                { color: selectedTab === PaywallTab.SINGLE_APP ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              NutritionRx Only
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              selectedTab === PaywallTab.BUNDLE && [styles.tabActive, { backgroundColor: SAGE_GREEN }],
            ]}
            onPress={() => handleTabSwitch(PaywallTab.BUNDLE)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedTab === PaywallTab.BUNDLE }}
          >
            <Text
              style={[
                styles.tabText,
                { color: selectedTab === PaywallTab.BUNDLE ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Both Apps
            </Text>
          </Pressable>
        </View>

        {/* Plan Cards */}
        <View style={styles.plans}>
          {selectedTab === PaywallTab.SINGLE_APP ? (
            <>
              {monthlyPackage && (
                <PlanCard
                  label="Monthly"
                  priceText={`${monthlyPackage.product.priceString}/mo`}
                  selected={selectedPlan === PaywallPlan.MONTHLY}
                  onSelect={() => handlePlanSelect(PaywallPlan.MONTHLY)}
                />
              )}
              {annualPackage && (
                <PlanCard
                  label="Annual"
                  priceText={`${monthlyFromAnnual}/mo`}
                  detail={`Billed ${annualPackage.product.priceString}/yr`}
                  badge={annualSavings > 0 ? `Save ${annualSavings}%` : undefined}
                  selected={selectedPlan === PaywallPlan.ANNUAL}
                  onSelect={() => handlePlanSelect(PaywallPlan.ANNUAL)}
                />
              )}
            </>
          ) : (
            <>
              {bundleMonthlyPackage && (
                <PlanCard
                  label="Monthly"
                  priceText={`${bundleMonthlyPackage.product.priceString}/mo`}
                  badge={bundleMonthlySavings > 0 ? `Save ${bundleMonthlySavings}%` : undefined}
                  selected={selectedPlan === PaywallPlan.MONTHLY}
                  onSelect={() => handlePlanSelect(PaywallPlan.MONTHLY)}
                />
              )}
              {bundleAnnualPackage && (
                <PlanCard
                  label="Annual"
                  priceText={`${bundleMonthlyFromAnnual}/mo`}
                  detail={`Billed ${bundleAnnualPackage.product.priceString}/yr`}
                  badge={bundleAnnualSavings > 0 ? `Best Value \u{2013} Save ${bundleAnnualSavings}%` : undefined}
                  selected={selectedPlan === PaywallPlan.ANNUAL}
                  onSelect={() => handlePlanSelect(PaywallPlan.ANNUAL)}
                />
              )}
            </>
          )}
        </View>

        {/* Error */}
        {errorMessage && (
          <PaywallErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
        )}

        {/* CTA */}
        <Pressable
          testID={TestIDs.Paywall.SubscribeButton}
          style={[
            styles.ctaButton,
            { backgroundColor: GOLD },
            (ctaDisabled || isPurchasing) && { opacity: 0.5 },
          ]}
          onPress={handlePurchase}
          disabled={ctaDisabled || isPurchasing}
          accessibilityRole="button"
          accessibilityLabel={
            trialEligible
              ? `Start 14-day free trial for ${priceString} per ${selectedPlan === PaywallPlan.ANNUAL ? 'year' : 'month'}`
              : `Subscribe for ${priceString} per ${selectedPlan === PaywallPlan.ANNUAL ? 'year' : 'month'}`
          }
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaText}>{ctaText}</Text>
          )}
        </Pressable>

        {/* Trust text */}
        {trustText !== '' && (
          <Text style={[styles.trustText, { color: colors.textTertiary }]}>{trustText}</Text>
        )}

        {/* Legal */}
        <Text style={[styles.legalText, { color: colors.textTertiary }]}>{legalText}</Text>

        {/* Referral Section */}
        {isPremium ? (
          <View style={[styles.referralCard, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.referralCardHeader}>
              <Ionicons name="gift-outline" size={20} color={GOLD} />
              <Text style={[styles.referralCardTitle, { color: colors.textPrimary }]}>
                Share the Nourishment
              </Text>
            </View>
            <Text style={[styles.referralCardSubtitle, { color: colors.textSecondary }]}>
              Give a friend premium access and earn a reward when they subscribe.
            </Text>
            {referralCode ? (
              <>
                <Pressable
                  style={[styles.codePill, { backgroundColor: GOLD_MUTED }]}
                  onPress={handleCopyCode}
                  accessibilityRole="button"
                  accessibilityLabel={`Copy referral code ${referralCode}`}
                >
                  <Text style={[styles.codePillText, { color: GOLD }]}>
                    {codeCopied ? 'Copied!' : referralCode}
                  </Text>
                  <Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={14} color={GOLD} />
                </Pressable>
                <Pressable
                  style={[styles.shareButton, { backgroundColor: SAGE_GREEN }]}
                  onPress={shareReferralLink}
                  accessibilityRole="button"
                  accessibilityLabel="Share referral link"
                >
                  <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.shareButtonText}>Share Referral Link</Text>
                </Pressable>
                {rewardGranted && rewardDetails && (
                  <View style={styles.rewardBadge}>
                    <Ionicons name="trophy" size={16} color={GOLD} />
                    <Text style={[styles.rewardBadgeText, { color: colors.textSecondary }]}>
                      Reward earned: {rewardDetails.duration} free!
                    </Text>
                  </View>
                )}
                {isRedeemed && !rewardGranted && (
                  <View style={styles.rewardBadge}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.rewardBadgeText, { color: colors.textSecondary }]}>
                      Your friend signed up! Reward is on the way.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Pressable
                style={[styles.generateButton, { backgroundColor: GOLD }, referralLoading && { opacity: 0.5 }]}
                onPress={handleGenerateCode}
                disabled={referralLoading}
                accessibilityRole="button"
                accessibilityLabel="Generate referral code"
              >
                {referralLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.generateButtonText}>Get Your Referral Code</Text>
                )}
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.referralSection}>
            {appliedCode ? (
              <View style={styles.referralSuccess}>
                <Ionicons name="checkmark-circle" size={16} color={SAGE_GREEN} />
                <Text style={[styles.referralSuccessText, { color: SAGE_GREEN }]}>
                  Referral code applied!
                </Text>
              </View>
            ) : (
              <>
                <Pressable
                  style={styles.referralToggle}
                  onPress={() => setReferralExpanded(!referralExpanded)}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle referral code input"
                >
                  <Ionicons name="gift-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.referralToggleText, { color: colors.textSecondary }]}>
                    Have a referral code from a friend?
                  </Text>
                  <Ionicons
                    name={referralExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textTertiary}
                  />
                </Pressable>
                {referralExpanded && (
                  <View style={styles.referralInputContainer}>
                    <View style={styles.referralInputRow}>
                      <TextInput
                        style={[styles.referralInput, {
                          color: colors.textPrimary,
                          backgroundColor: colors.bgSecondary,
                        }]}
                        placeholder="Enter code"
                        placeholderTextColor={colors.textTertiary}
                        value={referralInput}
                        onChangeText={(text) => {
                          setReferralInput(text);
                          if (referralError) clearReferralError();
                        }}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={12}
                      />
                      <Pressable
                        style={[
                          styles.referralApplyButton,
                          { backgroundColor: SAGE_GREEN },
                          (!referralInput.trim() || referralLoading) && { opacity: 0.5 },
                        ]}
                        onPress={handleApplyReferral}
                        disabled={!referralInput.trim() || referralLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Apply referral code"
                      >
                        {referralLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.referralApplyText}>Apply</Text>
                        )}
                      </Pressable>
                    </View>
                    {referralError && (
                      <Text style={[styles.referralErrorText, { color: colors.error }]}>
                        {referralError}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Footer links */}
        <View style={styles.footer}>
          <TouchableOpacity
            testID={TestIDs.Paywall.RestoreButton}
            onPress={handleRestore}
            disabled={isPurchasing || isRestoring}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>
                Restore purchase
              </Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.footerSep, { color: colors.textTertiary }]}>|</Text>

          <TouchableOpacity
            testID={TestIDs.Paywall.TermsLink}
            onPress={() => Linking.openURL('https://cascadesoftware.com/terms')}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
          >
            <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Terms</Text>
          </TouchableOpacity>

          <Text style={[styles.footerSep, { color: colors.textTertiary }]}>|</Text>

          <TouchableOpacity
            testID={TestIDs.Paywall.PrivacyLink}
            onPress={() => Linking.openURL('https://cascadesoftware.com/privacy')}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  benefitsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitIcon: {
    fontSize: 18,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    // backgroundColor set inline
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  plans: {
    marginBottom: 8,
  },
  ctaButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trustText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  legalText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  footerLink: {
    fontSize: 13,
    paddingVertical: 4,
  },
  footerSep: {
    fontSize: 13,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorSubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  referralCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  referralCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referralCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  referralCardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  codePillText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1.5,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  generateButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardBadgeText: {
    fontSize: 13,
  },
  referralSection: {
    marginTop: 20,
  },
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  referralToggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  referralInputContainer: {
    marginTop: 8,
    gap: 8,
  },
  referralInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  referralInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  referralApplyButton: {
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralApplyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  referralErrorText: {
    fontSize: 12,
    textAlign: 'center',
  },
  referralSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  referralSuccessText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
