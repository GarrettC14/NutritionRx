/**
 * Weight Trend Widget — Dashboard wrapper
 *
 * Thin wrapper around WeightTrendChart that handles:
 * - Header with navigation to /log-weight
 * - Data loading (loadEntries)
 * - Config migration & persistence (chartWindowDays)
 */

import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { useWeightStore, useGoalStore, useDashboardStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';
import { WeightTrendChart } from '@/components/charts';

const CHART_HEIGHT = 120;

const LEGACY_RANGE_TO_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180,
};

function readChartWindowDays(config?: Record<string, any>): number {
  if (!config) return 30;
  if (config.chartWindowDays != null) return config.chartWindowDays;
  if (config.chartRange != null) return LEGACY_RANGE_TO_DAYS[config.chartRange] ?? 30;
  return 30;
}

export function WeightTrendWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { entries, loadEntries } = useWeightStore();
  const { targetWeight } = useGoalStore();
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);

  const widgetId = useDashboardStore((s) =>
    s.widgets.find((w) => w.type === 'weight_trend')?.id
  );

  const initialWindowDays = readChartWindowDays(config);

  useEffect(() => {
    loadEntries(500);
  }, [loadEntries]);

  const handleWindowDaysChange = useCallback(
    (days: number) => {
      if (widgetId) {
        updateWidgetConfig(widgetId, {
          chartWindowDays: days,
          chartRange: undefined,
        });
      }
    },
    [widgetId, updateWidgetConfig]
  );

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

      <WeightTrendChart
        entries={entries}
        chartHeight={CHART_HEIGHT}
        initialWindowDays={initialWindowDays}
        onWindowDaysChange={handleWindowDaysChange}
        targetWeightKg={targetWeight}
        gesturesDisabled={isEditMode}
      />
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgElevated,
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
