/**
 * Weekly Insights Screen
 * Full-screen composition: Header + WeekNav + Calendar + Stats + Headline + CategoryChips + Questions + NeedsMoreData
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { LLMService } from '@/features/insights/services/LLMService';
import { useWeeklyInsightsStore } from '../stores/weeklyInsightsStore';
import { useWeeklyData } from '../hooks/useWeeklyData';
import { useWeeklyQuestions } from '../hooks/useWeeklyQuestions';
import { useWeeklyInsightGeneration } from '../hooks/useWeeklyInsightGeneration';
import { MiniCalendar } from './MiniCalendar';
import { WeeklyStatsGrid } from './WeeklyStatsGrid';
import { WeekNavigation } from './WeekNavigation';
import { QuestionCard } from './QuestionCard';
import { HeadlineInsightCard } from './HeadlineInsightCard';
import { CategoryChips } from './CategoryChips';
import { NeedsMoreDataSection } from './NeedsMoreDataSection';
import { InsightToast } from './InsightToast';
import { ModelDownloadSheet } from '@/components/llm/ModelDownloadSheet';
import type { ScoredQuestion, WeeklyInsightResponse, WeeklyQuestionCategory } from '../types/weeklyInsights.types';

export function WeeklyInsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Store state
  const weekStart = useWeeklyInsightsStore((s) => s.getEffectiveWeekStart());
  const setSelectedWeek = useWeeklyInsightsStore((s) => s.setSelectedWeek);
  const selectedQuestionId = useWeeklyInsightsStore((s) => s.selectedQuestionId);
  const selectQuestion = useWeeklyInsightsStore((s) => s.selectQuestion);
  const getCachedResponse = useWeeklyInsightsStore((s) => s.getCachedResponse);
  const llmStatus = useWeeklyInsightsStore((s) => s.llmStatus);
  const setLLMStatus = useWeeklyInsightsStore((s) => s.setLLMStatus);
  const selectedCategory = useWeeklyInsightsStore((s) => s.selectedCategory);
  const setSelectedCategory = useWeeklyInsightsStore((s) => s.setSelectedCategory);
  const perQuestionErrors = useWeeklyInsightsStore((s) => s.perQuestionErrors);

  // Data hooks
  const { data, isLoading: isDataLoading, error: dataError, refresh } = useWeeklyData();
  const { questions, unavailableQuestions, headline } = useWeeklyQuestions(data);
  const { generateForQuestion, retryForQuestion, isGenerating } = useWeeklyInsightGeneration();

  /**
   * LOCAL vs STORE response state:
   *
   * - `responses` (local useState): Drives the current render cycle. Updated
   *   immediately when a generation completes for instant UI feedback.
   *   Cleared on week navigation and pull-to-refresh.
   *
   * - `cache.responses` (Zustand store): Persisted across app restarts via
   *   zustand/persist. Written alongside local state via setCachedResponse().
   *   NOT cleared on pull-to-refresh (by design — cache invalidation is
   *   time-based, not user-triggered).
   *
   * On mount, local state is hydrated from the store cache if available.
   * If modifying response handling, ensure both sources stay in sync.
   */
  const [responses, setResponses] = useState<Record<string, WeeklyInsightResponse>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [showDownloadSheet, setShowDownloadSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Refs for scroll-to-target behavior
  const scrollViewRef = useRef<ScrollView>(null);
  const questionCardRefs = useRef<Record<string, View | null>>({});

  // Check LLM status on mount
  useEffect(() => {
    const checkLLM = async () => {
      const status = await LLMService.getStatus();
      setLLMStatus(status);
    };
    checkLLM();
  }, [setLLMStatus]);

  // Derive active categories from available questions
  const activeCategories = useMemo(() => {
    const cats = new Set<WeeklyQuestionCategory>();
    questions.forEach((q) => cats.add(q.definition.category));
    return Array.from(cats);
  }, [questions]);

  // Filter questions by selected category, keeping pinned highlights always visible
  const filteredQuestions = useMemo(() => {
    if (!selectedCategory) return questions;
    return questions.filter(
      (q) => q.isPinned || q.definition.category === selectedCategory
    );
  }, [questions, selectedCategory]);

  // Find the headline question (first non-highlights or first question)
  const headlineQuestion = useMemo(
    () => questions.find((q) => q.definition.category !== 'highlights') ?? questions[0],
    [questions]
  );

  const handleNavigate = useCallback(
    (newWeekStart: string) => {
      setSelectedWeek(newWeekStart);
      selectQuestion(null);
      setResponses({});
      setSelectedCategory(null);
    },
    [setSelectedWeek, selectQuestion, setSelectedCategory]
  );

  const handleQuestionPress = useCallback(
    async (question: ScoredQuestion) => {
      const qId = question.questionId;

      // Toggle if already selected
      if (selectedQuestionId === qId) {
        selectQuestion(null);
        return;
      }

      selectQuestion(qId);

      // Don't generate if question doesn't have enough data
      if (!question.isAvailable) return;

      // Check for cached response
      const cached = getCachedResponse(qId);
      if (cached) {
        setResponses((prev) => ({ ...prev, [qId]: cached }));
        return;
      }

      // Generate new response
      setGeneratingId(qId);
      const response = await generateForQuestion(question);
      setResponses((prev) => ({ ...prev, [qId]: response }));
      setGeneratingId(null);
    },
    [selectedQuestionId, selectQuestion, getCachedResponse, generateForQuestion]
  );

  const handleRetry = useCallback(
    async (question: ScoredQuestion) => {
      setGeneratingId(question.questionId);
      const response = await retryForQuestion(question);
      setResponses((prev) => ({ ...prev, [question.questionId]: response }));
      setGeneratingId(null);
    },
    [retryForQuestion]
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
          () => {}
        );
      }
    }, 150);
  }, []);

  const handleHeadlinePress = useCallback(() => {
    if (headlineQuestion) {
      handleQuestionPress(headlineQuestion);
      scrollToQuestion(headlineQuestion.questionId);
    }
  }, [headlineQuestion, handleQuestionPress, scrollToQuestion]);

  const styles = createStyles(colors);

  // Loading state
  if (isDataLoading && !data) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading weekly data...
        </Text>
      </View>
    );
  }

  // Error state
  if (dataError && !data) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Weekly Insights
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyNavWrapper}>
          <WeekNavigation weekStart={weekStart} onNavigate={handleNavigate} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} style={styles.emptyIcon} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Couldn't load your insights
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            There was a problem reading your data. This usually resolves on its own.
          </Text>
          <TouchableOpacity
            onPress={refresh}
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Empty state
  if (!data || data.loggedDayCount < 2) {
    const daysLogged = data?.loggedDayCount ?? 0;
    const daysRemaining = 2 - daysLogged;
    const emptyMessage =
      daysLogged === 0
        ? 'Log your meals for 2 days this week to unlock your weekly insights.'
        : 'One more day of logging and your weekly insights will be ready!';

    return (
      <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Weekly Insights
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyNavWrapper}>
          <WeekNavigation weekStart={weekStart} onNavigate={handleNavigate} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} style={styles.emptyIcon} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {daysLogged === 0 ? 'Your week awaits' : 'Almost ready!'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {emptyMessage}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Weekly Insights
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              setResponses({});
              selectQuestion(null);
              const status = await LLMService.getStatus();
              setLLMStatus(status);
              await refresh();
              setRefreshing(false);
            }}
            tintColor="#7C9A82"
            colors={['#7C9A82']}
          />
        }
      >
        {/* Week Navigation */}
        <WeekNavigation weekStart={weekStart} onNavigate={handleNavigate} />

        {/* LLM Status Banner */}
        {llmStatus === 'not_downloaded' && (
          <TouchableOpacity
            onPress={() => setShowDownloadSheet(true)}
            activeOpacity={0.7}
            style={[styles.llmBanner, { backgroundColor: colors.premiumGoldSubtle, borderColor: colors.premiumGoldMuted }]}
            accessibilityRole="button"
            accessibilityLabel="Download AI model for personalized insights"
          >
            <Ionicons name="sparkles" size={16} color={colors.premiumGold} />
            <Text style={[styles.llmBannerText, { color: colors.textSecondary }]}>
              Download AI model for personalized narratives
            </Text>
            <View style={[styles.llmBannerButton, { backgroundColor: colors.premiumGold }]}>
              <Text style={styles.llmBannerButtonText}>Download</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Mini Calendar */}
        <View style={styles.section}>
          <MiniCalendar
            days={data.days}
            calorieTarget={data.calorieTarget}
            large
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <WeeklyStatsGrid data={data} />
        </View>

        {/* Headline Insight Card */}
        {headline && headlineQuestion && (
          <HeadlineInsightCard headline={headline} onPress={handleHeadlinePress} />
        )}

        {/* Category Chips */}
        {activeCategories.length > 1 && (
          <CategoryChips
            categories={activeCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}

        {/* Questions Section */}
        <View style={styles.questionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            Questions for your week
          </Text>

          {filteredQuestions.map((question) => {
            const qId = question.questionId;
            const insufficientData = !question.isAvailable;
            const daysNeeded = Math.max(
              0,
              question.definition.minimumLoggedDays - (data?.loggedDayCount ?? 0)
            );

            return (
              <View
                key={qId}
                ref={(ref) => { questionCardRefs.current[qId] = ref; }}
              >
                <QuestionCard
                  question={question}
                  onPress={() => handleQuestionPress(question)}
                  isExpanded={selectedQuestionId === qId}
                  response={responses[qId] ?? null}
                  isGenerating={generatingId === qId}
                  questionError={perQuestionErrors[qId] ?? null}
                  insufficientData={insufficientData}
                  daysNeeded={daysNeeded}
                  onRetry={() => handleRetry(question)}
                />
              </View>
            );
          })}
        </View>

        {/* Needs More Data Section */}
        <NeedsMoreDataSection
          questions={unavailableQuestions}
          currentLoggedDays={data?.loggedDayCount ?? 0}
        />
      </ScrollView>

      {/* Toast Overlay */}
      <InsightToast />

      {/* Model Download Sheet */}
      <ModelDownloadSheet
        visible={showDownloadSheet}
        onDismiss={() => setShowDownloadSheet(false)}
        onComplete={async () => {
          const status = await LLMService.getStatus();
          setLLMStatus(status);
        }}
      />
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    headerSpacer: {
      width: 32,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 20,
    },
    llmBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 16,
    },
    llmBannerText: {
      fontSize: 13,
      flex: 1,
    },
    llmBannerButton: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
    },
    llmBannerButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
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
    loadingText: {
      fontSize: 15,
      marginTop: 12,
    },
    emptyNavWrapper: {
      paddingHorizontal: 16,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
    },
    retryButton: {
      marginTop: 20,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
  });
