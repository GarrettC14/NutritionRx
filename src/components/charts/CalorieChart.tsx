import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { DailyTotals } from '@/types/domain';
import { useSettingsStore } from '@/stores';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;

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

  // Convert to chart data
  const chartData = sortedData.map((day) => {
    const isOverGoal = day.totals.calories > calorieGoal;
    const isSignificantlyUnder = day.totals.calories < calorieGoal * 0.8;

    return {
      value: day.totals.calories,
      label: formatDateLabel(day.date),
      frontColor: isOverGoal
        ? colors.warning
        : isSignificantlyUnder
          ? colors.textTertiary
          : colors.accent,
      topLabelComponent: () => (
        <Text style={[styles.barLabel, { color: colors.textTertiary }]}>
          {day.totals.calories > 0 ? day.totals.calories.toLocaleString() : ''}
        </Text>
      ),
    };
  });

  // Calculate statistics
  const totalCalories = sortedData.reduce((sum, d) => sum + d.totals.calories, 0);
  const avgCalories = Math.round(totalCalories / sortedData.length);
  const maxCalories = Math.max(...sortedData.map(d => d.totals.calories));

  // Determine y-axis max
  const yMax = Math.max(maxCalories, calorieGoal) * 1.15;

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
        <BarChart
          data={chartData}
          width={CHART_WIDTH - 40}
          height={160}
          barWidth={Math.min(30, (CHART_WIDTH - 80) / chartData.length - 8)}
          spacing={8}
          noOfSections={4}
          maxValue={yMax}
          yAxisColor="transparent"
          xAxisColor={colors.borderDefault}
          yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
          hideRules
          barBorderRadius={4}
          showReferenceLine1={showGoalLine}
          referenceLine1Position={calorieGoal}
          referenceLine1Config={{
            color: colors.accent,
            dashWidth: 4,
            dashGap: 4,
            thickness: 1,
          }}
          renderTooltip={(item: any) => (
            <View style={[styles.tooltip, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.tooltipText, { color: colors.textPrimary }]}>
                {item.value.toLocaleString()} kcal
              </Text>
            </View>
          )}
        />
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
  barLabel: {
    fontSize: 9,
    marginBottom: 2,
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
  tooltip: {
    padding: spacing[2],
    borderRadius: 4,
  },
  tooltipText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
