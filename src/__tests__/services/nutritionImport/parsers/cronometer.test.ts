import { CronometerParser } from '@/services/nutritionImport/parsers/cronometer';
import { MealType } from '@/constants/mealTypes';

describe('CronometerParser', () => {
  const parser = new CronometerParser();

  describe('detect', () => {
    it('should detect Cronometer format headers', () => {
      const headers = [
        'Day',
        'Group',
        'Food Name',
        'Amount',
        'Energy (kcal)',
        'Protein (g)',
        'Carbs (g)',
        'Fat (g)',
      ];
      expect(parser.detect(headers)).toBe(true);
    });

    it('should reject headers without required fields', () => {
      const headers = ['Date', 'Meal', 'Calories'];
      expect(parser.detect(headers)).toBe(false);
    });
  });

  describe('parse - daily totals mode', () => {
    it('should aggregate foods into meal totals', () => {
      const data = [
        {
          Day: '2024-01-15',
          Group: 'Breakfast',
          'Food Name': 'Oatmeal, cooked',
          Amount: '1 cup',
          'Energy (kcal)': '158',
          'Protein (g)': '6',
          'Carbs (g)': '27',
          'Fat (g)': '3',
        },
        {
          Day: '2024-01-15',
          Group: 'Breakfast',
          'Food Name': 'Banana, raw',
          Amount: '1 medium',
          'Energy (kcal)': '105',
          'Protein (g)': '1',
          'Carbs (g)': '27',
          'Fat (g)': '0',
        },
        {
          Day: '2024-01-15',
          Group: 'Lunch',
          'Food Name': 'Chicken Breast, grilled',
          Amount: '6 oz',
          'Energy (kcal)': '281',
          'Protein (g)': '53',
          'Carbs (g)': '0',
          'Fat (g)': '6',
        },
      ];

      const result = parser.parse(data, 'daily_totals');
      const { days } = result;

      expect(days).toHaveLength(1);
      expect(days[0].meals).toHaveLength(2); // Breakfast and Lunch

      const breakfast = days[0].meals.find((m) => m.name === MealType.Breakfast);
      expect(breakfast).toBeDefined();
      expect(breakfast!.calories).toBe(263); // 158 + 105
      expect(breakfast!.foods).toBeUndefined(); // No individual foods in daily_totals mode

      expect(days[0].totals.calories).toBe(544); // 263 + 281
    });
  });

  describe('parse - individual foods mode', () => {
    it('should preserve individual food entries', () => {
      const data = [
        {
          Day: '2024-01-15',
          Group: 'Breakfast',
          'Food Name': 'Oatmeal, cooked',
          Amount: '1 cup',
          'Energy (kcal)': '158',
          'Protein (g)': '6',
          'Carbs (g)': '27',
          'Fat (g)': '3',
        },
        {
          Day: '2024-01-15',
          Group: 'Breakfast',
          'Food Name': 'Banana, raw',
          Amount: '1 medium',
          'Energy (kcal)': '105',
          'Protein (g)': '1',
          'Carbs (g)': '27',
          'Fat (g)': '0',
        },
      ];

      const result = parser.parse(data, 'individual_foods');
      const { days } = result;

      expect(days).toHaveLength(1);
      const breakfast = days[0].meals.find((m) => m.name === MealType.Breakfast);
      expect(breakfast!.foods).toBeDefined();
      expect(breakfast!.foods).toHaveLength(2);

      expect(breakfast!.foods![0].name).toBe('Oatmeal, cooked');
      expect(breakfast!.foods![1].name).toBe('Banana, raw');
    });
  });
});
