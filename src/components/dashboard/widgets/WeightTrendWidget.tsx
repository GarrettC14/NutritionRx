/**
 * Weight Trend Widget
 * Displays weight progress over time with a line chart
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { useWeightStore, useGoalStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';

const CHART_WIDTH = Dimensions.get('window').width - 80;
const CHART_HEIGHT = 80;

export function WeightTrendWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { entries } = useWeightStore();
  const { targetWeight } = useGoalStore();
  const chartRange = config?.chartRange ?? '7d';

  // Chart accent color
  const trendLineColor = colors.accent;

  // Get weight data for the selected range
  const chartData = useMemo(() => {
    const now = new Date();
    const daysBack = chartRange === '7d' ? 7 : chartRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const recentWeights = entries
      .filter((w) => new Date(w.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10);

    return recentWeights.map((w) => w.weightKg);
  }, [entries, chartRange]);

  const latestWeight = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const startWeight = chartData.length > 0 ? chartData[0] : null;
  const weightChange =
    latestWeight && startWeight ? latestWeight - startWeight : null;

  // Generate SVG path for the chart
  const chartPath = useMemo(() => {
    if (chartData.length < 2) return '';

    const minWeight = Math.min(...chartData) - 1;
    const maxWeight = Math.max(...chartData) + 1;
    const range = maxWeight - minWeight || 1;

    const points = chartData.map((weight, index) => {
      const x = (index / (chartData.length - 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - ((weight - minWeight) / range) * CHART_HEIGHT;
      return { x, y };
    });

    const path = points.reduce((acc, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    return path;
  }, [chartData]);

  const handlePress = () => {
    if (!isEditMode) {
      router.push('/log-weight');
    }
  };

  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Weight Trend</Text>
        {weightChange !== null && (
          <Text
            style={[
              styles.change,
              weightChange < 0 ? styles.changePositive : styles.changeNeutral,
            ]}
          >
            {weightChange > 0 ? '+' : ''}
            {weightChange.toFixed(1)} lbs
          </Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>
            {latestWeight ? `${latestWeight.toFixed(1)} lbs` : '--'}
          </Text>
        </View>
        {targetWeight && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue}>{targetWeight.toFixed(1)} lbs</Text>
          </View>
        )}
      </View>

      {chartData.length >= 2 ? (
        <View style={styles.chartContainer}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
            <Path
              d={chartPath}
              stroke={trendLineColor}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Latest point */}
            {chartData.length > 0 && (
              <Circle
                cx={CHART_WIDTH}
                cy={
                  CHART_HEIGHT -
                  ((chartData[chartData.length - 1] -
                    (Math.min(...chartData) - 1)) /
                    (Math.max(...chartData) - Math.min(...chartData) + 2 || 1)) *
                    CHART_HEIGHT
                }
                r={4}
                fill={trendLineColor}
              />
            )}
          </Svg>
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>
            Log your weight to see your trend
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
    change: {
      fontSize: 14,
      fontWeight: '600',
    },
    changePositive: {
      color: colors.success,
    },
    changeNeutral: {
      color: colors.textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 24,
      marginBottom: 16,
    },
    stat: {},
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    chartContainer: {
      height: CHART_HEIGHT,
      overflow: 'hidden',
    },
    emptyChart: {
      height: CHART_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
    },
  });
