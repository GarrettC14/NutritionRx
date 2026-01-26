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
