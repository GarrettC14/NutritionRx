/**
 * DailyInsightsScreen
 * Full screen with inline expand/collapse questions, category chips,
 * headline card, and pull-to-refresh.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useLLMStatus } from '@/hooks/useLLMStatus';
import { spacing, borderRadius } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDailyInsightData } from '../hooks/useDailyInsightData';
import { useDailyInsightStore } from '../stores/dailyInsightStore';
import { questionAnalyzers } from '../services/daily/analyzers';
import { DailyHeadlineCard } from '../components/DailyHeadlineCard';
import { DailyCategoryChips } from '../components/DailyCategoryChips';
import { DailyQuestionCard } from '../components/DailyQuestionCard';
import { DailyNeedsMoreDataSection } from '../components/DailyNeedsMoreDataSection';
import type {
  DailyQuestionId,
  DailyQuestionCategory,
  DailyInsightResponse,
  QuestionAnalysis,
  ScoredQuestion,
} from '../types/dailyInsights.types';

export function DailyInsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { data, headline, isLoaded } = useDailyInsightData();
  const { cache } = useDailyInsightStore();
  const refreshData = useDailyInsightStore((s) => s.refreshData);
  const generateInsight = useDailyInsightStore((s) => s.generateInsight);
  const { status: llmStatus, isDownloading, downloadProgress, startDownload } = useLLMStatus();

  // Local state
  const [selectedQuestionId, setSelectedQuestionId] = useState<DailyQuestionId | null>(null);
  const [responses, setResponses] = useState<Record<string, DailyInsightResponse>>({});
  const [analyses, setAnalyses] = useState<Record<string, QuestionAnalysis>>({});
  const [generatingId, setGeneratingId] = useState<DailyQuestionId | null>(null);
  const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<DailyQuestionCategory | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Refs for scroll-to-target behavior
  const scrollViewRef = useRef<ScrollView>(null);
  const questionCardRefs = useRef<Record<string, View | null>>({});

  // Computed values
  const availableQuestions = useMemo(
    () =>
      (cache?.scores ?? [])
        .filter((q) => q.available)
        .sort((a, b) => b.relevanceScore - a.relevanceScore),
    [cache?.scores],
  );

  const unavailableQuestions = useMemo(
    () => (cache?.scores ?? []).filter((q) => !q.available),
    [cache?.scores],
  );

  const activeCategories = useMemo(() => {
    const cats = new Set<DailyQuestionCategory>();
    for (const q of availableQuestions) {
      cats.add(q.definition.category);
    }
    return Array.from(cats);
  }, [availableQuestions]);

  const filteredQuestions = useMemo(() => {
    if (!selectedCategory) return availableQuestions;
    return availableQuestions.filter((q) => q.definition.category === selectedCategory);
  }, [availableQuestions, selectedCategory]);

  const headlineQuestion = availableQuestions[0] ?? null;

  // Get response for a question — check local cache, then store cache
  const getResponse = useCallback(
    (qId: DailyQuestionId): DailyInsightResponse | null => {
      return responses[qId] ?? cache?.responses[qId] ?? null;
    },
    [responses, cache?.responses],
  );

  // Handlers
  const handleQuestionPress = useCallback(
    (question: ScoredQuestion) => {
      const qId = question.definition.id;

      if (selectedQuestionId === qId) {
        // Toggle collapse
        setSelectedQuestionId(null);
        return;
      }

      // Expand this card
      setSelectedQuestionId(qId);

      // Run analyzer synchronously for data cards
      if (!analyses[qId] && cache?.data) {
        const analyzer = questionAnalyzers[qId];
        if (analyzer) {
          const analysis = analyzer(cache.data);
          setAnalyses((prev) => ({ ...prev, [qId]: analysis }));
        }
      }

      // Check for cached response
      const cachedResponse = responses[qId] ?? cache?.responses[qId];
      if (cachedResponse) return;

      // Generate insight
      setGeneratingId(qId);
      setGenerationErrors((prev) => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });

      generateInsight(qId)
        .then((result) => {
          setResponses((prev) => ({ ...prev, [qId]: result }));
          setGeneratingId((current) => (current === qId ? null : current));
        })
        .catch((err) => {
          const errMsg = err instanceof Error ? err.message : 'Generation failed';
          setGenerationErrors((prev) => ({ ...prev, [qId]: errMsg }));
          setGeneratingId((current) => (current === qId ? null : current));
        });
    },
    [selectedQuestionId, analyses, cache?.data, cache?.responses, responses, generateInsight],
  );

  const handleRetry = useCallback(
    (question: ScoredQuestion) => {
      const qId = question.definition.id;
      setGenerationErrors((prev) => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
      setGeneratingId(qId);

      generateInsight(qId)
        .then((result) => {
          setResponses((prev) => ({ ...prev, [qId]: result }));
          setGeneratingId((current) => (current === qId ? null : current));
        })
        .catch((err) => {
          const errMsg = err instanceof Error ? err.message : 'Generation failed';
          setGenerationErrors((prev) => ({ ...prev, [qId]: errMsg }));
          setGeneratingId((current) => (current === qId ? null : current));
        });
    },
    [generateInsight],
  );

  const scrollToQuestion = useCallback((questionId: string) => {
    setTimeout(() => {
      const ref = questionCardRefs.current[questionId];
      if (ref && scrollViewRef.current) {
        ref.measureLayout(
          scrollViewRef.current.getInnerViewNode(),
          (_x: number, y: number) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {},
        );
      }
    }, 150);
  }, []);

  const handleHeadlinePress = useCallback(() => {
    if (headlineQuestion) {
      handleQuestionPress(headlineQuestion);
      scrollToQuestion(headlineQuestion.definition.id);
    }
  }, [headlineQuestion, handleQuestionPress, scrollToQuestion]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Clear local state
    setSelectedQuestionId(null);
    setResponses({});
    setAnalyses({});
    setGeneratingId(null);
    setGenerationErrors({});
    setSelectedCategory(null);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleDownloadModel = useCallback(async () => {
    await startDownload();
  }, [startDownload]);

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Today's Insights
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {!isLoaded ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : !data || data.todayMealCount === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No meals logged yet
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Log your first meal to unlock today's insights.
            </Text>
          </View>
        ) : (
          <>
            {/* Headline card */}
            <View style={{ marginBottom: 16 }}>
              <DailyHeadlineCard headline={headline} onPress={handleHeadlinePress} />
            </View>

            {/* Category chips */}
            {activeCategories.length > 1 && (
              <DailyCategoryChips
                categories={activeCategories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            )}

            {/* Questions section */}
            <View style={styles.questionsSection}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Questions for today
              </Text>

              {filteredQuestions.map((question) => {
                const qId = question.definition.id;
                return (
                  <View
                    key={qId}
                    ref={(ref) => { questionCardRefs.current[qId] = ref; }}
                  >
                    <DailyQuestionCard
                      question={question}
                      onPress={() => handleQuestionPress(question)}
                      isExpanded={selectedQuestionId === qId}
                      analysis={analyses[qId] ?? null}
                      response={getResponse(qId)}
                      isGenerating={generatingId === qId}
                      generationError={generationErrors[qId] ?? null}
                      onRetry={() => handleRetry(question)}
                    />
                  </View>
                );
              })}
            </View>

            {/* LLM status banner */}
            {llmStatus !== 'ready' && llmStatus !== 'unsupported' && (
              <View
                style={[
                  styles.llmBanner,
                  { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault },
                ]}
              >
                {isDownloading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={[styles.llmBannerText, { color: colors.textSecondary }]}>
                      Downloading AI model... {downloadProgress}%
                    </Text>
                    <View style={[styles.downloadBar, { backgroundColor: colors.bgInteractive }]}>
                      <View
                        style={[
                          styles.downloadFill,
                          { width: `${downloadProgress}%`, backgroundColor: colors.accent },
                        ]}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color={colors.premiumGold} />
                    <View style={styles.llmBannerTextContainer}>
                      <Text style={[styles.llmBannerText, { color: colors.textPrimary }]}>
                        Download AI model for personalized narration
                      </Text>
                      <Text style={[styles.llmBannerSubtext, { color: colors.textTertiary }]}>
                        Questions work without AI — download enhances responses
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.downloadButton, { backgroundColor: colors.accent }]}
                      onPress={handleDownloadModel}
                      accessibilityRole="button"
                      accessibilityLabel="Download AI model"
                    >
                      <Text style={styles.downloadButtonText}>Download</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Needs more data section */}
            <DailyNeedsMoreDataSection questions={unavailableQuestions} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[3],
    },
    headerTitle: {
      ...typography.title.small,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 80,
      gap: spacing[3],
    },
    emptyTitle: {
      ...typography.title.medium,
      fontWeight: '600',
    },
    emptyMessage: {
      ...typography.body.medium,
      textAlign: 'center',
      maxWidth: 260,
    },
    questionsSection: {
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    llmBanner: {
      padding: spacing[4],
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      gap: spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 16,
    },
    llmBannerTextContainer: {
      flex: 1,
      gap: 2,
    },
    llmBannerText: {
      ...typography.body.small,
    },
    llmBannerSubtext: {
      ...typography.caption,
    },
    downloadButton: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      borderRadius: borderRadius.md,
    },
    downloadButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
    downloadBar: {
      width: '100%',
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    downloadFill: {
      height: '100%',
      borderRadius: 2,
    },
  });
