/**
 * TDEE Calculator Service Tests
 * Tests for BMR, TDEE, and macro calculations
 */

import { tdeeCalculator } from '@/services/tdeeCalculator';
import { ActivityLevel, Sex, GoalType } from '@/types/domain';

describe('tdeeCalculator', () => {
  // Test data for a 30-year-old male, 180cm, 80kg
  const maleInput = {
    sex: 'male' as Sex,
    ageYears: 30,
    heightCm: 180,
    weightKg: 80,
    activityLevel: 'moderately_active' as ActivityLevel,
  };

  // Test data for a 25-year-old female, 165cm, 60kg
  const femaleInput = {
    sex: 'female' as Sex,
    ageYears: 25,
    heightCm: 165,
    weightKg: 60,
    activityLevel: 'lightly_active' as ActivityLevel,
  };

  describe('calculateBMR', () => {
    it('calculates BMR correctly for males using Mifflin-St Jeor equation', () => {
      const bmr = tdeeCalculator.calculateBMR(maleInput);
      // BMR = (10 × 80) + (6.25 × 180) - (5 × 30) + 5 = 800 + 1125 - 150 + 5 = 1780
      expect(bmr).toBe(1780);
    });

    it('calculates BMR correctly for females using Mifflin-St Jeor equation', () => {
      const bmr = tdeeCalculator.calculateBMR(femaleInput);
      // BMR = (10 × 60) + (6.25 × 165) - (5 × 25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 ≈ 1345
      expect(bmr).toBe(1345);
    });

    it('handles edge case of very young age', () => {
      const youngInput = { ...maleInput, ageYears: 18 };
      const bmr = tdeeCalculator.calculateBMR(youngInput);
      // BMR = (10 × 80) + (6.25 × 180) - (5 × 18) + 5 = 800 + 1125 - 90 + 5 = 1840
      expect(bmr).toBe(1840);
    });

    it('handles edge case of older age', () => {
      const olderInput = { ...maleInput, ageYears: 60 };
      const bmr = tdeeCalculator.calculateBMR(olderInput);
      // BMR = (10 × 80) + (6.25 × 180) - (5 × 60) + 5 = 800 + 1125 - 300 + 5 = 1630
      expect(bmr).toBe(1630);
    });

    it('handles different body weights', () => {
      const lightInput = { ...maleInput, weightKg: 60 };
      const heavyInput = { ...maleInput, weightKg: 100 };

      const lightBmr = tdeeCalculator.calculateBMR(lightInput);
      const heavyBmr = tdeeCalculator.calculateBMR(heavyInput);

      expect(lightBmr).toBeLessThan(heavyBmr);
      expect(heavyBmr - lightBmr).toBe(400); // 10 × (100 - 60) = 400
    });
  });

  describe('calculateTDEE', () => {
    it('calculates TDEE correctly with activity multipliers', () => {
      const tdee = tdeeCalculator.calculateTDEE(maleInput);
      // TDEE = BMR × 1.55 (moderately active) = 1780 × 1.55 = 2759
      expect(tdee).toBe(2759);
    });

    it('applies sedentary multiplier correctly', () => {
      const sedentaryInput = { ...maleInput, activityLevel: 'sedentary' as ActivityLevel };
      const tdee = tdeeCalculator.calculateTDEE(sedentaryInput);
      // TDEE = 1780 × 1.2 = 2136
      expect(tdee).toBe(2136);
    });

    it('applies lightly_active multiplier correctly', () => {
      const lightlyActiveInput = { ...maleInput, activityLevel: 'lightly_active' as ActivityLevel };
      const tdee = tdeeCalculator.calculateTDEE(lightlyActiveInput);
      // TDEE = 1780 × 1.375 = 2447.5 ≈ 2448
      expect(tdee).toBe(2448);
    });

    it('applies very_active multiplier correctly', () => {
      const veryActiveInput = { ...maleInput, activityLevel: 'very_active' as ActivityLevel };
      const tdee = tdeeCalculator.calculateTDEE(veryActiveInput);
      // TDEE = 1780 × 1.725 = 3070.5 ≈ 3071
      expect(tdee).toBe(3071);
    });

    it('applies extremely_active multiplier correctly', () => {
      const extremeInput = { ...maleInput, activityLevel: 'extremely_active' as ActivityLevel };
      const tdee = tdeeCalculator.calculateTDEE(extremeInput);
      // TDEE = 1780 × 1.9 = 3382
      expect(tdee).toBe(3382);
    });
  });

  describe('calculateTargetCalories', () => {
    it('returns TDEE for maintain goal', () => {
      const goalInput = {
        ...maleInput,
        goalType: 'maintain' as GoalType,
        targetRatePercent: 0,
      };
      const target = tdeeCalculator.calculateTargetCalories(goalInput);
      expect(target).toBe(2759); // Same as TDEE
    });

    it('calculates deficit for weight loss goal', () => {
      const goalInput = {
        ...maleInput,
        goalType: 'lose' as GoalType,
        targetRatePercent: 0.5, // 0.5% body weight per week
      };
      const target = tdeeCalculator.calculateTargetCalories(goalInput);
      // Weekly weight change = 0.5% × 80kg = 0.4kg
      // Daily deficit = (0.4 × 7700) / 7 = 440 kcal
      // Target = 2759 - 440 = 2319
      expect(target).toBe(2319);
    });

    it('calculates surplus for weight gain goal', () => {
      const goalInput = {
        ...maleInput,
        goalType: 'gain' as GoalType,
        targetRatePercent: 0.25, // 0.25% body weight per week
      };
      const target = tdeeCalculator.calculateTargetCalories(goalInput);
      // Weekly weight change = 0.25% × 80kg = 0.2kg
      // Daily surplus = (0.2 × 7700) / 7 = 220 kcal
      // Target = 2759 + 220 = 2979
      expect(target).toBe(2979);
    });

    it('enforces minimum calories of 1200 for safety', () => {
      const extremeDeficitInput = {
        ...femaleInput,
        goalType: 'lose' as GoalType,
        targetRatePercent: 2.0, // Extreme rate
        activityLevel: 'sedentary' as ActivityLevel,
      };
      const target = tdeeCalculator.calculateTargetCalories(extremeDeficitInput);
      expect(target).toBe(1200);
    });

    it('handles 1% body weight loss rate', () => {
      const goalInput = {
        ...maleInput,
        goalType: 'lose' as GoalType,
        targetRatePercent: 1.0, // 1% body weight per week
      };
      const target = tdeeCalculator.calculateTargetCalories(goalInput);
      // Weekly weight change = 1% × 80kg = 0.8kg
      // Daily deficit = (0.8 × 7700) / 7 = 880 kcal
      // Target = 2759 - 880 = 1879
      expect(target).toBe(1879);
    });
  });

  describe('calculateMacros', () => {
    it('calculates macros for weight loss goal', () => {
      const goalInput = {
        ...maleInput,
        goalType: 'lose' as GoalType,
        targetRatePercent: 0.5,
      };
      const macros = tdeeCalculator.calculateMacros(goalInput);

      expect(macros.calories).toBe(2319);
      // Protein: 2.0g/kg × 80kg = 160g
      expect(macros.protein).toBe(160);
      // Fat: 30% of 2319 = 695.7 kcal / 9 = 77g
      expect(macros.fat).toBe(77);
      // Carbs: remaining calories
      // Protein calories: 160 × 4 = 640
      // Fat calories: 696 (rounded)
      // Remaining: 2319 - 640 - 696 = 983 / 4 = 246g
      expect(macros.carbs).toBe(246);
    });

    it('calculates macros for maintain goal', () => {
      const goalInput = {
        ...maleInput,
        goalType: 'maintain' as GoalType,
        targetRatePercent: 0,
      };
      const macros = tdeeCalculator.calculateMacros(goalInput);

      expect(macros.calories).toBe(2759);
      // Protein: 1.6g/kg × 80kg = 128g
      expect(macros.protein).toBe(128);
    });

    it('calculates macros for weight gain goal', () => {
      const goalInput = {
        ...maleInput,
        goalType: 'gain' as GoalType,
        targetRatePercent: 0.25,
      };
      const macros = tdeeCalculator.calculateMacros(goalInput);

      expect(macros.calories).toBe(2979);
      // Protein: 1.8g/kg × 80kg = 144g
      expect(macros.protein).toBe(144);
      // Fat: 25% of 2979 = 744.75 kcal / 9 = 83g
      expect(macros.fat).toBe(83);
    });

    it('ensures macros are non-negative', () => {
      const extremeInput = {
        sex: 'female' as Sex,
        ageYears: 60,
        heightCm: 150,
        weightKg: 45,
        activityLevel: 'sedentary' as ActivityLevel,
        goalType: 'lose' as GoalType,
        targetRatePercent: 1.0,
      };
      const macros = tdeeCalculator.calculateMacros(extremeInput);

      expect(macros.protein).toBeGreaterThanOrEqual(0);
      expect(macros.carbs).toBeGreaterThanOrEqual(0);
      expect(macros.fat).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRateOptions', () => {
    it('returns correct options for weight loss', () => {
      const options = tdeeCalculator.getRateOptions('lose');
      expect(options).toEqual([0.25, 0.5, 0.75, 1.0]);
    });

    it('returns correct options for weight gain', () => {
      const options = tdeeCalculator.getRateOptions('gain');
      expect(options).toEqual([0.25, 0.5]);
    });

    it('returns correct options for maintain', () => {
      const options = tdeeCalculator.getRateOptions('maintain');
      expect(options).toEqual([0]);
    });
  });

  describe('getRateDescription', () => {
    it('returns maintain description', () => {
      const desc = tdeeCalculator.getRateDescription('maintain', 0, 80);
      expect(desc).toBe('Maintain current weight');
    });

    it('returns slow loss description', () => {
      const desc = tdeeCalculator.getRateDescription('lose', 0.25, 80);
      expect(desc).toContain('Lose');
      expect(desc).toContain('0.2');
      expect(desc).toContain('Slow & steady');
    });

    it('returns moderate loss description', () => {
      const desc = tdeeCalculator.getRateDescription('lose', 0.5, 80);
      expect(desc).toContain('Lose');
      expect(desc).toContain('Moderate');
    });

    it('returns faster loss description', () => {
      const desc = tdeeCalculator.getRateDescription('lose', 0.75, 80);
      expect(desc).toContain('Faster');
    });

    it('returns aggressive loss description', () => {
      const desc = tdeeCalculator.getRateDescription('lose', 1.0, 80);
      expect(desc).toContain('Aggressive');
    });

    it('returns gain description', () => {
      const desc = tdeeCalculator.getRateDescription('gain', 0.25, 80);
      expect(desc).toContain('Gain');
      expect(desc).toContain('0.2');
    });

    it('handles custom rate', () => {
      const desc = tdeeCalculator.getRateDescription('lose', 0.6, 80);
      expect(desc).toContain('Lose');
      expect(desc).toContain('0.5');
    });
  });

  describe('calculateTimeToGoal', () => {
    it('calculates time to goal correctly', () => {
      const result = tdeeCalculator.calculateTimeToGoal(80, 70, 0.5);
      // Weight diff: 10kg
      // Weekly change: 0.5% × 80 = 0.4kg/week
      // Weeks: 10 / 0.4 = 25 weeks
      expect(result).not.toBeNull();
      expect(result!.weeks).toBe(25);
      expect(result!.months).toBe(6); // 25 / 4.33 ≈ 5.77 ≈ 6
    });

    it('returns null when no target weight', () => {
      const result = tdeeCalculator.calculateTimeToGoal(80, 0, 0.5);
      expect(result).toBeNull();
    });

    it('returns null when rate is zero', () => {
      const result = tdeeCalculator.calculateTimeToGoal(80, 70, 0);
      expect(result).toBeNull();
    });

    it('handles weight gain goal', () => {
      const result = tdeeCalculator.calculateTimeToGoal(70, 80, 0.25);
      expect(result).not.toBeNull();
      expect(result!.weeks).toBeGreaterThan(0);
    });
  });

  describe('validateGoal', () => {
    it('validates healthy goal without warnings', () => {
      const goalInput = {
        ...maleInput,
        goalType: 'lose' as GoalType,
        targetRatePercent: 0.5,
      };
      const result = tdeeCalculator.validateGoal(goalInput);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('warns about excessive loss rate', () => {
      const goalInput = {
        ...maleInput,
        goalType: 'lose' as GoalType,
        targetRatePercent: 1.5, // > 1%
      };
      const result = tdeeCalculator.validateGoal(goalInput);

      expect(result.valid).toBe(false);
      expect(result.warnings.some(w => w.includes('sustainable'))).toBe(true);
    });

    it('warns when BMI is already underweight', () => {
      const underweightInput = {
        sex: 'female' as Sex,
        ageYears: 25,
        heightCm: 170,
        weightKg: 50, // BMI ≈ 17.3
        activityLevel: 'moderately_active' as ActivityLevel,
        goalType: 'lose' as GoalType,
        targetRatePercent: 0.5,
      };
      const result = tdeeCalculator.validateGoal(underweightInput);

      expect(result.valid).toBe(false);
      expect(result.warnings.some(w => w.includes('underweight'))).toBe(true);
    });

    it('does not warn about BMI for maintain goal', () => {
      const maintainInput = {
        sex: 'female' as Sex,
        ageYears: 25,
        heightCm: 170,
        weightKg: 50,
        activityLevel: 'moderately_active' as ActivityLevel,
        goalType: 'maintain' as GoalType,
        targetRatePercent: 0,
      };
      const result = tdeeCalculator.validateGoal(maintainInput);

      expect(result.warnings.some(w => w.includes('underweight'))).toBe(false);
    });
  });

  describe('getActivityDescription', () => {
    it('returns correct description for sedentary', () => {
      const desc = tdeeCalculator.getActivityDescription('sedentary');
      expect(desc).toContain('little to no exercise');
    });

    it('returns correct description for lightly_active', () => {
      const desc = tdeeCalculator.getActivityDescription('lightly_active');
      expect(desc).toContain('1-3 days');
    });

    it('returns correct description for moderately_active', () => {
      const desc = tdeeCalculator.getActivityDescription('moderately_active');
      expect(desc).toContain('3-5 days');
    });

    it('returns correct description for very_active', () => {
      const desc = tdeeCalculator.getActivityDescription('very_active');
      expect(desc).toContain('6-7 days');
    });

    it('returns correct description for extremely_active', () => {
      const desc = tdeeCalculator.getActivityDescription('extremely_active');
      expect(desc).toContain('physical job');
    });
  });

  describe('getActivityLabel', () => {
    it('returns correct labels for all activity levels', () => {
      expect(tdeeCalculator.getActivityLabel('sedentary')).toBe('Sedentary');
      expect(tdeeCalculator.getActivityLabel('lightly_active')).toBe('Lightly Active');
      expect(tdeeCalculator.getActivityLabel('moderately_active')).toBe('Moderately Active');
      expect(tdeeCalculator.getActivityLabel('very_active')).toBe('Very Active');
      expect(tdeeCalculator.getActivityLabel('extremely_active')).toBe('Extremely Active');
    });
  });
});
