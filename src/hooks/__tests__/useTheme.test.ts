/**
 * useTheme Hook Tests
 *
 * Tests that the hook correctly delegates to useThemeContext
 * and returns all expected properties for dark and light themes.
 */

import { renderHook } from '@testing-library/react-native';

// ---- Mock state ----

const mockSetPreference = jest.fn();

let mockContextValue: {
  colorScheme: 'dark' | 'light';
  colors: Record<string, any>;
  isDark: boolean;
  preference: string;
  setPreference: jest.Mock;
  isLoading: boolean;
};

jest.mock('@/contexts/ThemeContext', () => ({
  useThemeContext: jest.fn(() => mockContextValue),
}));

// Import after mocks are defined
import { useTheme } from '@/hooks/useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = {
      colorScheme: 'light',
      colors: { bgPrimary: '#FFFFFF', textPrimary: '#000000' },
      isDark: false,
      preference: 'system',
      setPreference: mockSetPreference,
      isLoading: false,
    };
  });

  // ============================================================
  // Return value structure
  // ============================================================

  describe('return value structure', () => {
    it('returns all expected properties from context', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current).toHaveProperty('colorScheme');
      expect(result.current).toHaveProperty('colors');
      expect(result.current).toHaveProperty('isDark');
      expect(result.current).toHaveProperty('preference');
      expect(result.current).toHaveProperty('setPreference');
    });

    it('returns exactly five properties', () => {
      const { result } = renderHook(() => useTheme());

      expect(Object.keys(result.current)).toHaveLength(5);
    });
  });

  // ============================================================
  // Dark theme
  // ============================================================

  describe('dark theme', () => {
    it('returns isDark=true and colorScheme=dark for dark theme', () => {
      mockContextValue = {
        ...mockContextValue,
        colorScheme: 'dark',
        isDark: true,
        colors: { bgPrimary: '#1A1A2E', textPrimary: '#FFFFFF' },
      };

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
      expect(result.current.colorScheme).toBe('dark');
      expect(result.current.colors).toEqual({ bgPrimary: '#1A1A2E', textPrimary: '#FFFFFF' });
    });
  });

  // ============================================================
  // Light theme
  // ============================================================

  describe('light theme', () => {
    it('returns isDark=false and colorScheme=light for light theme', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);
      expect(result.current.colorScheme).toBe('light');
      expect(result.current.colors).toEqual({ bgPrimary: '#FFFFFF', textPrimary: '#000000' });
    });
  });

  // ============================================================
  // Preference passthrough
  // ============================================================

  describe('preference', () => {
    it('returns the current preference from context', () => {
      mockContextValue = { ...mockContextValue, preference: 'dark' };
      const { result } = renderHook(() => useTheme());

      expect(result.current.preference).toBe('dark');
    });

    it('passes through setPreference function from context', () => {
      const { result } = renderHook(() => useTheme());

      result.current.setPreference('dark');

      expect(mockSetPreference).toHaveBeenCalledTimes(1);
      expect(mockSetPreference).toHaveBeenCalledWith('dark');
    });
  });
});
