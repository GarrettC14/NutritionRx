import { LoseItParser } from '@/services/nutritionImport/parsers/loseit';
import { MealType } from '@/constants/mealTypes';

describe('LoseItParser', () => {
  const parser = new LoseItParser();

  describe('detect', () => {
    it('should detect Lose It! format headers', () => {
      const headers = [
        'Date',
        'Name',
        'Type',
        'Quantity',
        'Units',
        'Calories',
        'Fat (g)',
        'Protein (g)',
        'Carbohydrates (g)',
      ];
      expect(parser.detect(headers)).toBe(true);
    });

    it('should reject headers without type column', () => {
      // This distinguishes from MFP
      const headers = ['Date', 'Name', 'Calories', 'Fat (g)', 'Protein (g)'];
      expect(parser.detect(headers)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should filter out exercise entries', () => {
      const data = [
        {
          Date: '01/15/2024',
          Name: 'Banana',
          Type: 'Food',
          Quantity: '1',
          Units: 'medium',
          Calories: '105',
          'Protein (g)': '1',
          'Carbohydrates (g)': '27',
          'Fat (g)': '0',
        },
        {
          Date: '01/15/2024',
          Name: 'Morning Run',
          Type: 'Exercise',
          Quantity: '30',
          Units: 'minutes',
          Calories: '-280',
          'Protein (g)': '',
          'Carbohydrates (g)': '',
          'Fat (g)': '',
        },
        {
          Date: '01/15/2024',
          Name: 'Chicken Breast',
          Type: 'Food',
          Quantity: '170',
          Units: 'g',
          Calories: '281',
          'Protein (g)': '53',
          'Carbohydrates (g)': '0',
          'Fat (g)': '6',
        },
      ];

      const result = parser.parse(data);

      expect(result).toHaveLength(1);
      expect(result[0].totals.calories).toBe(386); // Only food entries: 105 + 281
    });

    it('should convert MM/DD/YYYY date format', () => {
      const data = [
        {
          Date: '01/15/2024',
          Name: 'Test Food',
          Type: 'Food',
          Calories: '100',
          'Protein (g)': '10',
          'Carbohydrates (g)': '10',
          'Fat (g)': '5',
        },
      ];

      const result = parser.parse(data);

      expect(result[0].date.getFullYear()).toBe(2024);
      expect(result[0].date.getMonth()).toBe(0); // January (0-indexed)
      expect(result[0].date.getDate()).toBe(15);
    });

    it('should aggregate all foods into a single meal (Snack)', () => {
      // Lose It! doesn't have meal grouping
      const data = [
        {
          Date: '01/15/2024',
          Name: 'Food 1',
          Type: 'Food',
          Calories: '100',
          'Protein (g)': '10',
          'Carbohydrates (g)': '10',
          'Fat (g)': '5',
        },
        {
          Date: '01/15/2024',
          Name: 'Food 2',
          Type: 'Food',
          Calories: '200',
          'Protein (g)': '20',
          'Carbohydrates (g)': '20',
          'Fat (g)': '10',
        },
      ];

      const result = parser.parse(data);

      expect(result[0].meals).toHaveLength(1);
      expect(result[0].meals[0].name).toBe(MealType.Snack);
      expect(result[0].meals[0].calories).toBe(300);
    });

    it('should return empty array for data with only exercise', () => {
      const data = [
        {
          Date: '01/15/2024',
          Name: 'Morning Run',
          Type: 'Exercise',
          Calories: '-280',
          'Protein (g)': '',
          'Carbohydrates (g)': '',
          'Fat (g)': '',
        },
      ];

      const result = parser.parse(data);

      expect(result).toHaveLength(0);
    });
  });
});
