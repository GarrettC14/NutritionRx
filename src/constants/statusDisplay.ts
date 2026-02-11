/**
 * Status Display Constants
 * Centralized labels, icons, and color mappings for NutrientStatus.
 * Uses non-judgmental, body-positive language aligned with "Nourished Calm" philosophy.
 */

import { NutrientStatus } from '@/types/micronutrients';
import { StatusColorKey } from '@/theme/statusColors';

export const STATUS_DISPLAY_LABELS: Record<NutrientStatus, string> = {
  deficient: 'Below target',
  low: 'Approaching target',
  adequate: 'Near target',
  optimal: 'On target',
  high: 'Above target',
  excessive: 'Well above target',
  no_data: 'No data yet',
};

export const STATUS_ICONS: Record<NutrientStatus, string> = {
  deficient: 'leaf-outline',
  low: 'water-outline',
  adequate: 'sunny-outline',
  optimal: 'flower-outline',
  high: 'cloud-outline',
  excessive: 'rainy-outline',
  no_data: 'help-circle-outline',
};

export const STATUS_TO_COLOR_KEY: Record<NutrientStatus, StatusColorKey> = {
  deficient: 'belowTarget',
  low: 'approachingTarget',
  adequate: 'nearTarget',
  optimal: 'onTarget',
  high: 'aboveTarget',
  excessive: 'wellAboveTarget',
  no_data: 'noData',
};
