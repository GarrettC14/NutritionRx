/**
 * Weekly Stats Grid
 * Displays Avg Cal, Avg Pro, Logged Days, Total Meals
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { WeeklyCollectedData } from '../types/weeklyInsights.types';

interface WeeklyStatsGridProps {
  data: WeeklyCollectedData;
}

export function WeeklyStatsGrid({ data }: WeeklyStatsGridProps) {
  const { colors } = useTheme();

  const daysAnnotation = `based on ${data.loggedDayCount} day${data.loggedDayCount !== 1 ? 's' : ''}`;

  const stats = [
    {
      value: data.avgCalories > 0 ? Math.round(data.avgCalories).toLocaleString() : '--',
      label: 'Avg Cal',
      annotation: data.avgCalories > 0 ? daysAnnotation : undefined,
    },
    {
      value: data.avgProtein > 0 ? `${Math.round(data.avgProtein)}g` : '--',
      label: 'Avg Protein',
      annotation: data.avgProtein > 0 ? daysAnnotation : undefined,
    },
    {
      value: `${data.loggedDayCount}/7`,
      label: 'Days Logged',
      annotation: undefined,
    },
    {
      value: data.totalMeals > 0 ? String(data.totalMeals) : '--',
      label: 'Total Meals',
      annotation: undefined,
    },
  ];

  return (
    <View style={styles.grid}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1}>
            {stat.value}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]} numberOfLines={1}>
            {stat.label}
          </Text>
          {stat.annotation && (
            <Text style={[styles.statAnnotation, { color: colors.textTertiary }]} numberOfLines={1}>
              {stat.annotation}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statAnnotation: {
    fontSize: 10,
    marginTop: 1,
    fontStyle: 'italic',
  },
});
