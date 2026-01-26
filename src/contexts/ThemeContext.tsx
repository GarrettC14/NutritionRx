import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, chartColors, Colors, ChartColors } from '@/constants/colors';
import { shadows } from '@/constants/spacing';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

interface Shadows {
  sm: ShadowStyle;
  md: ShadowStyle;
  lg: ShadowStyle;
}

export interface ThemeColors extends Colors {
  chart: ChartColors;
  shadows: Shadows;
}

interface ThemeContextValue {
  preference: ThemePreference;
  colorScheme: ResolvedTheme;
  colors: ThemeColors;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
  isLoading: boolean;
}

const THEME_STORAGE_KEY = '@theme_preference';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && ['system', 'light', 'dark'].includes(saved)) {
          setPreferenceState(saved as ThemePreference);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreference();
  }, []);

  // Save preference when it changes
  const setPreference = useCallback(async (newPreference: ThemePreference) => {
    setPreferenceState(newPreference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newPreference);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, []);

  // Resolve the actual color scheme based on preference
  const colorScheme: ResolvedTheme =
    preference === 'system'
      ? (systemColorScheme ?? 'dark')
      : preference;

  const isDark = colorScheme === 'dark';

  const themeColors: ThemeColors = {
    ...colors[colorScheme],
    chart: chartColors[colorScheme],
    shadows: shadows[colorScheme],
  };

  return (
    <ThemeContext.Provider
      value={{
        preference,
        colorScheme,
        colors: themeColors,
        isDark,
        setPreference,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
