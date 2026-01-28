/**
 * DailyInsightsSection Component
 * Main component that displays daily insights and deficiency alerts
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { LockedOverlay } from '@/components/premium/LockedOverlay';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

import { useInsightsData } from '../hooks/useInsightsData';
import { useInsightGeneration } from '../hooks/useInsightGeneration';
import { useDeficiencyAlerts } from '../hooks/useDeficiencyAlerts';

import { InsightCard } from './InsightCard';
import { DeficiencyAlertCard } from './DeficiencyAlertCard';
import { InsightsEmptyState } from './InsightsEmptyState';
import { InsightsLoadingState } from './InsightsLoadingState';
import { ModelDownloadProgress } from './ModelDownloadProgress';

export function DailyInsightsSection() {
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
      generateInsights(data);
    }
  }, [data, isDataLoading, generateInsights]);

  const showDownloadPrompt = llmStatus === 'not_downloaded' && !isDownloading;
  const isLoading = isDataLoading || isGenerating;
  const hasContent = insights.length > 0 || alerts.length > 0;

  // Content to render (will be blurred for non-premium)
  const content = (
    <View style={styles.content}>
      {/* Download prompt for LLM */}
      {showDownloadPrompt && isPremium && (
        <TouchableOpacity
          style={[styles.downloadPrompt, { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault }]}
          onPress={downloadModel}
        >
          <View style={styles.downloadRow}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
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
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>AI Analysis</Text>
        <TouchableOpacity onPress={refresh} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <LockedOverlay context="insights" message="Unlock AI-powered insights">
        {content}
      </LockedOverlay>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    minHeight: 150,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  downloadPrompt: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  downloadText: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  downloadSubtitle: {
    fontSize: 13,
  },
});
