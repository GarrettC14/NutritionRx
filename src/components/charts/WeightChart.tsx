import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, G, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { WeightEntry } from '@/types/domain';
import { useSettingsStore } from '@/stores';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 160;
const PADDING = { top: 20, bottom: 30, left: 40, right: 10 };

interface WeightChartProps {
  entries: WeightEntry[];
  showTrend?: boolean;
  startDate?: string;
  endDate?: string;
}

// Convert kg to lbs
const kgToLbs = (kg: number): number => kg * 2.20462;

// Format date for display
const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const WeightChart = React.memo(function WeightChart({ entries, showTrend = true, startDate, endDate }: WeightChartProps) {
  const { colors } = useTheme();
  const { settings } = useSettingsStore();
  const isLbs = settings.weightUnit === 'lbs';

  // Memoize sorted entries and chart data
  const { chartData, sortedEntries } = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const data = sorted.map((entry) => ({
      value: isLbs ? kgToLbs(entry.weightKg) : entry.weightKg,
      date: entry.date,
    }));
    return { chartData: data, sortedEntries: sorted };
  }, [entries, isLbs]);

  // Memoize all computed chart geometry
  const { linePath, areaPath, trendPath, latestWeight, firstWeight, weightChange, yAxisLabels, getX, getY } = useMemo(() => {
    if (chartData.length === 0) {
      return { linePath: '', areaPath: '', trendPath: null, latestWeight: 0, firstWeight: 0, weightChange: 0, yAxisLabels: [], getX: () => 0, getY: () => 0 };
    }

    const values = chartData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const pad = Math.max(range * 0.15, 2);
    const yMin = minValue - pad;
    const yMax = maxValue + pad;

    const chartWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const rangeStartMs = startDate ? new Date(startDate + 'T12:00:00').getTime() : null;
    const rangeEndMs = endDate ? new Date(endDate + 'T12:00:00').getTime() : null;
    const useDatePositioning = rangeStartMs != null && rangeEndMs != null && rangeEndMs > rangeStartMs;

    const _getX = (index: number) => {
      if (useDatePositioning) {
        const dateMs = new Date(chartData[index].date + 'T12:00:00').getTime();
        return PADDING.left + ((dateMs - rangeStartMs!) / (rangeEndMs! - rangeStartMs!)) * chartWidth;
      }
      return PADDING.left + (index / Math.max(chartData.length - 1, 1)) * chartWidth;
    };
    const _getY = (value: number) =>
      PADDING.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;

    const _linePath = chartData.map((point, i) => {
      const x = _getX(i);
      const y = _getY(point.value);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');

    const _areaPath = _linePath +
      ` L ${_getX(chartData.length - 1)} ${PADDING.top + chartHeight}` +
      ` L ${_getX(0)} ${PADDING.top + chartHeight} Z`;

    let _trendPath: string | null = null;
    if (showTrend && chartData.length >= 2) {
      const n = chartData.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = chartData.reduce((sum, d) => sum + d.value, 0);
      const sumXY = chartData.reduce((sum, d, i) => sum + i * d.value, 0);
      const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      _trendPath = `M ${_getX(0)} ${_getY(intercept)} L ${_getX(n - 1)} ${_getY(intercept + slope * (n - 1))}`;
    }

    const _latestWeight = chartData[chartData.length - 1]?.value ?? 0;
    const _firstWeight = chartData[0]?.value ?? 0;
    const _yAxisLabels = [yMin, yMin + (yMax - yMin) / 2, yMax].map(v => v.toFixed(1));

    return {
      linePath: _linePath,
      areaPath: _areaPath,
      trendPath: _trendPath,
      latestWeight: _latestWeight,
      firstWeight: _firstWeight,
      weightChange: _latestWeight - _firstWeight,
      yAxisLabels: _yAxisLabels,
      getX: _getX,
      getY: _getY,
    };
  }, [chartData, startDate, endDate, showTrend]);

  if (entries.length === 0) {
    return null;
  }

  const chartWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const useDatePositioning = startDate != null && endDate != null;

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Current
          </Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {latestWeight.toFixed(1)} {isLbs ? 'lbs' : 'kg'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Change
          </Text>
          <Text
            style={[
              styles.statValue,
              { color: weightChange <= 0 ? colors.success : colors.warning },
            ]}
          >
            {weightChange > 0 ? '+' : ''}
            {weightChange.toFixed(1)} {isLbs ? 'lbs' : 'kg'}
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Y-axis labels */}
          {yAxisLabels.map((label, i) => (
            <SvgText
              key={i}
              x={PADDING.left - 5}
              y={PADDING.top + chartHeight - (i / 2) * chartHeight + 4}
              fill={colors.textTertiary}
              fontSize={10}
              textAnchor="end"
            >
              {label}
            </SvgText>
          ))}

          {/* X-axis line */}
          <Line
            x1={PADDING.left}
            y1={PADDING.top + chartHeight}
            x2={CHART_WIDTH - PADDING.right}
            y2={PADDING.top + chartHeight}
            stroke={colors.borderDefault}
            strokeWidth={1}
          />

          {/* Area fill */}
          <Path
            d={areaPath}
            fill={colors.accent}
            fillOpacity={0.15}
          />

          {/* Main line */}
          <Path
            d={linePath}
            stroke={colors.accent}
            strokeWidth={2}
            fill="none"
          />

          {/* Trend line */}
          {trendPath && (
            <Path
              d={trendPath}
              stroke={colors.textTertiary}
              strokeWidth={1}
              strokeDasharray="4,4"
              fill="none"
            />
          )}

          {/* Data points */}
          {chartData.map((point, i) => (
            <Circle
              key={point.date}
              cx={getX(i)}
              cy={getY(point.value)}
              r={4}
              fill={colors.accent}
            />
          ))}

          {/* X-axis labels (range boundaries or first/last data) */}
          {chartData.length > 0 && (
            <>
              <SvgText
                x={PADDING.left}
                y={PADDING.top + chartHeight + 15}
                fill={colors.textTertiary}
                fontSize={10}
                textAnchor="start"
              >
                {formatDateLabel(useDatePositioning ? startDate! : chartData[0].date)}
              </SvgText>
              <SvgText
                x={PADDING.left + chartWidth}
                y={PADDING.top + chartHeight + 15}
                fill={colors.textTertiary}
                fontSize={10}
                textAnchor="end"
              >
                {formatDateLabel(useDatePositioning ? endDate! : chartData[chartData.length - 1].date)}
              </SvgText>
            </>
          )}
        </Svg>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    ...typography.caption,
    marginBottom: spacing[1],
  },
  statValue: {
    ...typography.title.medium,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: spacing[2],
  },
});
