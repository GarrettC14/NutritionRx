import { parserUtils, localDateFromKey } from '@/services/nutritionImport/parsers/types';

describe('parserUtils', () => {
  describe('parseNumber', () => {
    it('returns 0 for null', () => {
      expect(parserUtils.parseNumber(null)).toBe(0);
    });

    it('returns 0 for undefined', () => {
      expect(parserUtils.parseNumber(undefined)).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(parserUtils.parseNumber('')).toBe(0);
    });

    it('parses valid integer strings', () => {
      expect(parserUtils.parseNumber('42')).toBe(42);
      expect(parserUtils.parseNumber('0')).toBe(0);
      expect(parserUtils.parseNumber('-10')).toBe(-10);
    });

    it('parses valid float strings', () => {
      expect(parserUtils.parseNumber('3.14')).toBe(3.14);
      expect(parserUtils.parseNumber('100.5')).toBe(100.5);
    });

    it('returns 0 for NaN-producing strings', () => {
      expect(parserUtils.parseNumber('abc')).toBe(0);
      expect(parserUtils.parseNumber('not a number')).toBe(0);
    });
  });

  describe('parseDate', () => {
    it('parses YYYY-MM-DD format', () => {
      const date = parserUtils.parseDate('2024-03-15');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(2); // March is 0-indexed
      expect(date!.getDate()).toBe(15);
    });

    it('parses MM/DD/YYYY format', () => {
      const date = parserUtils.parseDate('12/25/2023');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2023);
      expect(date!.getMonth()).toBe(11); // December
      expect(date!.getDate()).toBe(25);
    });

    it('parses ISO date strings', () => {
      const date = parserUtils.parseDate('2024-06-01T12:00:00Z');
      expect(date).not.toBeNull();
      expect(date).toBeInstanceOf(Date);
      expect(date!.getFullYear()).toBe(2024);
    });

    it('returns null for empty string', () => {
      expect(parserUtils.parseDate('')).toBeNull();
    });

    it('returns null for invalid date string', () => {
      expect(parserUtils.parseDate('not a date')).toBeNull();
    });
  });

  describe('normalizeHeader', () => {
    it('lowercases the header', () => {
      expect(parserUtils.normalizeHeader('CALORIES')).toBe('calories');
      expect(parserUtils.normalizeHeader('Date')).toBe('date');
    });

    it('trims whitespace', () => {
      expect(parserUtils.normalizeHeader('  calories  ')).toBe('calories');
    });

    it('lowercases and trims combined', () => {
      expect(parserUtils.normalizeHeader(' Protein (g) ')).toBe('protein (g)');
    });
  });

  describe('hasRequiredHeaders', () => {
    it('returns true when all required headers are present', () => {
      const headers = ['Date', 'Meal', 'Calories', 'Protein (g)'];
      expect(parserUtils.hasRequiredHeaders(headers, ['date', 'meal', 'calories'])).toBe(true);
    });

    it('returns true with case-insensitive matching', () => {
      const headers = ['DATE', 'MEAL', 'CALORIES'];
      expect(parserUtils.hasRequiredHeaders(headers, ['date', 'meal', 'calories'])).toBe(true);
    });

    it('returns false when a required header is missing', () => {
      const headers = ['Date', 'Calories'];
      expect(parserUtils.hasRequiredHeaders(headers, ['date', 'meal', 'calories'])).toBe(false);
    });

    it('returns false when headers array is empty', () => {
      expect(parserUtils.hasRequiredHeaders([], ['date'])).toBe(false);
    });
  });

  describe('formatDateKey', () => {
    it('formats a Date as YYYY-MM-DD using local date parts', () => {
      const date = new Date(2024, 0, 5); // Jan 5 2024
      expect(parserUtils.formatDateKey(date)).toBe('2024-01-05');
    });

    it('pads single-digit months and days with leading zeros', () => {
      const date = new Date(2024, 2, 9); // Mar 9 2024
      expect(parserUtils.formatDateKey(date)).toBe('2024-03-09');
    });

    it('handles end-of-year dates', () => {
      const date = new Date(2023, 11, 31); // Dec 31 2023
      expect(parserUtils.formatDateKey(date)).toBe('2023-12-31');
    });
  });

  describe('getValue', () => {
    it('finds exact key match', () => {
      const row = { Date: '2024-01-15', Calories: '200' };
      expect(parserUtils.getValue(row, 'Date')).toBe('2024-01-15');
    });

    it('finds case-insensitive match when exact match fails', () => {
      const row = { Date: '2024-01-15' };
      expect(parserUtils.getValue(row, 'date')).toBe('2024-01-15');
      expect(parserUtils.getValue(row, 'DATE')).toBe('2024-01-15');
    });

    it('returns empty string when no key matches', () => {
      const row = { Date: '2024-01-15' };
      expect(parserUtils.getValue(row, 'NonExistent')).toBe('');
    });

    it('tries multiple possible keys in order', () => {
      const row = { 'Energy (kcal)': '300' };
      expect(parserUtils.getValue(row, 'Calories', 'Energy (kcal)')).toBe('300');
    });
  });
});

describe('localDateFromKey', () => {
  it('creates a local date from YYYY-MM-DD string', () => {
    const date = localDateFromKey('2024-07-20');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(6); // July is 0-indexed
    expect(date.getDate()).toBe(20);
  });

  it('handles month boundaries correctly (month is 0-indexed internally)', () => {
    // January should be month 0 internally
    const jan = localDateFromKey('2024-01-01');
    expect(jan.getMonth()).toBe(0);
    expect(jan.getDate()).toBe(1);

    // December should be month 11 internally
    const dec = localDateFromKey('2024-12-31');
    expect(dec.getMonth()).toBe(11);
    expect(dec.getDate()).toBe(31);
  });
});
