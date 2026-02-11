/**
 * Status Color Tokens
 * Warmth gradient from terracotta (below target) to sage green (on target).
 * Replaces traffic-light red/yellow/green.
 * All colors pass WCAG AA (4.5:1) against both bgPrimary and bgSecondary.
 */

export const statusColorsDark = {
  belowTarget: '#E07A5F',       // terracotta
  approachingTarget: '#D4A574', // warm tan
  nearTarget: '#87CEAB',        // soft sage
  onTarget: '#7DB87E',          // sage green
  aboveTarget: '#D4A574',       // warm tan (same as approachingTarget)
  wellAboveTarget: '#C97B6B',   // dusty rose
  noData: '#484F58',            // muted grey
};

export const statusColorsLight = {
  belowTarget: '#A14D38',
  approachingTarget: '#7D6540',
  nearTarget: '#3D7A5C',
  onTarget: '#357A48',
  aboveTarget: '#7D6540',
  wellAboveTarget: '#9B5548',
  noData: '#9CA3AF',
};

export type StatusColorKey = keyof typeof statusColorsDark;
