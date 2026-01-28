/**
 * Voice Assistant Service Tests
 * Unit tests for voice command parsing and response building
 */

import {
  getCurrentMealPeriod,
  getTodayDate,
  buildWaterResponse,
  buildQuickAddResponse,
  buildCalorieQueryResponse,
  buildMacroQueryResponse,
  buildWeightResponse,
  buildWaterQueryResponse,
  buildErrorResponse,
  parseCalorieAmount,
  parseWeightAmount,
  parseWaterAmount,
  parseMealType,
  parseMacroType,
  parseWeightUnit,
  capitalizeFirst,
  getHapticTypeForCommand,
} from '../voiceAssistantService';

describe('voiceAssistantService', () => {
  describe('getCurrentMealPeriod', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns breakfast for morning hours (5-11)', () => {
      // 8 AM
      jest.setSystemTime(new Date('2024-01-15T08:00:00'));
      expect(getCurrentMealPeriod()).toBe('breakfast');

      // 5 AM
      jest.setSystemTime(new Date('2024-01-15T05:00:00'));
      expect(getCurrentMealPeriod()).toBe('breakfast');

      // 10:59 AM
      jest.setSystemTime(new Date('2024-01-15T10:59:00'));
      expect(getCurrentMealPeriod()).toBe('breakfast');
    });

    it('returns lunch for midday hours (11-15)', () => {
      // 12 PM
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));
      expect(getCurrentMealPeriod()).toBe('lunch');

      // 11 AM
      jest.setSystemTime(new Date('2024-01-15T11:00:00'));
      expect(getCurrentMealPeriod()).toBe('lunch');

      // 2:59 PM
      jest.setSystemTime(new Date('2024-01-15T14:59:00'));
      expect(getCurrentMealPeriod()).toBe('lunch');
    });

    it('returns dinner for evening hours (15-21)', () => {
      // 6 PM
      jest.setSystemTime(new Date('2024-01-15T18:00:00'));
      expect(getCurrentMealPeriod()).toBe('dinner');

      // 3 PM
      jest.setSystemTime(new Date('2024-01-15T15:00:00'));
      expect(getCurrentMealPeriod()).toBe('dinner');

      // 8:59 PM
      jest.setSystemTime(new Date('2024-01-15T20:59:00'));
      expect(getCurrentMealPeriod()).toBe('dinner');
    });

    it('returns snack for late night hours (21-5)', () => {
      // 11 PM
      jest.setSystemTime(new Date('2024-01-15T23:00:00'));
      expect(getCurrentMealPeriod()).toBe('snack');

      // 2 AM
      jest.setSystemTime(new Date('2024-01-15T02:00:00'));
      expect(getCurrentMealPeriod()).toBe('snack');

      // Midnight
      jest.setSystemTime(new Date('2024-01-15T00:00:00'));
      expect(getCurrentMealPeriod()).toBe('snack');
    });
  });

  describe('getTodayDate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns date in YYYY-MM-DD format', () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));
      expect(getTodayDate()).toBe('2024-01-15');
    });

    it('handles single-digit months and days', () => {
      jest.setSystemTime(new Date('2024-03-05T12:00:00'));
      expect(getTodayDate()).toBe('2024-03-05');
    });
  });

  describe('buildWaterResponse', () => {
    it('builds singular response for 1 glass', () => {
      const response = buildWaterResponse(1, 5, 8);
      expect(response.spokenText).toBe("Added water. You've had 5 of 8 today.");
    });

    it('builds plural response for multiple glasses', () => {
      const response = buildWaterResponse(3, 6, 8);
      expect(response.spokenText).toBe("Added 3 glasses. You've had 6 today.");
    });

    it('does not include judgmental language', () => {
      const response = buildWaterResponse(1, 8, 8);
      expect(response.spokenText).not.toMatch(/great|good|excellent|awesome/i);
    });
  });

  describe('buildQuickAddResponse', () => {
    it('builds response with meal name', () => {
      const response = buildQuickAddResponse(400, 'lunch');
      expect(response.spokenText).toBe('400 calories added to lunch.');
    });

    it('capitalizes meal names in display', () => {
      const response = buildQuickAddResponse(500, 'breakfast');
      expect(response.spokenText).toContain('breakfast');
    });

    it('does not include judgmental language', () => {
      const response = buildQuickAddResponse(1000, 'dinner');
      expect(response.spokenText).not.toMatch(/too much|a lot|wow/i);
    });
  });

  describe('buildCalorieQueryResponse', () => {
    it('builds calorie count response', () => {
      const response = buildCalorieQueryResponse(1450);
      expect(response.spokenText).toBe("You've had 1,450 calories today.");
    });

    it('formats large numbers with commas', () => {
      const response = buildCalorieQueryResponse(2500);
      expect(response.spokenText).toContain('2,500');
    });

    it('does not include judgmental language', () => {
      const response = buildCalorieQueryResponse(3000);
      expect(response.spokenText).not.toMatch(/too much|only|good|bad/i);
    });
  });

  describe('buildMacroQueryResponse', () => {
    it('builds protein response', () => {
      const response = buildMacroQueryResponse('protein', 85.5);
      expect(response.spokenText).toBe("You've had 86 grams of protein.");
    });

    it('builds carbs response', () => {
      const response = buildMacroQueryResponse('carbs', 150.3);
      expect(response.spokenText).toBe("You've had 150 grams of carbs.");
    });

    it('builds fat response', () => {
      const response = buildMacroQueryResponse('fat', 65.7);
      expect(response.spokenText).toBe("You've had 66 grams of fat.");
    });

    it('rounds to nearest integer', () => {
      const response = buildMacroQueryResponse('protein', 100.4);
      expect(response.spokenText).toContain('100 grams');
    });
  });

  describe('buildWeightResponse', () => {
    it('builds pounds response without decimal', () => {
      const response = buildWeightResponse(175.3, 'pounds');
      expect(response.spokenText).toBe('Weight logged: 175 pounds.');
    });

    it('builds kilograms response with one decimal', () => {
      const response = buildWeightResponse(79.5, 'kilograms');
      expect(response.spokenText).toBe('Weight logged: 79.5 kilograms.');
    });

    it('does not include judgmental language', () => {
      const response = buildWeightResponse(200, 'pounds');
      expect(response.spokenText).not.toMatch(/great|good|progress|lost|gained/i);
    });
  });

  describe('buildWaterQueryResponse', () => {
    it('builds water count response', () => {
      const response = buildWaterQueryResponse(5, 8);
      expect(response.spokenText).toBe("You've had 5 glasses today.");
    });

    it('includes goal in display text', () => {
      const response = buildWaterQueryResponse(5, 8);
      expect(response.displayText).toContain('5 of 8');
    });
  });

  describe('buildErrorResponse', () => {
    it('returns network error message', () => {
      const response = buildErrorResponse('network');
      expect(response.spokenText).toContain("Couldn't save");
    });

    it('returns calorie error message', () => {
      const response = buildErrorResponse('invalid_calories');
      expect(response.spokenText).toContain("calorie amount");
    });

    it('returns weight error message', () => {
      const response = buildErrorResponse('invalid_weight');
      expect(response.spokenText).toContain('weight');
    });

    it('returns generic error for unknown types', () => {
      const response = buildErrorResponse('unknown_error_type');
      expect(response.spokenText).toContain('Something went wrong');
    });
  });

  describe('parseCalorieAmount', () => {
    it('parses valid integer', () => {
      expect(parseCalorieAmount(400)).toBe(400);
      expect(parseCalorieAmount('500')).toBe(500);
    });

    it('parses string with commas', () => {
      expect(parseCalorieAmount('1,200')).toBe(1200);
    });

    it('rounds decimal values', () => {
      expect(parseCalorieAmount(400.7)).toBe(401);
    });

    it('returns null for invalid values', () => {
      expect(parseCalorieAmount(undefined)).toBeNull();
      expect(parseCalorieAmount(null as any)).toBeNull();
      expect(parseCalorieAmount('')).toBeNull();
      expect(parseCalorieAmount('abc')).toBeNull();
    });

    it('returns null for out of range values', () => {
      expect(parseCalorieAmount(0)).toBeNull();
      expect(parseCalorieAmount(-100)).toBeNull();
      expect(parseCalorieAmount(15000)).toBeNull();
    });

    it('accepts values up to 10000', () => {
      expect(parseCalorieAmount(10000)).toBe(10000);
    });
  });

  describe('parseWeightAmount', () => {
    it('parses valid number', () => {
      expect(parseWeightAmount(175)).toBe(175);
      expect(parseWeightAmount('79.5')).toBe(79.5);
    });

    it('parses string with commas', () => {
      expect(parseWeightAmount('1,000')).toBe(1000);
    });

    it('returns null for invalid values', () => {
      expect(parseWeightAmount(undefined)).toBeNull();
      expect(parseWeightAmount('abc')).toBeNull();
    });

    it('returns null for out of range values', () => {
      expect(parseWeightAmount(0)).toBeNull();
      expect(parseWeightAmount(-50)).toBeNull();
      expect(parseWeightAmount(1500)).toBeNull();
    });
  });

  describe('parseWaterAmount', () => {
    it('returns 1 for undefined/null', () => {
      expect(parseWaterAmount(undefined)).toBe(1);
      expect(parseWaterAmount(null as any)).toBe(1);
    });

    it('parses valid number', () => {
      expect(parseWaterAmount(3)).toBe(3);
      expect(parseWaterAmount('5')).toBe(5);
    });

    it('rounds decimal values', () => {
      expect(parseWaterAmount(2.7)).toBe(3);
    });

    it('clamps to minimum of 1', () => {
      expect(parseWaterAmount(0)).toBe(1);
      expect(parseWaterAmount(-1)).toBe(1);
    });

    it('clamps to maximum of 20', () => {
      expect(parseWaterAmount(25)).toBe(20);
      expect(parseWaterAmount(100)).toBe(20);
    });
  });

  describe('parseMealType', () => {
    it('parses valid meal types', () => {
      expect(parseMealType('breakfast')).toBe('breakfast');
      expect(parseMealType('lunch')).toBe('lunch');
      expect(parseMealType('dinner')).toBe('dinner');
      expect(parseMealType('snack')).toBe('snack');
    });

    it('handles case insensitivity', () => {
      expect(parseMealType('BREAKFAST')).toBe('breakfast');
      expect(parseMealType('Lunch')).toBe('lunch');
    });

    it('trims whitespace', () => {
      expect(parseMealType('  dinner  ')).toBe('dinner');
    });

    it('returns null for invalid values', () => {
      expect(parseMealType(undefined)).toBeNull();
      expect(parseMealType('')).toBeNull();
      expect(parseMealType('brunch')).toBeNull();
    });
  });

  describe('parseMacroType', () => {
    it('parses valid macro types', () => {
      expect(parseMacroType('protein')).toBe('protein');
      expect(parseMacroType('carbs')).toBe('carbs');
      expect(parseMacroType('fat')).toBe('fat');
    });

    it('handles variations', () => {
      expect(parseMacroType('carbohydrates')).toBe('carbs');
      expect(parseMacroType('carb')).toBe('carbs');
      expect(parseMacroType('fats')).toBe('fat');
      expect(parseMacroType('proteins')).toBe('protein');
    });

    it('returns null for invalid values', () => {
      expect(parseMacroType(undefined)).toBeNull();
      expect(parseMacroType('fiber')).toBeNull();
    });
  });

  describe('parseWeightUnit', () => {
    it('parses pounds variations', () => {
      expect(parseWeightUnit('pounds')).toBe('pounds');
      expect(parseWeightUnit('lbs')).toBe('pounds');
      expect(parseWeightUnit('lb')).toBe('pounds');
      expect(parseWeightUnit('pound')).toBe('pounds');
    });

    it('parses kilograms variations', () => {
      expect(parseWeightUnit('kilograms')).toBe('kilograms');
      expect(parseWeightUnit('kg')).toBe('kilograms');
      expect(parseWeightUnit('kgs')).toBe('kilograms');
      expect(parseWeightUnit('kilogram')).toBe('kilograms');
    });

    it('handles case insensitivity', () => {
      expect(parseWeightUnit('POUNDS')).toBe('pounds');
      expect(parseWeightUnit('KG')).toBe('kilograms');
    });

    it('returns null for invalid values', () => {
      expect(parseWeightUnit(undefined)).toBeNull();
      expect(parseWeightUnit('stones')).toBeNull();
    });
  });

  describe('capitalizeFirst', () => {
    it('capitalizes first letter', () => {
      expect(capitalizeFirst('breakfast')).toBe('Breakfast');
      expect(capitalizeFirst('hello world')).toBe('Hello world');
    });

    it('handles empty string', () => {
      expect(capitalizeFirst('')).toBe('');
    });

    it('handles single character', () => {
      expect(capitalizeFirst('a')).toBe('A');
    });
  });

  describe('getHapticTypeForCommand', () => {
    it('returns correct haptic for water', () => {
      expect(getHapticTypeForCommand('water')).toBe('waterAdded');
      expect(getHapticTypeForCommand('water', { goalReached: true })).toBe('waterGoalReached');
    });

    it('returns correct haptic for quickAdd', () => {
      expect(getHapticTypeForCommand('quickAdd')).toBe('quickAddComplete');
    });

    it('returns correct haptic for query', () => {
      expect(getHapticTypeForCommand('query')).toBe('queryResponse');
    });

    it('returns correct haptic for weight', () => {
      expect(getHapticTypeForCommand('weight')).toBe('weightLogged');
    });

    it('returns correct haptic for error', () => {
      expect(getHapticTypeForCommand('error')).toBe('error');
    });
  });
});
