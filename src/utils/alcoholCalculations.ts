/**
 * Alcohol nutrition calculation utilities.
 *
 * Pure alcohol provides ~7 cal/g. The simplified formula used here:
 *   alcoholCalories = volumeOz × abvPercent × 1.6
 * accounts for the density of ethanol and fluid-ounce conversion.
 */

export type DrinkType = 'beer' | 'wine' | 'spirit' | 'cocktail';

export interface DrinkPreset {
  abv: number;
  volumeOz: number;
  carbAllocation: number; // 0–100
}

export const DRINK_PRESETS: Record<DrinkType, DrinkPreset> = {
  beer:     { abv: 5,  volumeOz: 12,  carbAllocation: 80 },
  wine:     { abv: 13, volumeOz: 5,   carbAllocation: 60 },
  spirit:   { abv: 40, volumeOz: 1.5, carbAllocation: 0 },
  cocktail: { abv: 15, volumeOz: 6,   carbAllocation: 50 },
};

export const DRINK_LABELS: Record<DrinkType, string> = {
  beer: 'Beer',
  wine: 'Wine',
  spirit: 'Spirit',
  cocktail: 'Cocktail',
};

export const DRINK_ICONS: Record<DrinkType, string> = {
  beer: '🍺',
  wine: '🍷',
  spirit: '🥃',
  cocktail: '🍹',
};

/** Calories from pure alcohol: volumeOz × ABV% × 1.6 */
export function calculateAlcoholCalories(abvPercent: number, volumeOz: number): number {
  return volumeOz * abvPercent * 1.6;
}

/** Estimated carbs (grams) from residual sugars in the drink */
export function estimateDrinkCarbs(drinkType: DrinkType | null, volumeOz: number): number {
  switch (drinkType) {
    case 'beer':     return volumeOz * 1.1;
    case 'wine':     return volumeOz * 0.7;
    case 'cocktail': return volumeOz * 1.5;
    case 'spirit':
    default:         return 0;
  }
}

/** Full calorie breakdown for a drink */
export function calculateDrinkNutrition(
  abvPercent: number,
  volumeOz: number,
  drinkType: DrinkType | null,
) {
  const alcoholCalories = calculateAlcoholCalories(abvPercent, volumeOz);
  const carbEstimate = estimateDrinkCarbs(drinkType, volumeOz);
  const carbCalories = carbEstimate * 4;
  const totalCalories = alcoholCalories + carbCalories;

  return { alcoholCalories, carbEstimate, carbCalories, totalCalories };
}

/**
 * Allocate total calories between carbs and fat for macro tracking.
 * Protein is always 0 for alcohol.
 *
 * @param totalCalories  total drink calories
 * @param carbPercent    0–100 slider value (how much to count as carbs)
 */
export function allocateToMacros(totalCalories: number, carbPercent: number) {
  const carbCals = totalCalories * (carbPercent / 100);
  const fatCals = totalCalories - carbCals;

  return {
    protein: 0,
    carbs: Math.round(carbCals / 4),
    fat: Math.round(fatCals / 9),
  };
}
