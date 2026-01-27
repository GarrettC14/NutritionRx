export const colors = {
  // === DARK MODE (Default) ===
  dark: {
    // Backgrounds
    bgPrimary: '#0D1117',
    bgSecondary: '#161B22',
    bgElevated: '#21262D',
    bgInteractive: '#30363D',

    // Text
    textPrimary: '#F0F6FC',
    textSecondary: '#8B949E',
    textTertiary: '#6E7681',
    textDisabled: '#484F58',

    // Borders
    borderDefault: '#30363D',
    borderStrong: '#484F58',

    // Brand
    accent: '#64B5F6',
    accentDark: '#4A90D9',

    // Status
    success: '#3FB950',
    successBg: 'rgba(63, 185, 80, 0.15)',
    warning: '#D29922',
    warningBg: 'rgba(210, 153, 34, 0.15)',
    error: '#F85149',
    errorBg: 'rgba(248, 81, 73, 0.15)',

    // Macros
    protein: '#64B5F6',
    carbs: '#81C784',
    fat: '#FFB74D',
    calories: '#F0F6FC',

    // Progress ring
    ringTrack: '#30363D',
    ringFill: '#64B5F6',

    // Favorites
    favorites: '#E57373',
  },

  // === LIGHT MODE ===
  light: {
    // Backgrounds
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F6F8FA',
    bgElevated: '#FFFFFF',
    bgInteractive: '#F3F4F6',

    // Text
    textPrimary: '#1F2328',
    textSecondary: '#656D76',
    textTertiary: '#8C959F',
    textDisabled: '#AFB8C1',

    // Borders
    borderDefault: '#D0D7DE',
    borderStrong: '#8C959F',

    // Brand
    accent: '#2563EB',
    accentDark: '#1D4ED8',

    // Status
    success: '#16A34A',
    successBg: 'rgba(22, 163, 74, 0.1)',
    warning: '#CA8A04',
    warningBg: 'rgba(202, 138, 4, 0.1)',
    error: '#DC2626',
    errorBg: 'rgba(220, 38, 38, 0.1)',

    // Macros
    protein: '#2563EB',
    carbs: '#16A34A',
    fat: '#D97706',
    calories: '#1F2328',

    // Progress ring
    ringTrack: '#E5E7EB',
    ringFill: '#2563EB',

    // Favorites
    favorites: '#D32F2F',
  },
} as const;

// Chart-specific colors
export const chartColors = {
  dark: {
    primary: '#64B5F6',
    primaryGradient: ['#64B5F6', 'rgba(100, 181, 246, 0.1)'],
    rawWeight: 'rgba(255, 255, 255, 0.4)',
    trendLine: '#64B5F6',
    goalLine: 'rgba(129, 199, 132, 0.6)',
    dailyBurn: '#64B5F6',
    initialEstimate: 'rgba(255, 255, 255, 0.3)',
    underTarget: '#64B5F6',
    atTarget: '#81C784',
    overTarget: 'rgba(255, 255, 255, 0.5)',
    targetLine: 'rgba(255, 255, 255, 0.6)',
    progress: '#81C784',
    remaining: 'rgba(255, 255, 255, 0.2)',
    setback: '#FFB74D',
    protein: '#64B5F6',
    carbs: '#81C784',
    fat: '#FFB74D',
    grid: 'rgba(255, 255, 255, 0.1)',
    axis: 'rgba(255, 255, 255, 0.3)',
    label: 'rgba(255, 255, 255, 0.6)',
  },
  light: {
    primary: '#2563EB',
    primaryGradient: ['#2563EB', 'rgba(37, 99, 235, 0.1)'],
    rawWeight: 'rgba(0, 0, 0, 0.3)',
    trendLine: '#2563EB',
    goalLine: 'rgba(22, 163, 74, 0.6)',
    dailyBurn: '#2563EB',
    initialEstimate: 'rgba(0, 0, 0, 0.2)',
    underTarget: '#2563EB',
    atTarget: '#16A34A',
    overTarget: 'rgba(0, 0, 0, 0.3)',
    targetLine: 'rgba(0, 0, 0, 0.4)',
    progress: '#16A34A',
    remaining: 'rgba(0, 0, 0, 0.1)',
    setback: '#D97706',
    protein: '#2563EB',
    carbs: '#16A34A',
    fat: '#D97706',
    grid: 'rgba(0, 0, 0, 0.05)',
    axis: 'rgba(0, 0, 0, 0.2)',
    label: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

export type ColorScheme = keyof typeof colors;

// Base color types (generic interface)
export interface Colors {
  bgPrimary: string;
  bgSecondary: string;
  bgElevated: string;
  bgInteractive: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  borderDefault: string;
  borderStrong: string;
  accent: string;
  accentDark: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  protein: string;
  carbs: string;
  fat: string;
  calories: string;
  ringTrack: string;
  ringFill: string;
  favorites: string;
}

export interface ChartColors {
  primary: string;
  primaryGradient: readonly string[];
  rawWeight: string;
  trendLine: string;
  goalLine: string;
  dailyBurn: string;
  initialEstimate: string;
  underTarget: string;
  atTarget: string;
  overTarget: string;
  targetLine: string;
  progress: string;
  remaining: string;
  setback: string;
  protein: string;
  carbs: string;
  fat: string;
  grid: string;
  axis: string;
  label: string;
}
