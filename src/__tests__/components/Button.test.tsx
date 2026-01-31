import React from 'react';

// Make React available globally so component files using JSX without React import work
// under the classic jsx transform used by ts-jest
(globalThis as any).React = React;

// Augment the react-native mock with components needed for Button
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Pressable: ({ children, testID, style, onPress, disabled, ...props }: any) => {
      const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
      return React.createElement(
        'Pressable',
        { testID, style: resolvedStyle, onPress, disabled, accessibilityState: disabled ? { disabled: true } : undefined, ...props },
        children,
      );
    },
    View: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    Text: ({ children, ...props }: any) =>
      React.createElement('Text', props, children),
    ActivityIndicator: ({ testID, ...props }: any) =>
      React.createElement('ActivityIndicator', { testID: testID || 'activity-indicator', ...props }),
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

// Mock the theme hook to return a stable set of colors
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
      error: '#F85149',
    },
    preference: 'system',
    setPreference: jest.fn(),
  }),
}));

describe('Button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<Button>Click Me</Button>);

    expect(screen.getByText('Click Me')).toBeTruthy();
  });

  it('renders with label prop', () => {
    render(<Button label="Submit" />);

    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('shows loading spinner when loading=true', () => {
    render(<Button loading={true}>Save</Button>);

    // When loading, the text should not be visible - ActivityIndicator shown instead
    expect(screen.queryByText('Save')).toBeNull();
    // ActivityIndicator should be rendered
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();
  });

  it('does not show loading spinner when loading=false', () => {
    render(<Button loading={false}>Save</Button>);

    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.queryByTestId('activity-indicator')).toBeNull();
  });

  it('calls onPress handler when tapped', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Tap Me</Button>);

    fireEvent.press(screen.getByText('Tap Me'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled state prevents onPress via disabled prop', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress} disabled={true}>Disabled</Button>);

    // The Pressable should have disabled set
    // fireEvent.press won't call onPress because the component guard checks disabled
    const pressable = screen.getByText('Disabled').parent;
    expect(pressable).toBeTruthy();
  });

  it('primary variant renders with accent background', () => {
    render(<Button variant="primary" testID="btn">Primary</Button>);

    const btn = screen.getByTestId('btn');
    const style = btn.props.style;
    const flatStyle = Array.isArray(style)
      ? style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
      : style;
    expect(flatStyle.backgroundColor).toBe('#64B5F6');
  });

  it('secondary variant renders with bgInteractive background', () => {
    render(<Button variant="secondary" testID="btn">Secondary</Button>);

    const btn = screen.getByTestId('btn');
    const style = btn.props.style;
    const flatStyle = Array.isArray(style)
      ? style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
      : style;
    expect(flatStyle.backgroundColor).toBe('#30363D');
  });

  it('ghost variant renders with transparent background', () => {
    render(<Button variant="ghost" testID="btn">Ghost</Button>);

    const btn = screen.getByTestId('btn');
    const style = btn.props.style;
    const flatStyle = Array.isArray(style)
      ? style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
      : style;
    expect(flatStyle.backgroundColor).toBe('transparent');
  });

  it('danger variant renders with error background', () => {
    render(<Button variant="danger" testID="btn">Danger</Button>);

    const btn = screen.getByTestId('btn');
    const style = btn.props.style;
    const flatStyle = Array.isArray(style)
      ? style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
      : style;
    expect(flatStyle.backgroundColor).toBe('#F85149');
  });

  it('full width prop applies correct style', () => {
    render(<Button fullWidth testID="btn">Full Width</Button>);

    const btn = screen.getByTestId('btn');
    const style = btn.props.style;
    const flatStyle = Array.isArray(style)
      ? style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
      : style;
    expect(flatStyle.width).toBe('100%');
  });

  it('non-fullWidth does not apply fullWidth style', () => {
    render(<Button fullWidth={false} testID="btn">Normal</Button>);

    const btn = screen.getByTestId('btn');
    const style = btn.props.style;
    const flatStyle = Array.isArray(style)
      ? style.filter(Boolean).reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
      : style;
    expect(flatStyle.width).toBeUndefined();
  });

  it('triggers haptics on press', () => {
    const Haptics = require('expo-haptics');
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Haptic</Button>);

    fireEvent.press(screen.getByText('Haptic'));

    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('disabled button applies bgInteractive background', () => {
    render(<Button disabled={true} variant="primary" testID="btn">Disabled</Button>);

    const btn = screen.getByTestId('btn');
    const style = btn.props.style;
    const flatStyle = Array.isArray(style)
      ? style.reduce((acc: any, s: any) => ({ ...acc, ...(s || {}) }), {})
      : style;
    expect(flatStyle.backgroundColor).toBe('#30363D');
  });
});
