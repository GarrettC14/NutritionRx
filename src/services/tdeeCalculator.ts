import { ActivityLevel, Sex, GoalType } from '@/types/domain';

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // Little to no exercise
  lightly_active: 1.375, // Light exercise 1-3 days/week
  moderately_active: 1.55, // Moderate exercise 3-5 days/week
  very_active: 1.725, // Hard exercise 6-7 days/week
  extremely_active: 1.9, // Very hard exercise, physical job
};

// Rate of weight change as % of body weight per week
const RATE_OPTIONS: Record<GoalType, number[]> = {
  lose: [0.25, 0.5, 0.75, 1.0], // % of body weight per week
  maintain: [0],
  gain: [0.25, 0.5],
};

// Calorie deficit/surplus per kg of weight change
// 1 kg = approximately 7700 kcal
const KCAL_PER_KG = 7700;

// Macro ratios based on goal type
// Format: { protein: g per kg bodyweight, carbsPercent, fatPercent (of remaining calories) }
const MACRO_GUIDELINES: Record<GoalType, { proteinPerKg: number; fatPercent: number }> = {
  lose: { proteinPerKg: 2.0, fatPercent: 0.30 }, // Higher protein during deficit
  maintain: { proteinPerKg: 1.6, fatPercent: 0.30 },
  gain: { proteinPerKg: 1.8, fatPercent: 0.25 },
};

export interface TDEECalculationInput {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}

export interface MacroTargets {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

export interface GoalCalculationInput extends TDEECalculationInput {
  goalType: GoalType;
  targetRatePercent: number; // % of body weight per week
}

export const tdeeCalculator = {
  /**
   * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
   * This is the number of calories your body burns at rest
   */
  calculateBMR(input: TDEECalculationInput): number {
    const { sex, ageYears, heightCm, weightKg } = input;

    // Mifflin-St Jeor equation
    // Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5
    // Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161

    const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;

    return Math.round(sex === 'male' ? baseBMR + 5 : baseBMR - 161);
  },

  /**
   * Calculate Total Daily Energy Expenditure
   * BMR × activity multiplier
   */
  calculateTDEE(input: TDEECalculationInput): number {
    const bmr = this.calculateBMR(input);
    const multiplier = ACTIVITY_MULTIPLIERS[input.activityLevel];
    return Math.round(bmr * multiplier);
  },

  /**
   * Calculate daily calorie target based on goal
   */
  calculateTargetCalories(input: GoalCalculationInput): number {
    const tdee = this.calculateTDEE(input);
    const { goalType, targetRatePercent, weightKg } = input;

    if (goalType === 'maintain') {
      return tdee;
    }

    // Calculate weekly weight change in kg
    const weeklyWeightChangeKg = (targetRatePercent / 100) * weightKg;

    // Calculate daily calorie adjustment
    const dailyCalorieAdjustment = Math.round((weeklyWeightChangeKg * KCAL_PER_KG) / 7);

    if (goalType === 'lose') {
      // Ensure we don't go below 1200 for safety
      return Math.max(1200, tdee - dailyCalorieAdjustment);
    } else {
      // Gaining weight
      return tdee + dailyCalorieAdjustment;
    }
  },

  /**
   * Calculate macro targets based on goal and body weight
   */
  calculateMacros(input: GoalCalculationInput): MacroTargets {
    const targetCalories = this.calculateTargetCalories(input);
    const { goalType, weightKg } = input;
    const guidelines = MACRO_GUIDELINES[goalType];

    // Protein: based on body weight
    const proteinGrams = Math.round(weightKg * guidelines.proteinPerKg);
    const proteinCalories = proteinGrams * 4;

    // Fat: percentage of total calories
    const fatCalories = Math.round(targetCalories * guidelines.fatPercent);
    const fatGrams = Math.round(fatCalories / 9);

    // Carbs: remaining calories
    const carbsCalories = targetCalories - proteinCalories - fatCalories;
    const carbsGrams = Math.round(carbsCalories / 4);

    return {
      calories: targetCalories,
      protein: Math.max(0, proteinGrams),
      carbs: Math.max(0, carbsGrams),
      fat: Math.max(0, fatGrams),
    };
  },

  /**
   * Get available rate options for a goal type
   */
  getRateOptions(goalType: GoalType): number[] {
    return RATE_OPTIONS[goalType];
  },

  /**
   * Get human-readable rate description
   */
  getRateDescription(goalType: GoalType, ratePercent: number, weightKg: number): string {
    if (goalType === 'maintain') {
      return 'Maintain current weight';
    }

    const weeklyChange = (ratePercent / 100) * weightKg;
    const action = goalType === 'lose' ? 'Lose' : 'Gain';

    if (ratePercent === 0.25) {
      return `${action} ~${weeklyChange.toFixed(1)} kg/week (Slow & steady)`;
    } else if (ratePercent === 0.5) {
      return `${action} ~${weeklyChange.toFixed(1)} kg/week (Moderate)`;
    } else if (ratePercent === 0.75) {
      return `${action} ~${weeklyChange.toFixed(1)} kg/week (Faster)`;
    } else if (ratePercent === 1.0) {
      return `${action} ~${weeklyChange.toFixed(1)} kg/week (Aggressive)`;
    }

    return `${action} ~${weeklyChange.toFixed(1)} kg/week`;
  },

  /**
   * Calculate estimated time to reach target weight
   */
  calculateTimeToGoal(
    currentWeightKg: number,
    targetWeightKg: number,
    ratePercent: number
  ): { weeks: number; months: number } | null {
    if (!targetWeightKg || ratePercent === 0) return null;

    const weightDiff = Math.abs(targetWeightKg - currentWeightKg);
    const weeklyChange = (ratePercent / 100) * currentWeightKg;

    const weeks = Math.ceil(weightDiff / weeklyChange);
    const months = Math.round(weeks / 4.33);

    return { weeks, months };
  },

  /**
   * Validate that goal parameters are reasonable
   */
  validateGoal(input: GoalCalculationInput): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const targetCalories = this.calculateTargetCalories(input);

    // Check if calorie target is too low
    if (targetCalories < 1200) {
      warnings.push('Calorie target may be too low for long-term health.');
    }

    // Check if rate is sustainable
    if (input.goalType === 'lose' && input.targetRatePercent > 1.0) {
      warnings.push('Losing more than 1% body weight per week may not be sustainable.');
    }

    // Check if BMI is already healthy for weight loss
    const bmi = input.weightKg / Math.pow(input.heightCm / 100, 2);
    if (input.goalType === 'lose' && bmi < 18.5) {
      warnings.push('Your BMI suggests you may already be underweight.');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  },

  /**
   * Get activity level description
   */
  getActivityDescription(level: ActivityLevel): string {
    const descriptions: Record<ActivityLevel, string> = {
      sedentary: 'Desk job, little to no exercise',
      lightly_active: 'Light exercise 1-3 days per week',
      moderately_active: 'Moderate exercise 3-5 days per week',
      very_active: 'Hard exercise 6-7 days per week',
      extremely_active: 'Very hard exercise or physical job',
    };
    return descriptions[level];
  },

  /**
   * Get activity level label
   */
  getActivityLabel(level: ActivityLevel): string {
    const labels: Record<ActivityLevel, string> = {
      sedentary: 'Sedentary',
      lightly_active: 'Lightly Active',
      moderately_active: 'Moderately Active',
      very_active: 'Very Active',
      extremely_active: 'Extremely Active',
    };
    return labels[level];
  },
};
