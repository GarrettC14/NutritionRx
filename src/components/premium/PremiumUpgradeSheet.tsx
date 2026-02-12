import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  ScrollView,
  Pressable,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Purchases, {
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
  INTRO_ELIGIBILITY_STATUS,
} from 'react-native-purchases';
import { useTheme } from '@/hooks/useTheme';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { usePremiumSheetStore } from './usePremiumSheetStore';
import { PaywallCategory, PaywallSource } from './analyticsEnums';
import { PremiumUpgradeContent } from './PremiumUpgradeContent';
import { PremiumFeatureChips } from './PremiumFeatureChips';
import { PaywallErrorBanner } from './PaywallErrorBanner';
import { trackPaywallEvent } from '@/utils/paywallAnalytics';
import { REVENUECAT_CONFIG } from '@/config/revenuecat';
import { getErrorMessage } from './purchaseErrorMap';

const GOLD = '#C9953C';
const GOLD_MUTED = 'rgba(201, 149, 60, 0.15)';

export function PremiumUpgradeSheet() {
  const { colors, isDark } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);

  const { isVisible, category, featureName, sessionId, openedAt, hidePremiumSheet } =
    usePremiumSheetStore();
  const { currentOffering, isPremium } = useSubscriptionStore();

  const [activeCategory, setActiveCategory] = useState<PaywallCategory>(
    PaywallCategory.AI_INSIGHTS,
  );
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const snapPoints = useMemo(() => ['85%'], []);

  // Get monthly package from offering
  const monthlyPackage: PurchasesPackage | undefined = useMemo(
    () =>
      currentOffering?.availablePackages.find((p) => p.packageType === 'MONTHLY'),
    [currentOffering],
  );

  // Sync active category when sheet opens with a specific category
  useEffect(() => {
    if (isVisible && category) {
      setActiveCategory(category);
      setErrorMessage(null);
    }
  }, [isVisible, category]);

  // Open/close the sheet
  useEffect(() => {
    if (isVisible && !isPremium) {
      sheetRef.current?.snapToIndex(0);
      if (sessionId) {
        trackPaywallEvent('premium_sheet_viewed', {
          paywallSessionId: sessionId,
          category: category ?? 'unknown',
          featureName: featureName ?? 'unknown',
          source: PaywallSource.LOCKED_CONTENT,
        });
      }
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible, isPremium, sessionId, category, featureName]);

  // Check trial eligibility for the monthly package
  useEffect(() => {
    if (!isVisible || !monthlyPackage) {
      setTrialEligible(null);
      return;
    }

    let cancelled = false;
    setTrialEligible(null); // loading state

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setTrialEligible(false);
        trackPaywallEvent('trial_eligibility_check_result', {
          paywallSessionId: sessionId,
          status: 'timeout',
          platform: Platform.OS,
        });
      }
    }, 5000);

    (async () => {
      try {
        let eligible = false;
        if (Platform.OS === 'ios') {
          const productId = monthlyPackage.product.identifier;
          const result =
            await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
          eligible =
            result[productId]?.status ===
            INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
        } else {
          eligible = monthlyPackage.product.introPrice != null;
        }
        if (!cancelled) {
          setTrialEligible(eligible);
          trackPaywallEvent('trial_eligibility_check_result', {
            paywallSessionId: sessionId,
            status: eligible ? 'eligible' : 'ineligible',
            platform: Platform.OS,
          });
        }
      } catch {
        if (!cancelled) {
          setTrialEligible(false);
          trackPaywallEvent('trial_eligibility_check_result', {
            paywallSessionId: sessionId,
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
  }, [isVisible, monthlyPackage, sessionId]);

  const handleDismiss = useCallback(() => {
    if (sessionId && openedAt) {
      trackPaywallEvent('paywall_dismissed', {
        paywallSessionId: sessionId,
        timeSpentMs: Date.now() - openedAt,
        source: PaywallSource.LOCKED_CONTENT,
        lastCategory: activeCategory,
      });
    }
    hidePremiumSheet();
  }, [sessionId, openedAt, activeCategory, hidePremiumSheet]);

  const handlePurchase = useCallback(async () => {
    if (!monthlyPackage || isPurchasing) return;

    setIsPurchasing(true);
    setErrorMessage(null);

    trackPaywallEvent('purchase_initiated', {
      paywallSessionId: sessionId,
      plan: 'monthly',
      tab: 'nutritionrx_only',
      productId: monthlyPackage.product.identifier,
      offeringId: currentOffering?.identifier ?? '',
      trialEligible: trialEligible === true,
    });

    try {
      const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
      const hasPremium =
        customerInfo.entitlements.active[
          REVENUECAT_CONFIG.entitlements.NUTRITIONRX_PREMIUM
        ] !== undefined ||
        customerInfo.entitlements.active[
          REVENUECAT_CONFIG.entitlements.CASCADE_BUNDLE
        ] !== undefined;

      if (hasPremium && sessionId && openedAt) {
        trackPaywallEvent('purchase_completed', {
          paywallSessionId: sessionId,
          plan: 'monthly',
          tab: 'nutritionrx_only',
          productId: monthlyPackage.product.identifier,
          offeringId: currentOffering?.identifier ?? '',
          revenue: monthlyPackage.product.price,
          currency: monthlyPackage.product.currencyCode,
        });
        trackPaywallEvent('paywall_converted', {
          paywallSessionId: sessionId,
          timeSpentMs: Date.now() - openedAt,
          source: PaywallSource.LOCKED_CONTENT,
          productId: monthlyPackage.product.identifier,
          plan: 'monthly',
          tab: 'nutritionrx_only',
        });
      }

      hidePremiumSheet();
    } catch (error: any) {
      if (
        error.userCancelled ||
        error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      ) {
        trackPaywallEvent('purchase_cancelled', {
          paywallSessionId: sessionId,
          plan: 'monthly',
          tab: 'nutritionrx_only',
          productId: monthlyPackage.product.identifier,
        });
        setIsPurchasing(false);
        return;
      }

      if (error.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
        await Purchases.syncPurchases();
        hidePremiumSheet();
        setIsPurchasing(false);
        return;
      }

      if (error.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
        hidePremiumSheet();
        setIsPurchasing(false);
        return;
      }

      if (error.code === PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR) {
        setIsPurchasing(false);
        return;
      }

      setErrorMessage(getErrorMessage(error.code));
      trackPaywallEvent('purchase_failed', {
        paywallSessionId: sessionId,
        plan: 'monthly',
        tab: 'nutritionrx_only',
        productId: monthlyPackage.product.identifier,
        error: error.message,
        errorCode: error.code,
        readableErrorCode: error.readableErrorCode,
      });
    } finally {
      setIsPurchasing(false);
    }
  }, [
    monthlyPackage,
    isPurchasing,
    sessionId,
    openedAt,
    currentOffering,
    trialEligible,
    hidePremiumSheet,
  ]);

  const handleRestore = useCallback(async () => {
    if (isRestoring) return;
    setIsRestoring(true);

    trackPaywallEvent('restore_purchases_tapped', { paywallSessionId: sessionId });

    try {
      const customerInfo = await Purchases.restoreTransactions();
      const entitlements = Object.keys(customerInfo.entitlements.active);

      trackPaywallEvent('restore_purchases_result', {
        paywallSessionId: sessionId,
        success: entitlements.length > 0,
        entitlements,
      });

      if (entitlements.length > 0) {
        hidePremiumSheet();
      } else {
        setErrorMessage('No previous purchases found for this account.');
      }
    } catch {
      setErrorMessage("Couldn't check for purchases. Please check your connection.");
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring, sessionId, hidePremiumSheet]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        // Sheet fully closed
        if (isVisible) handleDismiss();
      }
    },
    [isVisible, handleDismiss],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
        accessibilityLabel="Close"
      />
    ),
    [],
  );

  const priceString = monthlyPackage?.product.priceString;

  // CTA text
  let ctaText = 'Loading...';
  let ctaDisabled = true;
  if (trialEligible === null) {
    ctaText = 'Loading...';
    ctaDisabled = true;
  } else if (trialEligible) {
    ctaText = 'Start 14-Day Free Trial';
    ctaDisabled = false;
  } else if (priceString) {
    ctaText = `Subscribe \u{2014} ${priceString}/month`;
    ctaDisabled = false;
  }

  // Trust text
  let trustText = '';
  if (trialEligible === true && priceString) {
    trustText = `14-day free trial, then ${priceString}/month. Cancel anytime.`;
  } else if (trialEligible === false && priceString) {
    trustText = `${priceString}/month. Cancel anytime.`;
  }

  // Legal disclosure
  const legalText =
    Platform.OS === 'ios'
      ? 'Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless it is canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase.'
      : 'Subscription automatically renews unless canceled at least 24 hours before the end of the current billing period. Manage subscriptions in Google Play Store settings.';

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: colors.textTertiary }}
      backgroundStyle={{ backgroundColor: colors.bgElevated }}
      accessibilityViewIsModal
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.bgSecondary }]}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Gold sparkles icon */}
        <View style={[styles.iconCircle, { backgroundColor: GOLD_MUTED }]}>
          <Ionicons name="sparkles" size={28} color={GOLD} />
        </View>

        {/* Dynamic content */}
        <PremiumUpgradeContent category={activeCategory} />

        {/* Feature chips */}
        <PremiumFeatureChips
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Price */}
        {priceString && (
          <Text style={[styles.priceText, { color: colors.textPrimary }]}>
            {priceString}/month
          </Text>
        )}

        {/* Error */}
        {errorMessage && (
          <PaywallErrorBanner
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* CTA */}
        <Pressable
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
              ? `Start 14-day free trial for ${priceString} per month`
              : `Subscribe for ${priceString} per month`
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
          <Text style={[styles.trustText, { color: colors.textTertiary }]}>
            {trustText}
          </Text>
        )}

        {/* Legal disclosure */}
        <Text style={[styles.legalText, { color: colors.textTertiary }]}>
          {legalText}
        </Text>

        {/* Footer links */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleRestore}
            disabled={isRestoring}
            accessibilityRole="button"
            accessibilityLabel="Restore purchase"
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
            onPress={() => Linking.openURL('https://cascadesoftware.com/terms')}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
          >
            <Text style={[styles.footerLink, { color: colors.textSecondary }]}>
              Terms
            </Text>
          </TouchableOpacity>

          <Text style={[styles.footerSep, { color: colors.textTertiary }]}>|</Text>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://cascadesoftware.com/privacy')}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <Text style={[styles.footerLink, { color: colors.textSecondary }]}>
              Privacy
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  ctaButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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
});
