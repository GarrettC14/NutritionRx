export type WeightUnit = 'kg' | 'lbs';

export interface WeightTrendEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  trendWeightKg?: number;
}

export interface WeightTrendChartPalette {
  background: string;
  text: string;
  mutedText: string;
  grid: string;
  rawWeight: string;
  trendLine: string;
  pointFill: string;
  pointStroke: string;
  tooltipBg: string;
  tooltipBorder: string;
  positiveChange: string;
  neutralChange: string;
  presetActiveBg: string;
  presetActiveText: string;
  presetInactiveText: string;
  presetDisabledText: string;
}

export const DEFAULT_WEIGHT_TREND_PALETTE: WeightTrendChartPalette = {
  background: '#0F1115',
  text: '#F4F6F8',
  mutedText: '#9AA4B2',
  grid: 'rgba(255, 255, 255, 0.14)',
  rawWeight: 'rgba(255, 255, 255, 0.45)',
  trendLine: '#4DA3FF',
  pointFill: '#0F1115',
  pointStroke: '#4DA3FF',
  tooltipBg: '#181C23',
  tooltipBorder: 'rgba(255, 255, 255, 0.18)',
  positiveChange: '#3FB950',
  neutralChange: '#B7C0CC',
  presetActiveBg: '#2B313B',
  presetActiveText: '#F4F6F8',
  presetInactiveText: '#9AA4B2',
  presetDisabledText: '#606B79',
};
