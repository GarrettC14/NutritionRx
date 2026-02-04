/**
 * Needs More Data Section
 * Shows questions that can't be answered yet due to insufficient data
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type { ScoredQuestion } from '../types/weeklyInsights.types';

interface NeedsMoreDataSectionProps {
  questions: ScoredQuestion[];
  currentLoggedDays: number;
}

export function NeedsMoreDataSection({ questions, currentLoggedDays }: NeedsMoreDataSectionProps) {
  const { colors } = useTheme();

  if (questions.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
        Needs more data
      </Text>

      {questions.map((question) => {
        const daysNeeded = question.definition.minimumLoggedDays - currentLoggedDays;
        const helperText =
          daysNeeded > 0
            ? `Log ${daysNeeded} more day${daysNeeded !== 1 ? 's' : ''}`
            : question.definition.requiresPriorWeek
              ? 'Needs prior week data'
              : 'More data needed';

        return (
          <View key={question.questionId} style={styles.item}>
            <View style={[styles.iconContainer, { backgroundColor: colors.textTertiary + '15' }]}>
              <Ionicons
                name={question.definition.icon as any}
                size={14}
                color={colors.textTertiary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[styles.questionText, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {question.definition.displayText}
              </Text>
              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                {helperText}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  questionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  helperText: {
    fontSize: 11,
    marginTop: 2,
  },
});
