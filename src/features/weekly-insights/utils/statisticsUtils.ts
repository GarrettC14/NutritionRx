/**
 * Statistics Utilities
 * Math helpers for weekly insights analysis
 */

/**
 * Calculate the arithmetic mean of an array of numbers.
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate sample standard deviation.
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

/**
 * Calculate coefficient of variation (CV) as a percentage.
 * CV = (stdDev / mean) * 100
 */
export function coefficientOfVariation(values: number[]): number {
  const avg = mean(values);
  if (avg === 0) return 0;
  return (standardDeviation(values) / avg) * 100;
}

/**
 * Simple linear regression on values indexed by position.
 * Returns slope, intercept, and R-squared.
 */
export function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, rSquared: 0 };

  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);

  let ssXY = 0;
  let ssXX = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (xs[i] - xMean) * (values[i] - yMean);
    ssXX += (xs[i] - xMean) ** 2;
  }

  const slope = ssXX > 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * xs[i];
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - yMean) ** 2;
  }

  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
