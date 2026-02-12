import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';
import { Platform, Alert, Linking } from 'react-native';
import { reflectionRepository } from '@/repositories/reflectionRepository';
import type { Sentiment } from '@/repositories/reflectionRepository';
import { useRouteStore } from '@/stores/routeStore';
import { trackEvent } from '@/utils/analytics';

// ── Storage Keys ──

const STORAGE_KEYS = {
  INSTALL_DATE: '@NutritionRx:installDate',
  PROMPT_DATES: '@NutritionRx:reviewPromptDates',
} as const;

// ── Eligibility Constants ──

const MIN_REFLECTIONS = 3;
const MIN_DAYS_SINCE_INSTALL = 21;
const COOLDOWN_DAYS = 90;
const MAX_PROMPTS_PER_YEAR = 3;

// Strict route matching (v2 fix #4) — exact prefixes, not broad substrings
const BLOCKED_ROUTE_PREFIXES = [
  '/add-food',
  '/food/',
  '/log-entry/',
  '/log-weight',
  '/onboarding',
  '/weekly-reflection',
];

let isPromptInFlight = false;

// ── Helpers ──

function isRouteBlocked(path: string): boolean {
  return BLOCKED_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix),
  );
}

function daysBetween(dateA: Date, dateB: Date): number {
  return Math.floor(
    Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24),
  );
}

async function getInstallDate(): Promise<Date | null> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.INSTALL_DATE);
  return stored ? new Date(stored) : null;
}

async function getPromptDates(): Promise<Date[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROMPT_DATES);
  if (!stored) return [];
  try {
    const dates: string[] = JSON.parse(stored);
    return dates.map((d) => new Date(d));
  } catch {
    return [];
  }
}

async function recordPromptDate(): Promise<void> {
  const dates = await getPromptDates();
  dates.push(new Date());
  await AsyncStorage.setItem(
    STORAGE_KEYS.PROMPT_DATES,
    JSON.stringify(dates.map((d) => d.toISOString())),
  );
}

/**
 * Build the store URL for the current platform.
 * Uses Constants.expoConfig only (v2 fix #2 — no Constants.manifest).
 */
function getAppStoreUrl(): string | null {
  const config = Constants.expoConfig;
  const extra = config?.extra as Record<string, string> | undefined;

  if (Platform.OS === 'ios') {
    return extra?.appStoreUrl ?? null;
  }
  if (Platform.OS === 'android') {
    // Fall back to constructing from package name
    if (extra?.playStoreUrl) return extra.playStoreUrl;
    const packageName = config?.android?.package;
    return packageName
      ? `https://play.google.com/store/apps/details?id=${packageName}`
      : null;
  }
  return null;
}

// ── Service ──

export const reviewPromptService = {
  /**
   * Initialize install date on first app launch.
   * Call once during app startup (idempotent).
   */
  async initializeInstallDate(): Promise<void> {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.INSTALL_DATE);
    if (!existing) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.INSTALL_DATE,
        new Date().toISOString(),
      );
    }
  },

  /**
   * Called after a successful weekly reflection submission.
   * Checks all behavioral eligibility gates, then silently requests a native
   * review prompt. No custom UI — Apple HIG compliant.
   */
  async onReflectionCompleted(sentiment: Sentiment | null): Promise<void> {
    try {
      // Gate 0: In-flight guard — prevent duplicate concurrent calls
      if (isPromptInFlight) {
        trackEvent('review_prompt_skipped', { reason: 'in_flight' });
        return;
      }

      // Gate 1: Platform availability
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) {
        trackEvent('review_prompt_skipped', { reason: 'not_available' });
        return;
      }

      // Gate 2: Minimum reflection count (3+)
      const reflectionCount = await reflectionRepository.getCount();
      if (reflectionCount < MIN_REFLECTIONS) {
        trackEvent('review_prompt_skipped', {
          reason: 'insufficient_reflections',
          count: reflectionCount,
        });
        return;
      }

      // Gate 3: Minimum days since install (21+)
      const installDate = await getInstallDate();
      if (!installDate) {
        trackEvent('review_prompt_skipped', { reason: 'no_install_date' });
        return;
      }
      const daysSinceInstall = daysBetween(new Date(), installDate);
      if (daysSinceInstall < MIN_DAYS_SINCE_INSTALL) {
        trackEvent('review_prompt_skipped', {
          reason: 'too_soon',
          days: daysSinceInstall,
        });
        return;
      }

      // Gate 4: Cooldown (90 days since last prompt)
      const promptDates = await getPromptDates();
      if (promptDates.length > 0) {
        const lastPrompt = promptDates[promptDates.length - 1];
        const daysSinceLastPrompt = daysBetween(new Date(), lastPrompt);
        if (daysSinceLastPrompt < COOLDOWN_DAYS) {
          trackEvent('review_prompt_skipped', {
            reason: 'cooldown',
            days: daysSinceLastPrompt,
          });
          return;
        }
      }

      // Gate 5: Rolling annual cap (max 3 per 365 days)
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);
      const recentPrompts = promptDates.filter((d) => d > oneYearAgo);
      if (recentPrompts.length >= MAX_PROMPTS_PER_YEAR) {
        trackEvent('review_prompt_skipped', {
          reason: 'annual_cap',
          count: recentPrompts.length,
        });
        return;
      }

      // Gate 6: Sentiment — block only 'negative'
      if (sentiment === 'negative') {
        trackEvent('review_prompt_skipped', { reason: 'negative_sentiment' });
        return;
      }

      // Gate 7: Route guard — don't prompt during active input
      const currentPath = useRouteStore.getState().currentPath;
      if (isRouteBlocked(currentPath)) {
        trackEvent('review_prompt_skipped', {
          reason: 'blocked_route',
          route: currentPath,
        });
        return;
      }

      // ── All gates passed — request native review ──
      isPromptInFlight = true;
      trackEvent('review_prompt_requested', {
        reflectionCount,
        daysSinceInstall,
        promptCount: recentPrompts.length + 1,
        sentiment: sentiment ?? 'none',
      });

      await StoreReview.requestReview();
      await recordPromptDate();

      trackEvent('review_prompt_completed', {});
    } catch (error) {
      trackEvent('review_prompt_error', { error: String(error) });
      if (__DEV__) console.error('Review prompt failed:', error);
    } finally {
      isPromptInFlight = false;
    }
  },

  /**
   * Get the direct review URL for the current platform's store.
   * Safely appends query param (v2 fix #3 — ? vs &).
   */
  getStoreReviewUrl(): string | null {
    const baseUrl = getAppStoreUrl();
    if (!baseUrl) return null;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}action=write-review`;
  },

  /**
   * Opens the store page for rating. Used by Settings "Rate NutritionRx" row.
   * Shows a fallback alert if the URL can't be determined (v2 fix #1).
   */
  async handleRateApp(): Promise<void> {
    trackEvent('rate_app_tapped', {});

    const url = reviewPromptService.getStoreReviewUrl();
    if (!url) {
      Alert.alert(
        'Rate NutritionRx',
        'Search for "NutritionRx" on the App Store or Google Play to leave a review.',
        [{ text: 'OK' }],
      );
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Rate NutritionRx',
        'Search for "NutritionRx" on the App Store or Google Play to leave a review.',
        [{ text: 'OK' }],
      );
    }
  },

  /** @internal Exposed for testing only. */
  _resetInFlightForTesting(): void {
    isPromptInFlight = false;
  },
};
