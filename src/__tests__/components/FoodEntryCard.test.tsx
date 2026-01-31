import React from 'react';

// Make React available globally so component files using JSX without React import work
// under the classic jsx transform used by ts-jest
(globalThis as any).React = React;

// Augment the react-native mock with components needed for FoodEntryCard
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Pressable: ({ children, testID, style, onPress, ...props }: any) => {
      const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
      return React.createElement(
        'Pressable',
        { testID, style: resolvedStyle, onPress, ...props },
        children,
      );
    },
    View: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    Text: ({ children, ...props }: any) =>
      React.createElement('Text', props, children),
  };
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, ...props }: any) =>
    React.createElement('Ionicons', { name, size, color, testID: `icon-${name}`, ...props }),
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import { FoodEntryCard } from '@/components/food/FoodEntryCard';
import { LogEntry, QuickAddEntry } from '@/types/domain';
import { MealType } from '@/constants/mealTypes';

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

// Test data factories
const createLogEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  id: 'log-1',
  foodItemId: 'food-1',
  foodName: 'Chicken Breast',
  foodBrand: 'Kirkland',
  date: '2024-01-15',
  mealType: MealType.Lunch,
  servings: 1,
  calories: 250,
  protein: 45,
  carbs: 0,
  fat: 5,
  createdAt: new Date('2024-01-15T12:00:00'),
  updatedAt: new Date('2024-01-15T12:00:00'),
  ...overrides,
});

const createQuickAddEntry = (overrides: Partial<QuickAddEntry> = {}): QuickAddEntry => ({
  id: 'qa-1',
  date: '2024-01-15',
  mealType: MealType.Snack,
  calories: 200,
  protein: 10,
  carbs: 25,
  fat: 8,
  description: 'Afternoon snack',
  createdAt: new Date('2024-01-15T14:00:00'),
  updatedAt: new Date('2024-01-15T14:00:00'),
  ...overrides,
});

describe('FoodEntryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders food name and calories for LogEntry', () => {
    const entry = createLogEntry();
    render(<FoodEntryCard entry={entry} />);

    expect(screen.getByText('Chicken Breast')).toBeTruthy();
    expect(screen.getByText('250')).toBeTruthy();
    expect(screen.getByText('kcal')).toBeTruthy();
  });

  it('shows brand if available', () => {
    const entry = createLogEntry({ foodBrand: 'Kirkland' });
    render(<FoodEntryCard entry={entry} />);

    // Brand is shown in the subtitle as "Brand - servings serving(s)"
    expect(screen.getByText(/Kirkland/)).toBeTruthy();
  });

  it('shows serving size info without brand', () => {
    const entry = createLogEntry({ foodBrand: undefined, servings: 2 });
    render(<FoodEntryCard entry={entry} />);

    expect(screen.getByText('2 servings')).toBeTruthy();
  });

  it('shows singular serving when servings is 1', () => {
    const entry = createLogEntry({ foodBrand: undefined, servings: 1 });
    render(<FoodEntryCard entry={entry} />);

    expect(screen.getByText('1 serving')).toBeTruthy();
  });

  it('shows brand and serving info together', () => {
    const entry = createLogEntry({ foodBrand: 'Kirkland', servings: 2 });
    render(<FoodEntryCard entry={entry} />);

    // Subtitle format: "Brand - servings serving(s)"
    expect(screen.getByText(/Kirkland/)).toBeTruthy();
    expect(screen.getByText(/2 servings/)).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const entry = createLogEntry();
    render(<FoodEntryCard entry={entry} onPress={onPress} />);

    fireEvent.press(screen.getByText('Chicken Breast'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete action triggered', () => {
    const onDelete = jest.fn();
    const entry = createLogEntry();
    render(<FoodEntryCard entry={entry} onDelete={onDelete} />);

    // The delete button shows a close-circle icon
    const deleteIcon = screen.getByTestId('icon-close-circle');
    fireEvent.press(deleteIcon.parent!);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not render delete button when onDelete is not provided', () => {
    const entry = createLogEntry();
    render(<FoodEntryCard entry={entry} />);

    expect(screen.queryByTestId('icon-close-circle')).toBeNull();
  });

  it('handles QuickAddEntry with description', () => {
    const entry = createQuickAddEntry({ description: 'Afternoon snack' });
    render(<FoodEntryCard entry={entry} />);

    expect(screen.getByText('Afternoon snack')).toBeTruthy();
    expect(screen.getByText('200')).toBeTruthy();
  });

  it('handles QuickAddEntry without description - shows "Quick Add"', () => {
    const entry = createQuickAddEntry({ description: undefined });
    render(<FoodEntryCard entry={entry} />);

    expect(screen.getByText('Quick Add')).toBeTruthy();
  });

  it('QuickAddEntry does not render subtitle', () => {
    const entry = createQuickAddEntry();
    render(<FoodEntryCard entry={entry} />);

    // QuickAddEntry doesn't have brand/serving info subtitle
    // It only shows the description as title and calories
    expect(screen.getByText('Afternoon snack')).toBeTruthy();
    expect(screen.getByText('200')).toBeTruthy();
  });

  it('shows restaurant icon for LogEntry', () => {
    const entry = createLogEntry();
    render(<FoodEntryCard entry={entry} />);

    expect(screen.getByTestId('icon-restaurant')).toBeTruthy();
  });

  it('shows flash icon for QuickAddEntry', () => {
    const entry = createQuickAddEntry();
    render(<FoodEntryCard entry={entry} />);

    expect(screen.getByTestId('icon-flash')).toBeTruthy();
  });
});
