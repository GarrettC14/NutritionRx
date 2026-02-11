/**
 * Status Color Tokens
 * Gentle guidance color model — warmth gradient from terracotta (needs attention)
 * to sage green (well nourished). Replaces traffic-light red/yellow/green.
 * All colors pass WCAG AA (4.5:1) against both bgPrimary and bgSecondary.
 */

export const statusColorsDark = {
  needsNourishing: '#E07A5F', // terracotta
  gettingStarted: '#D4A574',  // warm tan
  gettingThere: '#87CEAB',    // soft sage
  wellNourished: '#7DB87E',   // sage green
  aboveTarget: '#D4A574',     // warm tan (same as gettingStarted)
  wellAboveTarget: '#C97B6B', // dusty rose
};

export const statusColorsLight = {
  needsNourishing: '#A14D38',
  gettingStarted: '#7D6540',
  gettingThere: '#3D7A5C',
  wellNourished: '#357A48',
  aboveTarget: '#7D6540',
  wellAboveTarget: '#9B5548',
};

export type StatusColorKey = keyof typeof statusColorsDark;
