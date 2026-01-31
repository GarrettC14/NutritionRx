/**
 * MealTypes Constants Tests
 * Tests for meal type enum, ordering, labels, and time-based suggestion
 */

import {
  MealType,
  MEAL_TYPE_ORDER,
  MEAL_TYPE_LABELS,
  MEAL_ORDER,
  getSuggestedMealType,
} from '@/constants/mealTypes';

describe('mealTypes constants', () => {
  describe('MealType enum', () => {
    it('has Breakfast value of "breakfast"', () => {
      expect(MealType.Breakfast).toBe('breakfast');
    });

    it('has Lunch value of "lunch"', () => {
      expect(MealType.Lunch).toBe('lunch');
    });

    it('has Dinner value of "dinner"', () => {
      expect(MealType.Dinner).toBe('dinner');
    });

    it('has Snack value of "snack"', () => {
      expect(MealType.Snack).toBe('snack');
    });

    it('has exactly 4 meal types', () => {
      // String enums in TypeScript compile to objects with just the forward mappings
      const values = Object.values(MealType);
      expect(values).toHaveLength(4);
    });
  });

  describe('MEAL_TYPE_ORDER', () => {
    it('has exactly 4 entries', () => {
      expect(MEAL_TYPE_ORDER).toHaveLength(4);
    });

    it('contains all meal types', () => {
      expect(MEAL_TYPE_ORDER).toContain(MealType.Breakfast);
      expect(MEAL_TYPE_ORDER).toContain(MealType.Lunch);
      expect(MEAL_TYPE_ORDER).toContain(MealType.Dinner);
      expect(MEAL_TYPE_ORDER).toContain(MealType.Snack);
    });

    it('has Breakfast first', () => {
      expect(MEAL_TYPE_ORDER[0]).toBe(MealType.Breakfast);
    });

    it('has Lunch second', () => {
      expect(MEAL_TYPE_ORDER[1]).toBe(MealType.Lunch);
    });

    it('has Dinner third', () => {
      expect(MEAL_TYPE_ORDER[2]).toBe(MealType.Dinner);
    });

    it('has Snack last', () => {
      expect(MEAL_TYPE_ORDER[3]).toBe(MealType.Snack);
    });

    it('matches the expected full order', () => {
      expect(MEAL_TYPE_ORDER).toEqual([
        MealType.Breakfast,
        MealType.Lunch,
        MealType.Dinner,
        MealType.Snack,
      ]);
    });
  });

  describe('MEAL_TYPE_LABELS', () => {
    it('has label "Breakfast" for MealType.Breakfast', () => {
      expect(MEAL_TYPE_LABELS[MealType.Breakfast]).toBe('Breakfast');
    });

    it('has label "Lunch" for MealType.Lunch', () => {
      expect(MEAL_TYPE_LABELS[MealType.Lunch]).toBe('Lunch');
    });

    it('has label "Dinner" for MealType.Dinner', () => {
      expect(MEAL_TYPE_LABELS[MealType.Dinner]).toBe('Dinner');
    });

    it('has label "Snack" for MealType.Snack', () => {
      expect(MEAL_TYPE_LABELS[MealType.Snack]).toBe('Snack');
    });

    it('has labels for all meal types', () => {
      const allMealTypes = [MealType.Breakfast, MealType.Lunch, MealType.Dinner, MealType.Snack];
      allMealTypes.forEach((type) => {
        expect(MEAL_TYPE_LABELS[type]).toBeDefined();
        expect(typeof MEAL_TYPE_LABELS[type]).toBe('string');
        expect(MEAL_TYPE_LABELS[type].length).toBeGreaterThan(0);
      });
    });

    it('has exactly 4 label entries', () => {
      expect(Object.keys(MEAL_TYPE_LABELS)).toHaveLength(4);
    });
  });

  describe('MEAL_ORDER', () => {
    it('assigns Breakfast order 1', () => {
      expect(MEAL_ORDER[MealType.Breakfast]).toBe(1);
    });

    it('assigns Lunch order 2', () => {
      expect(MEAL_ORDER[MealType.Lunch]).toBe(2);
    });

    it('assigns Dinner order 3', () => {
      expect(MEAL_ORDER[MealType.Dinner]).toBe(3);
    });

    it('assigns Snack order 4', () => {
      expect(MEAL_ORDER[MealType.Snack]).toBe(4);
    });

    it('has exactly 4 entries', () => {
      expect(Object.keys(MEAL_ORDER)).toHaveLength(4);
    });

    it('numeric order is consistent with MEAL_TYPE_ORDER', () => {
      for (let i = 0; i < MEAL_TYPE_ORDER.length; i++) {
        expect(MEAL_ORDER[MEAL_TYPE_ORDER[i]]).toBe(i + 1);
      }
    });

    it('all order values are unique', () => {
      const values = Object.values(MEAL_ORDER);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('order values are consecutive starting from 1', () => {
      const values = Object.values(MEAL_ORDER).sort((a, b) => a - b);
      expect(values).toEqual([1, 2, 3, 4]);
    });
  });

  describe('getSuggestedMealType', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns Breakfast between 5:00 and 10:59', () => {
      const hours = [5, 6, 7, 8, 9, 10];
      hours.forEach((hour) => {
        jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1, hour, 0, 0));
        expect(getSuggestedMealType()).toBe(MealType.Breakfast);
        jest.useRealTimers();
      });
    });

    it('returns Lunch between 11:00 and 14:59', () => {
      const hours = [11, 12, 13, 14];
      hours.forEach((hour) => {
        jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1, hour, 0, 0));
        expect(getSuggestedMealType()).toBe(MealType.Lunch);
        jest.useRealTimers();
      });
    });

    it('returns Dinner between 15:00 and 20:59', () => {
      const hours = [15, 16, 17, 18, 19, 20];
      hours.forEach((hour) => {
        jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1, hour, 0, 0));
        expect(getSuggestedMealType()).toBe(MealType.Dinner);
        jest.useRealTimers();
      });
    });

    it('returns Snack between 21:00 and 4:59', () => {
      const hours = [21, 22, 23, 0, 1, 2, 3, 4];
      hours.forEach((hour) => {
        jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1, hour, 0, 0));
        expect(getSuggestedMealType()).toBe(MealType.Snack);
        jest.useRealTimers();
      });
    });

    it('returns Breakfast at exactly 5:00', () => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1, 5, 0, 0));
      expect(getSuggestedMealType()).toBe(MealType.Breakfast);
    });

    it('returns Lunch at exactly 11:00', () => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1, 11, 0, 0));
      expect(getSuggestedMealType()).toBe(MealType.Lunch);
    });

    it('returns Dinner at exactly 15:00', () => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1, 15, 0, 0));
      expect(getSuggestedMealType()).toBe(MealType.Dinner);
    });

    it('returns Snack at exactly 21:00', () => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1, 21, 0, 0));
      expect(getSuggestedMealType()).toBe(MealType.Snack);
    });

    it('returns Snack at midnight (0:00)', () => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
      expect(getSuggestedMealType()).toBe(MealType.Snack);
    });

    it('always returns a valid MealType', () => {
      const validTypes = Object.values(MealType);
      for (let hour = 0; hour < 24; hour++) {
        jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1, hour, 30, 0));
        const result = getSuggestedMealType();
        expect(validTypes).toContain(result);
        jest.useRealTimers();
      }
    });
  });
});
