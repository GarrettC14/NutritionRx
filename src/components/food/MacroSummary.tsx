import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { DailyTotals } from '@/types/domain';

interface MacroSummaryProps {
  totals: DailyTotals;
  goals: {
    protein: number;
    carbs: number;
    fat: number;
  };
  variant?: 'compact' | 'detailed';
}

export function MacroSummary({ totals, goals, variant = 'compact' }: MacroSummaryProps) {
  const { colors } = useTheme();

  const macros = [
    {
      label: 'Protein',
      short: 'P',
      value: totals.protein,
      goal: goals.protein,
      color: colors.protein,
    },
    {
      label: 'Carbs',
      short: 'C',
      value: totals.carbs,
      goal: goals.carbs,
      color: colors.carbs,
    },
    {
      label: 'Fat',
      short: 'F',
      value: totals.fat,
      goal: goals.fat,
      color: colors.fat,
    },
  ];

  if (variant === 'detailed') {
    return (
      <View style={[styles.detailedContainer, { backgroundColor: colors.bgSecondary }]}>
        {macros.map((macro, index) => {
          const percentage = Math.min((macro.value / macro.goal) * 100, 100);
          return (
            <View key={macro.label} style={styles.detailedItem}>
              <View style={styles.detailedHeader}>
                <View style={styles.labelRow}>
                  <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                    {macro.label}
                  </Text>
                </View>
                <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
                  {Math.round(macro.value)}g / {macro.goal}g
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.ringTrack }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: macro.color, width: `${percentage}%` },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.compactContainer, { backgroundColor: colors.bgSecondary }]}>
      {macros.map((macro) => (
        <View key={macro.label} style={styles.compactItem}>
          <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
          <Text style={[styles.compactLabel, { color: colors.textSecondary }]}>
            {macro.short}
          </Text>
          <Text style={[styles.compactValue, { color: colors.textPrimary }]}>
            {Math.round(macro.value)}g
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Compact variant styles
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  compactLabel: {
    ...typography.caption,
  },
  compactValue: {
    ...typography.body.medium,
    fontWeight: '600',
  },

  // Detailed variant styles
  detailedContainer: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  detailedItem: {
    gap: spacing[2],
  },
  detailedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  macroLabel: {
    ...typography.caption,
  },
  macroValue: {
    ...typography.body.small,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Shared
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
