/**
 * Daily Question Card
 * Inline expand/collapse card modeled on weekly QuestionCard.
 * Collapsed: category icon + question text + chevron
 * Expanded: data card pills + narrative (shimmer/error/response)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, Layout, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { InsightShimmer } from '@/features/weekly-insights/components/InsightShimmer';
import { DAILY_CATEGORY_COLORS } from '../constants/dailyCategoryColors';
import type {
  ScoredQuestion,
  QuestionAnalysis,
  DailyInsightResponse,
  DataCardItem,
} from '../types/dailyInsights.types';

interface DailyQuestionCardProps {
  question: ScoredQuestion;
  onPress: () => void;
  isExpanded: boolean;
  analysis: QuestionAnalysis | null;
  response: DailyInsightResponse | null;
  isGenerating: boolean;
  generationError: string | null;
  onRetry: () => void;
}

function getErrorInfo(error: string): { message: string; icon: string; showRetry: boolean } {
  const lower = error.toLowerCase();
  if (lower.includes('network') || lower.includes('connect') || lower.includes('fetch')) {
    return { message: "Couldn't connect. Check your connection and try again.", icon: 'wifi-outline', showRetry: true };
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return { message: 'This is taking longer than expected. Try again?', icon: 'time-outline', showRetry: true };
  }
  if (lower.includes('model') || lower.includes('unavailable') || lower.includes('unsupported')) {
    return { message: "The AI model isn't available right now. You'll see template-based insights instead.", icon: 'cloud-offline-outline', showRetry: false };
  }
  return { message: 'Something went wrong. Try again, or your insights will refresh automatically.', icon: 'alert-circle-outline', showRetry: true };
}

function getStatusColor(status: DataCardItem['status'], accentColor: string): string {
  switch (status) {
    case 'on_track':
    case 'ahead':
      return '#66BB6A';
    case 'behind':
      return '#FFA726';
    default:
      return accentColor;
  }
}

export function DailyQuestionCard({
  question,
  onPress,
  isExpanded,
  analysis,
  response,
  isGenerating,
  generationError,
  onRetry,
}: DailyQuestionCardProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const catColor = DAILY_CATEGORY_COLORS[question.definition.category] || '#999999';

  return (
    <Animated.View layout={reducedMotion ? undefined : Layout.duration(200)} style={{ marginBottom: isExpanded ? 14 : 10 }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          styles.container,
          {
            backgroundColor: colors.bgElevated,
            borderColor: isExpanded ? colors.accent + '30' : colors.borderDefault,
            borderWidth: 1,
            borderLeftWidth: isExpanded ? 3 : 1,
            borderLeftColor: isExpanded ? colors.accent : colors.borderDefault,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${question.definition.text}, ${isExpanded ? 'collapse' : 'expand'}`}
      >
        {/* Collapsed Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: catColor + '18' }]}>
            <Ionicons name={question.definition.icon as any} size={16} color={catColor} />
          </View>
          <Text style={[styles.questionText, { color: colors.textPrimary }]} numberOfLines={2}>
            {question.definition.text}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textTertiary}
          />
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(200)} style={styles.expandedContent}>
            {/* Data card pills */}
            {analysis && analysis.dataCards.length > 0 && (
              <View style={styles.pillsRow}>
                {analysis.dataCards.map((card, i) => {
                  const pillColor = getStatusColor(card.status, colors.accent);
                  return (
                    <View
                      key={i}
                      style={[styles.pill, { backgroundColor: pillColor + '15' }]}
                    >
                      <Text style={[styles.pillLabel, { color: pillColor }]} numberOfLines={1}>
                        {card.label}
                      </Text>
                      <Text style={[styles.pillValue, { color: colors.textPrimary }]} numberOfLines={1}>
                        {card.value}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Narrative area */}
            {isGenerating && !response ? (
              <InsightShimmer />
            ) : generationError && !response ? (
              <ErrorContent error={generationError} onRetry={onRetry} colors={colors} />
            ) : response ? (
              <View style={styles.narrativeContainer}>
                <Text style={[styles.narrativeText, { color: colors.textSecondary }]}>
                  {response.narrative}
                </Text>
                <Text style={[styles.sourceBadge, { color: colors.textTertiary }]}>
                  {response.source === 'llm' ? 'AI' : 'Template'}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        )}

        {/* Bottom accent line (collapsed only) */}
        {!isExpanded && (
          <View style={[styles.accentLine, { backgroundColor: catColor + '30' }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function ErrorContent({
  error,
  onRetry,
  colors,
}: {
  error: string;
  onRetry: () => void;
  colors: any;
}) {
  const errorInfo = getErrorInfo(error);

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorRow}>
        <Ionicons name={errorInfo.icon as any} size={18} color="#C67D5B" />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {errorInfo.message}
        </Text>
      </View>
      {errorInfo.showRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry generating insight">
          <Ionicons name="refresh-outline" size={14} color={colors.accent} />
          <Text style={[styles.retryText, { color: colors.accent }]}>Tap to retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
  },
  expandedContent: {
    marginTop: 12,
    marginLeft: 38,
    paddingBottom: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    maxWidth: '45%',
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  narrativeContainer: {
    gap: 6,
  },
  narrativeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sourceBadge: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  accentLine: {
    height: 2,
    borderRadius: 1,
    marginTop: 10,
    marginLeft: 38,
  },
  errorContainer: {
    gap: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
