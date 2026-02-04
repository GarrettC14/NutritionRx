/**
 * SuggestedQuestions - Top 3 suggested questions
 * Displays the highest-relevance questions for today.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { QuestionCard } from './QuestionCard';
import type { ScoredQuestion, DailyQuestionId } from '../types/dailyInsights.types';

interface SuggestedQuestionsProps {
  questions: ScoredQuestion[];
  onQuestionPress: (questionId: DailyQuestionId) => void;
  responses?: Record<string, any>;
}

export function SuggestedQuestions({
  questions,
  onQuestionPress,
  responses = {},
}: SuggestedQuestionsProps) {
  const { colors } = useTheme();

  if (questions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Suggested For You
      </Text>
      <View style={styles.list}>
        {questions.map((scored) => (
          <QuestionCard
            key={scored.definition.id}
            question={scored.definition}
            onPress={() => onQuestionPress(scored.definition.id)}
            hasResponse={!!responses[scored.definition.id]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    gap: spacing[2],
  },
});
