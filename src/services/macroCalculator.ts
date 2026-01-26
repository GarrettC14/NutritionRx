import { EatingStyle, ProteinPriority } from '@/types/domain';

// Calories per gram of each macro
const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

// Eating style configurations
// Defines how remaining calories (after protein) are split between carbs and fat
const EATING_STYLE_CONFIG: Record<EatingStyle, { carbRatio: number; fatRatio: number; carbCap?: number }> = {
  flexible: { carbRatio: 0.5, fatRatio: 0.5 },
  carb_focused: { carbRatio: 0.65, fatRatio: 0.35 },
  fat_focused: { carbRatio: 0.35, fatRatio: 0.65, carbCap: 150 },
  very_low_carb: { carbRatio: 0.1, fatRatio: 0.9, carbCap: 50 },
};

// Protein priority configurations
// gPerLb = grams of protein per pound of body weight
// gPerKg = grams of protein per kilogram of body weight
const PROTEIN_PRIORITY_CONFIG: Record<ProteinPriority, { gPerLb: number; gPerKg: number }> = {
  standard: { gPerLb: 0.6, gPerKg: 1.32 },  // 0.6 g/lb ≈ 1.32 g/kg
  active: { gPerLb: 0.75, gPerKg: 1.65 },    // 0.75 g/lb ≈ 1.65 g/kg
  athletic: { gPerLb: 0.9, gPerKg: 1.98 },   // 0.9 g/lb ≈ 1.98 g/kg
  maximum: { gPerLb: 1.0, gPerKg: 2.2 },     // 1.0 g/lb ≈ 2.2 g/kg
};

