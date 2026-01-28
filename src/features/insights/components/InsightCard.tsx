/**
 * InsightCard Component
 * Displays a single insight with icon and text
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import type { Insight } from '../types/insights.types';
import { getCategoryIcon, getCategoryTitle } from '../services/InsightPromptBuilder';

interface InsightCardProps {
  insight: Insight;
  index?: number;
}

export function InsightCard({ insight, index = 0 }: InsightCardProps) {
  const { colors } = useTheme();

  const icon = insight.icon || getCategoryIcon(insight.category);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.textPrimary }]}>{insight.text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: spacing[3],
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    marginTop: 2,
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  text: {
    ...typography.body.medium,
    lineHeight: 22,
  },
});
