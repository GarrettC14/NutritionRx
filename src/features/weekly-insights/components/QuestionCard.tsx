/**
 * Question Card
 * Individual question card with 4 states: unselected, loading, generated, LLM unavailable
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type { ScoredQuestion, WeeklyInsightResponse } from '../types/weeklyInsights.types';
import { generatePreview } from '../constants/headlineTemplates';

interface QuestionCardProps {
  question: ScoredQuestion;
  onPress: () => void;
  isExpanded: boolean;
  response: WeeklyInsightResponse | null;
  isGenerating: boolean;
}

export function QuestionCard({
  question,
  onPress,
  isExpanded,
  response,
  isGenerating,
}: QuestionCardProps) {
  const { colors } = useTheme();
  const preview = generatePreview(question.questionId, question.analysisResult);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: colors.bgElevated,
          borderColor: isExpanded ? colors.accent : colors.borderDefault,
          borderWidth: isExpanded ? 1.5 : 1,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name={question.definition.icon as any} size={18} color={colors.textSecondary} />
        <Text style={[styles.questionText, { color: colors.textPrimary }]} numberOfLines={2}>
          {question.definition.displayText}
        </Text>
      </View>

      {/* Preview / Response */}
      {isGenerating ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Analyzing...
          </Text>
        </View>
      ) : response && isExpanded ? (
        <View style={styles.responseContainer}>
          <Text style={[styles.responseText, { color: colors.textSecondary }]}>
            {response.text}
          </Text>
          {response.source === 'template' && (
            <Text style={[styles.sourceBadge, { color: colors.textTertiary }]}>
              AI narrative unavailable
            </Text>
          )}
        </View>
      ) : (
        <Text
          style={[styles.previewText, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {preview}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  iconWrapper: {
    width: 18,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 28,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 28,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: 13,
  },
  responseContainer: {
    marginLeft: 28,
    paddingTop: 4,
  },
  responseText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sourceBadge: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
