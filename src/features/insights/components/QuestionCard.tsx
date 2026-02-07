/**
 * QuestionCard - Individual question card
 * Displays a tappable question with emoji, text, and response indicator.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { spacing, borderRadius } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { getDailyCategoryColor } from '../services/InsightPromptBuilder';
import type { DailyQuestionDefinition } from '../types/dailyInsights.types';

interface QuestionCardProps {
  question: DailyQuestionDefinition;
  onPress: () => void;
  hasResponse?: boolean;
}

export function QuestionCard({ question, onPress, hasResponse = false }: QuestionCardProps) {
  const { colors } = useTheme();
  const catColor = getDailyCategoryColor(question.category);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={question.text}
    >
      <View style={[styles.iconContainer, { backgroundColor: catColor + '18' }]}>
        <Ionicons name={question.icon as any} size={18} color={catColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={2}>
          {question.text}
        </Text>
      </View>
      <View style={styles.trailing}>
        {hasResponse && (
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  text: {
    ...typography.body.medium,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
