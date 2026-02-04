/**
 * Statistics Utilities Tests
 */

import {
  mean,
  standardDeviation,
  coefficientOfVariation,
  linearRegression,
  clamp,
} from '../utils/statisticsUtils';

describe('statisticsUtils', () => {
  describe('mean', () => {
    it('calculates correct mean', () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
    });

    it('returns 0 for empty array', () => {
      expect(mean([])).toBe(0);
    });

    it('handles single value', () => {
      expect(mean([42])).toBe(42);
    });

    it('handles decimal values', () => {
      expect(mean([1.5, 2.5])).toBe(2);
    });
  });

  describe('standardDeviation', () => {
    it('returns 0 for single value', () => {
      expect(standardDeviation([5])).toBe(0);
    });

    it('returns 0 for empty array', () => {
      expect(standardDeviation([])).toBe(0);
    });

    it('calculates sample standard deviation', () => {
      // [2, 4, 4, 4, 5, 5, 7, 9] -> mean = 5, sample stdDev ≈ 2.138
      const result = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(2.138, 2);
    });

    it('returns 0 for identical values', () => {
      expect(standardDeviation([5, 5, 5, 5])).toBe(0);
    });
  });

  describe('coefficientOfVariation', () => {
    it('returns 0 for identical values', () => {
      expect(coefficientOfVariation([5, 5, 5, 5])).toBe(0);
    });

    it('returns 0 when mean is 0', () => {
      expect(coefficientOfVariation([0, 0, 0])).toBe(0);
    });

    it('calculates CV as percentage', () => {
      // For [100, 200, 300]: mean=200, stdDev=100, CV=50%
      const result = coefficientOfVariation([100, 200, 300]);
      expect(result).toBeCloseTo(50, 0);
    });

    it('higher variance yields higher CV', () => {
      const lowCV = coefficientOfVariation([100, 102, 98, 101, 99]);
      const highCV = coefficientOfVariation([100, 200, 50, 300, 150]);
      expect(highCV).toBeGreaterThan(lowCV);
    });
  });

  describe('linearRegression', () => {
    it('returns slope 0 for constant values', () => {
      const result = linearRegression([5, 5, 5, 5]);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(5);
    });

    it('detects positive slope', () => {
      const result = linearRegression([1, 2, 3, 4, 5]);
      expect(result.slope).toBeCloseTo(1, 5);
      expect(result.rSquared).toBeCloseTo(1, 5);
    });

    it('detects negative slope', () => {
      const result = linearRegression([5, 4, 3, 2, 1]);
      expect(result.slope).toBeCloseTo(-1, 5);
      expect(result.rSquared).toBeCloseTo(1, 5);
    });

    it('returns 0 slope for single value', () => {
      const result = linearRegression([42]);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(42);
    });

    it('returns 0 for empty array', () => {
      const result = linearRegression([]);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
    });

    it('handles 2 values', () => {
      const result = linearRegression([10, 20]);
      expect(result.slope).toBeCloseTo(10, 5);
      expect(result.rSquared).toBeCloseTo(1, 5);
    });

    it('rSquared is between 0 and 1 for noisy data', () => {
      const result = linearRegression([10, 15, 12, 18, 14, 20]);
      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(1);
    });
  });

  describe('clamp', () => {
    it('returns value when in range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('clamps to min', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('clamps to max', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('handles equal min and max', () => {
      expect(clamp(5, 3, 3)).toBe(3);
    });
  });
});
