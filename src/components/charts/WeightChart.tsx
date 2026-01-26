import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { WeightEntry } from '@/types/domain';
import { useSettingsStore } from '@/stores';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;

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

  // Convert to chart data
  const chartData = sortedEntries.map((entry, index) => ({
    value: isLbs ? kgToLbs(entry.weightKg) : entry.weightKg,
    label: index === 0 || index === sortedEntries.length - 1
      ? formatDateLabel(entry.date)
      : '',
    dataPointText: '',
    date: entry.date,
  }));

  // Calculate trend line using simple linear regression
  const calculateTrendLine = () => {
    if (chartData.length < 2) return chartData;

    const n = chartData.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = chartData.reduce((sum, d) => sum + d.value, 0);
    const sumXY = chartData.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return chartData.map((point, i) => ({
      value: intercept + slope * i,
    }));
  };

  const trendData = showTrend ? calculateTrendLine() : [];

  // Find min/max for better axis
  const values = chartData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = Math.max(range * 0.1, 2);

  // Calculate statistics
  const latestWeight = chartData[chartData.length - 1]?.value;
  const firstWeight = chartData[0]?.value;
  const weightChange = latestWeight - firstWeight;

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
        <LineChart
          data={chartData}
          data2={showTrend && trendData.length > 0 ? trendData : undefined}
          width={CHART_WIDTH - 40}
          height={160}
          spacing={(CHART_WIDTH - 60) / Math.max(chartData.length - 1, 1)}
          color={colors.accent}
          color2={colors.textTertiary}
          thickness={2}
          thickness2={1}
          dataPointsColor={colors.accent}
          dataPointsRadius={4}
          hideDataPoints2
          startFillColor={colors.accent}
          startOpacity={0.2}
          endOpacity={0}
          areaChart
          curved
          yAxisColor="transparent"
          xAxisColor={colors.border}
          yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
          hideRules
          yAxisOffset={Math.floor(minValue - padding)}
          maxValue={Math.ceil(maxValue + padding) - Math.floor(minValue - padding)}
          noOfSections={4}
          dashGap={4}
          dashWidth={2}
          showVerticalLines={false}
        />
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
