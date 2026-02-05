/**
 * InsightCard Component
 * Displays a single AI-generated insight
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { getCategoryTitle, getCategoryColor, getCategoryIcon } from '../services/InsightPromptBuilder';
import type { Insight } from '../types/insights.types';

// Cached insights may still have old emoji icons — fall back to category-based Ionicon
function resolveIcon(insight: Insight): string {
  return insight.icon?.includes('-') ? insight.icon : getCategoryIcon(insight.category);
}

interface InsightCardProps {
  insight: Insight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const { colors } = useTheme();
  const catColor = getCategoryColor(insight.category);
  const iconName = resolveIcon(insight);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: catColor + '18' }]}>
          <Ionicons name={iconName as any} size={16} color={catColor} />
        </View>
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
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
