/**
 * InsightCard Component
 * Displays a single AI-generated insight
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { getCategoryTitle } from '../services/InsightPromptBuilder';
import type { Insight } from '../types/insights.types';

interface InsightCardProps {
  insight: Insight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{insight.icon}</Text>
        <Text style={[styles.category, { color: colors.textSecondary }]}>
          {getCategoryTitle(insight.category)}
        </Text>
      </View>
      <Text style={[styles.text, { color: colors.textPrimary }]}>{insight.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});
