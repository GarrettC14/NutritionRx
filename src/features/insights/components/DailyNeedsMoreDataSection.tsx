/**
 * Daily Needs More Data Section
 * Shows unavailable questions below a "Needs more data" divider
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type { ScoredQuestion } from '../types/dailyInsights.types';
import { DAILY_CATEGORY_COLORS } from '../constants/dailyCategoryColors';

interface DailyNeedsMoreDataSectionProps {
  questions: ScoredQuestion[];
}

export function DailyNeedsMoreDataSection({ questions }: DailyNeedsMoreDataSectionProps) {
  const { colors } = useTheme();

  if (questions.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
        Needs more data
      </Text>

      {questions.map((question) => {
        const catColor = DAILY_CATEGORY_COLORS[question.definition.category] || '#999';

        return (
          <View key={question.definition.id} style={styles.item}>
            <View style={[styles.iconContainer, { backgroundColor: catColor + '15' }]}>
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
                {question.definition.text}
              </Text>
              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                Log more meals to see this insight
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
