/**
 * useStatusColors Hook
 * Returns the correct status color palette for the current theme (dark/light).
 */

import { useTheme } from '@/hooks/useTheme';
import { statusColorsDark, statusColorsLight, StatusColorKey } from '@/theme/statusColors';
import { NutrientStatus } from '@/types/micronutrients';
import { STATUS_TO_COLOR_KEY } from '@/constants/statusDisplay';

export const useStatusColors = () => {
  const { isDark } = useTheme();
  const palette = isDark ? statusColorsDark : statusColorsLight;

  const getStatusColor = (status: NutrientStatus): string => {
    return palette[STATUS_TO_COLOR_KEY[status]];
  };

  return { palette, getStatusColor };
};
