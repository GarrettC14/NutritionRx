import { MealType } from '@/constants/mealTypes';
import { ParsedNutritionDay, ParsedMeal, NutritionTotals } from '@/types/nutritionImport';
import { NutritionCSVParser, parserUtils, localDateFromKey, ParseResult, ParseWarning } from './types';

/**
 * Parser for MyFitnessPal CSV exports
 *
 * MFP exports meal-level data with columns:
 * Date, Meal, Calories, Fat (g), Protein (g), Carbohydrates (g), etc.
 */
export class MyFitnessPalParser implements NutritionCSVParser {
  private requiredHeaders = ['date', 'meal', 'calories'];

  detect(headers: string[]): boolean {
    if (headers.length === 0) return false;

    const normalizedHeaders = headers.map((h) => parserUtils.normalizeHeader(h));

    // Must have Date, Meal, Calories (case-insensitive)
    const hasDate = normalizedHeaders.some((h) => h === 'date');
    const hasMeal = normalizedHeaders.some((h) => h === 'meal');
    const hasCalories = normalizedHeaders.some((h) => h === 'calories');

    return hasDate && hasMeal && hasCalories;
  }

  parse(data: Record<string, string>[]): ParseResult {
    if (data.length === 0) return { days: [], warnings: [] };

    const warnings: ParseWarning[] = [];
    // Group by date
    const dayMap = new Map<string, ParsedMeal[]>();

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
      const calories = parserUtils.parseNumber(parserUtils.getValue(row, 'Calories', 'calories'));
      const protein = parserUtils.parseNumber(
        parserUtils.getValue(row, 'Protein (g)', 'protein (g)', 'Protein')
      );
      const carbs = parserUtils.parseNumber(
        parserUtils.getValue(row, 'Carbohydrates (g)', 'carbohydrates (g)', 'Carbs (g)', 'carbs')
      );
      const fat = parserUtils.parseNumber(
        parserUtils.getValue(row, 'Fat (g)', 'fat (g)', 'Fat')
      );

      const meal: ParsedMeal = {
        name: mealName,
        calories,
        protein,
        carbs,
        fat,
      };

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, []);
      }
      dayMap.get(dateKey)!.push(meal);
    }

    // Convert to ParsedNutritionDay array
    const days: ParsedNutritionDay[] = [];

    for (const [dateKey, meals] of dayMap) {
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

    // Default to snack for unknown meal types
    return MealType.Snack;
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
