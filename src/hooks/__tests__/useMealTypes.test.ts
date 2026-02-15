/**
 * useMealTypes Hook Tests
 *
 * Tests for the hook that merges default and custom meal type configs
 * into a sorted array for display throughout the app.
 */

import { renderHook } from '@testing-library/react-native';
import type { MealTypeConfig } from '@/constants/mealTypes';
import type { CustomMealTypeRecord } from '@/stores/settingsStore';

// ---- Mock data ----

const DEFAULT_MEAL_CONFIGS: MealTypeConfig[] = [
  { id: 'breakfast', name: 'Breakfast', icon: '🌅', sortOrder: 1, isDefault: true, isActive: true },
  { id: 'lunch', name: 'Lunch', icon: '☀️', sortOrder: 2, isDefault: true, isActive: true },
  { id: 'dinner', name: 'Dinner', icon: '🌙', sortOrder: 3, isDefault: true, isActive: true },
  { id: 'snack', name: 'Snack', icon: '🍎', sortOrder: 4, isDefault: true, isActive: true },
];

let mockCustomMealTypes: CustomMealTypeRecord[] = [];

// ---- Mocks ----

jest.mock('@/constants/mealTypes', () => ({
  DEFAULT_MEAL_CONFIGS: [
    { id: 'breakfast', name: 'Breakfast', icon: '🌅', sortOrder: 1, isDefault: true, isActive: true },
    { id: 'lunch', name: 'Lunch', icon: '☀️', sortOrder: 2, isDefault: true, isActive: true },
    { id: 'dinner', name: 'Dinner', icon: '🌙', sortOrder: 3, isDefault: true, isActive: true },
    { id: 'snack', name: 'Snack', icon: '🍎', sortOrder: 4, isDefault: true, isActive: true },
  ],
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: jest.fn((fn: any) => fn),
}));

jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector: (s: any) => any) =>
    selector({ customMealTypes: mockCustomMealTypes }),
  ),
}));

// Import after mocks are defined
import { useMealTypes } from '@/hooks/useMealTypes';

describe('useMealTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomMealTypes = [];
  });

  // ============================================================
  // Default behavior
  // ============================================================

  describe('defaults only', () => {
    it('returns the 4 default meal types when no custom types exist', () => {
      const { result } = renderHook(() => useMealTypes());

      expect(result.current).toHaveLength(4);
      expect(result.current.map((m) => m.id)).toEqual([
        'breakfast', 'lunch', 'dinner', 'snack',
      ]);
    });

    it('all default types have isDefault=true', () => {
      const { result } = renderHook(() => useMealTypes());

      result.current.forEach((meal) => {
        expect(meal.isDefault).toBe(true);
      });
    });

    it('returns defaults sorted by sortOrder', () => {
      const { result } = renderHook(() => useMealTypes());

      const sortOrders = result.current.map((m) => m.sortOrder);
      expect(sortOrders).toEqual([1, 2, 3, 4]);
    });
  });

  // ============================================================
  // Custom meal types
  // ============================================================

  describe('custom meal types', () => {
    it('includes active custom types in the result', () => {
      mockCustomMealTypes = [
        {
          id: 'pre-workout',
          name: 'Pre-Workout',
          sortOrder: 5,
          icon: '💪',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      ];

      const { result } = renderHook(() => useMealTypes());

      expect(result.current).toHaveLength(5);
      const custom = result.current.find((m) => m.id === 'pre-workout');
      expect(custom).toBeDefined();
      expect(custom!.name).toBe('Pre-Workout');
      expect(custom!.isDefault).toBe(false);
      expect(custom!.isActive).toBe(true);
    });

    it('filters out inactive custom types', () => {
      mockCustomMealTypes = [
        {
          id: 'pre-workout',
          name: 'Pre-Workout',
          sortOrder: 5,
          icon: '💪',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
        {
          id: 'dessert',
          name: 'Dessert',
          sortOrder: 6,
          icon: '🍰',
          isActive: false,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      ];

      const { result } = renderHook(() => useMealTypes());

      expect(result.current).toHaveLength(5);
      expect(result.current.find((m) => m.id === 'dessert')).toBeUndefined();
      expect(result.current.find((m) => m.id === 'pre-workout')).toBeDefined();
    });

    it('uses fallback icon when custom type has no icon', () => {
      mockCustomMealTypes = [
        {
          id: 'brunch',
          name: 'Brunch',
          sortOrder: 1.5,
          icon: null,
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      ];

      const { result } = renderHook(() => useMealTypes());

      const brunch = result.current.find((m) => m.id === 'brunch');
      expect(brunch).toBeDefined();
      expect(brunch!.icon).toBe('🍽');
    });

    it('uses fallback icon when custom type has empty string icon', () => {
      mockCustomMealTypes = [
        {
          id: 'brunch',
          name: 'Brunch',
          sortOrder: 1.5,
          icon: '',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      ];

      const { result } = renderHook(() => useMealTypes());

      const brunch = result.current.find((m) => m.id === 'brunch');
      expect(brunch).toBeDefined();
      expect(brunch!.icon).toBe('🍽');
    });

    it('sorts custom types among defaults by sortOrder', () => {
      mockCustomMealTypes = [
        {
          id: 'brunch',
          name: 'Brunch',
          sortOrder: 1.5,
          icon: '🥂',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      ];

      const { result } = renderHook(() => useMealTypes());

      const ids = result.current.map((m) => m.id);
      expect(ids).toEqual(['breakfast', 'brunch', 'lunch', 'dinner', 'snack']);
    });

    it('custom type at end when sortOrder is highest', () => {
      mockCustomMealTypes = [
        {
          id: 'late-night',
          name: 'Late Night',
          sortOrder: 10,
          icon: '🌃',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      ];

      const { result } = renderHook(() => useMealTypes());

      const ids = result.current.map((m) => m.id);
      expect(ids[ids.length - 1]).toBe('late-night');
    });

    it('handles multiple custom types in correct sort order', () => {
      mockCustomMealTypes = [
        {
          id: 'late-night',
          name: 'Late Night',
          sortOrder: 10,
          icon: '🌃',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
        {
          id: 'brunch',
          name: 'Brunch',
          sortOrder: 1.5,
          icon: '🥂',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
        {
          id: 'pre-workout',
          name: 'Pre-Workout',
          sortOrder: 2.5,
          icon: '💪',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      ];

      const { result } = renderHook(() => useMealTypes());

      const ids = result.current.map((m) => m.id);
      expect(ids).toEqual([
        'breakfast',
        'brunch',
        'lunch',
        'pre-workout',
        'dinner',
        'snack',
        'late-night',
      ]);
    });

    it('all custom types have isDefault=false and isActive=true', () => {
      mockCustomMealTypes = [
        {
          id: 'pre-workout',
          name: 'Pre-Workout',
          sortOrder: 5,
          icon: '💪',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
        {
          id: 'brunch',
          name: 'Brunch',
          sortOrder: 1.5,
          icon: '🥂',
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      ];

      const { result } = renderHook(() => useMealTypes());

      const customResults = result.current.filter((m) => !m.isDefault);
      expect(customResults).toHaveLength(2);
      customResults.forEach((m) => {
        expect(m.isDefault).toBe(false);
        expect(m.isActive).toBe(true);
      });
    });
  });
});
