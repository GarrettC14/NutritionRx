import { MealType } from '@/constants/mealTypes';
import {
  ParsedNutritionDay,
  ParsedMeal,
  NutritionTotals,
  ParsedFood,
} from '@/types/nutritionImport';
import { NutritionCSVParser, parserUtils, localDateFromKey, ParseResult, ParseWarning } from './types';

/**
 * Parser for NutritionRx backup files (CSV format)
 *
 * NutritionRx exports data with sections marked by === SECTION NAME ===
 * Food logs section has columns:
 * Date, Meal, Type, Food Name, Brand, Servings, Calories, Protein (g), Carbs (g), Fat (g), Notes
 */
export class NutritionRxParser implements NutritionCSVParser {
  detect(headers: string[]): boolean {
    if (headers.length === 0) return false;

    const normalizedHeaders = headers.map((h) => parserUtils.normalizeHeader(h));

    // NutritionRx CSV has specific columns
    const hasDate = normalizedHeaders.some((h) => h === 'date');
    const hasMeal = normalizedHeaders.some((h) => h === 'meal');
    const hasType = normalizedHeaders.some((h) => h === 'type');
    const hasFoodName = normalizedHeaders.some((h) => h === 'food name');

    return hasDate && hasMeal && hasType && hasFoodName;
  }

  parse(data: Record<string, string>[]): ParseResult {
    if (data.length === 0) return { days: [], warnings: [] };

    const warnings: ParseWarning[] = [];
    // Group by date
    const dayMap = new Map<string, Map<MealType, ParsedFood[]>>();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const dateStr = parserUtils.getValue(row, 'Date', 'date');
      const date = parserUtils.parseDate(dateStr);
      if (!date) {
        warnings.push({ line: i + 2, message: `Could not parse date: "${dateStr}"` });
        continue;
      }

      const dateKey = parserUtils.formatDateKey(date);

      const mealName = this.normalizeMealName(parserUtils.getValue(row, 'Meal', 'meal'));
      const foodName = parserUtils.getValue(row, 'Food Name', 'food name');
      const brand = parserUtils.getValue(row, 'Brand', 'brand');
      const servings = parserUtils.getValue(row, 'Servings', 'servings');
      const calories = parserUtils.parseNumber(parserUtils.getValue(row, 'Calories', 'calories'));
      const protein = parserUtils.parseNumber(
        parserUtils.getValue(row, 'Protein (g)', 'protein (g)')
      );
      const carbs = parserUtils.parseNumber(parserUtils.getValue(row, 'Carbs (g)', 'carbs (g)'));
      const fat = parserUtils.parseNumber(parserUtils.getValue(row, 'Fat (g)', 'fat (g)'));

      const food: ParsedFood = {
        name: brand ? `${foodName} (${brand})` : foodName,
        amount: servings ? `${servings} serving(s)` : '1 serving',
        calories,
        protein,
        carbs,
        fat,
      };

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, new Map());
      }
      const dayMeals = dayMap.get(dateKey)!;

      if (!dayMeals.has(mealName)) {
        dayMeals.set(mealName, []);
      }
      dayMeals.get(mealName)!.push(food);
    }

    // Convert to ParsedNutritionDay array
    const days: ParsedNutritionDay[] = [];

    for (const [dateKey, mealMap] of dayMap) {
      const meals: ParsedMeal[] = [];

      for (const [mealType, foods] of mealMap) {
        const mealTotals = this.calculateFoodsTotals(foods);
        meals.push({
          name: mealType,
          calories: mealTotals.calories,
          protein: mealTotals.protein,
          carbs: mealTotals.carbs,
          fat: mealTotals.fat,
          foods,
        });
      }

      const totals = this.calculateTotals(meals);
      days.push({
        date: localDateFromKey(dateKey),
        meals,
        totals,
      });
    }

    // Sort by date ascending
    days.sort((a, b) => a.date.getTime() - b.date.getTime());

    return { days, warnings };
  }

  private normalizeMealName(name: string): MealType {
    const lower = name.toLowerCase().trim();

    if (lower === 'breakfast') return MealType.Breakfast;
    if (lower === 'lunch') return MealType.Lunch;
    if (lower === 'dinner') return MealType.Dinner;
    if (lower === 'snacks' || lower === 'snack') return MealType.Snack;

    return MealType.Snack;
  }

  private calculateFoodsTotals(foods: ParsedFood[]): NutritionTotals {
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

  private calculateTotals(meals: ParsedMeal[]): NutritionTotals {
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

