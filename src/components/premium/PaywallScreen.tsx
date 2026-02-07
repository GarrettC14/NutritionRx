import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage } from 'react-native-purchases';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { TestIDs } from '@/constants/testIDs';

import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useTheme } from '@/hooks/useTheme';

// ============================================
// CONTEXT CONFIGURATION
// ============================================

type PaywallContext =
  | 'ai_photo'
  | 'restaurant'
  | 'insights'
  | 'analytics'
  | 'planning'
  | 'coaching'
  | 'general';

interface ContextConfig {
  header: string;
  benefits: string[];
}

const CONTEXT_CONFIG: Record<PaywallContext, ContextConfig> = {
  ai_photo: {
    header: 'AI Food Recognition',
    benefits: [
      'Snap a photo, get instant macros',
      'Works with home-cooked meals',
      '30 scans per day',
    ],
  },
  restaurant: {
    header: 'Restaurant Menus',
    benefits: [
      '100+ restaurant chains',
      'Full nutrition data',
      'Search any menu item',
    ],
  },
  insights: {
    header: 'Smart Insights',
    benefits: [
      'AI-powered daily analysis',
      'Personalized recommendations',
      'Trend detection',
    ],
  },
  analytics: {
    header: 'Advanced Analytics',
    benefits: [
      'Extended history (90d, 1yr, all-time)',
      'Micronutrient tracking',
      'Export your data anytime',
    ],
  },
  planning: {
    header: 'Meal Planning',
    benefits: [
      'Custom macro cycling',
      'Meal prep mode',
      'Intermittent fasting timer',
    ],
  },
  coaching: {
    header: 'Advanced Coaching',
    benefits: [
      'Smart RIR coaching',
      'Training periodization',
      'Recovery recommendations',
    ],
  },
  general: {
    header: 'Unlock Premium',
    benefits: ['All premium features', 'No ads, no limits', 'Priority support'],
  },
};

// ============================================
// COMPONENT
// ============================================

