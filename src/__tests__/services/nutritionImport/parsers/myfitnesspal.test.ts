import { MyFitnessPalParser } from '@/services/nutritionImport/parsers/myfitnesspal';
import { MealType } from '@/constants/mealTypes';

describe('MyFitnessPalParser', () => {
  const parser = new MyFitnessPalParser();

  describe('detect', () => {
    it('should detect MFP format headers', () => {
      const headers = [
        'Date',
        'Meal',
        'Calories',
        'Fat (g)',
        'Protein (g)',
        'Carbohydrates (g)',
      ];
      expect(parser.detect(headers)).toBe(true);
    });

    it('should detect MFP format with lowercase headers', () => {
      const headers = [
        'date',
        'meal',
        'calories',
        'fat (g)',
        'protein (g)',
        'carbohydrates (g)',
      ];
      expect(parser.detect(headers)).toBe(true);
    });

    it('should reject headers without required fields', () => {
      const headers = ['Date', 'Food', 'Amount', 'Calories'];
      expect(parser.detect(headers)).toBe(false);
    });

    it('should reject empty headers', () => {
      expect(parser.detect([])).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse a complete day with all meals', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Calories: '450',
          'Protein (g)': '28',
          'Carbohydrates (g)': '52',
          'Fat (g)': '12',
        },
        {
          Date: '2024-01-15',
          Meal: 'Lunch',
          Calories: '680',
          'Protein (g)': '42',
          'Carbohydrates (g)': '68',
          'Fat (g)': '22',
        },
        {
          Date: '2024-01-15',
          Meal: 'Dinner',
          Calories: '820',
          'Protein (g)': '58',
          'Carbohydrates (g)': '72',
          'Fat (g)': '28',
        },
        {
          Date: '2024-01-15',
          Meal: 'Snacks',
          Calories: '280',
          'Protein (g)': '8',
          'Carbohydrates (g)': '38',
          'Fat (g)': '8',
        },
      ];

      const result = parser.parse(data);
      const { days } = result;

      expect(days).toHaveLength(1);
      expect(days[0].meals).toHaveLength(4);
      expect(days[0].totals.calories).toBe(2230);
      expect(days[0].totals.protein).toBe(136);
      expect(days[0].totals.carbs).toBe(230);
      expect(days[0].totals.fat).toBe(70);
    });

    it('should handle multiple days', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Calories: '450',
          'Protein (g)': '28',
          'Carbohydrates (g)': '52',
          'Fat (g)': '12',
        },
        {
          Date: '2024-01-16',
          Meal: 'Breakfast',
          Calories: '380',
          'Protein (g)': '22',
          'Carbohydrates (g)': '48',
          'Fat (g)': '10',
        },
      ];

      const result = parser.parse(data);
      const { days } = result;

      expect(days).toHaveLength(2);
      expect(days[0].date.getDate()).toBe(15);
      expect(days[1].date.getDate()).toBe(16);
    });

    it('should normalize meal names correctly', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'BREAKFAST',
          Calories: '100',
          'Protein (g)': '10',
          'Carbohydrates (g)': '10',
          'Fat (g)': '5',
        },
        {
          Date: '2024-01-15',
          Meal: 'dinner',
          Calories: '100',
          'Protein (g)': '10',
          'Carbohydrates (g)': '10',
          'Fat (g)': '5',
        },
        {
          Date: '2024-01-15',
          Meal: 'Unknown',
          Calories: '100',
          'Protein (g)': '10',
          'Carbohydrates (g)': '10',
          'Fat (g)': '5',
        },
      ];

      const result = parser.parse(data);
      const { days } = result;

      expect(days[0].meals[0].name).toBe(MealType.Breakfast);
      expect(days[0].meals[1].name).toBe(MealType.Dinner);
      expect(days[0].meals[2].name).toBe(MealType.Snack); // Unknown defaults to snack
    });

    it('should handle missing values as 0', () => {
      const data = [
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Calories: '',
          'Protein (g)': '',
          'Carbohydrates (g)': '',
          'Fat (g)': '',
        },
      ];

      const result = parser.parse(data);
      const { days } = result;

      expect(days[0].meals[0].calories).toBe(0);
      expect(days[0].meals[0].protein).toBe(0);
      expect(days[0].meals[0].carbs).toBe(0);
      expect(days[0].meals[0].fat).toBe(0);
    });

    it('should sort results by date', () => {
      const data = [
        {
          Date: '2024-01-20',
          Meal: 'Breakfast',
          Calories: '100',
          'Protein (g)': '10',
          'Carbohydrates (g)': '10',
          'Fat (g)': '5',
        },
        {
          Date: '2024-01-15',
          Meal: 'Breakfast',
          Calories: '100',
          'Protein (g)': '10',
          'Carbohydrates (g)': '10',
          'Fat (g)': '5',
        },
      ];

      const result = parser.parse(data);
      const { days } = result;

      expect(days[0].date.getDate()).toBe(15);
      expect(days[1].date.getDate()).toBe(20);
    });

    it('should return empty array for empty data', () => {
      const result = parser.parse([]);
      expect(result.days).toHaveLength(0);
    });
  });
});
