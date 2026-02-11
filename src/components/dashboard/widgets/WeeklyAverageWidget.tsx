/**
 * Weekly Average Widget
 * Shows average daily calories for the current week
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { useFoodLogStore } from '@/stores';
import { useResolvedTargets } from '@/hooks/useResolvedTargets';
import { WidgetProps } from '@/types/dashboard';

export function WeeklyAverageWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { entries } = useFoodLogStore();
  const { calories: calorieTarget } = useResolvedTargets();

  const { weeklyAverage, daysLogged } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weekEntries = entries.filter(
      (entry) => new Date(entry.date) >= startOfWeek
    );

    const caloriesByDay: Record<string, number> = {};
    weekEntries.forEach((entry) => {
      const dateKey = entry.date;
      caloriesByDay[dateKey] = (caloriesByDay[dateKey] || 0) + (entry.calories || 0);
    });

    const daysWithEntries = Object.keys(caloriesByDay).length;
    const totalCalories = Object.values(caloriesByDay).reduce(
      (sum, cal) => sum + cal,
      0
    );
    const average = daysWithEntries > 0 ? totalCalories / daysWithEntries : 0;

    return {
      weeklyAverage: Math.round(average),
      daysLogged: daysWithEntries,
    };
  }, [entries]);

  const target = calorieTarget;
  const difference = weeklyAverage - target;
  const percentOfGoal = Math.round((weeklyAverage / target) * 100);

  const handlePress = () => {
    if (!isEditMode) {
      router.push('/(tabs)/progress');
    }
  };

  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode}
      accessibilityRole="button"
      accessibilityLabel={`Weekly average: ${weeklyAverage > 0 ? `${weeklyAverage} calories, ${percentOfGoal}% of goal` : 'No data this week'}`}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="calendar-outline" size={22} color={colors.accent} />
      </View>

      <View style={styles.info} accessibilityLiveRegion="polite">
        <Text style={styles.title}>Weekly Avg</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>
            {weeklyAverage > 0 ? `${weeklyAverage.toLocaleString()} cal` : '--'}
          </Text>
          {weeklyAverage > 0 && (
            <Text
              style={[
                styles.percentage,
                percentOfGoal > 100 ? styles.over : styles.under,
              ]}
            >
              {percentOfGoal}% of goal
            </Text>
          )}
        </View>
        <Text style={styles.subtitle}>
          {daysLogged > 0 ? `Based on ${daysLogged} days` : 'No data this week'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: `${colors.accent}20`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    info: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    value: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    percentage: {
      fontSize: 12,
      fontWeight: '500',
    },
    over: {
      color: colors.warning,
    },
    under: {
      color: colors.success,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
  });
