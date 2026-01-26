import { useColorScheme } from 'react-native';
import { colors, chartColors, Colors, ChartColors } from '@/constants/colors';
import { shadows } from '@/constants/spacing';

interface ThemeColors extends Colors {
  chart: ChartColors;
  shadows: typeof shadows.dark;
}

export function useTheme(): {
  colorScheme: 'dark' | 'light';
  colors: ThemeColors;
  isDark: boolean;
} {
  const systemColorScheme = useColorScheme();
  const colorScheme = systemColorScheme ?? 'dark';
  const isDark = colorScheme === 'dark';

  const themeColors: ThemeColors = {
    ...colors[colorScheme],
    chart: chartColors[colorScheme],
    shadows: shadows[colorScheme],
  };

  return {
    colorScheme,
    colors: themeColors,
    isDark,
  };
}

export type { ThemeColors };
