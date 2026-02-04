/**
 * InsightDetailSheet - Bottom sheet for insight details
 * Shows data cards, AI narrative, and regenerate action.
 * Uses Modal since @gorhom/bottom-sheet is not installed.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Animated,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

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
  const percentage = card.target > 0 ? Math.min(100, (card.current / card.target) * 100) : 0;

  return (
    <View style={[styles.dataCard, { borderColor: colors.borderDefault }]}>
      <View style={styles.dataCardHeader}>
        <Text style={[styles.dataCardLabel, { color: colors.textSecondary }]}>{card.label}</Text>
        <Text style={[styles.dataCardPercent, { color: colors.textPrimary }]}>
          {Math.round(percentage)}%
        </Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: colors.bgInteractive }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(100, percentage)}%`,
              backgroundColor: percentage >= 100 ? colors.success : colors.accent,
            },
          ]}
        />
      </View>
      <Text style={[styles.dataCardDetail, { color: colors.textTertiary }]}>
        {card.currentFormatted} / {card.targetFormatted}
      </Text>
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

  // Swipe-to-dismiss
  const translateY = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture downward drags when scroll is at top
        return gestureState.dy > 10 && scrollOffset.current <= 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Dismiss
          Animated.timing(translateY, {
            toValue: SHEET_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            translateY.setValue(0);
          });
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  // Reset position when sheet opens
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      scrollOffset.current = 0;
    }
  }, [visible]);

  // Compute analysis and fetch/generate insight when sheet opens
  useEffect(() => {
    if (!visible || !questionId || !cache?.data) {
      setAnalysis(null);
      setResponse(null);
      return;
    }

    // Run analyzer for data cards
    const analyzer = questionAnalyzers[questionId];
    if (analyzer) {
      setAnalysis(analyzer(cache.data));
    }

    // Check for cached response
    const cached = cache.responses[questionId];
    if (cached) {
      setResponse(cached);
    } else {
      // Auto-generate
      generateInsight(questionId).then(setResponse);
    }
  }, [visible, questionId, cache?.data]);

  const handleRegenerate = useCallback(async () => {
    if (!questionId) return;

    // Clear cached response
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
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            { backgroundColor: colors.bgPrimary, borderColor: colors.borderDefault },
            { transform: [{ translateY }] },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              scrollOffset.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            {/* Question title */}
            <View style={styles.questionHeader}>
              <Text style={styles.questionEmoji}>{questionDef.emoji}</Text>
              <Text style={[styles.questionText, { color: colors.textPrimary }]}>
                {questionDef.text}
              </Text>
            </View>

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
                { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault },
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
                  <Text style={[styles.narrative, { color: colors.textPrimary }]}>
                    {response.emoji} {response.narrative}
                  </Text>
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

          {/* Action buttons */}
          <View style={[styles.actions, { borderColor: colors.borderDefault }]}>
            {llmStatus === 'ready' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.bgInteractive }]}
                onPress={handleRegenerate}
                disabled={isGenerating}
              >
                <Ionicons name="refresh" size={16} color={colors.accent} />
                <Text style={[styles.actionText, { color: colors.accent }]}>Regenerate</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.bgInteractive }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: spacing[4],
    gap: spacing[4],
  },
  questionHeader: {
    alignItems: 'center',
    gap: spacing[2],
  },
  questionEmoji: {
    fontSize: 32,
  },
  questionText: {
    ...typography.title.medium,
    textAlign: 'center',
    fontWeight: '600',
  },
  dataCardsContainer: {
    gap: spacing[2],
  },
  dataCard: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
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
    ...typography.metric.small,
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
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  narrative: {
    ...typography.body.medium,
    lineHeight: 22,
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
    paddingVertical: spacing[4],
  },
  loadingText: {
    ...typography.body.small,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
  },
  actionText: {
    ...typography.body.small,
    fontWeight: '600',
  },
});
