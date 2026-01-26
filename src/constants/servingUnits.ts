/**
 * Serving Unit Types and Conversion Utilities
 * Per ADD_FOOD_SERVING_SPEC.md
 */

export type ServingUnit = 'serving' | 'g' | 'oz' | 'cup' | 'tbsp' | 'tsp' | 'ml' | 'fl_oz';

export interface ServingUnitConfig {
  id: ServingUnit;
  label: string;
  shortLabel: string;
  category: 'weight' | 'volume' | 'serving';
}

export const SERVING_UNITS: ServingUnitConfig[] = [
  { id: 'serving', label: 'Serving', shortLabel: 'serving', category: 'serving' },
  { id: 'g', label: 'Grams', shortLabel: 'g', category: 'weight' },
  { id: 'oz', label: 'Ounces', shortLabel: 'oz', category: 'weight' },
  { id: 'cup', label: 'Cup', shortLabel: 'cup', category: 'volume' },
  { id: 'tbsp', label: 'Tablespoon', shortLabel: 'tbsp', category: 'volume' },
  { id: 'tsp', label: 'Teaspoon', shortLabel: 'tsp', category: 'volume' },
  { id: 'ml', label: 'Milliliters', shortLabel: 'ml', category: 'volume' },
  { id: 'fl_oz', label: 'Fluid Ounces', shortLabel: 'fl oz', category: 'volume' },
];

// Conversion factors
export const GRAMS_PER_OZ = 28.3495;
export const ML_PER_CUP = 236.588;
export const ML_PER_TBSP = 14.787;
export const ML_PER_TSP = 4.929;
export const ML_PER_FL_OZ = 29.5735;

/**
 * Get available units for a food based on its data
 * - All foods get 'serving'
 * - Foods with gram weight get 'g' and 'oz'
 * - Foods with volume data (servingSizeMl) get volume units
 */
export function getAvailableUnits(food: {
  servingSizeGrams?: number | null;
  servingSizeMl?: number | null;
}): ServingUnit[] {
  const units: ServingUnit[] = ['serving'];

  // Always add weight units if we have gram data
  if (food.servingSizeGrams && food.servingSizeGrams > 0) {
    units.push('g', 'oz');
  }

  // Add volume units if we have ml data (typically for liquids)
  if (food.servingSizeMl && food.servingSizeMl > 0) {
    units.push('ml', 'fl_oz', 'cup', 'tbsp', 'tsp');
  }

  return units;
}

/**
 * Calculate nutrition based on amount and unit
 */
export function calculateNutritionForUnit(
  food: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: number;
    servingSizeGrams?: number | null;
    servingSizeMl?: number | null;
  },
  amount: number,
  unit: ServingUnit
): { calories: number; protein: number; carbs: number; fat: number; grams?: number } {
  // Base nutrition is per 1 serving
  const caloriesPerServing = food.calories;
  const proteinPerServing = food.protein;
  const carbsPerServing = food.carbs;
  const fatPerServing = food.fat;

  let multiplier = amount; // Default: treat as servings
  let grams: number | undefined;

  const servingGrams = food.servingSizeGrams || 100; // Default to 100g if not specified

  switch (unit) {
    case 'serving':
      multiplier = amount;
      grams = Math.round(servingGrams * amount);
      break;

    case 'g':
      // Convert grams to servings
      multiplier = amount / servingGrams;
      grams = Math.round(amount);
      break;

    case 'oz':
      // Convert oz to grams, then to servings
      const gramsFromOz = amount * GRAMS_PER_OZ;
      multiplier = gramsFromOz / servingGrams;
      grams = Math.round(gramsFromOz);
      break;

    case 'ml':
      if (food.servingSizeMl && food.servingSizeMl > 0) {
        multiplier = amount / food.servingSizeMl;
        // Estimate grams from ml (assume density ~1 for most liquids)
        grams = Math.round(amount * (servingGrams / food.servingSizeMl));
      }
      break;

    case 'fl_oz':
      if (food.servingSizeMl && food.servingSizeMl > 0) {
        const mlFromFlOz = amount * ML_PER_FL_OZ;
        multiplier = mlFromFlOz / food.servingSizeMl;
        grams = Math.round(mlFromFlOz * (servingGrams / food.servingSizeMl));
      }
      break;

    case 'cup':
      if (food.servingSizeMl && food.servingSizeMl > 0) {
        const mlFromCup = amount * ML_PER_CUP;
        multiplier = mlFromCup / food.servingSizeMl;
        grams = Math.round(mlFromCup * (servingGrams / food.servingSizeMl));
      }
      break;

    case 'tbsp':
      if (food.servingSizeMl && food.servingSizeMl > 0) {
        const mlFromTbsp = amount * ML_PER_TBSP;
        multiplier = mlFromTbsp / food.servingSizeMl;
        grams = Math.round(mlFromTbsp * (servingGrams / food.servingSizeMl));
      }
      break;

    case 'tsp':
      if (food.servingSizeMl && food.servingSizeMl > 0) {
        const mlFromTsp = amount * ML_PER_TSP;
        multiplier = mlFromTsp / food.servingSizeMl;
        grams = Math.round(mlFromTsp * (servingGrams / food.servingSizeMl));
      }
      break;
  }

  return {
    calories: Math.round(caloriesPerServing * multiplier),
    protein: Math.round(proteinPerServing * multiplier * 10) / 10,
    carbs: Math.round(carbsPerServing * multiplier * 10) / 10,
    fat: Math.round(fatPerServing * multiplier * 10) / 10,
    grams,
  };
}

/**
 * Get default amount when switching units
 */
export function getDefaultAmountForUnit(
  unit: ServingUnit,
  food: { servingSizeGrams?: number | null }
): string {
  switch (unit) {
    case 'serving':
      return '1';
    case 'g':
      return String(food.servingSizeGrams || 100);
    case 'oz':
      return String(Math.round(((food.servingSizeGrams || 100) / GRAMS_PER_OZ) * 10) / 10);
    case 'cup':
      return '1';
    case 'tbsp':
      return '1';
    case 'tsp':
      return '1';
    case 'ml':
      return '100';
    case 'fl_oz':
      return '1';
    default:
      return '1';
  }
}

/**
 * Get unit label for display
 */
export function getUnitLabel(unit: ServingUnit): string {
  const config = SERVING_UNITS.find(u => u.id === unit);
  return config?.shortLabel || unit;
}
