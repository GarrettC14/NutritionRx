/**
 * Weekly Insights Screen
 * Full-screen composition: Header + WeekNav + Calendar + Stats + Headline + CategoryChips + Questions + NeedsMoreData
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
  const { data, isLoading: isDataLoading } = useWeeklyData();
  const { questions, unavailableQuestions, headline } = useWeeklyQuestions(data);
  const { generateForQuestion, retryForQuestion, isGenerating } = useWeeklyInsightGeneration();

  // Local state for per-question responses
  const [responses, setResponses] = useState<Record<string, WeeklyInsightResponse>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Check LLM status on mount
  useEffect(() => {
    const checkLLM = async () => {
      console.log('[LLM:WeeklyScreen] Mount — checking LLM status');
      const status = await LLMService.getStatus();
      console.log(`[LLM:WeeklyScreen] LLM status on mount: ${status}`);
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

  // Filter questions by selected category
  const filteredQuestions = useMemo(() => {
    if (!selectedCategory) return questions;
    return questions.filter((q) => q.definition.category === selectedCategory);
  }, [questions, selectedCategory]);

  // Find the headline question (first non-highlights or first question)
  const headlineQuestion = useMemo(
    () => questions.find((q) => q.definition.category !== 'highlights') ?? questions[0],
    [questions]
  );

  const handleNavigate = useCallback(
    (newWeekStart: string) => {
      console.log(`[LLM:WeeklyScreen] handleNavigate(${newWeekStart})`);
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
      console.log(`[LLM:WeeklyScreen] handleQuestionPress(${qId}) — currentSelected=${selectedQuestionId}`);

      // Toggle if already selected
      if (selectedQuestionId === qId) {
        console.log(`[LLM:WeeklyScreen] Toggling off ${qId}`);
        selectQuestion(null);
        return;
      }

      selectQuestion(qId);

      // Don't generate if question doesn't have enough data
      if (!question.isAvailable) return;

      // Check for cached response
      const cached = getCachedResponse(qId);
      if (cached) {
        console.log(`[LLM:WeeklyScreen] Cache hit for ${qId}, source=${cached.source}`);
        setResponses((prev) => ({ ...prev, [qId]: cached }));
        return;
      }

      // Generate new response
      console.log(`[LLM:WeeklyScreen] Generating response for ${qId}...`);
      setGeneratingId(qId);
      const response = await generateForQuestion(question);
      console.log(`[LLM:WeeklyScreen] Response for ${qId} — source=${response.source}, length=${response.text?.length || 0}`);
      setResponses((prev) => ({ ...prev, [qId]: response }));
      setGeneratingId(null);
    },
    [selectedQuestionId, selectQuestion, getCachedResponse, generateForQuestion]
  );

  const handleRetry = useCallback(
    async (question: ScoredQuestion) => {
      console.log(`[LLM:WeeklyScreen] handleRetry(${question.questionId})`);
      setGeneratingId(question.questionId);
      const response = await retryForQuestion(question);
      setResponses((prev) => ({ ...prev, [question.questionId]: response }));
      setGeneratingId(null);
    },
    [retryForQuestion]
  );

  const handleFollowUp = useCallback(
    (questionId: string) => {
      console.log(`[LLM:WeeklyScreen] handleFollowUp(${questionId})`);
      // Collapse current, expand target
      const targetQuestion = questions.find((q) => q.questionId === questionId);
      if (targetQuestion) {
        selectQuestion(null);
        // Small delay to allow collapse animation
        setTimeout(() => handleQuestionPress(targetQuestion), 100);
      }
    },
    [questions, selectQuestion, handleQuestionPress]
  );

  const handleHeadlinePress = useCallback(() => {
    if (headlineQuestion) {
      handleQuestionPress(headlineQuestion);
    }
  }, [headlineQuestion, handleQuestionPress]);

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

  // Empty state
  if (!data || data.loggedDayCount < 2) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
            Almost there!
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Log a few more days to unlock your weekly insights
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Weekly Insights
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Week Navigation */}
        <WeekNavigation weekStart={weekStart} onNavigate={handleNavigate} />

        {/* LLM Status Banner */}
        {llmStatus === 'not_downloaded' && (
          <View style={[styles.llmBanner, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}30` }]}>
            <Ionicons name="sparkles" size={16} color={colors.accent} />
            <Text style={[styles.llmBannerText, { color: colors.textSecondary }]}>
              Download AI model for personalized narratives
            </Text>
          </View>
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
              <QuestionCard
                key={qId}
                question={question}
                onPress={() => handleQuestionPress(question)}
                isExpanded={selectedQuestionId === qId}
                response={responses[qId] ?? null}
                isGenerating={generatingId === qId}
                questionError={perQuestionErrors[qId] ?? null}
                insufficientData={insufficientData}
                daysNeeded={daysNeeded}
                onRetry={() => handleRetry(question)}
                onFollowUp={handleFollowUp}
              />
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
  });
