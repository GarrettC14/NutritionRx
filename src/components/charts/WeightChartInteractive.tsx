import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { LineChart } from 'react-native-wagmi-charts';
import { useTheme } from '@/hooks/useTheme';
import { chartColors as allChartColors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { WeightEntry } from '@/types/domain';
import { useSettingsStore } from '@/stores';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const Y_GUTTER = 16;

interface WeightChartInteractiveProps {
  entries: WeightEntry[];
  startDate?: string;
  endDate?: string;
}

const kgToLbs = (kg: number): number => kg * 2.20462;

const TREND_THRESHOLD = 7;

export const WeightChartInteractive = React.memo(function WeightChartInteractive({
  entries,
  startDate,
  endDate,
}: WeightChartInteractiveProps) {
  const { colors, colorScheme } = useTheme();
  const chartThemeColors = allChartColors[colorScheme];
  const { settings } = useSettingsStore();
  const isLbs = settings.weightUnit === 'lbs';
  const router = useRouter();

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [entries]
  );

  const convert = (kg: number) => (isLbs ? kgToLbs(kg) : kg);
  const unit = isLbs ? 'lbs' : 'kg';
  const entryCount = sortedEntries.length;
  const hasTrend = entryCount >= TREND_THRESHOLD;

  // Build wagmi-charts data
  const { rawData, trendData } = useMemo(() => {
    const raw = sortedEntries.map((e) => ({
      timestamp: new Date(e.date + 'T12:00:00').getTime(),
      value: convert(e.weightKg),
    }));

    const trend = sortedEntries
      .filter((e) => e.trendWeightKg != null)
      .map((e) => ({
        timestamp: new Date(e.date + 'T12:00:00').getTime(),
        value: convert(e.trendWeightKg!),
      }));

    return { rawData: raw, trendData: trend };
  }, [sortedEntries, isLbs]);

  // Stats
  const latestRaw = sortedEntries.length > 0 ? convert(sortedEntries[sortedEntries.length - 1].weightKg) : 0;
  const latestTrend = sortedEntries.length > 0 && sortedEntries[sortedEntries.length - 1].trendWeightKg != null
    ? convert(sortedEntries[sortedEntries.length - 1].trendWeightKg!)
    : null;
  const firstTrend = sortedEntries.length > 0 && sortedEntries[0].trendWeightKg != null
    ? convert(sortedEntries[0].trendWeightKg!)
    : null;
  const trendChange = latestTrend != null && firstTrend != null ? latestTrend - firstTrend : null;

  // Compute y domain with padding
  const allValues = useMemo(() => {
    const vals = rawData.map((d) => d.value);
    if (hasTrend) vals.push(...trendData.map((d) => d.value));
    return vals;
  }, [rawData, trendData, hasTrend]);

  const yDomain = useMemo<[number, number]>(() => {
    if (allValues.length === 0) return [0, 100];
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal;
    const pad = Math.max(range * 0.15, isLbs ? 2 : 1);
    return [minVal - pad, maxVal + pad];
  }, [allValues, isLbs]);

  const yRange = useMemo(() => ({ min: yDomain[0], max: yDomain[1] }), [yDomain]);

  // Axis formatting
  const formatYAxis = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toFixed(0);
  };

  const formatXAxis = (value: number | string) => {
    const ts = typeof value === 'string' ? parseFloat(value) : value;
    const date = new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTooltipPrice = ({ value }: { value: string; formatted: string }) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `${num.toFixed(1)} ${unit}`;
  };

  // === EMPTY STATES ===

  // 0 entries
  if (entryCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="scale-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Log your first weight to start tracking
        </Text>
        <Pressable
          style={[styles.ctaButton, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/log-weight')}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.ctaText}>Log Weight</Text>
        </Pressable>
      </View>
    );
  }

  // 1 entry
  if (entryCount === 1) {
    return (
      <View style={styles.singleEntryContainer}>
        <Text style={[styles.singleValue, { color: colors.textPrimary }]}>
          {latestRaw.toFixed(1)} {unit}
        </Text>
        <Text style={[styles.singleHint, { color: colors.textSecondary }]}>
          Keep logging daily to reveal your trend. About 7 days to see meaningful patterns.
        </Text>
      </View>
    );
  }

  // Ensure we have at least 2 data points for the chart
  if (rawData.length < 2) {
    return null;
  }

  // 2-6 entries: raw line only
  const showTrendLine = hasTrend && trendData.length >= 2;

  // Build chart data — if showing both lines use dict, otherwise single array
  const chartData = showTrendLine
    ? { raw: rawData, trend: trendData }
    : rawData;

  const axisTextStyle = { color: colors.textTertiary, fontSize: 10 };
  const chartWidth = SCREEN_WIDTH - 48;

  return (
    <View style={styles.container}>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Current</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {latestRaw.toFixed(1)} {unit}
          </Text>
        </View>
        {hasTrend && latestTrend != null && (
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trend</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {latestTrend.toFixed(1)} {unit}
            </Text>
          </View>
        )}
        {trendChange != null && hasTrend ? (
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Change</Text>
            <Text
              style={[
                styles.statValue,
                { color: trendChange <= 0 ? colors.success : colors.textSecondary },
              ]}
            >
              {trendChange > 0 ? '+' : ''}
              {trendChange.toFixed(1)} {unit}
            </Text>
          </View>
        ) : (
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Change</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {(latestRaw - convert(sortedEntries[0].weightKg) > 0 ? '+' : '')}
              {(latestRaw - convert(sortedEntries[0].weightKg)).toFixed(1)} {unit}
            </Text>
          </View>
        )}
      </View>

      {/* Chart */}
      {showTrendLine ? (
        <LineChart.Provider data={chartData} yRange={yRange}>
          <LineChart height={CHART_HEIGHT} width={chartWidth} yGutter={Y_GUTTER} id="raw">
            <LineChart.Path color={chartThemeColors.rawWeight} width={1.5}>
              <LineChart.Gradient color={chartThemeColors.rawWeight} />
            </LineChart.Path>
          </LineChart>
          <LineChart height={CHART_HEIGHT} width={chartWidth} yGutter={Y_GUTTER} id="trend" absolute>
            <LineChart.Path color={chartThemeColors.trendLine} width={2.5} />
            <LineChart.CursorLine
              color={chartThemeColors.trendLine}
              textStyle={axisTextStyle}
              format={({ value }) => {
                const ts = typeof value === 'string' ? parseFloat(value as string) : (value as number);
                const date = new Date(ts);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <LineChart.Tooltip position="top" cursorGutter={16}>
              <View style={[styles.tooltipContainer, { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault }]}>
                <LineChart.PriceText
                  precision={1}
                  format={formatTooltipPrice}
                  style={[styles.tooltipValue, { color: colors.textPrimary }]}
                />
              </View>
            </LineChart.Tooltip>
            {/* Y-axis (left) — must be inside LineChart for dimensions context */}
            <LineChart.Axis
              position="left"
              orientation="vertical"
              tickCount={4}
              domain={yDomain}
              format={formatYAxis}
              color={colors.textTertiary}
              textStyle={axisTextStyle}
              labelPadding={4}
            />
          </LineChart>
        </LineChart.Provider>
      ) : (
        <LineChart.Provider data={rawData} yRange={yRange}>
          <LineChart height={CHART_HEIGHT} width={chartWidth} yGutter={Y_GUTTER}>
            <LineChart.Path color={chartThemeColors.trendLine} width={2}>
              <LineChart.Gradient color={chartThemeColors.trendLine} />
            </LineChart.Path>
            <LineChart.CursorLine
              color={chartThemeColors.trendLine}
              textStyle={axisTextStyle}
              format={({ value }) => {
                const ts = typeof value === 'string' ? parseFloat(value as string) : (value as number);
                const date = new Date(ts);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <LineChart.Tooltip position="top" cursorGutter={16}>
              <View style={[styles.tooltipContainer, { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault }]}>
                <LineChart.PriceText
                  precision={1}
                  format={formatTooltipPrice}
                  style={[styles.tooltipValue, { color: colors.textPrimary }]}
                />
              </View>
            </LineChart.Tooltip>
            {/* Y-axis (left) */}
            <LineChart.Axis
              position="left"
              orientation="vertical"
              tickCount={4}
              domain={yDomain}
              format={formatYAxis}
              color={colors.textTertiary}
              textStyle={axisTextStyle}
              labelPadding={4}
            />
          </LineChart>
        </LineChart.Provider>
      )}

      {/* Hint for 2-6 entries */}
      {!hasTrend && entryCount >= 2 && (
        <Text style={[styles.trendHint, { color: colors.textTertiary }]}>
          {TREND_THRESHOLD - entryCount} more {TREND_THRESHOLD - entryCount === 1 ? 'entry' : 'entries'} until trend activates
        </Text>
      )}

      {/* Legend for 7+ entries */}
      {hasTrend && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: chartThemeColors.rawWeight }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>Raw</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLineBold, { backgroundColor: chartThemeColors.trendLine }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Trend</Text>
          </View>
        </View>
      )}
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
    marginBottom: spacing[2],
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
  tooltipContainer: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 70,
  },
  tooltipValue: {
    ...typography.body.small,
    fontWeight: '600',
  },
  trendHint: {
    ...typography.caption,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[4],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  legendLine: {
    width: 16,
    height: 1.5,
    borderRadius: 1,
    opacity: 0.6,
  },
  legendLineBold: {
    width: 16,
    height: 2.5,
    borderRadius: 1,
  },
  legendText: {
    ...typography.caption,
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
  },
  emptyTitle: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    marginTop: spacing[1],
  },
  ctaText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  singleEntryContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
  },
  singleValue: {
    ...typography.display.small,
  },
  singleHint: {
    ...typography.body.medium,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
});
