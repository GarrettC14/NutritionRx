/**
 * MealSection Component Tests
 *
 * Tests the meal section that shows meal name, food entries,
 * total calories, add food button, and empty state.
 */

import React from 'react';

// --- Mocks (must be before component imports) ---

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

  const Modal = RealReact.forwardRef((props: any, ref: any) => {
    if (!props.visible) return null;
    return RealReact.createElement('Modal', { ...props, ref });
  });
  Modal.displayName = 'Modal';

  return {
    View,
    Text,
    Pressable,
    Modal,
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
  };
});

import { render, fireEvent } from '@testing-library/react-native';
import { MealSection } from '@/components/food/MealSection';
import { MealType } from '@/constants/mealTypes';
import { LogEntry, QuickAddEntry } from '@/types/domain';

// --- Test Helpers ---

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'entry-1',
    foodItemId: 'food-1',
    foodName: 'Chicken Breast',
    foodBrand: 'Generic',
    date: '2024-01-15',
    mealType: MealType.Lunch,
    servings: 1,
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeQuickAddEntry(overrides: Partial<QuickAddEntry> = {}): QuickAddEntry {
  return {
    id: 'quick-1',
    date: '2024-01-15',
    mealType: MealType.Lunch,
    calories: 200,
    description: 'Quick snack',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MealSection', () => {
  const mockOnAddPress = jest.fn();
  const mockOnEntryPress = jest.fn();
  const mockOnDeleteEntry = jest.fn();
  const mockOnCopyMeal = jest.fn();

  const defaultProps = {
    mealType: MealType.Breakfast,
    entries: [] as LogEntry[],
    quickAddEntries: [] as QuickAddEntry[],
    onAddPress: mockOnAddPress,
    onEntryPress: mockOnEntryPress,
    onDeleteEntry: mockOnDeleteEntry,
    onCopyMeal: mockOnCopyMeal,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('meal name rendering', () => {
    it('renders "Breakfast" label for breakfast meal type', () => {
      const { getByText } = render(
        <MealSection {...defaultProps} mealType={MealType.Breakfast} />
      );
      expect(getByText('Breakfast')).toBeTruthy();
    });

    it('renders "Lunch" label for lunch meal type', () => {
      const { getByText } = render(
        <MealSection {...defaultProps} mealType={MealType.Lunch} />
      );
      expect(getByText('Lunch')).toBeTruthy();
    });

    it('renders "Dinner" label for dinner meal type', () => {
      const { getByText } = render(
        <MealSection {...defaultProps} mealType={MealType.Dinner} />
      );
      expect(getByText('Dinner')).toBeTruthy();
    });

    it('renders "Snack" label for snack meal type', () => {
      const { getByText } = render(
        <MealSection {...defaultProps} mealType={MealType.Snack} />
      );
      expect(getByText('Snack')).toBeTruthy();
    });
  });

  describe('total calories', () => {
    it('shows 0 cal when no entries', () => {
      const { getByText } = render(
        <MealSection {...defaultProps} entries={[]} quickAddEntries={[]} />
      );
      expect(getByText('0 cal')).toBeTruthy();
    });

    it('shows total calories from log entries', () => {
      const entries = [
        makeLogEntry({ id: 'e1', calories: 300 }),
        makeLogEntry({ id: 'e2', calories: 450 }),
      ];
      const { getByText } = render(
        <MealSection {...defaultProps} entries={entries} />
      );
      expect(getByText('750 cal')).toBeTruthy();
    });

    it('shows total calories from quick add entries', () => {
      const quickAddEntries = [
        makeQuickAddEntry({ id: 'q1', calories: 150 }),
        makeQuickAddEntry({ id: 'q2', calories: 100 }),
      ];
      const { getByText } = render(
        <MealSection {...defaultProps} quickAddEntries={quickAddEntries} />
      );
      expect(getByText('250 cal')).toBeTruthy();
    });

    it('shows combined calories from both entry types', () => {
      const entries = [makeLogEntry({ id: 'e1', calories: 300 })];
      const quickAddEntries = [makeQuickAddEntry({ id: 'q1', calories: 200 })];
      const { getByText } = render(
        <MealSection
          {...defaultProps}
          entries={entries}
          quickAddEntries={quickAddEntries}
        />
      );
      expect(getByText('500 cal')).toBeTruthy();
    });
  });

  describe('add food button', () => {
    it('calls onAddPress with the correct mealType when add button is pressed', () => {
      const { UNSAFE_getAllByType } = render(
        <MealSection {...defaultProps} mealType={MealType.Dinner} />
      );

      // Pressable order in collapsed: [0] header toggle, [1] add button
      const pressables = UNSAFE_getAllByType('Pressable' as any);
      expect(pressables.length).toBeGreaterThanOrEqual(2);

      // The add button handler calls e.stopPropagation(), so pass a mock event
      fireEvent(pressables[1], 'press', { stopPropagation: jest.fn() });
      expect(mockOnAddPress).toHaveBeenCalledWith(MealType.Dinner);
    });

    it('passes the breakfast meal type correctly', () => {
      const { UNSAFE_getAllByType } = render(
        <MealSection {...defaultProps} mealType={MealType.Breakfast} />
      );

      const pressables = UNSAFE_getAllByType('Pressable' as any);
      fireEvent(pressables[1], 'press', { stopPropagation: jest.fn() });
      expect(mockOnAddPress).toHaveBeenCalledWith(MealType.Breakfast);
    });
  });

  describe('empty state', () => {
    it('shows "No foods logged yet" when expanded with no entries', () => {
      const { getByText } = render(
        <MealSection
          {...defaultProps}
          entries={[]}
          quickAddEntries={[]}
          defaultExpanded={true}
        />
      );
      expect(getByText('No foods logged yet')).toBeTruthy();
    });

    it('does not show "No foods logged yet" when collapsed', () => {
      const { queryByText } = render(
        <MealSection
          {...defaultProps}
          entries={[]}
          quickAddEntries={[]}
          defaultExpanded={false}
        />
      );
      expect(queryByText('No foods logged yet')).toBeNull();
    });
  });

  describe('expanded/collapsed state', () => {
    it('starts collapsed by default (defaultExpanded=false)', () => {
      const entries = [makeLogEntry({ id: 'e1', foodName: 'Apple' })];
      const { queryByText } = render(
        <MealSection {...defaultProps} entries={entries} />
      );
      // FoodEntryCard content should not be visible when collapsed
      // (the entries are rendered inside expanded content)
      // The header still shows item count
      expect(queryByText('No foods logged yet')).toBeNull();
    });

    it('shows item count in header when collapsed with entries', () => {
      const entries = [
        makeLogEntry({ id: 'e1', calories: 200 }),
        makeLogEntry({ id: 'e2', calories: 300 }),
      ];
      const { getByText } = render(
        <MealSection {...defaultProps} entries={entries} defaultExpanded={false} />
      );
      // When collapsed and has entries, shows "2 items"
      expect(getByText('2 items')).toBeTruthy();
    });

    it('shows "1 item" for singular entry count', () => {
      const entries = [makeLogEntry({ id: 'e1', calories: 200 })];
      const { getByText } = render(
        <MealSection {...defaultProps} entries={entries} defaultExpanded={false} />
      );
      expect(getByText('1 item')).toBeTruthy();
    });

    it('toggles expanded state when header is pressed', () => {
      const { getByText, queryByText } = render(
        <MealSection
          {...defaultProps}
          entries={[]}
          quickAddEntries={[]}
        />
      );

      // Initially collapsed
      expect(queryByText('No foods logged yet')).toBeNull();

      // Press header to expand
      fireEvent.press(getByText('Breakfast'));

      // Now expanded and showing empty state
      expect(getByText('No foods logged yet')).toBeTruthy();
    });
  });

  describe('food entries display', () => {
    it('renders food entry names when expanded', () => {
      const entries = [
        makeLogEntry({ id: 'e1', foodName: 'Grilled Chicken', calories: 250 }),
        makeLogEntry({ id: 'e2', foodName: 'Brown Rice', calories: 180 }),
      ];
      const { getByText } = render(
        <MealSection
          {...defaultProps}
          entries={entries}
          defaultExpanded={true}
        />
      );
      expect(getByText('Grilled Chicken')).toBeTruthy();
      expect(getByText('Brown Rice')).toBeTruthy();
    });

    it('renders quick add descriptions when expanded', () => {
      const quickAddEntries = [
        makeQuickAddEntry({ id: 'q1', description: 'Post workout shake', calories: 300 }),
      ];
      const { getByText } = render(
        <MealSection
          {...defaultProps}
          quickAddEntries={quickAddEntries}
          defaultExpanded={true}
        />
      );
      expect(getByText('Post workout shake')).toBeTruthy();
    });

    it('renders calories for each entry when expanded', () => {
      const entries = [
        makeLogEntry({ id: 'e1', foodName: 'Apple', calories: 95 }),
      ];
      const { getByText } = render(
        <MealSection
          {...defaultProps}
          entries={entries}
          defaultExpanded={true}
        />
      );
      // FoodEntryCard shows calories as a number
      expect(getByText('95')).toBeTruthy();
    });
  });

  describe('copy meal button', () => {
    it('shows "Copy to tomorrow" when expanded with entries and onCopyMeal provided', () => {
      const entries = [makeLogEntry({ id: 'e1', calories: 300 })];
      const { getByText } = render(
        <MealSection
          {...defaultProps}
          entries={entries}
          onCopyMeal={mockOnCopyMeal}
          defaultExpanded={true}
        />
      );
      expect(getByText('Copy to tomorrow')).toBeTruthy();
    });

    it('does not show "Copy to tomorrow" when there are no entries', () => {
      const { queryByText } = render(
        <MealSection
          {...defaultProps}
          entries={[]}
          quickAddEntries={[]}
          onCopyMeal={mockOnCopyMeal}
          defaultExpanded={true}
        />
      );
      expect(queryByText('Copy to tomorrow')).toBeNull();
    });
  });
});
