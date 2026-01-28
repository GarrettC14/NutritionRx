import { parserUtils } from '@/services/nutritionImport/parsers/types';

describe('parserUtils', () => {
  describe('parseNumber', () => {
    it('should parse valid numbers', () => {
      expect(parserUtils.parseNumber('100')).toBe(100);
      expect(parserUtils.parseNumber('50.5')).toBe(50.5);
      expect(parserUtils.parseNumber('0')).toBe(0);
    });

    it('should return 0 for empty strings', () => {
      expect(parserUtils.parseNumber('')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(parserUtils.parseNumber(null)).toBe(0);
      expect(parserUtils.parseNumber(undefined)).toBe(0);
    });

    it('should return 0 for invalid numbers', () => {
      expect(parserUtils.parseNumber('abc')).toBe(0);
      expect(parserUtils.parseNumber('not a number')).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(parserUtils.parseNumber('-100')).toBe(-100);
    });
  });

  describe('parseDate', () => {
    it('should parse YYYY-MM-DD format', () => {
      const date = parserUtils.parseDate('2024-01-15');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(0); // January
      expect(date!.getDate()).toBe(15);
    });

    it('should parse MM/DD/YYYY format', () => {
      const date = parserUtils.parseDate('01/15/2024');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(0);
      expect(date!.getDate()).toBe(15);
    });

    it('should parse single digit month/day in MM/DD/YYYY format', () => {
      const date = parserUtils.parseDate('1/5/2024');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(0);
      expect(date!.getDate()).toBe(5);
    });

    it('should return null for empty string', () => {
      expect(parserUtils.parseDate('')).toBeNull();
    });

    it('should return null for invalid date', () => {
      expect(parserUtils.parseDate('not a date')).toBeNull();
    });
  });

  describe('normalizeHeader', () => {
    it('should lowercase headers', () => {
      expect(parserUtils.normalizeHeader('CALORIES')).toBe('calories');
      expect(parserUtils.normalizeHeader('Date')).toBe('date');
    });

    it('should trim whitespace', () => {
      expect(parserUtils.normalizeHeader('  calories  ')).toBe('calories');
    });

    it('should handle mixed case and whitespace', () => {
      expect(parserUtils.normalizeHeader(' Protein (g) ')).toBe('protein (g)');
    });
  });

  describe('hasRequiredHeaders', () => {
    it('should return true when all required headers exist', () => {
      const headers = ['Date', 'Meal', 'Calories', 'Fat (g)'];
      expect(parserUtils.hasRequiredHeaders(headers, ['date', 'meal', 'calories'])).toBe(true);
    });

    it('should return false when required headers are missing', () => {
      const headers = ['Date', 'Calories'];
      expect(parserUtils.hasRequiredHeaders(headers, ['date', 'meal', 'calories'])).toBe(false);
    });

    it('should be case insensitive', () => {
      const headers = ['DATE', 'MEAL', 'CALORIES'];
      expect(parserUtils.hasRequiredHeaders(headers, ['date', 'meal', 'calories'])).toBe(true);
    });

    it('should match partial header names', () => {
      const headers = ['Energy (kcal)'];
      expect(parserUtils.hasRequiredHeaders(headers, ['energy'])).toBe(true);
    });
  });

  describe('getValue', () => {
    it('should get value by exact key', () => {
      const row = { Date: '2024-01-15', Calories: '100' };
      expect(parserUtils.getValue(row, 'Date')).toBe('2024-01-15');
      expect(parserUtils.getValue(row, 'Calories')).toBe('100');
    });

    it('should be case insensitive', () => {
      const row = { Date: '2024-01-15' };
      expect(parserUtils.getValue(row, 'date')).toBe('2024-01-15');
      expect(parserUtils.getValue(row, 'DATE')).toBe('2024-01-15');
    });

    it('should try multiple keys', () => {
      const row = { 'Energy (kcal)': '100' };
      expect(parserUtils.getValue(row, 'Calories', 'Energy (kcal)')).toBe('100');
    });

    it('should return empty string when key not found', () => {
      const row = { Date: '2024-01-15' };
      expect(parserUtils.getValue(row, 'NonExistent')).toBe('');
    });
  });
});
