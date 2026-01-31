/**
 * Defaults Constants Tests
 * Tests for all exported default values and configuration constants
 */

import {
  DEFAULT_SETTINGS,
  ACTIVITY_MULTIPLIERS,
  CALORIES_PER_KG,
  CALORIES_PER_LB,
  CALORIES_PER_GRAM,
  CALORIE_FLOORS,
  MAX_RATE_PERCENT,
  WEIGHT_SMOOTHING_FACTOR,
  SEARCH_SETTINGS,
  RATE_OPTIONS,
  ACTIVITY_OPTIONS,
} from '@/constants/defaults';

import type { WeightUnit, Theme } from '@/constants/defaults';

describe('defaults constants', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('has dailyCalorieGoal of 2000', () => {
      expect(DEFAULT_SETTINGS.dailyCalorieGoal).toBe(2000);
    });

    it('has dailyProteinGoal of 150', () => {
      expect(DEFAULT_SETTINGS.dailyProteinGoal).toBe(150);
    });

    it('has dailyCarbsGoal of 200', () => {
      expect(DEFAULT_SETTINGS.dailyCarbsGoal).toBe(200);
    });

    it('has dailyFatGoal of 65', () => {
      expect(DEFAULT_SETTINGS.dailyFatGoal).toBe(65);
    });

    it('has weightUnit of "lbs"', () => {
      expect(DEFAULT_SETTINGS.weightUnit).toBe('lbs');
    });

    it('has theme of "dark"', () => {
      expect(DEFAULT_SETTINGS.theme).toBe('dark');
    });

    it('has notificationsEnabled as false', () => {
      expect(DEFAULT_SETTINGS.notificationsEnabled).toBe(false);
    });

    it('has reminderTime as null', () => {
      expect(DEFAULT_SETTINGS.reminderTime).toBeNull();
    });

    it('has hasSeenOnboarding as false', () => {
      expect(DEFAULT_SETTINGS.hasSeenOnboarding).toBe(false);
    });

    it('has onboardingSkipped as false', () => {
      expect(DEFAULT_SETTINGS.onboardingSkipped).toBe(false);
    });
  });

  describe('ACTIVITY_MULTIPLIERS', () => {
    it('has sedentary multiplier of 1.2', () => {
      expect(ACTIVITY_MULTIPLIERS.sedentary).toBe(1.2);
    });

    it('has lightly_active multiplier of 1.375', () => {
      expect(ACTIVITY_MULTIPLIERS.lightly_active).toBe(1.375);
    });

    it('has moderately_active multiplier of 1.55', () => {
      expect(ACTIVITY_MULTIPLIERS.moderately_active).toBe(1.55);
    });

    it('has very_active multiplier of 1.725', () => {
      expect(ACTIVITY_MULTIPLIERS.very_active).toBe(1.725);
    });

    it('has extremely_active multiplier of 1.9', () => {
      expect(ACTIVITY_MULTIPLIERS.extremely_active).toBe(1.9);
    });

    it('has exactly 5 activity levels', () => {
      expect(Object.keys(ACTIVITY_MULTIPLIERS)).toHaveLength(5);
    });

    it('all multipliers are greater than 1', () => {
      Object.values(ACTIVITY_MULTIPLIERS).forEach((value) => {
        expect(value).toBeGreaterThan(1);
      });
    });

    it('multipliers increase with activity level', () => {
      expect(ACTIVITY_MULTIPLIERS.sedentary).toBeLessThan(ACTIVITY_MULTIPLIERS.lightly_active);
      expect(ACTIVITY_MULTIPLIERS.lightly_active).toBeLessThan(ACTIVITY_MULTIPLIERS.moderately_active);
      expect(ACTIVITY_MULTIPLIERS.moderately_active).toBeLessThan(ACTIVITY_MULTIPLIERS.very_active);
      expect(ACTIVITY_MULTIPLIERS.very_active).toBeLessThan(ACTIVITY_MULTIPLIERS.extremely_active);
    });
  });

  describe('calorie conversion constants', () => {
    it('has CALORIES_PER_KG of 7700', () => {
      expect(CALORIES_PER_KG).toBe(7700);
    });

    it('has CALORIES_PER_LB of 3500', () => {
      expect(CALORIES_PER_LB).toBe(3500);
    });
  });

  describe('CALORIES_PER_GRAM', () => {
    it('has protein at 4 calories per gram', () => {
      expect(CALORIES_PER_GRAM.protein).toBe(4);
    });

    it('has carbs at 4 calories per gram', () => {
      expect(CALORIES_PER_GRAM.carbs).toBe(4);
    });

    it('has fat at 9 calories per gram', () => {
      expect(CALORIES_PER_GRAM.fat).toBe(9);
    });

    it('has exactly 3 macro types', () => {
      expect(Object.keys(CALORIES_PER_GRAM)).toHaveLength(3);
    });
  });

  describe('CALORIE_FLOORS', () => {
    it('has male floor of 1500', () => {
      expect(CALORIE_FLOORS.male).toBe(1500);
    });

    it('has female floor of 1200', () => {
      expect(CALORIE_FLOORS.female).toBe(1200);
    });

    it('male floor is higher than female floor', () => {
      expect(CALORIE_FLOORS.male).toBeGreaterThan(CALORIE_FLOORS.female);
    });
  });

  describe('MAX_RATE_PERCENT', () => {
    it('has loss rate of 1.0', () => {
      expect(MAX_RATE_PERCENT.loss).toBe(1.0);
    });

    it('has gain rate of 0.5', () => {
      expect(MAX_RATE_PERCENT.gain).toBe(0.5);
    });

    it('loss rate is higher than gain rate', () => {
      expect(MAX_RATE_PERCENT.loss).toBeGreaterThan(MAX_RATE_PERCENT.gain);
    });
  });

  describe('WEIGHT_SMOOTHING_FACTOR', () => {
    it('has value of 0.1', () => {
      expect(WEIGHT_SMOOTHING_FACTOR).toBe(0.1);
    });

    it('is between 0 and 1 (valid EMA range)', () => {
      expect(WEIGHT_SMOOTHING_FACTOR).toBeGreaterThan(0);
      expect(WEIGHT_SMOOTHING_FACTOR).toBeLessThanOrEqual(1);
    });
  });

  describe('SEARCH_SETTINGS', () => {
    it('has debounceMs of 300', () => {
      expect(SEARCH_SETTINGS.debounceMs).toBe(300);
    });

    it('has minQueryLength of 2', () => {
      expect(SEARCH_SETTINGS.minQueryLength).toBe(2);
    });

    it('has maxResults of 50', () => {
      expect(SEARCH_SETTINGS.maxResults).toBe(50);
    });

    it('has recentLimit of 20', () => {
      expect(SEARCH_SETTINGS.recentLimit).toBe(20);
    });

    it('has frequentLimit of 10', () => {
      expect(SEARCH_SETTINGS.frequentLimit).toBe(10);
    });
  });

  describe('RATE_OPTIONS', () => {
    it('has exactly 4 options', () => {
      expect(RATE_OPTIONS).toHaveLength(4);
    });

    it('has values of 0.25, 0.5, 0.75, 1.0', () => {
      expect(RATE_OPTIONS[0].value).toBe(0.25);
      expect(RATE_OPTIONS[1].value).toBe(0.5);
      expect(RATE_OPTIONS[2].value).toBe(0.75);
      expect(RATE_OPTIONS[3].value).toBe(1.0);
    });

    it('has labels for all options', () => {
      expect(RATE_OPTIONS[0].label).toBe('Gentle');
      expect(RATE_OPTIONS[1].label).toBe('Steady');
      expect(RATE_OPTIONS[2].label).toBe('Ambitious');
      expect(RATE_OPTIONS[3].label).toBe('Aggressive');
    });

    it('has descriptions for all options', () => {
      RATE_OPTIONS.forEach((option) => {
        expect(option.description).toBeDefined();
        expect(typeof option.description).toBe('string');
        expect(option.description.length).toBeGreaterThan(0);
      });
    });

    it('has sublabels for all options', () => {
      RATE_OPTIONS.forEach((option) => {
        expect(option.sublabel).toBeDefined();
        expect(typeof option.sublabel).toBe('string');
        expect(option.sublabel.length).toBeGreaterThan(0);
      });
    });

    it('marks "Steady" as recommended', () => {
      const steadyOption = RATE_OPTIONS.find((o) => o.label === 'Steady');
      expect(steadyOption).toBeDefined();
      expect(steadyOption!.recommended).toBe(true);
    });

    it('has values in ascending order', () => {
      for (let i = 1; i < RATE_OPTIONS.length; i++) {
        expect(RATE_OPTIONS[i].value).toBeGreaterThan(RATE_OPTIONS[i - 1].value);
      }
    });
  });

  describe('ACTIVITY_OPTIONS', () => {
    it('has exactly 5 options', () => {
      expect(ACTIVITY_OPTIONS).toHaveLength(5);
    });

    it('has all activity level values', () => {
      const values = ACTIVITY_OPTIONS.map((o) => o.value);
      expect(values).toEqual([
        'sedentary',
        'lightly_active',
        'moderately_active',
        'very_active',
        'extremely_active',
      ]);
    });

    it('has labels for all options', () => {
      ACTIVITY_OPTIONS.forEach((option) => {
        expect(option.label).toBeDefined();
        expect(typeof option.label).toBe('string');
        expect(option.label.length).toBeGreaterThan(0);
      });
    });

    it('has descriptions for all options', () => {
      ACTIVITY_OPTIONS.forEach((option) => {
        expect(option.description).toBeDefined();
        expect(typeof option.description).toBe('string');
        expect(option.description.length).toBeGreaterThan(0);
      });
    });

    it('marks "moderately_active" as default', () => {
      const moderateOption = ACTIVITY_OPTIONS.find(
        (o) => o.value === 'moderately_active'
      );
      expect(moderateOption).toBeDefined();
      expect(moderateOption!.default).toBe(true);
    });

    it('activity option values match ACTIVITY_MULTIPLIERS keys', () => {
      const multiplierKeys = Object.keys(ACTIVITY_MULTIPLIERS);
      ACTIVITY_OPTIONS.forEach((option) => {
        expect(multiplierKeys).toContain(option.value);
      });
    });
  });

  describe('type safety', () => {
    it('weightUnit type accepts lbs and kg', () => {
      const lbs: WeightUnit = 'lbs';
      const kg: WeightUnit = 'kg';

      expect(lbs).toBe('lbs');
      expect(kg).toBe('kg');
    });

    it('theme type accepts dark, light, and auto', () => {
      const dark: Theme = 'dark';
      const light: Theme = 'light';
      const auto: Theme = 'auto';

      expect(dark).toBe('dark');
      expect(light).toBe('light');
      expect(auto).toBe('auto');
    });

    it('DEFAULT_SETTINGS.weightUnit is a valid WeightUnit', () => {
      const validUnits: WeightUnit[] = ['lbs', 'kg'];
      expect(validUnits).toContain(DEFAULT_SETTINGS.weightUnit);
    });

    it('DEFAULT_SETTINGS.theme is a valid Theme', () => {
      const validThemes: Theme[] = ['dark', 'light', 'auto'];
      expect(validThemes).toContain(DEFAULT_SETTINGS.theme);
    });
  });
});
