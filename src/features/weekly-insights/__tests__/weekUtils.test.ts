/**
 * Week Utilities Tests
 */

import {
  getWeekStart,
  getWeekEnd,
  addDays,
  formatWeekRange,
  isCurrentWeek,
  getDayName,
  getDayOfWeek,
  DAY_NAMES,
  DAY_ABBREVIATIONS,
} from '../utils/weekUtils';

describe('weekUtils', () => {
  describe('getWeekStart', () => {
    it('returns the Sunday of the current week', () => {
      // Wednesday Jan 22 2025 -> Sunday Jan 19
      const wed = new Date(2025, 0, 22);
      expect(getWeekStart(wed)).toBe('2025-01-19');
    });

    it('returns the same day if already Sunday', () => {
      const sun = new Date(2025, 0, 19);
      expect(getWeekStart(sun)).toBe('2025-01-19');
    });

    it('handles Saturday (end of week)', () => {
      const sat = new Date(2025, 0, 25);
      expect(getWeekStart(sat)).toBe('2025-01-19');
    });

    it('handles month boundaries', () => {
      // Feb 1 2025 is a Saturday -> week start is Jan 26
      const feb1 = new Date(2025, 1, 1);
      expect(getWeekStart(feb1)).toBe('2025-01-26');
    });
  });

  describe('getWeekEnd', () => {
    it('returns Saturday for a given week start', () => {
      expect(getWeekEnd('2025-01-19')).toBe('2025-01-25');
    });

    it('handles month boundary', () => {
      expect(getWeekEnd('2025-01-26')).toBe('2025-02-01');
    });
  });

  describe('addDays', () => {
    it('adds positive days', () => {
      expect(addDays('2025-01-19', 3)).toBe('2025-01-22');
    });

    it('adds negative days', () => {
      expect(addDays('2025-01-19', -7)).toBe('2025-01-12');
    });

    it('handles month rollover', () => {
      expect(addDays('2025-01-30', 3)).toBe('2025-02-02');
    });

    it('handles year rollover', () => {
      expect(addDays('2024-12-30', 3)).toBe('2025-01-02');
    });
  });

  describe('formatWeekRange', () => {
    it('formats within same month', () => {
      const result = formatWeekRange('2025-01-19');
      // Jan 19–25
      expect(result).toContain('Jan');
      expect(result).toContain('19');
      expect(result).toContain('25');
    });

    it('formats across month boundary', () => {
      const result = formatWeekRange('2025-01-26');
      // Jan 26 – Feb 1
      expect(result).toContain('Jan');
      expect(result).toContain('26');
      expect(result).toContain('Feb');
      expect(result).toContain('1');
    });
  });

  describe('isCurrentWeek', () => {
    it('returns true for current week start', () => {
      const today = getWeekStart();
      expect(isCurrentWeek(today)).toBe(true);
    });

    it('returns false for a past week', () => {
      expect(isCurrentWeek('2024-01-01')).toBe(false);
    });
  });

  describe('getDayName', () => {
    it('returns correct name for Sunday (0)', () => {
      expect(getDayName(0)).toBe('Sunday');
    });

    it('returns correct name for Saturday (6)', () => {
      expect(getDayName(6)).toBe('Saturday');
    });

    it('returns Unknown for invalid index', () => {
      expect(getDayName(7)).toBe('Unknown');
      expect(getDayName(-1)).toBe('Unknown');
    });
  });

  describe('getDayOfWeek', () => {
    it('returns 0 for a known Sunday', () => {
      expect(getDayOfWeek('2025-01-19')).toBe(0);
    });

    it('returns 3 for a known Wednesday', () => {
      expect(getDayOfWeek('2025-01-22')).toBe(3);
    });

    it('returns 6 for a known Saturday', () => {
      expect(getDayOfWeek('2025-01-25')).toBe(6);
    });
  });

  describe('constants', () => {
    it('DAY_NAMES has 7 entries', () => {
      expect(DAY_NAMES.length).toBe(7);
      expect(DAY_NAMES[0]).toBe('Sunday');
      expect(DAY_NAMES[6]).toBe('Saturday');
    });

    it('DAY_ABBREVIATIONS has 7 entries', () => {
      expect(DAY_ABBREVIATIONS.length).toBe(7);
      expect(DAY_ABBREVIATIONS[0]).toBe('S');
      expect(DAY_ABBREVIATIONS[5]).toBe('F');
    });
  });
});
