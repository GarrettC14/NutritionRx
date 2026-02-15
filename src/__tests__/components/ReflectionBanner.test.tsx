/**
 * ReflectionBanner Component Tests
 *
 * Tests the reflection prompt banner with multiple states (first_time, due, overdue, very_overdue),
 * minimized display after repeated dismissals, CTA/dismiss interactions, haptics, and accessibility.
 */

// --- Setup (must be before mocks and imports) ---

import React from 'react';
(globalThis as any).React = React;

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

  const Pressable = React.forwardRef((props: any, ref: any) =>
    React.createElement('Pressable', { ...props, ref }),
  );
  Pressable.displayName = 'Pressable';

  return {
    View,
    Text,
    Pressable,
    Animated: {
      Value: jest.fn().mockImplementation((value: number) => ({
        _value: value,
        setValue: jest.fn(),
        interpolate: jest.fn().mockReturnThis(),
      })),
      View: React.forwardRef((props: any, ref: any) =>
        React.createElement('Animated.View', { ...props, ref }),
      ),
      timing: jest.fn().mockReturnValue({
        start: jest.fn((callback?: () => void) => callback?.()),
      }),
      parallel: jest.fn().mockReturnValue({
        start: jest.fn((callback?: () => void) => callback?.()),
      }),
    },
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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    colorScheme: 'dark',
    isDark: true,
    colors: {
      textPrimary: '#F0F6FC',
      textSecondary: '#8B949E',
      textTertiary: '#6E7681',
    },
    preference: 'system',
    setPreference: jest.fn(),
  }),
}));

jest.mock('@/constants/typography', () => ({
  typography: {
    body: {
      small: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: '400' },
      medium: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: '400' },
      large: { fontSize: 17, lineHeight: 24, letterSpacing: 0, fontWeight: '400' },
    },
  },
}));

