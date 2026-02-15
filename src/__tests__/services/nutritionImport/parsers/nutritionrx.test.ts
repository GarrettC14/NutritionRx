jest.mock('@/constants/mealTypes', () => ({
  MealType: { Breakfast: 'breakfast', Lunch: 'lunch', Dinner: 'dinner', Snack: 'snack' },
}));

import { NutritionRxParser } from '@/services/nutritionImport/parsers/nutritionrx';

describe('NutritionRxParser', () => {
  const parser = new NutritionRxParser();

  describe('detect', () => {
    it('returns true for headers with date, meal, type, food name', () => {
      const headers = ['Date', 'Meal', 'Type', 'Food Name', 'Calories', 'Protein (g)'];
      expect(parser.detect(headers)).toBe(true);
    });

    it('returns false for empty headers', () => {
      expect(parser.detect([])).toBe(false);
    });

    it('returns false when missing meal or type column', () => {
      // Missing 'Meal'
      const headers1 = ['Date', 'Type', 'Food Name'];
      expect(parser.detect(headers1)).toBe(false);

      // Missing 'Type'
      const headers2 = ['Date', 'Meal', 'Food Name'];
      expect(parser.detect(headers2)).toBe(false);
    });
  });

  describe('parse', () => {
    it('returns empty for empty data', () => {
      const result = parser.parse([]);
      expect(result.days).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('parses single food entry correctly with meal grouping', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Type: 'food',
          'Food Name': 'Oatmeal',
          Brand: '',
          Servings: '1',
          Calories: '150',
          'Protein (g)': '5',
          'Carbs (g)': '27',
          'Fat (g)': '3',
        },
      ];

      const result = parser.parse(data);
      expect(result.days).toHaveLength(1);
      expect(result.days[0].meals).toHaveLength(1);
      expect(result.days[0].meals[0].name).toBe('breakfast');
      expect(result.days[0].meals[0].foods).toHaveLength(1);
      expect(result.days[0].meals[0].foods![0].name).toBe('Oatmeal');
      expect(result.days[0].meals[0].foods![0].calories).toBe(150);
    });

    it('normalizes meal names (Breakfast, LUNCH, dinner, Snacks to enum values)', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Type: 'food',
          'Food Name': 'Eggs',
          Calories: '140',
          'Protein (g)': '12',
          'Carbs (g)': '1',
          'Fat (g)': '10',
        },
        {
          Date: '2024-01-15',
          Meal: 'LUNCH',
          Type: 'food',
          'Food Name': 'Sandwich',
          Calories: '350',
          'Protein (g)': '20',
          'Carbs (g)': '40',
          'Fat (g)': '12',
        },
        {
          Date: '2024-01-15',
          Meal: 'dinner',
          Type: 'food',
          'Food Name': 'Pasta',
          Calories: '400',
          'Protein (g)': '15',
          'Carbs (g)': '55',
          'Fat (g)': '10',
        },
        {
          Date: '2024-01-15',
          Meal: 'Snacks',
          Type: 'food',
          'Food Name': 'Apple',
          Calories: '95',
          'Protein (g)': '0',
          'Carbs (g)': '25',
          'Fat (g)': '0',
        },
      ];

      const result = parser.parse(data);
      const mealNames = result.days[0].meals.map((m) => m.name);
      expect(mealNames).toContain('breakfast');
      expect(mealNames).toContain('lunch');
      expect(mealNames).toContain('dinner');
      expect(mealNames).toContain('snack');
    });

    it('defaults unknown meal names to Snack', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Midnight Snack',
          Type: 'food',
          'Food Name': 'Cookies',
          Calories: '200',
          'Protein (g)': '2',
          'Carbs (g)': '30',
          'Fat (g)': '9',
        },
      ];

      const result = parser.parse(data);
      expect(result.days[0].meals[0].name).toBe('snack');
    });

    it('combines brand with food name when brand present', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Type: 'food',
          'Food Name': 'Greek Yogurt',
          Brand: 'Chobani',
          Servings: '1',
          Calories: '130',
          'Protein (g)': '15',
          'Carbs (g)': '6',
          'Fat (g)': '4',
        },
      ];

      const result = parser.parse(data);
      const food = result.days[0].meals[0].foods![0];
      expect(food.name).toBe('Greek Yogurt (Chobani)');
    });

    it('formats servings correctly', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Lunch',
          Type: 'food',
          'Food Name': 'Rice',
          Servings: '2',
          Calories: '400',
          'Protein (g)': '8',
          'Carbs (g)': '88',
          'Fat (g)': '1',
        },
      ];

      const result = parser.parse(data);
      const food = result.days[0].meals[0].foods![0];
      expect(food.amount).toBe('2 serving(s)');
    });

    it('uses 1 serving default when servings is empty', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Lunch',
          Type: 'food',
          'Food Name': 'Salad',
          Servings: '',
          Calories: '100',
          'Protein (g)': '3',
          'Carbs (g)': '10',
          'Fat (g)': '5',
        },
      ];

      const result = parser.parse(data);
      const food = result.days[0].meals[0].foods![0];
      expect(food.amount).toBe('1 serving');
    });

    it('groups foods into correct meals within same day', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Type: 'food',
          'Food Name': 'Eggs',
          Calories: '140',
          'Protein (g)': '12',
          'Carbs (g)': '1',
          'Fat (g)': '10',
        },
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Type: 'food',
          'Food Name': 'Toast',
          Calories: '80',
          'Protein (g)': '3',
          'Carbs (g)': '15',
          'Fat (g)': '1',
        },
        {
          Date: '2024-01-15',
          Meal: 'Lunch',
          Type: 'food',
          'Food Name': 'Chicken Wrap',
          Calories: '400',
          'Protein (g)': '30',
          'Carbs (g)': '35',
          'Fat (g)': '15',
        },
      ];

      const result = parser.parse(data);
      expect(result.days).toHaveLength(1);
      expect(result.days[0].meals).toHaveLength(2);

      const breakfast = result.days[0].meals.find((m) => m.name === 'breakfast');
      expect(breakfast!.foods).toHaveLength(2);

      const lunch = result.days[0].meals.find((m) => m.name === 'lunch');
      expect(lunch!.foods).toHaveLength(1);
    });

    it('calculates per-meal and daily totals', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Type: 'food',
          'Food Name': 'Eggs',
          Calories: '140',
          'Protein (g)': '12',
          'Carbs (g)': '1',
          'Fat (g)': '10',
        },
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Type: 'food',
          'Food Name': 'Toast',
          Calories: '80',
          'Protein (g)': '3',
          'Carbs (g)': '15',
          'Fat (g)': '1',
        },
        {
          Date: '2024-01-15',
          Meal: 'Lunch',
          Type: 'food',
          'Food Name': 'Salad',
          Calories: '300',
          'Protein (g)': '20',
          'Carbs (g)': '25',
          'Fat (g)': '12',
        },
      ];

      const result = parser.parse(data);

      const breakfast = result.days[0].meals.find((m) => m.name === 'breakfast');
      expect(breakfast!.calories).toBe(220); // 140 + 80
      expect(breakfast!.protein).toBe(15);   // 12 + 3
      expect(breakfast!.carbs).toBe(16);     // 1 + 15
      expect(breakfast!.fat).toBe(11);       // 10 + 1

      const lunch = result.days[0].meals.find((m) => m.name === 'lunch');
      expect(lunch!.calories).toBe(300);

      // Daily totals
      expect(result.days[0].totals.calories).toBe(520);  // 220 + 300
      expect(result.days[0].totals.protein).toBe(35);    // 15 + 20
      expect(result.days[0].totals.carbs).toBe(41);      // 16 + 25
      expect(result.days[0].totals.fat).toBe(23);        // 11 + 12
    });

    it('records warnings for invalid dates', () => {
      const data = [
        {
          Date: 'garbage-date',
          Meal: 'Lunch',
          Type: 'food',
          'Food Name': 'Pizza',
          Calories: '300',
          'Protein (g)': '12',
          'Carbs (g)': '35',
          'Fat (g)': '14',
        },
      ];

      const result = parser.parse(data);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('garbage-date');
      expect(result.days).toHaveLength(0);
    });

    it('sorts days by date ascending', () => {
      const data = [
        {
          Date: '2024-03-01',
          Meal: 'Breakfast',
          Type: 'food',
          'Food Name': 'Cereal',
          Calories: '200',
          'Protein (g)': '5',
          'Carbs (g)': '40',
          'Fat (g)': '2',
        },
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Type: 'food',
          'Food Name': 'Pancakes',
          Calories: '350',
          'Protein (g)': '8',
          'Carbs (g)': '50',
          'Fat (g)': '12',
        },
        {
          Date: '2024-02-10',
          Meal: 'Lunch',
          Type: 'food',
          'Food Name': 'Soup',
          Calories: '180',
          'Protein (g)': '10',
          'Carbs (g)': '20',
          'Fat (g)': '6',
        },
      ];

      const result = parser.parse(data);
      expect(result.days).toHaveLength(3);
      expect(result.days[0].date.getMonth()).toBe(0);  // January
      expect(result.days[1].date.getMonth()).toBe(1);  // February
      expect(result.days[2].date.getMonth()).toBe(2);  // March
    });
  });
});