export function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const params = useLocalSearchParams<{ context?: string }>();

  const { currentOffering, error, purchasePackage, restorePurchases, clearError } =
    useSubscriptionStore();

  const [selectedPackage, setSelectedPackage] = useState<'monthly' | 'annual' | 'bundle'>(
    'annual'
  );
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Get context-specific content
  const context = (params.context as PaywallContext) || 'general';
  const contextConfig = CONTEXT_CONFIG[context];

  // Get packages from offering
  const monthlyPackage = currentOffering?.availablePackages.find(
    (p) => p.packageType === 'MONTHLY'
  );
  const annualPackage = currentOffering?.availablePackages.find(
    (p) => p.packageType === 'ANNUAL'
  );
  const bundlePackage = currentOffering?.availablePackages.find(
    (p) => p.identifier === 'bundle'
  );

  // Calculate savings
  const getAnnualSavings = () => {
    if (!monthlyPackage || !annualPackage) return 0;
    const monthlyAnnual = monthlyPackage.product.price * 12;
    const annual = annualPackage.product.price;
    return Math.round(((monthlyAnnual - annual) / monthlyAnnual) * 100);
  };

  const handlePurchase = useCallback(async () => {
    let pkg: PurchasesPackage | undefined;

    switch (selectedPackage) {
      case 'monthly':
        pkg = monthlyPackage;
        break;
      case 'annual':
        pkg = annualPackage;
        break;
      case 'bundle':
        pkg = bundlePackage;
        break;
    }

    if (!pkg) return;

    setIsPurchasing(true);
    const success = await purchasePackage(pkg);
    setIsPurchasing(false);

    if (success) {
      // Navigate back with celebration
      router.back();
      // The success celebration will be handled by the calling screen
    }
  }, [
    selectedPackage,
    monthlyPackage,
    annualPackage,
    bundlePackage,
    purchasePackage,
    router,
  ]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    const success = await restorePurchases();
    setIsRestoring(false);

    if (success) {
      router.back();
    }
  }, [restorePurchases, router]);

  const handleDismiss = useCallback(() => {
    router.back();
  }, [router]);

  // ============================================
  // STYLES (Theme-aware)
  // ============================================

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: insets.top + 16,
      paddingBottom: insets.bottom + 24,
    },
    closeButton: {
      position: 'absolute',
      top: insets.top + 8,
      right: 16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    header: {
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 32,
    },
    appIcon: {
      width: 64,
      height: 64,
      borderRadius: 14,
      backgroundColor: colors.premiumGoldMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    benefitsCard: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    benefitIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.premiumGoldMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    benefitText: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
    pricingSection: {
      marginBottom: 24,
    },
    pricingOption: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    pricingOptionSelected: {
      borderColor: colors.accent,
    },
    pricingOptionHighlighted: {
      backgroundColor: colors.accent + '1A',
    },
    pricingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pricingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    pricingBadge: {
      backgroundColor: colors.accent,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    pricingBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    pricingPrice: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 4,
    },
    pricingSubtext: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 2,
    },
    continueButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    continueButtonDisabled: {
      opacity: 0.6,
    },
    continueButtonText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 24,
    },
    footerLink: {
      paddingVertical: 8,
    },
    footerLinkText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    errorBanner: {
      backgroundColor: colors.errorBg,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      color: colors.error,
      marginLeft: 8,
    },
  });

  // ============================================
  // RENDER
  // ============================================

  if (!currentOffering) {
    return (
      <View testID={TestIDs.Paywall.Screen} style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <TouchableOpacity testID={TestIDs.Paywall.CloseButton} style={styles.closeButton} onPress={handleDismiss} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View testID={TestIDs.Paywall.Screen} style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleDismiss} accessibilityRole="button" accessibilityLabel="Close">
        <Ionicons name="close" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.appIcon}>
            <Ionicons name="nutrition" size={28} color={colors.premiumGold} />
          </View>
          <Text style={styles.title}>{contextConfig.header}</Text>
          <Text style={styles.subtitle}>Upgrade to unlock this feature</Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          {contextConfig.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name="checkmark" size={14} color={colors.premiumGold} />
              </View>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Error Banner */}
        {error && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(200)}
            exiting={reducedMotion ? undefined : FadeOut.duration(200)}
            style={styles.errorBanner}
          >
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError} accessibilityRole="button" accessibilityLabel="Dismiss error">
              <Ionicons name="close" size={18} color={colors.error} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Pricing Options */}
        <View style={styles.pricingSection}>
          {/* Monthly */}
          {monthlyPackage && (
            <TouchableOpacity
              style={[
                styles.pricingOption,
                selectedPackage === 'monthly' && styles.pricingOptionSelected,
              ]}
              onPress={() => setSelectedPackage('monthly')}
              accessibilityRole="button"
              accessibilityLabel={`Monthly plan, ${monthlyPackage.product.priceString} per month`}
            >
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingLabel}>Monthly</Text>
              </View>
              <Text style={styles.pricingPrice}>
                {monthlyPackage.product.priceString}/month
              </Text>
            </TouchableOpacity>
          )}

          {/* Annual - Best Value */}
          {annualPackage && (
            <TouchableOpacity
              style={[
                styles.pricingOption,
                styles.pricingOptionHighlighted,
                selectedPackage === 'annual' && styles.pricingOptionSelected,
              ]}
              onPress={() => setSelectedPackage('annual')}
              accessibilityRole="button"
              accessibilityLabel={`Annual plan, ${annualPackage.product.priceString} per year, save ${getAnnualSavings()}%`}
            >
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingLabel}>Annual</Text>
                <View style={styles.pricingBadge}>
                  <Text style={styles.pricingBadgeText}>SAVE {getAnnualSavings()}%</Text>
                </View>
              </View>
              <Text style={styles.pricingPrice}>
                {annualPackage.product.priceString}/year
              </Text>
              <Text style={styles.pricingSubtext}>
                Just {(annualPackage.product.price / 12).toFixed(2)}/month
              </Text>
            </TouchableOpacity>
          )}

          {/* Bundle */}
          {bundlePackage && (
            <TouchableOpacity
              style={[
                styles.pricingOption,
                selectedPackage === 'bundle' && styles.pricingOptionSelected,
              ]}
              onPress={() => setSelectedPackage('bundle')}
              accessibilityRole="button"
              accessibilityLabel={`Both Apps Bundle, ${bundlePackage.product.priceString} per year, includes GymRx and NutritionRx`}
            >
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingLabel}>Both Apps Bundle</Text>
                <View style={[styles.pricingBadge, { backgroundColor: colors.success }]}>
                  <Text style={styles.pricingBadgeText}>SAVE 40%</Text>
                </View>
              </View>
              <Text style={styles.pricingPrice}>
                {bundlePackage.product.priceString}/year
              </Text>
              <Text style={styles.pricingSubtext}>Includes GymRx + NutritionRx</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (isPurchasing || isRestoring) && styles.continueButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={isPurchasing || isRestoring}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        {/* Footer Links */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerLink}
            onPress={handleRestore}
            disabled={isPurchasing || isRestoring}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={styles.footerLinkText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => Linking.openURL('https://cascadesoftware.app/terms')}
            accessibilityRole="link"
            accessibilityLabel="Terms and Privacy"
          >
            <Text style={styles.footerLinkText}>Terms & Privacy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
