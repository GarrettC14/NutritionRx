/**
 * Color Utilities
 * Safe color manipulation functions for theme-aware rendering.
 */

/** Convert a hex color + alpha (0–1) to an rgba() string. */
export const withAlpha = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/** Compute relative luminance per WCAG 2.1. */
export const relativeLuminance = (hex: string): number => {
  const linearize = (c: number) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
};

/**
 * Pick white or dark text color based on which achieves higher
 * WCAG contrast ratio against the given background.
 */
export const contrastTextColor = (bgHex: string): string => {
  const bgLum = relativeLuminance(bgHex);
  const WHITE = '#FFFFFF';
  const DARK = '#1F2328';
  const whiteLum = 1.0;
  const darkLum = 0.024;

  const whiteRatio =
    (Math.max(bgLum, whiteLum) + 0.05) / (Math.min(bgLum, whiteLum) + 0.05);
  const darkRatio =
    (Math.max(bgLum, darkLum) + 0.05) / (Math.min(bgLum, darkLum) + 0.05);

  return whiteRatio >= darkRatio ? WHITE : DARK;
};
