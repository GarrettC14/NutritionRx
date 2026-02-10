/**
 * Question Card
 * Redesigned card with collapsed state + 4 expanded sub-states:
 * 1. Insufficient data — data gates fail
 * 2. Loading (shimmer) — LLM generating
 * 3. Error with retry — generation failed
 * 4. Success — response ready with metrics, sentiment, follow-ups
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, Layout, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type {
  ScoredQuestion,
  WeeklyInsightResponse,
  InsightSentiment,
} from '../types/weeklyInsights.types';
import { InsightShimmer } from './InsightShimmer';
import { WEEKLY_CATEGORY_COLORS } from '../constants/categoryColors';

const SENTIMENT_BORDER_COLORS: Record<InsightSentiment, string> = {
  positive: '#66BB6A',
  neutral: '#9E9E9E',
  negative: '#FFA726',
};

const SENTIMENT_ICONS: Record<InsightSentiment, { name: string; color: string; label: string }> = {
  positive: { name: 'checkmark-circle-outline', color: '#7C9A82', label: 'Positive trend' },
  neutral: { name: 'remove-circle-outline', color: '#C4A95A', label: 'Mixed results' },
  negative: { name: 'arrow-down-circle-outline', color: '#C67D5B', label: 'Needs attention' },
};

type ExpandedState = 'insufficient_data' | 'loading' | 'error' | 'success';

interface QuestionCardProps {
  question: ScoredQuestion;
  onPress: () => void;
  isExpanded: boolean;
  response: WeeklyInsightResponse | null;
  isGenerating: boolean;
  questionError: string | null;
  insufficientData: boolean;
  daysNeeded: number;
  onRetry: () => void;
}

export function QuestionCard({
  question,
  onPress,
  isExpanded,
  response,
  isGenerating,
  questionError,
  insufficientData,
  daysNeeded,
  onRetry,
}: QuestionCardProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const catColor = WEEKLY_CATEGORY_COLORS[question.definition.category] || '#999999';

  // Determine expanded sub-state
  const getExpandedState = (): ExpandedState => {
    if (insufficientData) return 'insufficient_data';
    if (isGenerating) return 'loading';
    if (questionError) return 'error';
    return 'success';
  };

  const expandedState = isExpanded ? getExpandedState() : null;

  // Left border color for expanded states
  const getLeftBorderColor = (): string => {
    if (!isExpanded) return 'transparent';
    switch (expandedState) {
      case 'insufficient_data':
        return '#FFA726'; // orange
      case 'loading':
        return colors.accent;
      case 'error':
        return '#EF5350'; // red
      case 'success':
        return response?.sentiment
          ? SENTIMENT_BORDER_COLORS[response.sentiment]
          : colors.accent;
      default:
        return 'transparent';
    }
  };

  return (
    <Animated.View layout={reducedMotion ? undefined : Layout.duration(200)} style={{ marginBottom: isExpanded ? 14 : 10 }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          styles.container,
          {
            backgroundColor: colors.bgElevated,
            borderColor: isExpanded ? getLeftBorderColor() + '30' : colors.borderDefault,
            borderWidth: 1,
            borderLeftWidth: isExpanded ? 3 : 1,
            borderLeftColor: getLeftBorderColor(),
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${question.definition.displayText}, ${isExpanded ? 'collapse' : 'expand'}`}
      >
        {/* Collapsed Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: catColor + '18' }]}>
            <Ionicons name={question.definition.icon as any} size={16} color={catColor} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.questionText, { color: colors.textPrimary }]} numberOfLines={2}>
              {question.definition.displayText}
            </Text>
            {!isExpanded && (
              <Text
                style={[styles.shortDescription, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {question.definition.shortDescription}
              </Text>
            )}
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textTertiary}
          />
        </View>

        {/* Sentiment icon (shown when expanded with a response) */}
        {isExpanded && expandedState === 'success' && response?.sentiment && (
          <View style={styles.sentimentRow}>
            <Ionicons
              name={SENTIMENT_ICONS[response.sentiment].name as any}
              size={14}
              color={SENTIMENT_ICONS[response.sentiment].color}
              accessibilityLabel={SENTIMENT_ICONS[response.sentiment].label}
            />
            <Text style={[styles.sentimentLabel, { color: SENTIMENT_ICONS[response.sentiment].color }]}>
              {SENTIMENT_ICONS[response.sentiment].label}
            </Text>
          </View>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(200)} style={styles.expandedContent}>
            {expandedState === 'insufficient_data' && (
              <InsufficientDataState daysNeeded={daysNeeded} colors={colors} />
            )}
            {expandedState === 'loading' && <InsightShimmer />}
            {expandedState === 'error' && (
              <ErrorState error={questionError!} onRetry={onRetry} colors={colors} />
            )}
            {expandedState === 'success' && response && (
              <SuccessState response={response} colors={colors} />
            )}
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

// ── Sub-state components ──

function InsufficientDataState({
  daysNeeded,
  colors,
}: {
  daysNeeded: number;
  colors: any;
}) {
  const message =
    daysNeeded > 0
      ? `Log ${daysNeeded} more day${daysNeeded !== 1 ? 's' : ''} to see this insight`
      : 'This insight compares weeks — check back after your second week of logging';

  return (
    <View style={styles.stateContainer}>
      <View style={styles.stateRow}>
        <Ionicons name="time-outline" size={18} color="#C4A95A" />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          {message}
        </Text>
      </View>
    </View>
  );
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

function ErrorState({
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
    <View style={styles.stateContainer}>
      <View style={styles.stateRow}>
        <Ionicons name={errorInfo.icon as any} size={18} color="#C67D5B" />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
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

function SuccessState({
  response,
  colors,
}: {
  response: WeeklyInsightResponse;
  colors: any;
}) {
  return (
    <View style={styles.stateContainer}>
      {/* Key metrics */}
      {response.keyMetrics.length > 0 && (
        <View style={styles.metricsRow}>
          {response.keyMetrics.map((metric, i) => (
            <View
              key={i}
              style={[styles.metricPill, { backgroundColor: colors.accent + '12' }]}
            >
              <Text style={[styles.metricLabel, { color: colors.textTertiary }]} numberOfLines={1}>
                {metric.label}
              </Text>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {metric.value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Response text */}
      <Text style={[styles.responseText, { color: colors.textSecondary }]}>
        {response.text}
      </Text>

      {/* Source badge */}
      <Text style={[styles.sourceBadge, { color: colors.textTertiary }]}>
        {response.source === 'llm' ? 'AI' : 'Template'}
      </Text>
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
  headerTextContainer: {
    flex: 1,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  shortDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  sentimentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginLeft: 38,
  },
  sentimentLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 12,
    marginLeft: 38,
    paddingBottom: 4,
  },
  accentLine: {
    height: 2,
    borderRadius: 1,
    marginTop: 10,
    marginLeft: 38,
  },
  stateContainer: {
    gap: 8,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stateText: {
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
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  metricPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    maxWidth: '45%',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
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
