/**
 * InsightDetailDialog - Centered dialog for insight details
 * Shows data cards and AI narrative. Matches ConfirmDialog styling.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { spacing, borderRadius } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDailyInsightStore } from '../stores/dailyInsightStore';
import { questionAnalyzers } from '../services/daily/analyzers';
import { questionRegistry } from '../constants/dailyQuestionRegistry';
import type {
  DailyQuestionId,
  DailyInsightResponse,
  QuestionAnalysis,
  DataCardItem,
} from '../types/dailyInsights.types';

interface InsightDetailSheetProps {
  questionId: DailyQuestionId | null;
  visible: boolean;
  onClose: () => void;
}

interface DataCardProps {
  card: DataCardItem;
  colors: any;
}

function DataCard({ card, colors }: DataCardProps) {
  const hasBar = card.percent != null && card.percent > 0;
  const percentage = card.percent ?? 0;

  const statusColor =
    card.status === 'on_track' || card.status === 'ahead'
      ? colors.success
      : card.status === 'behind'
        ? colors.warning
        : colors.accent;

  const valueColor =
    card.status === 'on_track' || card.status === 'ahead'
      ? colors.success
      : card.status === 'behind'
        ? colors.warning
        : colors.textPrimary;

  return (
    <View style={[styles.dataCard, { borderColor: colors.borderDefault }]}>
      <View style={styles.dataCardHeader}>
        <Text style={[styles.dataCardLabel, { color: colors.textSecondary }]}>{card.label}</Text>
        <Text style={[styles.dataCardPercent, { color: valueColor }]}>
          {card.value}
        </Text>
      </View>
      {hasBar && (
        <View style={[styles.progressBar, { backgroundColor: colors.bgInteractive }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, percentage)}%`,
                backgroundColor: percentage >= 100 ? colors.success : statusColor,
              },
            ]}
          />
        </View>
      )}
      {card.subValue && (
        <Text style={[styles.dataCardDetail, { color: colors.textTertiary }]}>
          {card.subValue}
        </Text>
      )}
    </View>
  );
}

export function InsightDetailSheet({ questionId, visible, onClose }: InsightDetailSheetProps) {
  const { colors } = useTheme();
  const { cache, isGenerating, llmStatus } = useDailyInsightStore();
  const generateInsight = useDailyInsightStore((s) => s.generateInsight);

  const [response, setResponse] = useState<DailyInsightResponse | null>(null);
  const [analysis, setAnalysis] = useState<QuestionAnalysis | null>(null);

  const questionDef = questionId
    ? questionRegistry.find((q) => q.id === questionId)
    : null;

  // Compute analysis and fetch/generate insight when dialog opens
  useEffect(() => {
    if (!visible || !questionId || !cache?.data) {
      setAnalysis(null);
      setResponse(null);
      return;
    }

    const analyzer = questionAnalyzers[questionId];
    if (analyzer) {
      setAnalysis(analyzer(cache.data));
    }

    const cached = cache.responses[questionId];
    if (cached) {
      setResponse(cached);
    } else {
      generateInsight(questionId).then(setResponse);
    }
  }, [visible, questionId, cache?.data]);

  const handleRegenerate = useCallback(async () => {
    if (!questionId) return;

    const state = useDailyInsightStore.getState();
    if (state.cache?.responses[questionId]) {
      const { [questionId]: _, ...rest } = state.cache.responses;
      useDailyInsightStore.setState({
        cache: { ...state.cache, responses: rest },
      });
    }

    const result = await generateInsight(questionId);
    setResponse(result);
  }, [questionId, generateInsight]);

  if (!questionDef) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayPress} onPress={onClose}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgElevated,
                shadowColor: colors.textPrimary,
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name={questionDef.icon as any} size={40} color={colors.accent} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {questionDef.text}
              </Text>

              {/* Scrollable content */}
              <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Data cards */}
                {analysis && analysis.dataCards.length > 0 && (
                  <View style={styles.dataCardsContainer}>
                    {analysis.dataCards.map((card, index) => (
                      <DataCard key={index} card={card} colors={colors} />
                    ))}
                  </View>
                )}

                {/* AI Narrative */}
                <View
                  style={[
                    styles.narrativeContainer,
                    { backgroundColor: colors.bgInteractive, borderColor: colors.borderDefault },
                  ]}
                >
                  {isGenerating ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.accent} />
                      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Generating insight...
                      </Text>
                    </View>
                  ) : response ? (
                    <>
                      <View style={styles.narrativeRow}>
                        <Ionicons name={response.icon as any} size={18} color={colors.accent} />
                        <Text style={[styles.narrative, { color: colors.textPrimary }]}>
                          {response.narrative}
                        </Text>
                      </View>
                      {response.source === 'fallback' && llmStatus !== 'ready' && (
                        <Text style={[styles.fallbackLabel, { color: colors.textTertiary }]}>
                          Template insight — download AI model for personalized narration
                        </Text>
                      )}
                    </>
                  ) : analysis ? (
                    <Text style={[styles.narrative, { color: colors.textPrimary }]}>
                      {analysis.fallbackText}
                    </Text>
                  ) : null}
                </View>
              </ScrollView>

              {/* Okay button */}
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.accent }]}
                  onPress={onClose}
                >
                  <Text style={styles.actionText}>Okay</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayPress: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 380,
    maxHeight: '80%',
    borderRadius: borderRadius.xl,
    padding: spacing[6],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  title: {
    ...typography.title.medium,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollContentContainer: {
    gap: spacing[3],
  },
  dataCardsContainer: {
    gap: spacing[1],
  },
  dataCard: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dataCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  dataCardLabel: {
    ...typography.body.small,
    fontWeight: '600',
  },
  dataCardPercent: {
    ...typography.body.small,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  dataCardDetail: {
    ...typography.caption,
    marginTop: spacing[1],
  },
  narrativeContainer: {
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  narrativeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  narrative: {
    ...typography.body.medium,
    lineHeight: 22,
    flex: 1,
  },
  fallbackLabel: {
    ...typography.caption,
    marginTop: spacing[2],
    fontStyle: 'italic',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  loadingText: {
    ...typography.body.small,
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[5],
  },
  actionButton: {
    minWidth: 140,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
  },
  actionText: {
    ...typography.body.medium,
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
  },
});