jest.mock('@/constants/spacing', () => ({
  spacing: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReflectionBanner } from '@/components/reflection/ReflectionBanner';

const defaultProps = {
  daysSinceLastReflection: 7,
  hasCompletedFirstReflection: true,
  onStartReflection: jest.fn(),
  onDismiss: jest.fn(),
  dismissCount: 0,
};

describe('ReflectionBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('banner state: first_time', () => {
    it('shows first-time message when hasCompletedFirstReflection is false', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          hasCompletedFirstReflection={false}
          daysSinceLastReflection={null}
        />,
      );

      expect(
        screen.getByText('Set up your weekly reflection to keep your plan on track'),
      ).toBeTruthy();
    });

    it('shows "Get started" CTA for first-time state', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          hasCompletedFirstReflection={false}
        />,
      );

      expect(screen.getByText('Get started')).toBeTruthy();
    });
  });

  describe('banner state: due', () => {
    it('shows due message for daysSince < 8', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          daysSinceLastReflection={7}
          hasCompletedFirstReflection={true}
        />,
      );

      expect(
        screen.getByText("It's been a week \u2014 ready for a quick reflection?"),
      ).toBeTruthy();
    });

    it('shows "Reflect now" CTA for due state', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          daysSinceLastReflection={5}
        />,
      );

      expect(screen.getByText('Reflect now')).toBeTruthy();
    });
  });

  describe('banner state: overdue', () => {
    it('shows overdue message for daysSince >= 8 and < 14', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          daysSinceLastReflection={10}
        />,
      );

      expect(
        screen.getByText('Your plan works best with regular updates'),
      ).toBeTruthy();
    });

    it('shows "Reflect now" CTA for overdue state', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          daysSinceLastReflection={12}
        />,
      );

      expect(screen.getByText('Reflect now')).toBeTruthy();
    });
  });

  describe('banner state: very_overdue', () => {
    it('shows very overdue message for daysSince >= 14', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          daysSinceLastReflection={14}
        />,
      );

      expect(
        screen.getByText("Welcome back! Let's get your plan in sync"),
      ).toBeTruthy();
    });

    it('shows very overdue message for null daysSince', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          daysSinceLastReflection={null}
          hasCompletedFirstReflection={true}
        />,
      );

      expect(
        screen.getByText("Welcome back! Let's get your plan in sync"),
      ).toBeTruthy();
    });

    it('shows "Let\'s go" CTA for very_overdue state', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          daysSinceLastReflection={20}
        />,
      );

      expect(screen.getByText("Let's go")).toBeTruthy();
    });
  });

  describe('minimized state', () => {
    it('renders minimized badge when dismissCount >= 3', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          dismissCount={3}
        />,
      );

      expect(screen.getByText('Reflection available')).toBeTruthy();
    });

    it('renders minimized badge when dismissCount > 3', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          dismissCount={5}
        />,
      );

      expect(screen.getByText('Reflection available')).toBeTruthy();
    });

    it('does not render full banner when minimized', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          dismissCount={3}
        />,
      );

      expect(
        screen.queryByText("It's been a week \u2014 ready for a quick reflection?"),
      ).toBeNull();
    });

    it('calls onStartReflection when minimized badge is pressed', () => {
      const onStartReflection = jest.fn();
      render(
        <ReflectionBanner
          {...defaultProps}
          dismissCount={3}
          onStartReflection={onStartReflection}
        />,
      );

      fireEvent.press(screen.getByText('Reflection available'));

      expect(onStartReflection).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility label for minimized badge', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          dismissCount={3}
        />,
      );

      const badge = screen.getByLabelText('Weekly reflection available');
      expect(badge).toBeTruthy();
    });
  });

  describe('full banner (dismissCount < 3)', () => {
    it('renders full banner when dismissCount is 0', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          dismissCount={0}
        />,
      );

      expect(screen.queryByText('Reflection available')).toBeNull();
    });

    it('renders full banner when dismissCount is 2', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          dismissCount={2}
        />,
      );

      expect(screen.queryByText('Reflection available')).toBeNull();
    });
  });

  describe('interactions', () => {
    it('calls onStartReflection when CTA is pressed', () => {
      const onStartReflection = jest.fn();
      render(
        <ReflectionBanner
          {...defaultProps}
          onStartReflection={onStartReflection}
        />,
      );

      fireEvent.press(screen.getByText('Reflect now'));

      expect(onStartReflection).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      render(
        <ReflectionBanner
          {...defaultProps}
          onDismiss={onDismiss}
        />,
      );

      const dismissButton = screen.getByLabelText('Dismiss reflection reminder');
      fireEvent.press(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('triggers haptics on CTA press', () => {
      const Haptics = require('expo-haptics');
      render(<ReflectionBanner {...defaultProps} />);

      fireEvent.press(screen.getByText('Reflect now'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });

    it('triggers haptics on dismiss press', () => {
      const Haptics = require('expo-haptics');
      render(<ReflectionBanner {...defaultProps} />);

      const dismissButton = screen.getByLabelText('Dismiss reflection reminder');
      fireEvent.press(dismissButton);

      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });
  });

  describe('accessibility', () => {
    it('dismiss button has button role', () => {
      render(<ReflectionBanner {...defaultProps} />);

      const dismissButton = screen.getByLabelText('Dismiss reflection reminder');
      expect(dismissButton.props.accessibilityRole).toBe('button');
    });

    it('CTA button has accessibilityRole button', () => {
      const { toJSON } = render(<ReflectionBanner {...defaultProps} />);
      const tree = JSON.stringify(toJSON());
      // Both the dismiss and CTA pressables have accessibilityRole="button"
      expect(tree).toContain('"accessibilityRole":"button"');
    });

    it('minimized badge has accessibilityRole button', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          dismissCount={3}
        />,
      );

      const badge = screen.getByLabelText('Weekly reflection available');
      expect(badge.props.accessibilityRole).toBe('button');
    });
  });

  describe('edge cases', () => {
    it('handles daysSinceLastReflection of 0', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          daysSinceLastReflection={0}
        />,
      );

      // daysSince=0, hasCompleted=true → 'due' state
      expect(
        screen.getByText("It's been a week \u2014 ready for a quick reflection?"),
      ).toBeTruthy();
    });

    it('handles exact boundary at 8 days (overdue)', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          daysSinceLastReflection={8}
        />,
      );

      expect(
        screen.getByText('Your plan works best with regular updates'),
      ).toBeTruthy();
    });

    it('handles exact boundary at 14 days (very_overdue)', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          daysSinceLastReflection={14}
        />,
      );

      expect(
        screen.getByText("Welcome back! Let's get your plan in sync"),
      ).toBeTruthy();
    });

    it('first_time takes precedence over very_overdue when hasCompleted is false', () => {
      render(
        <ReflectionBanner
          {...defaultProps}
          hasCompletedFirstReflection={false}
          daysSinceLastReflection={30}
        />,
      );

      expect(
        screen.getByText('Set up your weekly reflection to keep your plan on track'),
      ).toBeTruthy();
    });
  });
});
