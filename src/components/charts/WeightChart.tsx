import React from 'react';
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
}

// Convert kg to lbs
const kgToLbs = (kg: number): number => kg * 2.20462;

// Format date for display
const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function WeightChart({ entries, showTrend = true }: WeightChartProps) {
  const { colors } = useTheme();
  const { settings } = useSettingsStore();
  const isLbs = settings.weightUnit === 'lbs';

  if (entries.length === 0) {
    return null;
  }

  // Sort entries by date ascending
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Convert to display values
  const chartData = sortedEntries.map((entry) => ({
    value: isLbs ? kgToLbs(entry.weightKg) : entry.weightKg,
    date: entry.date,
  }));

  // Find min/max for better axis
  const values = chartData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = Math.max(range * 0.15, 2);
  const yMin = minValue - padding;
  const yMax = maxValue + padding;

  // Chart dimensions
  const chartWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  // Calculate points
  const getX = (index: number) =>
    PADDING.left + (index / Math.max(chartData.length - 1, 1)) * chartWidth;
  const getY = (value: number) =>
    PADDING.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;

  // Create path for line
  const linePath = chartData.map((point, i) => {
    const x = getX(i);
    const y = getY(point.value);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  // Create path for area fill
  const areaPath = linePath +
    ` L ${getX(chartData.length - 1)} ${PADDING.top + chartHeight}` +
    ` L ${getX(0)} ${PADDING.top + chartHeight} Z`;

  // Calculate trend line using simple linear regression
  const calculateTrendLine = () => {
    if (chartData.length < 2) return null;

    const n = chartData.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = chartData.reduce((sum, d) => sum + d.value, 0);
    const sumXY = chartData.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const startY = getY(intercept);
    const endY = getY(intercept + slope * (n - 1));

    return `M ${getX(0)} ${startY} L ${getX(n - 1)} ${endY}`;
  };

  const trendPath = showTrend ? calculateTrendLine() : null;

  // Calculate statistics
  const latestWeight = chartData[chartData.length - 1]?.value;
  const firstWeight = chartData[0]?.value;
  const weightChange = latestWeight - firstWeight;

  // Y-axis labels
  const yAxisLabels = [yMin, yMin + (yMax - yMin) / 2, yMax].map(v => v.toFixed(1));

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

          {/* X-axis labels (first and last) */}
          {chartData.length > 0 && (
            <>
              <SvgText
                x={getX(0)}
                y={PADDING.top + chartHeight + 15}
                fill={colors.textTertiary}
                fontSize={10}
                textAnchor="start"
              >
                {formatDateLabel(chartData[0].date)}
              </SvgText>
              {chartData.length > 1 && (
                <SvgText
                  x={getX(chartData.length - 1)}
                  y={PADDING.top + chartHeight + 15}
                  fill={colors.textTertiary}
                  fontSize={10}
                  textAnchor="end"
                >
                  {formatDateLabel(chartData[chartData.length - 1].date)}
                </SvgText>
              )}
            </>
          )}
        </Svg>
      </View>
    </View>
  );
}

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
