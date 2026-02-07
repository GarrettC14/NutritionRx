import { MealType } from '@/constants/mealTypes';
import { ParsedNutritionDay, ParsedMeal, NutritionTotals, ParsedFood } from '@/types/nutritionImport';
import { NutritionCSVParser, parserUtils, localDateFromKey, ParseResult, ParseWarning } from './types';

/**
 * Parser for MacroFactor CSV exports
 *
 * MacroFactor exports food-level data with columns:
 * Date, Time, Food Name, Calories, Protein (g), Carbs (g), Fat (g), Fiber (g), etc.
 */
export class MacroFactorParser implements NutritionCSVParser {
  private requiredHeaders = ['date', 'food', 'calories'];

  detect(headers: string[]): boolean {
    if (headers.length === 0) return false;

    const normalizedHeaders = headers.map((h) => parserUtils.normalizeHeader(h));

    // MacroFactor typically has: Date, Food Name/Food, Calories, Protein, Carbs, Fat
    // It may also have Time column
    const hasDate = normalizedHeaders.some((h) => h === 'date');
    const hasFood = normalizedHeaders.some(
      (h) => h === 'food name' || h === 'food' || h === 'name'
    );
    const hasCalories = normalizedHeaders.some(
      (h) => h === 'calories' || h === 'energy' || h === 'kcal'
    );

    // MacroFactor specific: often has "entry type" or similar
    const hasMacroFactorSpecific = normalizedHeaders.some(
      (h) => h.includes('macrofactor') || h === 'entry type' || h === 'source'
    );

    return hasDate && hasFood && hasCalories;
  }

  parse(data: Record<string, string>[]): ParseResult {
    if (data.length === 0) return { days: [], warnings: [] };

    const warnings: ParseWarning[] = [];
    // Group by date
    const dayMap = new Map<string, { foods: ParsedFood[]; time?: string }[]>();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const dateStr = parserUtils.getValue(row, 'Date', 'date');
      const date = parserUtils.parseDate(dateStr);
      if (!date) {
        warnings.push({ line: i + 2, message: `Could not parse date: "${dateStr}"` });
        continue;
      }

      const dateKey = parserUtils.formatDateKey(date);

      const foodName = parserUtils.getValue(row, 'Food Name', 'Food', 'Name', 'food name');
      const calories = parserUtils.parseNumber(
        parserUtils.getValue(row, 'Calories', 'Energy', 'kcal', 'calories')
      );
      const protein = parserUtils.parseNumber(
        parserUtils.getValue(row, 'Protein (g)', 'Protein', 'protein (g)', 'protein')
      );
      const carbs = parserUtils.parseNumber(
        parserUtils.getValue(row, 'Carbs (g)', 'Carbohydrates (g)', 'Carbs', 'carbs (g)', 'carbs')
      );
      const fat = parserUtils.parseNumber(
        parserUtils.getValue(row, 'Fat (g)', 'Fat', 'fat (g)', 'fat')
      );
      const time = parserUtils.getValue(row, 'Time', 'time');
      const amount = parserUtils.getValue(row, 'Amount', 'Serving', 'Servings', 'serving');

      const food: ParsedFood = {
        name: foodName || 'Unknown Food',
        amount: amount || '1 serving',
        calories,
        protein,
        carbs,
        fat,
      };

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, []);
      }
      dayMap.get(dateKey)!.push({ foods: [food], time });
    }

    // Convert to ParsedNutritionDay array
    const days: ParsedNutritionDay[] = [];

    for (const [dateKey, entries] of dayMap) {
      // Group foods by approximate time into meals
      const meals = this.groupIntoMeals(entries);
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

  private groupIntoMeals(entries: { foods: ParsedFood[]; time?: string }[]): ParsedMeal[] {
    // If we have time information, group by time periods
    // Otherwise, create a single "Imported" meal for the day

    const allFoods: ParsedFood[] = entries.flatMap((e) => e.foods);

    if (entries.some((e) => e.time)) {
      // Try to group by time
      const mealBuckets: Map<MealType, ParsedFood[]> = new Map();

      for (const entry of entries) {
        const mealType = this.timeTOMealType(entry.time);
        if (!mealBuckets.has(mealType)) {
          mealBuckets.set(mealType, []);
        }
        mealBuckets.get(mealType)!.push(...entry.foods);
      }

      const meals: ParsedMeal[] = [];
      for (const [mealType, foods] of mealBuckets) {
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

      return meals;
    }

    // No time info - create a single meal with all foods
    const totals = this.calculateFoodsTotals(allFoods);
    return [
      {
        name: MealType.Snack, // Default to snack for imported data
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        foods: allFoods,
      },
    ];
  }

  private timeTOMealType(time?: string): MealType {
    if (!time) return MealType.Snack;

    // Parse time like "08:30" or "8:30 AM"
    const match = time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!match) return MealType.Snack;

    let hour = parseInt(match[1], 10);
    const ampm = match[3]?.toLowerCase();

    if (ampm === 'pm' && hour !== 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    if (hour >= 5 && hour < 11) return MealType.Breakfast;
    if (hour >= 11 && hour < 15) return MealType.Lunch;
    if (hour >= 15 && hour < 21) return MealType.Dinner;
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
