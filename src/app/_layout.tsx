import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Platform, Linking, LogBox, useColorScheme } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useNavigationContainerRef, usePathname } from 'expo-router';
import Constants from 'expo-constants';
import { scrubSensitiveData, NUTRITION_PATTERN } from '@/utils/sentryHelpers';

// Suppress on-screen LogBox bars so they don't intercept Maestro E2E taps.
// Warnings still appear in Metro console / logcat.
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}
// Allow font scaling for accessibility, cap at 2× to prevent layout breakage
(Text as any).defaultProps = { ...(Text as any).defaultProps, maxFontSizeMultiplier: 2.0 };
(TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, maxFontSizeMultiplier: 1.5 };

// ── Sentry Initialization (module scope — runs once on import) ──

const routingInstrumentation = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN) && !__DEV__,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  environment: __DEV__ ? 'development' : 'production',
  integrations: [routingInstrumentation],

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.data) scrubSensitiveData(breadcrumb.data);
    if (breadcrumb.message) {
      breadcrumb.message = breadcrumb.message.replace(NUTRITION_PATTERN, '[redacted]');
    }
    return breadcrumb;
  },

  beforeSend(event) {
    // Drop common mobile network errors
    if (event.exception?.values?.[0]?.value?.includes('Network request failed')) {
      return null;
    }
    if (event.extra) scrubSensitiveData(event.extra as Record<string, any>);
    if (event.contexts) scrubSensitiveData(event.contexts as Record<string, any>);
    if (event.tags) {
      const sensitiveKeys = ['calories', 'protein', 'carbs', 'fat', 'weight', 'food', 'meal', 'serving', 'macros', 'grams', 'intake'];
      for (const key of Object.keys(event.tags)) {
        if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
          delete event.tags[key];
        }
      }
    }
    return event;
  },
});

// Set app version tag once at startup
Sentry.setTag('app_version', Constants.expoConfig?.version ?? 'unknown');

// ── Imports (after Sentry.init so it can instrument them) ──

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { initDatabase } from '@/db/database';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { TooltipProvider } from '@/contexts/TooltipContext';
import { TooltipModal } from '@/components/ui/TooltipModal';
import { ConfirmDialogProvider } from '@/contexts/ConfirmDialogContext';
import { useTheme } from '@/hooks/useTheme';
import { REVENUECAT_CONFIG } from '@/config/revenuecat';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { PremiumUpgradeSheet } from '@/components/premium/PremiumUpgradeSheet';
import { useRouteStore } from '@/stores/routeStore';
import { reviewPromptService } from '@/services/reviewPromptService';
import { useReferralStore } from '@/stores/useReferralStore';
import { useRouter } from '@/hooks/useRouter';

function ThemedBackground({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      {children}
    </View>
  );
}

function RootLayoutContent() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'default', // Platform-native push/pop animations
          gestureEnabled: Platform.OS === 'ios', // iOS swipe back gesture
          contentStyle: { backgroundColor: colors.bgPrimary },
        }}
      >
        {/* App initializer - no animation needed */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />

        {/* Main tabs - no animation (handled by tab navigator) */}
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />

        {/* Legal acknowledgment - full screen, no back */}
        <Stack.Screen
          name="legal-acknowledgment"
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }}
        />

        {/* Legal terms - pushed from legal acknowledgment, back only */}
        <Stack.Screen
          name="legal-terms"
          options={{
            gestureEnabled: false,
          }}
        />

        {/* Full screen onboarding flow — no back gesture */}
        <Stack.Screen
          name="onboarding"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />

        {/* Settings nested stack - default push animation */}
        <Stack.Screen name="settings" />

        {/* Add food - treated as pseudo-tab, no animation from tabs */}
        <Stack.Screen name="add-food" options={{ animation: 'none' }} />

        {/* Daily insights - default push animation */}
        <Stack.Screen name="daily-insights" />

        {/* Detail screens - default platform push animation */}
        <Stack.Screen name="food/[id]" />

        {/* Modal forms - slide up from bottom */}
        <Stack.Screen
          name="log-entry/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="log-weight"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="weekly-reflection"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />

        {/* Micronutrients detail - pushed screen */}
        <Stack.Screen name="micronutrients" />

        {/* Progress Photos - pushed screen with default animation */}
        <Stack.Screen name="progress-photos" />

        {/* Progress Photos Capture - modal slide up */}
        <Stack.Screen
          name="progress-photos/capture"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />

        {/* Progress Photos Compare - modal slide up */}
        <Stack.Screen
          name="progress-photos/compare"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />

        {/* Paywall - full screen modal, no swipe dismiss */}
        <Stack.Screen
          name="paywall"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
      </Stack>
    </>
  );
}

