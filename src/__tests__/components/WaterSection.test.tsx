/**
 * WaterSection Component Tests
 *
 * Tests the water tracking section that shows glass indicators,
 * count/goal display, add/remove actions, and different fill states.
 */

// WaterSection.tsx uses JSX but only imports { useState } from 'react' (no default React).
// With ts-jest jsx: 'react' (classic transform), React must be globally available.
import React from 'react';
(globalThis as any).React = React;

// --- Mocks (must be before component imports) ---

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('react-native-reanimated', () => {
  const RealReact = require('react');

  const AnimatedView = RealReact.forwardRef((props: any, ref: any) =>
    RealReact.createElement('View', { ...props, ref })
  );
  AnimatedView.displayName = 'Animated.View';

  const Animated = {
    View: AnimatedView,
    createAnimatedComponent: (comp: any) => comp,
  };

  // Module must export Animated as both __esModule default and as properties
  return {
    __esModule: true,
    default: Animated,
    useSharedValue: jest.fn((val: number) => ({ value: val })),
    useAnimatedStyle: jest.fn((fn: () => any) => {
      try { return fn(); } catch { return {}; }
    }),
    withTiming: jest.fn((val: number) => val),
    useReducedMotion: jest.fn(() => false),
  };
});

jest.mock('@expo/vector-icons', () => {
  const RealReact = require('react');
  return {
    Ionicons: RealReact.forwardRef((props: any, ref: any) =>
      RealReact.createElement('Ionicons', { ...props, ref })
    ),
  };
});

jest.mock('@/hooks/useTheme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      bgPrimary: '#0D1117',
      bgSecondary: '#161B22',
      bgElevated: '#21262D',
      bgInteractive: '#30363D',
      textPrimary: '#F0F6FC',
      textSecondary: '#8B949E',
      textTertiary: '#6E7681',
      textDisabled: '#484F58',
      borderDefault: '#30363D',
      accent: '#64B5F6',
      success: '#3FB950',
    },
    isDark: true,
    colorScheme: 'dark',
  })),
}));

// Mock waterStore at the module path used by the component (@/stores)
const mockAddGlass = jest.fn().mockResolvedValue(undefined);
const mockRemoveGlass = jest.fn().mockResolvedValue(undefined);
const mockHasMetGoal = jest.fn().mockReturnValue(false);

jest.mock('@/stores', () => ({
  useWaterStore: jest.fn(() => ({
    todayLog: { glasses: 0 },
    goalGlasses: 8,
    addGlass: mockAddGlass,
    removeGlass: mockRemoveGlass,
    hasMetGoal: mockHasMetGoal,
  })),
}));

jest.mock('@/repositories', () => ({
  DEFAULT_WATER_GOAL: 8,
}));

jest.mock('react-native', () => {
  const RealReact = require('react');

  const View = RealReact.forwardRef((props: any, ref: any) =>
    RealReact.createElement('View', { ...props, ref })
  );
  View.displayName = 'View';

  const Text = RealReact.forwardRef((props: any, ref: any) =>
    RealReact.createElement('Text', { ...props, ref })
  );
  Text.displayName = 'Text';

  const Pressable = RealReact.forwardRef((props: any, ref: any) =>
    RealReact.createElement('Pressable', { ...props, ref })
  );
  Pressable.displayName = 'Pressable';

  return {
    View,
    Text,
    Pressable,
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
    LayoutAnimation: {
      configureNext: jest.fn(),
      Presets: { easeInEaseOut: {} },
    },
    UIManager: {
      setLayoutAnimationEnabledExperimental: jest.fn(),
    },
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
    },
  };
});

import { render, fireEvent } from '@testing-library/react-native';
import { WaterSection } from '@/components/water/WaterSection';
import { useWaterStore } from '@/stores';

// Type the mock to access mockReturnValue
const mockUseWaterStore = useWaterStore as jest.MockedFunction<typeof useWaterStore>;

function setWaterState(overrides: {
  glasses?: number;
  goalGlasses?: number;
  goalMet?: boolean;
}) {
  const glasses = overrides.glasses ?? 0;
  const goalGlasses = overrides.goalGlasses ?? 8;
  const goalMet = overrides.goalMet ?? false;

  mockHasMetGoal.mockReturnValue(goalMet);
  mockUseWaterStore.mockReturnValue({
    todayLog: { glasses } as any,
    goalGlasses,
    addGlass: mockAddGlass,
    removeGlass: mockRemoveGlass,
    hasMetGoal: mockHasMetGoal,
  } as any);
}

