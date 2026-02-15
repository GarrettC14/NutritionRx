import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { getDeviationPercent } from '@/utils/redistribution';
import { DayBudget } from '@/types/planning';

const BAR_COLORS = {
  unlocked: '#7C9A8E',
  locked: '#C8CCC9',
  selected: '#6B8B7E',
};

const MAX_BAR_HEIGHT = 140;

interface BudgetBarChartProps {
  days: DayBudget[];
  selectedIndex: number | null;
  weeklyTotal: number;
  onSelectDay: (index: number) => void;
  onToggleLock: (index: number) => void;
}

export function BudgetBarChart({
  days,
  selectedIndex,
  weeklyTotal,
  onSelectDay,
  onToggleLock,
}: BudgetBarChartProps) {
  const { colors } = useTheme();
  const maxCal = Math.max(...days.map((d) => d.calories), 1);
  const scaledMax = maxCal * 1.2;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
      <View style={styles.chartRow}>
        {days.map((day, index) => (
          <BarColumn
            key={day.date}
            day={day}
            index={index}
            isSelected={selectedIndex === index}
            scaledMax={scaledMax}
            weeklyTotal={weeklyTotal}
            colors={colors}
            onSelect={() => onSelectDay(index)}
            onToggleLock={() => onToggleLock(index)}
          />
        ))}
      </View>
    </View>
  );
}

function BarColumn({
  day,
  index,
  isSelected,
  scaledMax,
  weeklyTotal,
  colors,
  onSelect,
  onToggleLock,
}: {
  day: DayBudget;
  index: number;
  isSelected: boolean;
  scaledMax: number;
  weeklyTotal: number;
  colors: any;
  onSelect: () => void;
  onToggleLock: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const barHeight = (day.calories / scaledMax) * MAX_BAR_HEIGHT;
  const deviation = getDeviationPercent(day.calories, weeklyTotal);
  const deviationStr = deviation >= 0 ? `+${deviation}%` : `${deviation}%`;

  const barColor = isSelected
    ? BAR_COLORS.selected
    : day.locked
      ? BAR_COLORS.locked
      : BAR_COLORS.unlocked;

  const animatedBarStyle = useAnimatedStyle(() => ({
    height: reducedMotion ? barHeight : withTiming(barHeight, { duration: 300 }),
  }));

  return (
    <View style={barStyles.column}>
      {/* Day label */}
      <Text style={[barStyles.dayLabel, { color: colors.textSecondary }]}>
        {day.dayLabel}
      </Text>

      {/* Bar area */}
      <Pressable
        style={barStyles.barWrapper}
        onPress={onSelect}
        accessibilityRole="button"
        accessibilityLabel={`${day.dayLabel}, ${day.calories} calories${day.locked ? ', locked' : ''}`}
      >
        <View style={barStyles.barContainer}>
          <Animated.View
            style={[
              barStyles.bar,
              { backgroundColor: barColor },
              animatedBarStyle,
            ]}
          />
        </View>
      </Pressable>

      {/* Calorie value */}
      <Text
        style={[
          barStyles.calValue,
          { color: isSelected ? colors.textPrimary : colors.textSecondary },
        ]}
      >
        {day.calories}
      </Text>

      {/* Deviation */}
      <Text style={[barStyles.deviation, { color: colors.textTertiary }]}>
        {deviationStr}
      </Text>

      {/* Lock icon */}
      <Pressable
        onPress={onToggleLock}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${day.locked ? 'Unlock' : 'Lock'} ${day.dayLabel}`}
      >
        <Ionicons
          name={day.locked ? 'lock-closed' : 'lock-open-outline'}
          size={14}
          color={day.locked ? colors.textSecondary : colors.textTertiary}
        />
      </Pressable>

      {/* Today indicator */}
      {day.isToday && (
        <View style={[barStyles.todayDot, { backgroundColor: colors.accent }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
});

const barStyles = StyleSheet.create({
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[1],
  },
  dayLabel: {
    ...typography.caption,
    fontWeight: '500',
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  barContainer: {
    width: '60%',
    height: MAX_BAR_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: borderRadius.sm,
    minHeight: 4,
  },
  calValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  deviation: {
    fontSize: 9,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
});
