/**
 * Premium Feature Hook
 * Manages premium feature access and gating
 *
 * This is a placeholder implementation. In production, this would
 * connect to a subscription service (RevenueCat, Stripe, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_STORAGE_KEY = '@premium_status';

// Premium features enum
export enum PremiumFeature {
  AIPhoto = 'ai_photo',
  RestaurantDatabase = 'restaurant_database',
  AdvancedAnalytics = 'advanced_analytics',
  UnlimitedHistory = 'unlimited_history',
}

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  expirationDate: Date | null;
}

// Feature availability for free users (can use limited times for discovery)
const FREE_TIER_LIMITS: Partial<Record<PremiumFeature, number>> = {
  [PremiumFeature.AIPhoto]: 30, // 30 per day
  [PremiumFeature.RestaurantDatabase]: -1, // Always available but shows premium prompt
};

export function usePremium() {
  const [state, setState] = useState<PremiumState>({
    isPremium: false,
    isLoading: true,
    expirationDate: null,
  });

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({
          isPremium: parsed.isPremium || false,
          isLoading: false,
          expirationDate: parsed.expirationDate ? new Date(parsed.expirationDate) : null,
        });
      } else {
        setState({ isPremium: false, isLoading: false, expirationDate: null });
      }
    } catch (error) {
      console.error('Failed to load premium status:', error);
      setState({ isPremium: false, isLoading: false, expirationDate: null });
    }
  };

  // Check if a specific feature is available
  const canUseFeature = useCallback(
    (feature: PremiumFeature): boolean => {
      if (state.isPremium) return true;

      // Check free tier limits
      const limit = FREE_TIER_LIMITS[feature];
      if (limit === -1) return true; // Always available for discovery
      if (limit === undefined) return false; // Premium only
      return true; // Has free tier
    },
    [state.isPremium]
  );

  // Show premium prompt for a feature
  const showPremiumPrompt = useCallback((feature: PremiumFeature) => {
    // This would trigger a premium upgrade modal/screen
    // For now, we'll just log it
    console.log(`Premium prompt for feature: ${feature}`);
  }, []);

  // Unlock premium (for testing/development)
  const unlockPremium = useCallback(async (duration: 'month' | 'year' = 'month') => {
    const expirationDate = new Date();
    if (duration === 'month') {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    } else {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    }

    const newState = {
      isPremium: true,
      expirationDate: expirationDate.toISOString(),
    };

    await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(newState));
    setState({
      isPremium: true,
      isLoading: false,
      expirationDate,
    });
  }, []);

  // Revoke premium (for testing/development)
  const revokePremium = useCallback(async () => {
    await AsyncStorage.removeItem(PREMIUM_STORAGE_KEY);
    setState({
      isPremium: false,
      isLoading: false,
      expirationDate: null,
    });
  }, []);

  return {
    ...state,
    canUseFeature,
    showPremiumPrompt,
    unlockPremium,
    revokePremium,
    reloadStatus: loadPremiumStatus,
  };
}

// Get feature display name
export function getFeatureDisplayName(feature: PremiumFeature): string {
  switch (feature) {
    case PremiumFeature.AIPhoto:
      return 'AI Food Photo Recognition';
    case PremiumFeature.RestaurantDatabase:
      return 'Restaurant Database';
    case PremiumFeature.AdvancedAnalytics:
      return 'Advanced Analytics';
    case PremiumFeature.UnlimitedHistory:
      return 'Unlimited History';
    default:
      return 'Premium Feature';
  }
}
