/**
 * Weekly Budget Widget
 * Compact 7-bar miniature showing calorie distribution
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { useMacroCycleStore, useSubscriptionStore } from '@/stores';
import { useResolvedTargets } from '@/hooks/useResolvedTargets';
import { WidgetProps } from '@/types/dashboard';

const BAR_COLOR = '#7C9A8E';
const BAR_TODAY_COLOR = '#6B8B7E';
const MAX_BAR_HEIGHT = 48;

export const WeeklyBudgetWidget = React.memo(function WeeklyBudgetWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const { redistributionDays, weeklyTotal } = useMacroCycleStore();
  const { calories } = useResolvedTargets();

  const handlePress = () => {
    if (!isEditMode) {
      router.push('/weekly-budget');
    }
  };

  const days = redistributionDays.length === 7
    ? redistributionDays
    : Array.from({ length: 7 }, () => ({ calories, isToday: false }));

  const maxCal = Math.max(...days.map((d) => d.calories), 1);
  const total = weeklyTotal > 0 ? weeklyTotal : calories * 7;
  const consumed = 0; // Would need daily totals — simplified for widget
  const remaining = total;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode}
      accessibilityRole="button"
      accessibilityLabel={`Weekly calorie budget: ${total.toLocaleString()} calories total`}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Weekly Budget</Text>

      <View style={styles.barRow}>
        {days.map((day, i) => {
          const height = (day.calories / (maxCal * 1.2)) * MAX_BAR_HEIGHT;
          return (
            <View key={i} style={styles.barColumn}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(3, height),
                      backgroundColor: day.isToday ? BAR_TODAY_COLOR : BAR_COLOR,
                    },
                  ]}
                />
              </View>
              {day.isToday && (
                <View style={[styles.todayDot, { backgroundColor: colors.accent }]} />
              )}
            </View>
          );
        })}
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {total.toLocaleString()} cal / week
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  title: {
    ...typography.title.small,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: MAX_BAR_HEIGHT,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '50%',
  },
  bar: {
    width: '100%',
    borderRadius: 2,
    minHeight: 3,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  subtitle: {
    ...typography.body.small,
    textAlign: 'center',
  },
});