describe('WaterSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: empty state, 0/8 glasses
    setWaterState({ glasses: 0, goalGlasses: 8, goalMet: false });
  });

  describe('rendering', () => {
    it('renders the "Water" title', () => {
      const { getByText } = render(<WaterSection />);
      expect(getByText('Water')).toBeTruthy();
    });

    it('shows current count / goal count in the header', () => {
      setWaterState({ glasses: 3, goalGlasses: 8 });
      const { getByText } = render(<WaterSection />);
      expect(getByText('3/8 glasses')).toBeTruthy();
    });

    it('shows 0/8 glasses when empty', () => {
      setWaterState({ glasses: 0, goalGlasses: 8 });
      const { getByText } = render(<WaterSection />);
      expect(getByText('0/8 glasses')).toBeTruthy();
    });

    it('shows full count when goal is met', () => {
      setWaterState({ glasses: 8, goalGlasses: 8, goalMet: true });
      const { getByText } = render(<WaterSection />);
      expect(getByText('8/8 glasses')).toBeTruthy();
    });
  });

  describe('different water goal values', () => {
    it('displays custom goal of 10', () => {
      setWaterState({ glasses: 5, goalGlasses: 10 });
      const { getByText } = render(<WaterSection />);
      expect(getByText('5/10 glasses')).toBeTruthy();
    });

    it('displays custom goal of 6', () => {
      setWaterState({ glasses: 2, goalGlasses: 6 });
      const { getByText } = render(<WaterSection />);
      expect(getByText('2/6 glasses')).toBeTruthy();
    });
  });

  describe('add glass interaction', () => {
    it('calls addGlass when the header add button is pressed', () => {
      setWaterState({ glasses: 3, goalGlasses: 8 });
      const { UNSAFE_getAllByType } = render(<WaterSection />);

      // The header has a Pressable with the add icon.
      // Pressable order in collapsed: [0] header toggle, [1] header add button
      const pressables = UNSAFE_getAllByType('Pressable' as any);
      expect(pressables.length).toBeGreaterThanOrEqual(2);

      fireEvent.press(pressables[1]);
      expect(mockAddGlass).toHaveBeenCalled();
    });
  });

  describe('expanded state', () => {
    it('shows expanded content when defaultExpanded is true', () => {
      setWaterState({ glasses: 3, goalGlasses: 8 });
      const { getByText } = render(<WaterSection defaultExpanded={true} />);

      // Expanded content includes the "Add Glass" button
      expect(getByText('Add Glass')).toBeTruthy();
    });

    it('does not show "Add Glass" button when collapsed (defaultExpanded=false)', () => {
      setWaterState({ glasses: 3, goalGlasses: 8 });
      const { queryByText } = render(<WaterSection defaultExpanded={false} />);
      expect(queryByText('Add Glass')).toBeNull();
    });

    it('toggles expanded state when header is pressed', () => {
      setWaterState({ glasses: 3, goalGlasses: 8 });
      const { getByText, queryByText } = render(<WaterSection />);

      // Initially collapsed
      expect(queryByText('Add Glass')).toBeNull();

      // Press header to expand
      fireEvent.press(getByText('Water'));

      // Now expanded
      expect(getByText('Add Glass')).toBeTruthy();
    });
  });

  describe('expanded actions', () => {
    it('calls addGlass when the large Add Glass button is pressed', () => {
      setWaterState({ glasses: 3, goalGlasses: 8 });
      const { getByText } = render(<WaterSection defaultExpanded={true} />);

      fireEvent.press(getByText('Add Glass'));
      expect(mockAddGlass).toHaveBeenCalledTimes(1);
    });

    it('calls removeGlass when the remove button is pressed (glasses > 0)', () => {
      setWaterState({ glasses: 3, goalGlasses: 8 });
      const { UNSAFE_getAllByType } = render(<WaterSection defaultExpanded={true} />);

      // In expanded mode, Pressable order:
      // [0] header toggle, [1] header add, [2] remove button, [3] Add Glass button
      const pressables = UNSAFE_getAllByType('Pressable' as any);
      expect(pressables.length).toBeGreaterThanOrEqual(4);
      fireEvent.press(pressables[2]);
      expect(mockRemoveGlass).toHaveBeenCalledTimes(1);
    });
  });

  describe('display states', () => {
    it('shows empty state: 0 glasses filled', () => {
      setWaterState({ glasses: 0, goalGlasses: 8 });
      const { getByText } = render(<WaterSection />);
      expect(getByText('0/8 glasses')).toBeTruthy();
    });

    it('shows partial state: some glasses filled', () => {
      setWaterState({ glasses: 4, goalGlasses: 8 });
      const { getByText } = render(<WaterSection />);
      expect(getByText('4/8 glasses')).toBeTruthy();
    });

    it('shows full state: all glasses filled', () => {
      setWaterState({ glasses: 8, goalGlasses: 8, goalMet: true });
      const { getByText } = render(<WaterSection />);
      expect(getByText('8/8 glasses')).toBeTruthy();
    });

    it('shows over-goal state', () => {
      setWaterState({ glasses: 10, goalGlasses: 8, goalMet: true });
      const { getByText } = render(<WaterSection />);
      expect(getByText('10/8 glasses')).toBeTruthy();
    });
  });
});
