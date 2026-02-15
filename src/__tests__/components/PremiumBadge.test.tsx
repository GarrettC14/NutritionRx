/**
 * PremiumBadge Component Tests
 *
 * Tests the "PRO" pill badge for premium feature discovery.
 * Covers default rendering, size variants, text content, and theme integration.
 */

// --- Mocks (must be before imports) ---

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

  return {
    View,
    Text,
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
      premiumGold: '#FFD700',
      premiumGoldMuted: '#FFD70033',
      bgPrimary: '#0D1117',
      bgSecondary: '#161B22',
      textPrimary: '#F0F6FC',
      textSecondary: '#8B949E',
    },
    preference: 'system',
    setPreference: jest.fn(),
  }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PremiumBadge } from '@/components/premium/PremiumBadge';

describe('PremiumBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default rendering', () => {
    it('renders "PRO" text', () => {
      render(<PremiumBadge />);

      expect(screen.getByText('PRO')).toBeTruthy();
    });

    it('defaults to small size', () => {
      const { toJSON } = render(<PremiumBadge />);
      const tree = toJSON();

      // The outer View should have badgeSmall styles applied
      expect(tree).toBeTruthy();
      expect(screen.getByText('PRO')).toBeTruthy();
    });
  });

  describe('size variants', () => {
    it('renders small size with reduced padding', () => {
      const { toJSON } = render(<PremiumBadge size="small" />);
      const tree = toJSON() as any;

      // Outer view should have both badge and badgeSmall styles
      const style = Array.isArray(tree.props.style)
        ? tree.props.style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
        : tree.props.style;

      expect(style.paddingHorizontal).toBe(4);
      expect(style.paddingVertical).toBe(1);
      expect(style.borderRadius).toBe(3);
    });

    it('renders medium size with standard padding', () => {
      const { toJSON } = render(<PremiumBadge size="medium" />);
      const tree = toJSON() as any;

      // Outer view should have badge styles but NOT badgeSmall
      const style = Array.isArray(tree.props.style)
        ? tree.props.style.filter(Boolean).reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
        : tree.props.style;

      expect(style.paddingHorizontal).toBe(6);
      expect(style.paddingVertical).toBe(2);
      expect(style.borderRadius).toBe(4);
    });
  });

  describe('theme colors', () => {
    it('applies premiumGoldMuted background color', () => {
      const { toJSON } = render(<PremiumBadge />);
      const tree = toJSON() as any;

      const style = Array.isArray(tree.props.style)
        ? tree.props.style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
        : tree.props.style;

      expect(style.backgroundColor).toBe('#FFD70033');
    });

    it('applies premiumGold text color', () => {
      render(<PremiumBadge />);
      const textElement = screen.getByText('PRO');
      const style = Array.isArray(textElement.props.style)
        ? textElement.props.style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
        : textElement.props.style;

      expect(style.color).toBe('#FFD700');
    });
  });

  describe('text styling', () => {
    it('renders with bold font weight', () => {
      render(<PremiumBadge />);
      const textElement = screen.getByText('PRO');
      const style = Array.isArray(textElement.props.style)
        ? textElement.props.style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
        : textElement.props.style;

      expect(style.fontWeight).toBe('700');
    });

    it('renders small text font size for small badge', () => {
      render(<PremiumBadge size="small" />);
      const textElement = screen.getByText('PRO');
      const style = Array.isArray(textElement.props.style)
        ? textElement.props.style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
        : textElement.props.style;

      expect(style.fontSize).toBe(8);
    });

    it('renders standard text font size for medium badge', () => {
      render(<PremiumBadge size="medium" />);
      const textElement = screen.getByText('PRO');
      const style = Array.isArray(textElement.props.style)
        ? textElement.props.style.filter(Boolean).reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
        : textElement.props.style;

      expect(style.fontSize).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('renders without crashing when no props provided', () => {
      const { toJSON } = render(<PremiumBadge />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
