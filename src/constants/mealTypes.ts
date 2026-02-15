export enum MealType {
  Breakfast = 'breakfast',
  Lunch = 'lunch',
  Dinner = 'dinner',
  Snack = 'snack',
}

export const MEAL_TYPE_ORDER: MealType[] = [
  MealType.Breakfast,
  MealType.Lunch,
  MealType.Dinner,
  MealType.Snack,
];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  [MealType.Breakfast]: 'Breakfast',
  [MealType.Lunch]: 'Lunch',
  [MealType.Dinner]: 'Dinner',
  [MealType.Snack]: 'Snack',
};

// Numeric order for sorting
export const MEAL_ORDER: Record<MealType, number> = {
  [MealType.Breakfast]: 1,
  [MealType.Lunch]: 2,
  [MealType.Dinner]: 3,
  [MealType.Snack]: 4,
};

// ============================================================
// Custom Meal Type Support
// ============================================================

export interface MealTypeConfig {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export const DEFAULT_MEAL_CONFIGS: MealTypeConfig[] = [
  { id: MealType.Breakfast, name: 'Breakfast', icon: '🌅', sortOrder: 1, isDefault: true, isActive: true },
  { id: MealType.Lunch, name: 'Lunch', icon: '☀️', sortOrder: 2, isDefault: true, isActive: true },
  { id: MealType.Dinner, name: 'Dinner', icon: '🌙', sortOrder: 3, isDefault: true, isActive: true },
  { id: MealType.Snack, name: 'Snack', icon: '🍎', sortOrder: 4, isDefault: true, isActive: true },
];

/** Type guard for the 4 built-in meal types */
export function isCoreMealType(value: string): value is MealType {
  return Object.values(MealType).includes(value as MealType);
}

/** Get display name for any meal type (core or custom) */
export function getMealTypeName(
  mealTypeId: string,
  customMealTypes?: Array<{ id: string; name: string }>,
): string {
  // Check core types first
  if (isCoreMealType(mealTypeId)) {
    return MEAL_TYPE_LABELS[mealTypeId];
  }
  // Check custom types
  const custom = customMealTypes?.find((c) => c.id === mealTypeId);
  if (custom) return custom.name;
  // Fallback
  return mealTypeId;
}

// Get suggested meal type based on current time
export function getSuggestedMealType(): MealType {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) {
    return MealType.Breakfast;
  } else if (hour >= 11 && hour < 15) {
    return MealType.Lunch;
  } else if (hour >= 15 && hour < 21) {
    return MealType.Dinner;
  } else {
    return MealType.Snack;
  }
}
