import { Platform, TextStyle } from 'react-native';

// Font families based on platform
export const fontFamily = {
  primary: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

// Type scale definitions
interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: TextStyle['fontWeight'];
  fontFamily?: string;
}

export const typography = {
  display: {
    large: {
      fontSize: 34,
      lineHeight: 41,
      letterSpacing: -0.4,
      fontWeight: '700' as const,
    },
    medium: {
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.3,
      fontWeight: '700' as const,
    },
    small: {
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.2,
      fontWeight: '600' as const,
    },
  },

  title: {
    large: {
      fontSize: 20,
      lineHeight: 25,
      letterSpacing: -0.2,
      fontWeight: '600' as const,
    },
    medium: {
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: -0.1,
      fontWeight: '600' as const,
    },
    small: {
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
      fontWeight: '600' as const,
    },
  },

  body: {
    large: {
      fontSize: 17,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: '400' as const,
    },
    medium: {
      fontSize: 15,
      lineHeight: 22,
      letterSpacing: 0,
      fontWeight: '400' as const,
    },
    small: {
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      fontWeight: '400' as const,
    },
  },

  caption: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
    fontWeight: '400' as const,
  },

  overline: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },

  // Numeric typography (for calories, macros, weight)
  metric: {
    large: {
      fontSize: 48,
      lineHeight: 52,
      letterSpacing: -1.0,
      fontWeight: '700' as const,
      fontFamily: fontFamily.mono,
    },
    medium: {
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.5,
      fontWeight: '600' as const,
      fontFamily: fontFamily.mono,
    },
    small: {
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.3,
      fontWeight: '500' as const,
      fontFamily: fontFamily.mono,
    },
    tiny: {
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: 0,
      fontWeight: '500' as const,
      fontFamily: fontFamily.mono,
    },
  },
} as const;

// Helper function to create text styles
export function createTextStyle(
  variant: keyof typeof typography,
  size?: string
): TextStyle {
  const baseStyle = typography[variant];

  if (size && typeof baseStyle === 'object' && size in baseStyle) {
    return baseStyle[size as keyof typeof baseStyle] as TextStyle;
  }

  return baseStyle as TextStyle;
}

export type Typography = typeof typography;
