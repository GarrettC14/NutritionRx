import { MealType } from '@/constants/mealTypes';
import {
  ParsedNutritionDay,
  ParsedMeal,
  ParsedFood,
  NutritionTotals,
  ImportType,
} from '@/types/nutritionImport';
import { NutritionCSVParser, parserUtils } from './types';

/**
 * Parser for Cronometer CSV exports
 *
 * Cronometer exports food-level data with columns:
 * Day, Group (meal), Food Name, Amount, Energy (kcal), Protein (g), Carbs (g), Fat (g), etc.
 */
export class CronometerParser implements NutritionCSVParser {
  detect(headers: string[]): boolean {
    if (headers.length === 0) return false;

    const normalizedHeaders = headers.map((h) => parserUtils.normalizeHeader(h));

    // Must have Day, Food Name, Energy (kcal)
    const hasDay = normalizedHeaders.some((h) => h === 'day');
    const hasFoodName = normalizedHeaders.some((h) => h === 'food name');
    const hasEnergy = normalizedHeaders.some((h) => h.includes('energy'));

    return hasDay && hasFoodName && hasEnergy;
  }

  parse(data: Record<string, string>[], importType: ImportType = 'daily_totals'): ParsedNutritionDay[] {
    if (data.length === 0) return [];

    // Group by date and meal
    const dayMap = new Map<string, Map<MealType, ParsedFood[]>>();

    for (const row of data) {
      const dateStr = parserUtils.getValue(row, 'Day', 'day');
      const date = parserUtils.parseDate(dateStr);
      if (!date) continue;

      const dateKey = date.toISOString().split('T')[0];

      const mealGroup = parserUtils.getValue(row, 'Group', 'group');
      const mealType = this.normalizeMealName(mealGroup);

      const food: ParsedFood = {
        name: parserUtils.getValue(row, 'Food Name', 'food name'),
        amount: parserUtils.getValue(row, 'Amount', 'amount'),
        calories: parserUtils.parseNumber(
          parserUtils.getValue(row, 'Energy (kcal)', 'energy (kcal)', 'Calories')
        ),
        protein: parserUtils.parseNumber(
          parserUtils.getValue(row, 'Protein (g)', 'protein (g)')
        ),
        carbs: parserUtils.parseNumber(
          parserUtils.getValue(row, 'Carbs (g)', 'carbs (g)', 'Carbohydrates (g)')
        ),
        fat: parserUtils.parseNumber(parserUtils.getValue(row, 'Fat (g)', 'fat (g)')),
      };

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, new Map());
      }

      const dayMeals = dayMap.get(dateKey)!;
      if (!dayMeals.has(mealType)) {
        dayMeals.set(mealType, []);
      }
      dayMeals.get(mealType)!.push(food);
    }

    // Convert to ParsedNutritionDay array
    const days: ParsedNutritionDay[] = [];

    for (const [dateKey, mealMap] of dayMap) {
      const meals: ParsedMeal[] = [];

      for (const [mealType, foods] of mealMap) {
        const mealTotals = this.calculateFoodTotals(foods);
        const meal: ParsedMeal = {
          name: mealType,
          calories: mealTotals.calories,
          protein: mealTotals.protein,
          carbs: mealTotals.carbs,
          fat: mealTotals.fat,
        };

        // Include individual foods only if requested
        if (importType === 'individual_foods') {
          meal.foods = foods;
        }

        meals.push(meal);
      }

      const totals = this.calculateMealTotals(meals);
      days.push({
        date: new Date(dateKey + 'T12:00:00'),
        meals,
        totals,
      });
    }

    // Sort by date ascending
    days.sort((a, b) => a.date.getTime() - b.date.getTime());

    return days;
  }

  private normalizeMealName(name: string): MealType {
    const lower = name.toLowerCase().trim();

    if (lower === 'breakfast') return MealType.Breakfast;
    if (lower === 'lunch') return MealType.Lunch;
    if (lower === 'dinner' || lower === 'supper') return MealType.Dinner;
    if (lower === 'snacks' || lower === 'snack') return MealType.Snack;

    // Default to snack for unknown meal types
    return MealType.Snack;
  }

  private calculateFoodTotals(foods: ParsedFood[]): NutritionTotals {
    return foods.reduce(
      (totals, food) => ({
        calories: totals.calories + food.calories,
        protein: totals.protein + food.protein,
        carbs: totals.carbs + food.carbs,
        fat: totals.fat + food.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  private calculateMealTotals(meals: ParsedMeal[]): NutritionTotals {
    return meals.reduce(
      (totals, meal) => ({
        calories: totals.calories + meal.calories,
        protein: totals.protein + meal.protein,
        carbs: totals.carbs + meal.carbs,
        fat: totals.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }
}
