/**
 * Weight Trend Widget — Dashboard wrapper
 *
 * Thin wrapper around WeightTrendChartMinimal that handles:
 * - Header with navigation to /log-weight
 * - Data loading (loadEntries)
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { useWeightStore, useSettingsStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';
import { WeightTrendChartMinimal } from '@/components/charts';
import { chartColors as allChartColors } from '@/constants/colors';
import { WeightTrendChartPalette } from '@/types/weightTrend';

const CHART_HEIGHT = 200;

export function WeightTrendWidget({ isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors, colorScheme } = useTheme();
  const { entries, loadEntries } = useWeightStore();
  const { settings } = useSettingsStore();
  const unit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const chartThemeColors = allChartColors[colorScheme];

  const palette = useMemo<Partial<WeightTrendChartPalette>>(() => ({
    background: colors.bgSecondary,
    text: colors.textPrimary,
    mutedText: colors.textTertiary,
    grid: colors.borderDefault,
    rawWeight: chartThemeColors.rawWeight,
    trendLine: chartThemeColors.trendLine,
    pointFill: colors.bgElevated,
    pointStroke: chartThemeColors.trendLine,
    tooltipBg: colors.bgElevated,
    tooltipBorder: colors.borderDefault,
    positiveChange: colors.success,
    neutralChange: colors.textSecondary,
    presetActiveBg: colors.bgInteractive,
    presetActiveText: colors.textPrimary,
    presetInactiveText: colors.textTertiary,
    presetDisabledText: colors.textDisabled,
  }), [colors, chartThemeColors]);

  useEffect(() => {
    loadEntries(500);
  }, [loadEntries]);

  const handleHeaderPress = () => {
    if (!isEditMode) router.push('/log-weight');
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleHeaderPress} activeOpacity={0.8} disabled={isEditMode}>
        <View style={styles.header}>
          <Text style={styles.title}>Weight Trend</Text>
        </View>
      </TouchableOpacity>

      <WeightTrendChartMinimal
        entries={entries}
        unit={unit}
        chartHeight={CHART_HEIGHT}
        gesturesEnabled={!isEditMode}
        palette={palette}
      />
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
  });
