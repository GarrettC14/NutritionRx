import {
  isExpectedError,
  SENSITIVE_KEYS,
  NUTRITION_PATTERN,
  scrubSensitiveData,
} from '@/utils/sentryHelpers';

// ---------------------------------------------------------------------------
// isExpectedError
// ---------------------------------------------------------------------------
describe('isExpectedError', () => {
  describe('Error instances with expected messages', () => {
    it('returns true for "User cancelled"', () => {
      expect(isExpectedError(new Error('User cancelled'))).toBe(true);
    });

    it('returns true for "user canceled" (case-insensitive)', () => {
      expect(isExpectedError(new Error('user canceled'))).toBe(true);
    });

    it('returns true for "Network request failed"', () => {
      expect(isExpectedError(new Error('Network request failed'))).toBe(true);
    });

    it('returns true for "Request aborted"', () => {
      expect(isExpectedError(new Error('Request aborted'))).toBe(true);
    });

    it('returns true for "Connection timeout"', () => {
      expect(isExpectedError(new Error('Connection timeout'))).toBe(true);
    });
  });

  describe('Error instances with unexpected messages', () => {
    it('returns false for "Something unexpected"', () => {
      expect(isExpectedError(new Error('Something unexpected'))).toBe(false);
    });

    it('returns false for an empty error message', () => {
      expect(isExpectedError(new Error(''))).toBe(false);
    });
  });

  describe('RevenueCat-style objects with userCancelled', () => {
    it('returns true when userCancelled is true', () => {
      expect(isExpectedError({ userCancelled: true })).toBe(true);
    });

    it('returns false when userCancelled is false', () => {
      expect(isExpectedError({ userCancelled: false })).toBe(false);
    });
  });

  describe('non-error values', () => {
    it('returns false for null', () => {
      expect(isExpectedError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isExpectedError(undefined)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(isExpectedError('some string')).toBe(false);
    });

    it('returns false for a number', () => {
      expect(isExpectedError(42)).toBe(false);
    });

    it('returns false for a plain object without userCancelled', () => {
      expect(isExpectedError({ code: 'ERR_UNKNOWN' })).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// SENSITIVE_KEYS
// ---------------------------------------------------------------------------
describe('SENSITIVE_KEYS', () => {
  it('is an array', () => {
    expect(Array.isArray(SENSITIVE_KEYS)).toBe(true);
  });

  it.each([
    'calories',
    'protein',
    'carbs',
    'fat',
    'weight',
    'food',
    'meal',
    'serving',
    'macros',
    'grams',
    'intake',
  ])('contains "%s"', (key) => {
    expect(SENSITIVE_KEYS).toContain(key);
  });

  it('has no duplicate entries', () => {
    const unique = new Set(SENSITIVE_KEYS);
    expect(unique.size).toBe(SENSITIVE_KEYS.length);
  });
});

// ---------------------------------------------------------------------------
// NUTRITION_PATTERN
// ---------------------------------------------------------------------------
describe('NUTRITION_PATTERN', () => {
  beforeEach(() => {
    // Reset lastIndex since the regex has the global flag
    NUTRITION_PATTERN.lastIndex = 0;
  });

  it.each([
    '200 cal',
    '30g',
    '1 serving',
    '100 kcal',
    '12oz',
    '500 mg',
    '2 servings',
    '45 macros',
  ])('matches "%s"', (input) => {
    NUTRITION_PATTERN.lastIndex = 0;
    expect(NUTRITION_PATTERN.test(input)).toBe(true);
  });

  it.each([
    'hello world',
    'just a random sentence',
    'no numbers here',
    '',
  ])('does not match "%s"', (input) => {
    NUTRITION_PATTERN.lastIndex = 0;
    expect(NUTRITION_PATTERN.test(input)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scrubSensitiveData
// ---------------------------------------------------------------------------
describe('scrubSensitiveData', () => {
  it('removes keys containing sensitive terms', () => {
    const obj: Record<string, any> = {
      calories: 2000,
      protein: 150,
      name: 'test',
    };
    scrubSensitiveData(obj);
    expect(obj).toEqual({ name: 'test' });
  });

  it('matches sensitive keys case-insensitively', () => {
    const obj: Record<string, any> = {
      userCalories: 2000,
      totalProtein: 150,
      DailyFat: 80,
      label: 'kept',
    };
    scrubSensitiveData(obj);
    expect(obj).toEqual({ label: 'kept' });
  });

  it('recursively strips nested sensitive keys', () => {
    const obj: Record<string, any> = {
      user: {
        id: 1,
        mealPlan: 'keto',
        preferences: {
          proteinGoal: 120,
          theme: 'dark',
        },
      },
      version: '1.0',
    };
    scrubSensitiveData(obj);
    expect(obj).toEqual({
      user: {
        id: 1,
        preferences: {
          theme: 'dark',
        },
      },
      version: '1.0',
    });
  });

  it('preserves non-sensitive keys', () => {
    const obj: Record<string, any> = {
      screen: 'home',
      action: 'navigate',
      timestamp: 12345,
    };
    scrubSensitiveData(obj);
    expect(obj).toEqual({
      screen: 'home',
      action: 'navigate',
      timestamp: 12345,
    });
  });

  it('handles null without throwing', () => {
    expect(() => scrubSensitiveData(null as any)).not.toThrow();
  });

  it('handles undefined without throwing', () => {
    expect(() => scrubSensitiveData(undefined as any)).not.toThrow();
  });

  it('handles non-object values without throwing', () => {
    expect(() => scrubSensitiveData(42 as any)).not.toThrow();
    expect(() => scrubSensitiveData('string' as any)).not.toThrow();
  });

  it('handles empty object without throwing', () => {
    const obj: Record<string, any> = {};
    scrubSensitiveData(obj);
    expect(obj).toEqual({});
  });

  it('mutates the original object in place', () => {
    const obj: Record<string, any> = { calories: 500, id: 1 };
    const ref = obj;
    scrubSensitiveData(obj);
    expect(ref).toBe(obj);
    expect(ref).toEqual({ id: 1 });
  });
});
