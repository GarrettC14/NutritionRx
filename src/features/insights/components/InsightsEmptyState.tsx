/**
 * InsightsEmptyState Component
 * Shown when there's no data for insights
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface InsightsEmptyStateProps {
  title: string;
  message: string;
}

export function InsightsEmptyState({ title, message }: InsightsEmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📊</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: spacing[3],
  },
  title: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  message: {
    ...typography.body.small,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing[2],
  },
});
