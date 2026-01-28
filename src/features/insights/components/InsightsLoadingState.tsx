/**
 * InsightsLoadingState Component
 * Shown while insights are being generated
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface InsightsLoadingStateProps {
  source?: 'llm' | 'fallback';
}

export function InsightsLoadingState({ source = 'fallback' }: InsightsLoadingStateProps) {
  const { colors } = useTheme();

  const message = source === 'llm' ? 'AI is analyzing your nutrition...' : 'Generating insights...';

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  spinner: {
    marginBottom: spacing[3],
  },
  message: {
    ...typography.body.small,
  },
});
