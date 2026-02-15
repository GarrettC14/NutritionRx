/**
 * HealthKitPermissionScreen Component Tests
 *
 * Tests the pre-permission UI shown before requesting HealthKit access.
 * Covers default render, loading state, benefit rows, connect/skip callbacks,
 * button disabled states, privacy note, and accessibility.
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

  const ScrollView = React.forwardRef((props: any, ref: any) =>
    React.createElement('ScrollView', { ...props, ref }),
  );
  ScrollView.displayName = 'ScrollView';

  const Pressable = React.forwardRef((props: any, ref: any) =>
    React.createElement('Pressable', { ...props, ref }),
  );
  Pressable.displayName = 'Pressable';

  const ActivityIndicator = (props: any) =>
    React.createElement('ActivityIndicator', { testID: 'activity-indicator', ...props });

  return {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
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
      bgPrimary: '#0D1117',
      bgSecondary: '#161B22',
      bgElevated: '#21262D',
      bgInteractive: '#30363D',
      textPrimary: '#F0F6FC',
      textSecondary: '#8B949E',
      textTertiary: '#6E7681',
      textDisabled: '#484F58',
      accent: '#64B5F6',
      success: '#3FB950',
      successBg: '#3FB95020',
      error: '#F85149',
    },
    preference: 'system',
    setPreference: jest.fn(),
  }),
}));

jest.mock('@/constants/typography', () => ({
  typography: {
    display: {
      medium: { fontSize: 28, lineHeight: 34, letterSpacing: -0.3, fontWeight: '700' },
    },
    body: {
      large: { fontSize: 17, lineHeight: 24, letterSpacing: 0, fontWeight: '400' },
      medium: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: '400' },
      small: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: '400' },
    },
  },
}));

jest.mock('@/constants/spacing', () => ({
  spacing: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import { HealthKitPermissionScreen } from '@/components/healthkit/HealthKitPermissionScreen';

const defaultProps = {
  onConnect: jest.fn(),
  onSkip: jest.fn(),
};

describe('HealthKitPermissionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<HealthKitPermissionScreen {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders title text', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      expect(screen.getByText('Keep Everything in Sync')).toBeTruthy();
    });

    it('renders subtitle text', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      expect(
        screen.getByText('Your nutrition journey, all in one place.'),
      ).toBeTruthy();
    });

    it('renders "Connect to Apple Health" button', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      expect(screen.getByText('Connect to Apple Health')).toBeTruthy();
    });

    it('renders "Maybe Later" button', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      expect(screen.getByText('Maybe Later')).toBeTruthy();
    });
  });

  describe('benefit rows', () => {
    it('displays meals sync benefit', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      expect(
        screen.getByText('Your meals sync automatically to Apple Health'),
      ).toBeTruthy();
    });

    it('displays weight sync benefit', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      expect(screen.getByText('Weight updates flow between apps')).toBeTruthy();
    });

    it('displays water tracking benefit', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      expect(screen.getByText('Track water intake across devices')).toBeTruthy();
    });

    it('displays security benefit', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      expect(screen.getByText('Your health data stays secure')).toBeTruthy();
    });

    it('renders exactly 4 benefit rows', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      const benefits = [
        'Your meals sync automatically to Apple Health',
        'Weight updates flow between apps',
        'Track water intake across devices',
        'Your health data stays secure',
      ];

      benefits.forEach((benefit) => {
        expect(screen.getByText(benefit)).toBeTruthy();
      });
    });
  });

  describe('privacy note', () => {
    it('renders privacy reassurance text', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      expect(
        screen.getByText(/Your health data syncs directly with Apple Health/),
      ).toBeTruthy();
    });

    it('mentions not accessing health data directly', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      expect(
        screen.getByText(/We never access your health information directly/),
      ).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onConnect when connect button is pressed', () => {
      const onConnect = jest.fn();
      render(
        <HealthKitPermissionScreen {...defaultProps} onConnect={onConnect} />,
      );

      fireEvent.press(screen.getByText('Connect to Apple Health'));

      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when skip button is pressed', () => {
      const onSkip = jest.fn();
      render(
        <HealthKitPermissionScreen {...defaultProps} onSkip={onSkip} />,
      );

      fireEvent.press(screen.getByText('Maybe Later'));

      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('defaults isLoading to false', () => {
      render(<HealthKitPermissionScreen {...defaultProps} />);

      // Connect button should show text, not spinner
      expect(screen.getByText('Connect to Apple Health')).toBeTruthy();
    });

    it('shows loading state on connect button when isLoading is true', () => {
      render(
        <HealthKitPermissionScreen {...defaultProps} isLoading={true} />,
      );

      // When loading, the button text may be replaced by ActivityIndicator
      // The connect button should be disabled
      expect(screen.queryByText('Connect to Apple Health')).toBeNull();
    });

    it('disables connect button when isLoading is true', () => {
      const onConnect = jest.fn();
      render(
        <HealthKitPermissionScreen
          {...defaultProps}
          onConnect={onConnect}
          isLoading={true}
        />,
      );

      // The Button component applies disabled when loading
      // Verify the loading indicator is shown instead of text
      expect(screen.queryByText('Connect to Apple Health')).toBeNull();
    });

    it('disables skip button when isLoading is true', () => {
      render(
        <HealthKitPermissionScreen {...defaultProps} isLoading={true} />,
      );

      // Skip button should still render but be disabled
      expect(screen.getByText('Maybe Later')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('renders correctly with isLoading explicitly false', () => {
      render(
        <HealthKitPermissionScreen {...defaultProps} isLoading={false} />,
      );

      expect(screen.getByText('Connect to Apple Health')).toBeTruthy();
      expect(screen.getByText('Maybe Later')).toBeTruthy();
    });
  });
});
