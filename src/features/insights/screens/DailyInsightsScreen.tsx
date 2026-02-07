/**
 * DailyInsightsScreen
 * Full screen with snapshot cards, suggested questions, category browser, and detail sheet.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useLLMStatus } from '@/hooks/useLLMStatus';
import { spacing, borderRadius } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDailyInsightData } from '../hooks/useDailyInsightData';
import { useDailyInsightStore } from '../stores/dailyInsightStore';
import { SnapshotCards } from '../components/SnapshotCards';
import { SuggestedQuestions } from '../components/SuggestedQuestions';
import { QuestionCategoryList } from '../components/QuestionCategoryList';
import { InsightDetailSheet } from '../components/InsightDetailSheet';
import type { DailyQuestionId } from '../types/dailyInsights.types';

export function DailyInsightsScreen() {
  console.log('[LLM:DailyScreen] Render');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { data, headline, suggestedQuestions, isLoaded } = useDailyInsightData();
  const { cache } = useDailyInsightStore();
  const refreshData = useDailyInsightStore((s) => s.refreshData);
  const getAvailableQuestions = useDailyInsightStore((s) => s.getAvailableQuestions);
  const { status: llmStatus, isDownloading, downloadProgress, startDownload } = useLLMStatus();

  const [selectedQuestion, setSelectedQuestion] = useState<DailyQuestionId | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const groupedQuestions = getAvailableQuestions();

  const handleQuestionPress = useCallback((questionId: DailyQuestionId) => {
    setSelectedQuestion(questionId);
    setSheetVisible(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
    setSelectedQuestion(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    console.log('[LLM:DailyScreen] handleRefresh()');
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  }, [refreshData]);

  const handleDownloadModel = useCallback(async () => {
    console.log('[LLM:DailyScreen] handleDownloadModel() started');
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
        <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing} hitSlop={12} accessibilityRole="button" accessibilityLabel="Refresh insights">
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            {/* Headline */}
            <View
              style={[
                styles.headlineCard,
                { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault },
              ]}
            >
              <Ionicons name={headline.icon as any} size={28} color={colors.accent} />
              <Text style={[styles.headlineText, { color: colors.textPrimary }]}>
                {headline.text}
              </Text>
            </View>

            {/* Snapshot cards */}
            <SnapshotCards data={data} />

            {/* Suggested questions */}
            <SuggestedQuestions
              questions={suggestedQuestions}
              onQuestionPress={handleQuestionPress}
              responses={cache?.responses}
            />

            {/* All questions by category */}
            <QuestionCategoryList
              groupedQuestions={groupedQuestions}
              onQuestionPress={handleQuestionPress}
              responses={cache?.responses}
            />

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
          </>
        )}
      </ScrollView>

      {/* Insight detail sheet */}
      <InsightDetailSheet
        questionId={selectedQuestion}
        visible={sheetVisible}
        onClose={handleCloseSheet}
      />
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
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[8],
      gap: spacing[5],
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
    emptyIcon: {
      marginBottom: spacing[1],
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
    headlineCard: {
      padding: spacing[4],
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
    },
    headlineIcon: {
      marginTop: 2,
    },
    headlineText: {
      flex: 1,
      ...typography.body.medium,
      lineHeight: 22,
    },
    llmBanner: {
      padding: spacing[4],
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      gap: spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
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
