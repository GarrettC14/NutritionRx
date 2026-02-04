/**
 * SnapshotCards - Today's stats mini cards
 * Displays calorie, protein, water, meal count, and streak at a glance.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { spacing, borderRadius } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { DailyInsightData } from '../types/dailyInsights.types';

interface SnapshotCardsProps {
  data: DailyInsightData;
}

interface MiniCardProps {
  label: string;
  value: string;
  icon: string;
  colors: any;
}

function MiniCard({ label, value, icon, colors }: MiniCardProps) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault },
      ]}
    >
      <Ionicons name={icon as any} size={18} color={colors.textSecondary} style={styles.cardIcon} />
      <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function SnapshotCards({ data }: SnapshotCardsProps) {
  const { colors } = useTheme();

  const cards = [
    { label: 'Calories', value: `${data.caloriePercent}%`, icon: 'flame-outline' },
    { label: 'Protein', value: `${data.proteinPercent}%`, icon: 'barbell-outline' },
    { label: 'Water', value: `${data.waterPercent}%`, icon: 'water-outline' },
    { label: 'Meals', value: `${data.todayMealCount}`, icon: 'restaurant-outline' },
    { label: 'Streak', value: `${data.loggingStreak}d`, icon: 'flame-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {cards.slice(0, 3).map((card) => (
          <MiniCard key={card.label} {...card} colors={colors} />
        ))}
      </View>
      <View style={styles.row}>
        {cards.slice(3).map((card) => (
          <MiniCard key={card.label} {...card} colors={colors} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  cardIcon: {
    marginBottom: spacing[1],
  },
  cardValue: {
    ...typography.metric.medium,
    fontWeight: '700',
  },
  cardLabel: {
    ...typography.caption,
    marginTop: 2,
  },
});
