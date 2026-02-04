/**
 * Weekly Insights Screen
 * Full-screen composition: WeekNavigation + MiniCalendar + StatsGrid + QuestionCards
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import type { ScoredQuestion, WeeklyInsightResponse } from '../types/weeklyInsights.types';

export function WeeklyInsightsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // Store state
  const weekStart = useWeeklyInsightsStore((s) => s.getEffectiveWeekStart());
  const setSelectedWeek = useWeeklyInsightsStore((s) => s.setSelectedWeek);
  const selectedQuestionId = useWeeklyInsightsStore((s) => s.selectedQuestionId);
  const selectQuestion = useWeeklyInsightsStore((s) => s.selectQuestion);
  const getCachedResponse = useWeeklyInsightsStore((s) => s.getCachedResponse);
  const llmStatus = useWeeklyInsightsStore((s) => s.llmStatus);
  const setLLMStatus = useWeeklyInsightsStore((s) => s.setLLMStatus);

  // Data hooks
  const { data, isLoading: isDataLoading } = useWeeklyData();
  const { questions, headline } = useWeeklyQuestions(data);
  const { generateForQuestion, isGenerating } = useWeeklyInsightGeneration();

  // Local state for per-question responses
  const [responses, setResponses] = useState<Record<string, WeeklyInsightResponse>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Check LLM status on mount
  useEffect(() => {
    const checkLLM = async () => {
      const status = await LLMService.getStatus();
      setLLMStatus(status);
    };
    checkLLM();
  }, [setLLMStatus]);

  const handleNavigate = useCallback(
    (newWeekStart: string) => {
      setSelectedWeek(newWeekStart);
      selectQuestion(null);
      setResponses({});
    },
    [setSelectedWeek, selectQuestion]
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
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Weekly Insights
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.emptyIcon]}>
            {'\u{1F4CA}'}
          </Text>
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
      <View style={styles.headerBar}>
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

        {/* Questions Section */}
        <View style={styles.questionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            Questions for your week
          </Text>

          {questions.map((question) => (
            <QuestionCard
              key={question.questionId}
              question={question}
              onPress={() => handleQuestionPress(question)}
              isExpanded={selectedQuestionId === question.questionId}
              response={responses[question.questionId] ?? null}
              isGenerating={generatingId === question.questionId}
            />
          ))}
        </View>
      </ScrollView>
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