function RouteTracker() {
  const pathname = usePathname();
  const setCurrentPath = useRouteStore((s) => s.setCurrentPath);

  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname, setCurrentPath]);

  return null;
}

function ReferralLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const match = event.url.match(
        /app\.cascademobile\.dev\/refer\/nutritionrx\/([A-Za-z0-9]+)/,
      );
      if (match?.[1]) {
        useReferralStore.getState().setPendingReferralCode(match[1]);
        router.push('/paywall?context=referral&showReferralInput=true');
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, [router]);

  return null;
}

function RootLayout() {
  const systemScheme = useColorScheme();
  const initBg = systemScheme === 'light' ? '#FFFFFF' : '#0D1117';
  const [dbReady, setDbReady] = useState(false);
  const [purchasesReady, setPurchasesReady] = useState(false);
  const initializeSubscription = useSubscriptionStore((state) => state.initialize);
  const navigationRef = useNavigationContainerRef();

  // Register Sentry navigation instrumentation
  useEffect(() => {
    if (navigationRef?.current) {
      routingInstrumentation.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  useEffect(() => {
    // Initialize database and purchases in parallel — purchases uses
    // AsyncStorage (not SQLite), so it doesn't need to wait for the DB.
    initDatabase()
      .then(() => setDbReady(true))
      .catch((error) => {
        Sentry.captureException(error, { tags: { feature: 'database', action: 'init' } });
        if (__DEV__) console.error('Database initialization failed:', error);
        setDbReady(true); // Still proceed to show error state
      });

    const initPurchases = async () => {
      if (!REVENUECAT_CONFIG.apiKey) {
        if (__DEV__) console.warn('[RevenueCat] Skipping init — no API key configured');
        setPurchasesReady(true);
        return;
      }

      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        await Purchases.configure({ apiKey: REVENUECAT_CONFIG.apiKey });
        await initializeSubscription();
        setPurchasesReady(true);
      } catch (error) {
        Sentry.captureException(error, { tags: { feature: 'subscription', action: 'init' } });
        if (__DEV__) console.error('Failed to initialize purchases:', error);
        setPurchasesReady(true); // Still proceed even if purchases fail
      }
    };

    initPurchases();

    // Record install date for review prompt eligibility (idempotent)
    reviewPromptService.initializeInstallDate().catch(() => {});
  }, [initializeSubscription]);

  // Wait for database and purchases before rendering routes
  if (!dbReady || !purchasesReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: initBg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: initBg }}>
          <ActivityIndicator size="large" color={systemScheme === 'light' ? '#0969DA' : '#58a6ff'} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NetworkProvider>
            <ThemedBackground>
              <BottomSheetModalProvider>
                <TooltipProvider>
                  <ConfirmDialogProvider>
                    <RootLayoutContent />
                    <RouteTracker />
                    <ReferralLinkHandler />
                    <PremiumUpgradeSheet />
                    <TooltipModal />
                  </ConfirmDialogProvider>
                </TooltipProvider>
              </BottomSheetModalProvider>
            </ThemedBackground>
          </NetworkProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
