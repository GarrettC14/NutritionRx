import { MealType } from '@/constants/mealTypes';
import { ParsedNutritionDay, ParsedMeal, NutritionTotals } from '@/types/nutritionImport';
import { NutritionCSVParser, parserUtils } from './types';

/**
 * Parser for Lose It! CSV exports
 *
 * Lose It! exports food-level data with columns:
 * Date, Name, Type (Food/Exercise), Quantity, Units, Calories, Fat (g), Protein (g), Carbohydrates (g)
 *
 * Key differences from other apps:
 * - Uses "Type" column to distinguish Food from Exercise entries
 * - Date format is MM/DD/YYYY
 * - No meal grouping - all foods are aggregated into Snack
 * - Exercise entries have negative calories
 */
export class LoseItParser implements NutritionCSVParser {
  detect(headers: string[]): boolean {
    if (headers.length === 0) return false;

    const normalizedHeaders = headers.map((h) => parserUtils.normalizeHeader(h));

    // Must have Date, Name, Type (the Type column distinguishes from MFP)
    const hasDate = normalizedHeaders.some((h) => h === 'date');
    const hasName = normalizedHeaders.some((h) => h === 'name');
    const hasType = normalizedHeaders.some((h) => h === 'type');

    return hasDate && hasName && hasType;
  }

  parse(data: Record<string, string>[]): ParsedNutritionDay[] {
    if (data.length === 0) return [];

    // Filter out exercise entries and group by date
    const dayMap = new Map<string, NutritionTotals>();

    for (const row of data) {
      // Skip exercise entries
      const entryType = parserUtils.getValue(row, 'Type', 'type');
      if (entryType.toLowerCase() === 'exercise') continue;

      const dateStr = parserUtils.getValue(row, 'Date', 'date');
      const date = this.parseLosetItDate(dateStr);
      if (!date) continue;

      const dateKey = date.toISOString().split('T')[0];

      const calories = parserUtils.parseNumber(parserUtils.getValue(row, 'Calories', 'calories'));
      const protein = parserUtils.parseNumber(
        parserUtils.getValue(row, 'Protein (g)', 'protein (g)')
      );
      const carbs = parserUtils.parseNumber(
        parserUtils.getValue(row, 'Carbohydrates (g)', 'carbohydrates (g)')
      );
      const fat = parserUtils.parseNumber(parserUtils.getValue(row, 'Fat (g)', 'fat (g)'));

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { calories: 0, protein: 0, carbs: 0, fat: 0 });
      }

      const dayTotals = dayMap.get(dateKey)!;
      dayTotals.calories += calories;
      dayTotals.protein += protein;
      dayTotals.carbs += carbs;
      dayTotals.fat += fat;
    }

    // Convert to ParsedNutritionDay array
    // Lose It! doesn't have meal grouping, so we put everything in one "Snack" meal
    const days: ParsedNutritionDay[] = [];

    for (const [dateKey, totals] of dayMap) {
      const meal: ParsedMeal = {
        name: MealType.Snack,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      };

      days.push({
        date: new Date(dateKey + 'T12:00:00'),
        meals: [meal],
        totals,
      });
    }

    // Sort by date ascending
    days.sort((a, b) => a.date.getTime() - b.date.getTime());

    return days;
  }

  /**
   * Parse Lose It! date format (MM/DD/YYYY)
   */
  private parseLosetItDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Lose It! uses MM/DD/YYYY format
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, month, day, year] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Fallback to general date parsing
    return parserUtils.parseDate(dateStr);
  }
}
