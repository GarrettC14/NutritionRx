/**
 * Question Response Card
 * Displays AI narrative response with metadata
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { WeeklyInsightResponse } from '../types/weeklyInsights.types';

interface QuestionResponseCardProps {
  response: WeeklyInsightResponse;
}

export function QuestionResponseCard({ response }: QuestionResponseCardProps) {
  const { colors } = useTheme();

  const timeAgo = getTimeAgo(response.generatedAt);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{response.icon}</Text>
        <View style={styles.meta}>
          <Text style={[styles.sourceLabel, { color: colors.textTertiary }]}>
            {response.source === 'llm' ? 'AI Insight' : 'Summary'}
          </Text>
          <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
            {timeAgo}
          </Text>
        </View>
      </View>

      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {response.text}
      </Text>
    </View>
  );
}

function getTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  icon: {
    fontSize: 16,
  },
  meta: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
