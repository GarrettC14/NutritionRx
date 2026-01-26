// Base spacing unit: 4px
export const spacing = {
  0: 0,
  1: 4,    // Tight padding
  2: 8,    // Inline spacing
  3: 12,   // Compact padding
  4: 16,   // Standard padding
  5: 20,   // Comfortable padding
  6: 24,   // Section spacing
  8: 32,   // Large section spacing
  10: 40,  // Screen section breaks
  12: 48,  // Major section breaks
  16: 64,  // Screen-level spacing
} as const;

// Component-specific spacing
export const componentSpacing = {
  cardPadding: 16,
  cardGap: 12,
  listItemHeight: 56,
  listItemPadding: 16,
  buttonPaddingV: 12,
  buttonPaddingH: 24,
  inputPaddingV: 12,
  inputPaddingH: 16,
  screenEdgePadding: 16,
  bottomNavHeight: 83, // Including safe area
  headerHeight: 56,
  tabBarHeight: 49,
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,      // Small elements, tags
  md: 8,      // Buttons, inputs
  lg: 12,     // Cards
  xl: 16,     // Large cards, modals
  full: 9999, // Pills, circular elements
} as const;

// Shadow definitions
export const shadows = {
  dark: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  light: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  },
} as const;

// Animation durations
export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  screenTransition: 300,
  progressRing: 400,
} as const;

export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
