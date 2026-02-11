/**
 * PremiumGate Component Tests
 *
 * Tests the premium gating wrapper that intercepts taps for non-premium users
 * and redirects them to the paywall.
 */

// --- Mocks (must be before imports) ---

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('@/hooks/useRouter', () => ({
  useRouter: jest.fn(() => ({ push: mockPush, back: mockBack })),
}));

jest.mock('react-native-purchases', () => ({
  getOfferings: jest.fn(),
  getCustomerInfo: jest.fn(),
  addCustomerInfoUpdateListener: jest.fn(),
  invalidateCustomerInfoCache: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
}));

jest.mock('@/config/revenuecat', () => ({
  REVENUECAT_CONFIG: {
    apiKey: 'test-api-key',
    entitlements: {
      GYMRX_PREMIUM: 'gymrx_premium',
      NUTRITIONRX_PREMIUM: 'nutritionrx_premium',
      BUNDLE_PREMIUM: 'bundle_premium',
    },
    defaultOffering: 'default',
  },
  APP_ID: 'nutritionrx',
  APP_ENTITLEMENT: 'nutritionrx_premium',
}));

// Override the react-native moduleNameMapper mock with one that includes TouchableOpacity
jest.mock('react-native', () => {
  const React = require('react');

  const View = React.forwardRef((props: any, ref: any) => {
    return React.createElement('View', { ...props, ref });
  });
  View.displayName = 'View';

  const Text = React.forwardRef((props: any, ref: any) => {
    return React.createElement('Text', { ...props, ref });
  });
  Text.displayName = 'Text';

  const TouchableOpacity = React.forwardRef((props: any, ref: any) => {
    return React.createElement('TouchableOpacity', { ...props, ref });
  });
  TouchableOpacity.displayName = 'TouchableOpacity';

  return {
    View,
    Text,
    TouchableOpacity,
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => {
        if (Array.isArray(style)) {
          return style.reduce((acc: any, curr: any) => ({ ...acc, ...curr }), {});
        }
        return style || {};
      },
    },
    Platform: {
      OS: 'ios',
      select: (options: Record<string, any>) => options.ios ?? options.default,
    },
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

describe('PremiumGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to non-premium by default
    useSubscriptionStore.setState({ isPremium: false });
  });

  describe('when user is premium', () => {
    beforeEach(() => {
      useSubscriptionStore.setState({ isPremium: true });
    });

    it('renders children directly without a wrapper', () => {
      const { getByText } = render(
        <PremiumGate>
          <Text>Premium Content</Text>
        </PremiumGate>
      );

      expect(getByText('Premium Content')).toBeTruthy();
    });

    it('does not navigate to paywall on tap', () => {
      const { getByText } = render(
        <PremiumGate context="test_feature">
          <Text>Premium Content</Text>
        </PremiumGate>
      );

      // Children are rendered directly as a fragment, no TouchableOpacity wrapping
      expect(getByText('Premium Content')).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not call onPremiumRequired callback', () => {
      const onPremiumRequired = jest.fn();
      render(
        <PremiumGate onPremiumRequired={onPremiumRequired}>
          <Text>Premium Content</Text>
        </PremiumGate>
      );

      // Premium users see children directly, no interception
      expect(onPremiumRequired).not.toHaveBeenCalled();
    });
  });

  describe('when user is NOT premium', () => {
    beforeEach(() => {
      useSubscriptionStore.setState({ isPremium: false });
    });

    it('renders children inside a touchable wrapper', () => {
      const { getByText } = render(
        <PremiumGate>
          <Text>Locked Content</Text>
        </PremiumGate>
      );

      expect(getByText('Locked Content')).toBeTruthy();
    });

    it('navigates to paywall with default context on tap', () => {
      const { getByText } = render(
        <PremiumGate>
          <Text>Locked Content</Text>
        </PremiumGate>
      );

      fireEvent.press(getByText('Locked Content'));

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/paywall?context=general');
    });

    it('navigates to paywall with custom context on tap', () => {
      const { getByText } = render(
        <PremiumGate context="restaurant_feature">
          <Text>Locked Content</Text>
        </PremiumGate>
      );

      fireEvent.press(getByText('Locked Content'));

      expect(mockPush).toHaveBeenCalledWith('/paywall?context=restaurant_feature');
    });

    it('calls onPremiumRequired callback before navigating', () => {
      const onPremiumRequired = jest.fn();
      const { getByText } = render(
        <PremiumGate context="ai_photo" onPremiumRequired={onPremiumRequired}>
          <Text>Locked Content</Text>
        </PremiumGate>
      );

      fireEvent.press(getByText('Locked Content'));

      expect(onPremiumRequired).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/paywall?context=ai_photo');
    });

    it('disables pointer events on children so taps go to the gate', () => {
      const { getByText } = render(
        <PremiumGate>
          <Text>Locked Content</Text>
        </PremiumGate>
      );

      // The child is wrapped with pointerEvents="none", so the gate captures the tap
      fireEvent.press(getByText('Locked Content'));

      // The gate navigates to paywall
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('context parameter', () => {
    it('defaults to "general" when no context is provided', () => {
      useSubscriptionStore.setState({ isPremium: false });

      const { getByText } = render(
        <PremiumGate>
          <Text>Content</Text>
        </PremiumGate>
      );

      fireEvent.press(getByText('Content'));
      expect(mockPush).toHaveBeenCalledWith('/paywall?context=general');
    });

    it('passes through feature-specific context strings', () => {
      useSubscriptionStore.setState({ isPremium: false });

      const contexts = ['ai_photo', 'restaurant_database', 'advanced_analytics'];

      contexts.forEach((ctx) => {
        mockPush.mockClear();

        const { getByText, unmount } = render(
          <PremiumGate context={ctx}>
            <Text>Content</Text>
          </PremiumGate>
        );

        fireEvent.press(getByText('Content'));
        expect(mockPush).toHaveBeenCalledWith(`/paywall?context=${ctx}`);
        unmount();
      });
    });
  });

  describe('premium state transitions', () => {
    it('switches from gated to ungated when user becomes premium', () => {
      useSubscriptionStore.setState({ isPremium: false });

      const { getByText, rerender } = render(
        <PremiumGate>
          <Text>Content</Text>
        </PremiumGate>
      );

      // Tap triggers paywall when not premium
      fireEvent.press(getByText('Content'));
      expect(mockPush).toHaveBeenCalledTimes(1);

      // User becomes premium
      useSubscriptionStore.setState({ isPremium: true });
      mockPush.mockClear();

      rerender(
        <PremiumGate>
          <Text>Content</Text>
        </PremiumGate>
      );

      // Content is now directly rendered (no gate wrapper)
      expect(getByText('Content')).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
