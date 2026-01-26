import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { DailyTotals } from '@/types/domain';
import { useSettingsStore } from '@/stores';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 160;
const PADDING = { top: 20, bottom: 30, left: 10, right: 10 };

interface CalorieChartProps {
  data: Array<{ date: string; totals: DailyTotals }>;
  showGoalLine?: boolean;
}

// Format date for display
const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
};

export function CalorieChart({ data, showGoalLine = true }: CalorieChartProps) {
  const { colors } = useTheme();
  const { settings } = useSettingsStore();
  const calorieGoal = settings.dailyCalorieGoal;

  if (data.length === 0) {
    return null;
  }

  // Sort by date ascending
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate statistics
  const totalCalories = sortedData.reduce((sum, d) => sum + d.totals.calories, 0);
  const avgCalories = Math.round(totalCalories / sortedData.length);
  const maxCalories = Math.max(...sortedData.map(d => d.totals.calories));

  // Determine y-axis max
  const yMax = Math.max(maxCalories, calorieGoal) * 1.15;

  // Chart dimensions
  const chartWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const barWidth = Math.min(30, (chartWidth / sortedData.length) - 8);
  const barSpacing = (chartWidth - barWidth * sortedData.length) / (sortedData.length + 1);

  // Calculate goal line position
  const goalLineY = PADDING.top + chartHeight - (calorieGoal / yMax) * chartHeight;

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Average
          </Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {avgCalories.toLocaleString()} kcal
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            vs Goal
          </Text>
          <Text
            style={[
              styles.statValue,
              { color: avgCalories <= calorieGoal ? colors.success : colors.warning },
            ]}
          >
            {avgCalories <= calorieGoal ? '' : '+'}
            {(avgCalories - calorieGoal).toLocaleString()} kcal
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* X-axis line */}
          <Line
            x1={PADDING.left}
            y1={PADDING.top + chartHeight}
            x2={CHART_WIDTH - PADDING.right}
            y2={PADDING.top + chartHeight}
            stroke={colors.borderDefault}
            strokeWidth={1}
          />

          {/* Goal line */}
          {showGoalLine && (
            <Line
              x1={PADDING.left}
              y1={goalLineY}
              x2={CHART_WIDTH - PADDING.right}
              y2={goalLineY}
              stroke={colors.accent}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          )}

          {/* Bars */}
          {sortedData.map((day, index) => {
            const x = PADDING.left + barSpacing + index * (barWidth + barSpacing);
            const barHeight = (day.totals.calories / yMax) * chartHeight;
            const y = PADDING.top + chartHeight - barHeight;
            const isOverGoal = day.totals.calories > calorieGoal;
            const isSignificantlyUnder = day.totals.calories < calorieGoal * 0.8;
            const barColor = isOverGoal
              ? colors.warning
              : isSignificantlyUnder
                ? colors.textTertiary
                : colors.accent;

            return (
              <G key={day.date}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={barColor}
                  rx={4}
                  ry={4}
                />
                {/* X-axis label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={PADDING.top + chartHeight + 15}
                  fill={colors.textTertiary}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {formatDateLabel(day.date)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {showGoalLine && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Goal: {calorieGoal.toLocaleString()} kcal
            </Text>
          </View>
        </View>
      )}
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[4],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
  },
});
