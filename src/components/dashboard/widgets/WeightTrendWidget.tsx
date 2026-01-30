/**
 * Weight Trend Widget
 * Displays weight progress over time with a line chart
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { useWeightStore, useGoalStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';

const CHART_PADDING = { left: 40, right: 10, top: 10, bottom: 25 };
const CHART_WIDTH = Dimensions.get('window').width - 80;
const CHART_HEIGHT = 100;
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

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
      .filter((w) => new Date(w.date) >= cutoff && typeof w.weightKg === 'number')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10);

    return recentWeights.map((w) => ({
      weight: w.weightKg,
      date: new Date(w.date),
    }));
  }, [entries, chartRange]);

  const weights = chartData.map((d) => d.weight);
  const latestWeight = weights.length > 0 && typeof weights[weights.length - 1] === 'number'
    ? weights[weights.length - 1]
    : null;
  const startWeight = weights.length > 0 && typeof weights[0] === 'number'
    ? weights[0]
    : null;
  const weightChange =
    latestWeight && startWeight ? latestWeight - startWeight : null;

  // Calculate chart bounds and path
  const { chartPath, minWeight, maxWeight, points } = useMemo(() => {
    if (chartData.length < 2) {
      return { chartPath: '', minWeight: 0, maxWeight: 0, points: [] };
    }

    const allWeights = chartData.map((d) => d.weight);
    const min = Math.min(...allWeights) - 0.5;
    const max = Math.max(...allWeights) + 0.5;
    const range = max - min || 1;

    const pts = chartData.map((data, index) => {
      const x = CHART_PADDING.left + (index / (chartData.length - 1)) * PLOT_WIDTH;
      const y = CHART_PADDING.top + PLOT_HEIGHT - ((data.weight - min) / range) * PLOT_HEIGHT;
      return { x, y, weight: data.weight, date: data.date };
    });

    const path = pts.reduce((acc, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    return { chartPath: path, minWeight: min, maxWeight: max, points: pts };
  }, [chartData]);

  // Generate Y-axis labels
  const yAxisLabels = useMemo(() => {
    if (chartData.length < 2) return [];
    const mid = (minWeight + maxWeight) / 2;
    return [
      { value: maxWeight, y: CHART_PADDING.top },
      { value: mid, y: CHART_PADDING.top + PLOT_HEIGHT / 2 },
      { value: minWeight, y: CHART_PADDING.top + PLOT_HEIGHT },
    ];
  }, [chartData.length, minWeight, maxWeight]);

  // Generate X-axis labels (first and last date)
  const xAxisLabels = useMemo(() => {
    if (chartData.length < 2) return [];
    const firstDate = chartData[0].date;
    const lastDate = chartData[chartData.length - 1].date;
    const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return [
      { label: formatDate(firstDate), x: CHART_PADDING.left },
      { label: formatDate(lastDate), x: CHART_PADDING.left + PLOT_WIDTH },
    ];
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
        {typeof weightChange === 'number' && (
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
            {typeof latestWeight === 'number' ? `${latestWeight.toFixed(1)} lbs` : '--'}
          </Text>
        </View>
        {typeof targetWeight === 'number' && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue}>{targetWeight.toFixed(1)} lbs</Text>
          </View>
        )}
      </View>

      {chartData.length >= 2 ? (
        <View style={styles.chartContainer}>
          <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
            {/* Horizontal grid lines */}
            {yAxisLabels.map((label, i) => (
              <Line
                key={`grid-${i}`}
                x1={CHART_PADDING.left}
                y1={label.y}
                x2={CHART_PADDING.left + PLOT_WIDTH}
                y2={label.y}
                stroke={colors.borderDefault}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            ))}

            {/* Y-axis labels */}
            {yAxisLabels.map((label, i) => (
              <SvgText
                key={`y-label-${i}`}
                x={CHART_PADDING.left - 6}
                y={label.y + 4}
                fontSize={10}
                fill={colors.textTertiary}
                textAnchor="end"
              >
                {label.value.toFixed(0)}
              </SvgText>
            ))}

            {/* X-axis labels */}
            {xAxisLabels.map((label, i) => (
              <SvgText
                key={`x-label-${i}`}
                x={label.x}
                y={CHART_HEIGHT - 5}
                fontSize={10}
                fill={colors.textTertiary}
                textAnchor={i === 0 ? 'start' : 'end'}
              >
                {label.label}
              </SvgText>
            ))}

            {/* Trend line */}
            <Path
              d={chartPath}
              stroke={trendLineColor}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((point, i) => (
              <Circle
                key={`point-${i}`}
                cx={point.x}
                cy={point.y}
                r={i === points.length - 1 ? 5 : 3}
                fill={i === points.length - 1 ? trendLineColor : colors.bgElevated}
                stroke={trendLineColor}
                strokeWidth={i === points.length - 1 ? 0 : 1.5}
              />
            ))}
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
      marginTop: 4,
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
