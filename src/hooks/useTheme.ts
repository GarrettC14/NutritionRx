import { useThemeContext, ThemeColors, ThemePreference } from '@/contexts/ThemeContext';

export type { ThemeColors, ThemePreference };

export function useTheme(): {
  colorScheme: 'dark' | 'light';
  colors: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
} {
  const { colorScheme, colors, isDark, preference, setPreference } = useThemeContext();

  return {
    colorScheme,
    colors,
    isDark,
    preference,
    setPreference,
  };
}