export interface MacroCalculationInput {
  weightKg: number;
  targetCalories: number;
  eatingStyle: EatingStyle;
  proteinPriority: ProteinPriority;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroBreakdown extends MacroTargets {
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
  carbCapApplied: boolean;
}

export const macroCalculator = {
  /**
   * Calculate macro targets based on eating style and protein priority
   *
   * Algorithm:
   * 1. Calculate protein based on body weight and protein priority
   * 2. Calculate remaining calories after protein
   * 3. Split remaining calories between carbs and fat based on eating style
   * 4. Apply carb cap if applicable (fat_focused: 150g, very_low_carb: 50g)
   * 5. Reallocate excess carb calories to fat when carb cap is hit
   */
  calculateMacros(input: MacroCalculationInput): MacroTargets {
    const { weightKg, targetCalories, eatingStyle, proteinPriority } = input;

    const proteinConfig = PROTEIN_PRIORITY_CONFIG[proteinPriority];
    const styleConfig = EATING_STYLE_CONFIG[eatingStyle];

    // Step 1: Calculate protein based on body weight
    const proteinGrams = Math.round(weightKg * proteinConfig.gPerKg);
    const proteinCalories = proteinGrams * CALORIES_PER_GRAM.protein;

    // Step 2: Calculate remaining calories after protein
    const remainingCalories = Math.max(0, targetCalories - proteinCalories);

    // Step 3: Calculate initial carbs and fat split
    let carbsCalories = remainingCalories * styleConfig.carbRatio;
    let fatCalories = remainingCalories * styleConfig.fatRatio;

    let carbsGrams = Math.round(carbsCalories / CALORIES_PER_GRAM.carbs);
    let fatGrams = Math.round(fatCalories / CALORIES_PER_GRAM.fat);

    // Step 4: Apply carb cap if needed
    if (styleConfig.carbCap !== undefined && carbsGrams > styleConfig.carbCap) {
      carbsGrams = styleConfig.carbCap;
      carbsCalories = carbsGrams * CALORIES_PER_GRAM.carbs;

      // Step 5: Reallocate excess calories to fat
      const excessCalories = remainingCalories - carbsCalories;
      fatGrams = Math.round(excessCalories / CALORIES_PER_GRAM.fat);
    }

    // Ensure non-negative values
    return {
      calories: targetCalories,
      protein: Math.max(0, proteinGrams),
      carbs: Math.max(0, carbsGrams),
      fat: Math.max(0, fatGrams),
    };
  },

  /**
   * Calculate macros with detailed breakdown including percentages
   */
  calculateMacrosWithBreakdown(input: MacroCalculationInput): MacroBreakdown {
    const { weightKg, targetCalories, eatingStyle, proteinPriority } = input;

    const proteinConfig = PROTEIN_PRIORITY_CONFIG[proteinPriority];
    const styleConfig = EATING_STYLE_CONFIG[eatingStyle];

    // Calculate protein
    const proteinGrams = Math.round(weightKg * proteinConfig.gPerKg);
    const proteinCalories = proteinGrams * CALORIES_PER_GRAM.protein;

    // Calculate remaining calories
    const remainingCalories = Math.max(0, targetCalories - proteinCalories);

    // Calculate initial carbs and fat
    let carbsCalories = remainingCalories * styleConfig.carbRatio;
    let fatCalories = remainingCalories * styleConfig.fatRatio;

    let carbsGrams = Math.round(carbsCalories / CALORIES_PER_GRAM.carbs);
    let fatGrams = Math.round(fatCalories / CALORIES_PER_GRAM.fat);

    let carbCapApplied = false;

    // Apply carb cap if needed
    if (styleConfig.carbCap !== undefined && carbsGrams > styleConfig.carbCap) {
      carbCapApplied = true;
      carbsGrams = styleConfig.carbCap;
      carbsCalories = carbsGrams * CALORIES_PER_GRAM.carbs;

      const excessCalories = remainingCalories - carbsCalories;
      fatGrams = Math.round(excessCalories / CALORIES_PER_GRAM.fat);
      fatCalories = fatGrams * CALORIES_PER_GRAM.fat;
    }

    // Ensure non-negative
    const protein = Math.max(0, proteinGrams);
    const carbs = Math.max(0, carbsGrams);
    const fat = Math.max(0, fatGrams);

    // Recalculate actual calories from rounded grams
    const actualProteinCalories = protein * CALORIES_PER_GRAM.protein;
    const actualCarbsCalories = carbs * CALORIES_PER_GRAM.carbs;
    const actualFatCalories = fat * CALORIES_PER_GRAM.fat;
    const totalCalories = actualProteinCalories + actualCarbsCalories + actualFatCalories;

    // Calculate percentages
    const proteinPercent = totalCalories > 0 ? (actualProteinCalories / totalCalories) * 100 : 0;
    const carbsPercent = totalCalories > 0 ? (actualCarbsCalories / totalCalories) * 100 : 0;
    const fatPercent = totalCalories > 0 ? (actualFatCalories / totalCalories) * 100 : 0;

    return {
      calories: targetCalories,
      protein,
      carbs,
      fat,
      proteinCalories: actualProteinCalories,
      carbsCalories: actualCarbsCalories,
      fatCalories: actualFatCalories,
      proteinPercent: Math.round(proteinPercent),
      carbsPercent: Math.round(carbsPercent),
      fatPercent: Math.round(fatPercent),
      carbCapApplied,
    };
  },

  /**
   * Get protein amount for a given weight and priority
   */
  getProteinForWeight(weightKg: number, proteinPriority: ProteinPriority): number {
    const config = PROTEIN_PRIORITY_CONFIG[proteinPriority];
    return Math.round(weightKg * config.gPerKg);
  },

  /**
   * Get the carb cap for an eating style (if any)
   */
  getCarbCap(eatingStyle: EatingStyle): number | undefined {
    return EATING_STYLE_CONFIG[eatingStyle].carbCap;
  },

  /**
   * Get human-readable label for eating style
   */
  getEatingStyleLabel(style: EatingStyle): string {
    const labels: Record<EatingStyle, string> = {
      flexible: 'Flexible',
      carb_focused: 'Carb Focused',
      fat_focused: 'Fat Focused',
      very_low_carb: 'Very Low Carb',
    };
    return labels[style];
  },

  /**
   * Get human-readable description for eating style
   */
  getEatingStyleDescription(style: EatingStyle): string {
    const descriptions: Record<EatingStyle, string> = {
      flexible: 'Balanced split between carbs and fats (50/50)',
      carb_focused: 'Higher carbs for energy-demanding activities (65/35)',
      fat_focused: 'Higher fats, capped at 150g carbs (35/65)',
      very_low_carb: 'Keto-style, max 50g carbs (10/90)',
    };
    return descriptions[style];
  },

  /**
   * Get human-readable label for protein priority
   */
  getProteinPriorityLabel(priority: ProteinPriority): string {
    const labels: Record<ProteinPriority, string> = {
      standard: 'Standard',
      active: 'Active',
      athletic: 'Athletic',
      maximum: 'Maximum',
    };
    return labels[priority];
  },

  /**
   * Get human-readable description for protein priority
   */
  getProteinPriorityDescription(priority: ProteinPriority): string {
    const config = PROTEIN_PRIORITY_CONFIG[priority];
    const descriptions: Record<ProteinPriority, string> = {
      standard: `Lower protein for sedentary lifestyle (${config.gPerLb}g/lb)`,
      active: `Moderate protein for regular exercise (${config.gPerLb}g/lb)`,
      athletic: `Higher protein for intense training (${config.gPerLb}g/lb)`,
      maximum: `Maximum protein for muscle building (${config.gPerLb}g/lb)`,
    };
    return descriptions[priority];
  },

  /**
   * Get protein amount example for a given priority at 150 lbs
   */
  getProteinExample(priority: ProteinPriority): string {
    const config = PROTEIN_PRIORITY_CONFIG[priority];
    const exampleWeight = 150; // lbs
    const proteinAmount = Math.round(exampleWeight * config.gPerLb);
    return `${proteinAmount}g at 150 lbs`;
  },

  /**
   * Get all eating styles with labels and descriptions
   */
  getAllEatingStyles(): Array<{ value: EatingStyle; label: string; description: string }> {
    const styles: EatingStyle[] = ['flexible', 'carb_focused', 'fat_focused', 'very_low_carb'];
    return styles.map((style) => ({
      value: style,
      label: this.getEatingStyleLabel(style),
      description: this.getEatingStyleDescription(style),
    }));
  },

  /**
   * Get all protein priorities with labels and descriptions
   */
  getAllProteinPriorities(): Array<{ value: ProteinPriority; label: string; description: string; example: string }> {
    const priorities: ProteinPriority[] = ['standard', 'active', 'athletic', 'maximum'];
    return priorities.map((priority) => ({
      value: priority,
      label: this.getProteinPriorityLabel(priority),
      description: this.getProteinPriorityDescription(priority),
      example: this.getProteinExample(priority),
    }));
  },

  /**
   * Validate that a macro combination is reasonable
   */
  validateMacros(macros: MacroTargets): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check minimum protein
    if (macros.protein < 40) {
      warnings.push('Protein is very low. Consider increasing protein priority.');
    }

    // Check minimum fat for hormone health
    if (macros.fat < 30) {
      warnings.push('Fat is very low. This may affect hormone function.');
    }

    // Check if carbs are negative (shouldn't happen but safety check)
    if (macros.carbs < 0) {
      warnings.push('Carbs calculation resulted in negative value.');
    }

    // Check total calories match roughly
    const calculatedCalories =
      macros.protein * 4 +
      macros.carbs * 4 +
      macros.fat * 9;

    const difference = Math.abs(calculatedCalories - macros.calories);
    if (difference > 50) {
      warnings.push('Macro totals differ significantly from calorie target.');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  },
};
