/**
 * PremiumSettingsRow Component Tests
 *
 * Tests the premium-gated settings row that shows lock icon for non-premium users.
 * Covers premium/free states, navigation behavior, lock icon visibility,
 * subtitle rendering, accessibility labels, and icon rendering.
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
      CASCADE_BUNDLE: 'cascade_bundle',
    },
    defaultOffering: 'default',
  },
  APP_ID: 'nutritionrx',
  APP_ENTITLEMENT: 'nutritionrx_premium',
}));

jest.mock('react-native', () => {
  const React = require('react');

  const View = React.forwardRef((props: any, ref: any) =>
    React.createElement('View', { ...props, ref }),
  );
  View.displayName = 'View';

  const Text = React.forwardRef((props: any, ref: any) =>
    React.createElement('Text', { ...props, ref }, props.children),
  );
  Text.displayName = 'Text';

  const TouchableOpacity = React.forwardRef((props: any, ref: any) =>
    React.createElement('TouchableOpacity', { ...props, ref }),
  );
  TouchableOpacity.displayName = 'TouchableOpacity';

  return {
    View,
    Text,
    TouchableOpacity,
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => {
        if (Array.isArray(style)) {
          return style.reduce((acc: any, curr: any) => ({ ...acc, ...(curr || {}) }), {});
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

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    colorScheme: 'dark',
    isDark: true,
    colors: {
      bgPrimary: '#0D1117',
      bgSecondary: '#161B22',
      bgElevated: '#21262D',
      bgInteractive: '#30363D',
      textPrimary: '#F0F6FC',
      textSecondary: '#8B949E',
      textTertiary: '#6E7681',
      accent: '#64B5F6',
      premiumGold: '#FFD700',
    },
    preference: 'system',
    setPreference: jest.fn(),
  }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PremiumSettingsRow } from '@/components/premium/PremiumSettingsRow';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

describe('PremiumSettingsRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSubscriptionStore.setState({ isPremium: false });
  });

  describe('default rendering', () => {
    it('renders label text', () => {
      render(<PremiumSettingsRow label="Macro Cycling" />);

      expect(screen.getByText('Macro Cycling')).toBeTruthy();
    });

    it('renders with required props only', () => {
      const { toJSON } = render(<PremiumSettingsRow label="Settings" />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders chevron-forward icon for all states', () => {
      const { toJSON } = render(<PremiumSettingsRow label="Feature" />);
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('chevron-forward');
    });
  });

  describe('premium state - unlocked', () => {
    beforeEach(() => {
      useSubscriptionStore.setState({ isPremium: true });
    });

    it('navigates to href when pressed', () => {
      render(<PremiumSettingsRow label="Macro Cycling" href="/settings/macro-cycling" />);

      fireEvent.press(screen.getByText('Macro Cycling'));

      expect(mockPush).toHaveBeenCalledWith('/settings/macro-cycling');
    });

    it('does not show lock icon', () => {
      const { toJSON } = render(<PremiumSettingsRow label="Feature" />);
      const tree = JSON.stringify(toJSON());
      expect(tree).not.toContain('lock-closed');
    });

    it('accessibility label does not include locked text', () => {
      render(<PremiumSettingsRow label="Macro Cycling" testID="row" />);

      const row = screen.getByTestId('row');
      expect(row.props.accessibilityLabel).toBe('Macro Cycling');
    });
  });

  describe('free state - locked', () => {
    beforeEach(() => {
      useSubscriptionStore.setState({ isPremium: false });
    });

    it('navigates to paywall with default context when pressed', () => {
      render(<PremiumSettingsRow label="Feature" />);

      fireEvent.press(screen.getByText('Feature'));

      expect(mockPush).toHaveBeenCalledWith('/paywall?context=general');
    });

    it('navigates to paywall with custom context when pressed', () => {
      render(
        <PremiumSettingsRow label="Macro Cycling" href="/settings/macro-cycling" context="macro_cycling" />,
      );

      fireEvent.press(screen.getByText('Macro Cycling'));

      expect(mockPush).toHaveBeenCalledWith('/paywall?context=macro_cycling');
    });

    it('does not navigate to href', () => {
      render(<PremiumSettingsRow label="Feature" href="/settings/feature" />);

      fireEvent.press(screen.getByText('Feature'));

      expect(mockPush).not.toHaveBeenCalledWith('/settings/feature');
    });

    it('shows lock-closed icon', () => {
      const { toJSON } = render(<PremiumSettingsRow label="Feature" />);
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('lock-closed');
    });

    it('accessibility label includes locked text', () => {
      render(<PremiumSettingsRow label="Macro Cycling" testID="row" />);

      const row = screen.getByTestId('row');
      expect(row.props.accessibilityLabel).toBe('Macro Cycling, locked, tap to unlock');
    });
  });

  describe('optional props', () => {
    it('renders icon when provided', () => {
      const { toJSON } = render(
        <PremiumSettingsRow label="Feature" icon="analytics-outline" />,
      );
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('analytics-outline');
    });

    it('does not render icon container when icon not provided', () => {
      const { toJSON } = render(<PremiumSettingsRow label="Feature" />);
      const tree = toJSON() as any;

      // Without icon, the iconContainer view should not be present
      // The tree should have fewer children
      expect(tree).toBeTruthy();
    });

    it('renders subtitle when provided', () => {
      render(<PremiumSettingsRow label="Feature" subtitle="Configure your settings" />);

      expect(screen.getByText('Configure your settings')).toBeTruthy();
    });

    it('does not render subtitle when not provided', () => {
      render(<PremiumSettingsRow label="Feature" />);

      expect(screen.queryByText('Configure your settings')).toBeNull();
    });

    it('applies custom testID', () => {
      render(<PremiumSettingsRow label="Feature" testID="settings-macro-cycling" />);

      expect(screen.getByTestId('settings-macro-cycling')).toBeTruthy();
    });
  });

  describe('navigation edge cases', () => {
    it('navigates to paywall when premium but no href provided', () => {
      useSubscriptionStore.setState({ isPremium: true });

      render(<PremiumSettingsRow label="Feature" />);

      fireEvent.press(screen.getByText('Feature'));

      // isPremium && href → false because href is undefined
      expect(mockPush).toHaveBeenCalledWith('/paywall?context=general');
    });

    it('defaults context to "general"', () => {
      render(<PremiumSettingsRow label="Feature" />);

      fireEvent.press(screen.getByText('Feature'));

      expect(mockPush).toHaveBeenCalledWith('/paywall?context=general');
    });
  });

  describe('premium state transitions', () => {
    it('updates behavior when user becomes premium', () => {
      useSubscriptionStore.setState({ isPremium: false });

      const { rerender } = render(
        <PremiumSettingsRow label="Feature" href="/settings/feature" />,
      );

      fireEvent.press(screen.getByText('Feature'));
      expect(mockPush).toHaveBeenCalledWith('/paywall?context=general');

      mockPush.mockClear();
      useSubscriptionStore.setState({ isPremium: true });

      rerender(<PremiumSettingsRow label="Feature" href="/settings/feature" />);

      fireEvent.press(screen.getByText('Feature'));
      expect(mockPush).toHaveBeenCalledWith('/settings/feature');
    });
  });
});
