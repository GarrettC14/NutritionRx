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

  const stats = [
    {
      value: data.avgCalories > 0 ? Math.round(data.avgCalories).toLocaleString() : '--',
      label: 'Avg Cal',
    },
    {
      value: data.avgProtein > 0 ? `${Math.round(data.avgProtein)}g` : '--',
      label: 'Avg Protein',
    },
    {
      value: `${data.loggedDayCount}/7`,
      label: 'Days Logged',
    },
    {
      value: data.totalMeals > 0 ? String(data.totalMeals) : '--',
      label: 'Total Meals',
    },
  ];

  return (
    <View style={styles.grid}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stat.value}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
