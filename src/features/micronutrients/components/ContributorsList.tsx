/**
 * ContributorsList
 * Shows which foods contributed to a nutrient's intake for the day
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { NutrientContributor } from '@/types/micronutrients';

interface ContributorsListProps {
  contributors: NutrientContributor[];
  unit: string;
  isLoading: boolean;
}

export function ContributorsList({ contributors, unit, isLoading }: ContributorsListProps) {
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  if (contributors.length === 0) {
    return (
      <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
        No contributing foods tracked for today
      </Text>
    );
  }

  const formatAmount = (value: number): string => {
    if (unit === 'mcg') return `${Math.round(value)} ${unit}`;
    if (unit === 'mg') return value >= 1000 ? `${(value / 1000).toFixed(1)} g` : `${Math.round(value)} ${unit}`;
    if (unit === 'g') return `${value.toFixed(1)} ${unit}`;
    return `${Math.round(value)} ${unit}`;
  };

  return (
    <View style={styles.container}>
      {contributors.map((contributor, index) => (
        <View key={`${contributor.logEntryId}-${index}`} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text
              style={[styles.foodName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {contributor.foodName}
            </Text>
            <View style={styles.rowValues}>
              <Text style={[styles.amount, { color: colors.textPrimary }]}>
                {formatAmount(contributor.amount)}
              </Text>
              <Text style={[styles.percent, { color: colors.textTertiary }]}>
                {contributor.percentOfDailyIntake}%
              </Text>
            </View>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.bgInteractive }]}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(contributor.percentOfDailyIntake, 100)}%`,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  loadingContainer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body.small,
    textAlign: 'center',
    paddingVertical: spacing[3],
  },
  row: {
    gap: spacing[1],
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodName: {
    ...typography.body.small,
    flex: 1,
    marginRight: spacing[2],
  },
  rowValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  amount: {
    ...typography.body.small,
    fontWeight: '600',
  },
  percent: {
    ...typography.caption,
    minWidth: 36,
    textAlign: 'right',
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
});
