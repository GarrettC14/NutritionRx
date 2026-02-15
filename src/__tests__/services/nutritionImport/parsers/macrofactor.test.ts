jest.mock('@/constants/mealTypes', () => ({
  MealType: { Breakfast: 'breakfast', Lunch: 'lunch', Dinner: 'dinner', Snack: 'snack' },
}));

import { MacroFactorParser } from '@/services/nutritionImport/parsers/macrofactor';

describe('MacroFactorParser', () => {
  const parser = new MacroFactorParser();

  describe('detect', () => {
    it('returns true for headers with date, food, calories', () => {
      const headers = ['Date', 'Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
      expect(parser.detect(headers)).toBe(true);
    });

    it('returns true for header variations (Food Name, Energy, kcal)', () => {
      const headers = ['Date', 'Food Name', 'Energy', 'Protein'];
      expect(parser.detect(headers)).toBe(true);

      const headers2 = ['Date', 'Name', 'kcal', 'Fat'];
      expect(parser.detect(headers2)).toBe(true);
    });

    it('returns false for empty headers', () => {
      expect(parser.detect([])).toBe(false);
    });

    it('returns false for missing required columns', () => {
      // Missing food column
      const headers = ['Date', 'Calories'];
      expect(parser.detect(headers)).toBe(false);
    });
  });

  describe('parse', () => {
    it('returns empty for empty data', () => {
      const result = parser.parse([]);
      expect(result.days).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('parses single food entry correctly', () => {
      const data = [
        {
          Date: '2024-01-15',
          'Food Name': 'Chicken Breast',
          Calories: '250',
          'Protein (g)': '40',
          'Carbs (g)': '0',
          'Fat (g)': '8',
          Amount: '6 oz',
        },
      ];

      const result = parser.parse(data);
      expect(result.days).toHaveLength(1);
      expect(result.days[0].date.getFullYear()).toBe(2024);
      expect(result.days[0].date.getMonth()).toBe(0);
      expect(result.days[0].date.getDate()).toBe(15);

      // Should have at least one meal containing the food
      const allFoods = result.days[0].meals.flatMap((m) => m.foods || []);
      expect(allFoods).toHaveLength(1);
      expect(allFoods[0].name).toBe('Chicken Breast');
      expect(allFoods[0].calories).toBe(250);
      expect(allFoods[0].protein).toBe(40);
      expect(allFoods[0].carbs).toBe(0);
      expect(allFoods[0].fat).toBe(8);
      expect(allFoods[0].amount).toBe('6 oz');
    });

    it('groups multiple foods on same date into one day', () => {
      const data = [
        {
          Date: '2024-01-15',
          'Food Name': 'Oatmeal',
          Calories: '150',
          'Protein (g)': '5',
          'Carbs (g)': '27',
          'Fat (g)': '3',
        },
        {
          Date: '2024-01-15',
          'Food Name': 'Banana',
          Calories: '105',
          'Protein (g)': '1',
          'Carbs (g)': '27',
          'Fat (g)': '0',
        },
      ];

      const result = parser.parse(data);
      expect(result.days).toHaveLength(1);

      const allFoods = result.days[0].meals.flatMap((m) => m.foods || []);
      expect(allFoods).toHaveLength(2);
    });

    it('sorts days by date ascending', () => {
      const data = [
        {
          Date: '2024-01-20',
          'Food Name': 'Rice',
          Calories: '200',
          'Protein (g)': '4',
          'Carbs (g)': '44',
          'Fat (g)': '0',
        },
        {
          Date: '2024-01-10',
          'Food Name': 'Pasta',
          Calories: '220',
          'Protein (g)': '8',
          'Carbs (g)': '43',
          'Fat (g)': '1',
        },
      ];

      const result = parser.parse(data);
      expect(result.days).toHaveLength(2);
      expect(result.days[0].date.getDate()).toBe(10);
      expect(result.days[1].date.getDate()).toBe(20);
    });

    it('assigns meal type by time (breakfast 5-11, lunch 11-15, dinner 15-21, snack default)', () => {
      const data = [
        {
          Date: '2024-01-15',
          'Food Name': 'Eggs',
          Calories: '140',
          'Protein (g)': '12',
          'Carbs (g)': '1',
          'Fat (g)': '10',
          Time: '07:00',
        },
        {
          Date: '2024-01-15',
          'Food Name': 'Sandwich',
          Calories: '350',
          'Protein (g)': '20',
          'Carbs (g)': '40',
          'Fat (g)': '12',
          Time: '12:00',
        },
        {
          Date: '2024-01-15',
          'Food Name': 'Steak',
          Calories: '500',
          'Protein (g)': '50',
          'Carbs (g)': '0',
          'Fat (g)': '30',
          Time: '18:00',
        },
        {
          Date: '2024-01-15',
          'Food Name': 'Chips',
          Calories: '150',
          'Protein (g)': '2',
          'Carbs (g)': '18',
          'Fat (g)': '8',
          Time: '23:00',
        },
      ];

      const result = parser.parse(data);
      expect(result.days).toHaveLength(1);

      const mealNames = result.days[0].meals.map((m) => m.name);
      expect(mealNames).toContain('breakfast');
      expect(mealNames).toContain('lunch');
      expect(mealNames).toContain('dinner');
      expect(mealNames).toContain('snack');

      const breakfastMeal = result.days[0].meals.find((m) => m.name === 'breakfast');
      expect(breakfastMeal!.foods![0].name).toBe('Eggs');

      const lunchMeal = result.days[0].meals.find((m) => m.name === 'lunch');
      expect(lunchMeal!.foods![0].name).toBe('Sandwich');

      const dinnerMeal = result.days[0].meals.find((m) => m.name === 'dinner');
      expect(dinnerMeal!.foods![0].name).toBe('Steak');

      const snackMeal = result.days[0].meals.find((m) => m.name === 'snack');
      expect(snackMeal!.foods![0].name).toBe('Chips');
    });

    it('uses Snack as default when no time provided', () => {
      const data = [
        {
          Date: '2024-01-15',
          'Food Name': 'Apple',
          Calories: '95',
          'Protein (g)': '0',
          'Carbs (g)': '25',
          'Fat (g)': '0',
        },
      ];

      const result = parser.parse(data);
      expect(result.days[0].meals).toHaveLength(1);
      expect(result.days[0].meals[0].name).toBe('snack');
    });

    it('calculates totals correctly (sum of all meals)', () => {
      const data = [
        {
          Date: '2024-01-15',
          'Food Name': 'Food A',
          Calories: '200',
          'Protein (g)': '10',
          'Carbs (g)': '20',
          'Fat (g)': '5',
          Time: '08:00',
        },
        {
          Date: '2024-01-15',
          'Food Name': 'Food B',
          Calories: '300',
          'Protein (g)': '25',
          'Carbs (g)': '30',
          'Fat (g)': '10',
          Time: '12:00',
        },
      ];

      const result = parser.parse(data);
      expect(result.days[0].totals.calories).toBe(500);
      expect(result.days[0].totals.protein).toBe(35);
      expect(result.days[0].totals.carbs).toBe(50);
      expect(result.days[0].totals.fat).toBe(15);
    });

    it('records warnings for unparseable dates', () => {
      const data = [
        {
          Date: 'not-a-date',
          'Food Name': 'Apple',
          Calories: '95',
          'Protein (g)': '0',
          'Carbs (g)': '25',
          'Fat (g)': '0',
        },
      ];

      const result = parser.parse(data);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('not-a-date');
      expect(result.days).toHaveLength(0);
    });

    it('handles missing food name with Unknown Food default', () => {
      const data = [
        {
          Date: '2024-01-15',
          'Food Name': '',
          Calories: '100',
          'Protein (g)': '5',
          'Carbs (g)': '10',
          'Fat (g)': '3',
        },
      ];

      const result = parser.parse(data);
      const allFoods = result.days[0].meals.flatMap((m) => m.foods || []);
      expect(allFoods[0].name).toBe('Unknown Food');
    });

    it('handles missing amount with 1 serving default', () => {
      const data = [
        {
          Date: '2024-01-15',
          'Food Name': 'Chicken',
          Calories: '250',
          'Protein (g)': '40',
          'Carbs (g)': '0',
          'Fat (g)': '8',
        },
      ];

      const result = parser.parse(data);
      const allFoods = result.days[0].meals.flatMap((m) => m.foods || []);
      expect(allFoods[0].amount).toBe('1 serving');
    });
  });
});
