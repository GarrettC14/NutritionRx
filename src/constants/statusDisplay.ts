/**
 * Status Display Constants
 * Centralized labels, icons, and color mappings for NutrientStatus.
 * Uses non-judgmental, body-positive language aligned with "Nourished Calm" philosophy.
 */

import { NutrientStatus } from '@/types/micronutrients';
import { StatusColorKey } from '@/theme/statusColors';

export const STATUS_DISPLAY_LABELS: Record<NutrientStatus, string> = {
  deficient: 'Needs nourishing',
  low: 'Getting started',
  adequate: 'Getting there',
  optimal: 'Well nourished',
  high: 'Above target',
  excessive: 'Well above target',
};

export const STATUS_ICONS: Record<NutrientStatus, string> = {
  deficient: 'leaf-outline',
  low: 'water-outline',
  adequate: 'sunny-outline',
  optimal: 'flower-outline',
  high: 'cloud-outline',
  excessive: 'rainy-outline',
};

export const STATUS_TO_COLOR_KEY: Record<NutrientStatus, StatusColorKey> = {
  deficient: 'needsNourishing',
  low: 'gettingStarted',
  adequate: 'gettingThere',
  optimal: 'wellNourished',
  high: 'aboveTarget',
  excessive: 'wellAboveTarget',
};
