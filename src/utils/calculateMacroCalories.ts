/**
 * Atwater factor calorie calculation.
 * Current log entries have no fiber field — callers pass fiber=0.
 * Degrades gracefully to basic 4-4-9 formula.
 */
export function calculateMacroCalories(
  protein: number,
  carbs: number,
  fat: number,
  fiber = 0,
  alcohol = 0
): number {
  const safeFiber = Math.max(0, fiber);
  const netCarbs = Math.max(0, carbs - safeFiber);
  const fiberCalories = safeFiber * 2;
  return Math.round(
    protein * 4 + netCarbs * 4 + fiberCalories + fat * 9 + alcohol * 7
  );
}

/**
 * Delta between label and macro-calculated calories.
 * Positive = macro is higher than label.
 */
export function getCalorieDelta(
  labelCalories: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber = 0
): number {
  return calculateMacroCalories(protein, carbs, fat, fiber) - labelCalories;
}
