/**
 * DailyInsightsSection Component
 * Main component that displays daily insights and deficiency alerts
 * Uses standardized LockedContentArea pattern for premium gating
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { LockedContentArea } from '@/components/premium/LockedContentArea';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

import { useInsightsData } from '../hooks/useInsightsData';
import { useInsightGeneration } from '../hooks/useInsightGeneration';
import { useDeficiencyAlerts } from '../hooks/useDeficiencyAlerts';

import { InsightCard } from './InsightCard';
import { DeficiencyAlertCard } from './DeficiencyAlertCard';
import { InsightsEmptyState } from './InsightsEmptyState';
import { InsightsLoadingState } from './InsightsLoadingState';
import { ModelDownloadProgress } from './ModelDownloadProgress';

export function DailyInsightsSection() {
  console.log('[LLM:DailySection] Render');
  const { colors } = useTheme();
  const { isPremium } = useSubscriptionStore();

  // Data hooks
  const { data, nutrientData, isLoading: isDataLoading, daysUsingApp, daysSinceLastLog, refresh } = useInsightsData();

  const {
    insights,
    isGenerating,
    llmStatus,
    emptyState,
    generateInsights,
    downloadModel,
    cancelDownload,
    isDownloading,
    downloadProgress,
  } = useInsightGeneration();

  const { alerts, dismissAlert } = useDeficiencyAlerts({
    nutrientData,
    daysUsingApp,
    daysSinceLastLog,
  });

  // Generate insights when data is available
  useEffect(() => {
    if (data && !isDataLoading) {
      console.log(`[LLM:DailySection] Data ready — triggering generateInsights(), meals=${data.todayMealCount}, cal=${data.todayCalories}`);
      generateInsights(data);
    }
  }, [data, isDataLoading, generateInsights]);

  const showDownloadPrompt = llmStatus === 'not_downloaded' && !isDownloading;
  const isLoading = isDataLoading || isGenerating;
  const hasContent = insights.length > 0 || alerts.length > 0;
  console.log(`[LLM:DailySection] State — isPremium=${isPremium}, llmStatus=${llmStatus}, isLoading=${isLoading}, insights=${insights.length}, alerts=${alerts.length}, hasContent=${hasContent}`);

  // Content to render (will be blurred for non-premium)
  const contentArea = (
    <>
      {/* Download prompt for LLM */}
      {showDownloadPrompt && isPremium && (
        <TouchableOpacity
          style={[styles.downloadPrompt, { backgroundColor: colors.bgPrimary, borderColor: colors.borderDefault }]}
          onPress={downloadModel}
        >
          <View style={styles.downloadRow}>
            <Ionicons name="sparkles" size={20} color={colors.premiumGold} />
            <View style={styles.downloadText}>
              <Text style={[styles.downloadTitle, { color: colors.textPrimary }]}>Enable AI Insights</Text>
              <Text style={[styles.downloadSubtitle, { color: colors.textSecondary }]}>
                Download 1GB model for personalized insights
              </Text>
            </View>
            <Ionicons name="download-outline" size={20} color={colors.accent} />
          </View>
        </TouchableOpacity>
      )}

      {/* Download progress */}
      <ModelDownloadProgress progress={downloadProgress} isDownloading={isDownloading} onCancel={cancelDownload} />

      {/* Loading state */}
      {isLoading && <InsightsLoadingState />}

      {/* Empty state */}
      {!isLoading && !hasContent && emptyState && (
        <InsightsEmptyState title={emptyState.title} message={emptyState.message} />
      )}

      {/* Deficiency alerts */}
      {!isLoading && alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Nutrient Alerts</Text>
          {alerts.map((alert) => (
            <DeficiencyAlertCard
              key={alert.nutrientId}
              alert={alert}
              onDismiss={() => dismissAlert(alert.nutrientId, alert.severity)}
            />
          ))}
        </View>
      )}

      {/* Daily insights */}
      {!isLoading && insights.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Today's Insights</Text>
          {insights.map((insight, index) => (
            <InsightCard key={`${insight.category}-${index}`} insight={insight} />
          ))}
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      {/* Header with icon - dimmed when locked */}
      <View
        style={[styles.header, !isPremium && styles.headerLocked]}
        pointerEvents={isPremium ? 'auto' : 'none'}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles-outline" size={24} color={colors.premiumGold} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>AI Analysis</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Personalized insights
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={refresh} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content area - locked for non-premium */}
      {isPremium ? (
        <View style={styles.content}>{contentArea}</View>
      ) : (
        <View style={styles.lockedWrapper}>
          <LockedContentArea
            context="insights"
            message="Upgrade to unlock"
            minHeight={150}
          >
            {contentArea}
          </LockedContentArea>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
  },
  headerLocked: {
    opacity: 0.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  headerText: {
    gap: 2,
  },
  title: {
    ...typography.title.small,
  },
  subtitle: {
    ...typography.caption,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  lockedWrapper: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  downloadPrompt: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  downloadText: {
    flex: 1,
  },
  downloadTitle: {
    ...typography.body.medium,
    fontWeight: '600',
    marginBottom: 2,
  },
  downloadSubtitle: {
    ...typography.body.small,
  },
});
