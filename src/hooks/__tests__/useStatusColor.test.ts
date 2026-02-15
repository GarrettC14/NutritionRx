/**
 * useStatusColors Hook Tests
 *
 * Tests that the hook returns the correct color palette based on theme (dark/light)
 * and that getStatusColor maps NutrientStatus values to the correct color strings.
 */

import { renderHook } from '@testing-library/react-native';

// ---- Mock state ----

let mockIsDark = false;

jest.mock('@/hooks/useTheme', () => ({
  useTheme: jest.fn(() => ({ isDark: mockIsDark })),
}));

const mockStatusColorsDark = {
  belowTarget: '#E07A5F',
  approachingTarget: '#D4A574',
  nearTarget: '#87CEAB',
  onTarget: '#7DB87E',
  aboveTarget: '#D4A574',
  wellAboveTarget: '#C97B6B',
  noData: '#484F58',
};

const mockStatusColorsLight = {
  belowTarget: '#A14D38',
  approachingTarget: '#7D6540',
  nearTarget: '#3D7A5C',
  onTarget: '#357A48',
  aboveTarget: '#7D6540',
  wellAboveTarget: '#9B5548',
  noData: '#9CA3AF',
};

jest.mock('@/theme/statusColors', () => ({
  statusColorsDark: mockStatusColorsDark,
  statusColorsLight: mockStatusColorsLight,
}));

const mockStatusToColorKey: Record<string, string> = {
  deficient: 'belowTarget',
  low: 'approachingTarget',
  adequate: 'nearTarget',
  optimal: 'onTarget',
  high: 'aboveTarget',
  excessive: 'wellAboveTarget',
  no_data: 'noData',
};

jest.mock('@/constants/statusDisplay', () => ({
  STATUS_TO_COLOR_KEY: mockStatusToColorKey,
}));

// Import after mocks are defined
import { useStatusColors } from '@/hooks/useStatusColor';

describe('useStatusColors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDark = false;
  });

  // ============================================================
  // Palette selection
  // ============================================================

  describe('palette selection', () => {
    it('returns the dark palette when isDark is true', () => {
      mockIsDark = true;
      const { result } = renderHook(() => useStatusColors());

      expect(result.current.palette).toBe(mockStatusColorsDark);
    });

    it('returns the light palette when isDark is false', () => {
      mockIsDark = false;
      const { result } = renderHook(() => useStatusColors());

      expect(result.current.palette).toBe(mockStatusColorsLight);
    });
  });

  // ============================================================
  // getStatusColor
  // ============================================================

  describe('getStatusColor', () => {
    it('maps deficient status to belowTarget color in dark mode', () => {
      mockIsDark = true;
      const { result } = renderHook(() => useStatusColors());

      expect(result.current.getStatusColor('deficient')).toBe('#E07A5F');
    });

    it('maps optimal status to onTarget color in light mode', () => {
      mockIsDark = false;
      const { result } = renderHook(() => useStatusColors());

      expect(result.current.getStatusColor('optimal')).toBe('#357A48');
    });

    it('maps all NutrientStatus values to correct dark colors', () => {
      mockIsDark = true;
      const { result } = renderHook(() => useStatusColors());

      expect(result.current.getStatusColor('deficient')).toBe('#E07A5F');
      expect(result.current.getStatusColor('low')).toBe('#D4A574');
      expect(result.current.getStatusColor('adequate')).toBe('#87CEAB');
      expect(result.current.getStatusColor('optimal')).toBe('#7DB87E');
      expect(result.current.getStatusColor('high')).toBe('#D4A574');
      expect(result.current.getStatusColor('excessive')).toBe('#C97B6B');
      expect(result.current.getStatusColor('no_data')).toBe('#484F58');
    });

    it('maps all NutrientStatus values to correct light colors', () => {
      mockIsDark = false;
      const { result } = renderHook(() => useStatusColors());

      expect(result.current.getStatusColor('deficient')).toBe('#A14D38');
      expect(result.current.getStatusColor('low')).toBe('#7D6540');
      expect(result.current.getStatusColor('adequate')).toBe('#3D7A5C');
      expect(result.current.getStatusColor('optimal')).toBe('#357A48');
      expect(result.current.getStatusColor('high')).toBe('#7D6540');
      expect(result.current.getStatusColor('excessive')).toBe('#9B5548');
      expect(result.current.getStatusColor('no_data')).toBe('#9CA3AF');
    });
  });
});
