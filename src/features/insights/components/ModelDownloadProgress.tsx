/**
 * Model Download Progress Component
 * Displays download progress for the AI model
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import type { LLMDownloadProgress } from '../types/insights.types';

interface ModelDownloadProgressProps {
  progress: LLMDownloadProgress | null;
  isDownloading: boolean;
  error?: string | null;
  onStartDownload: () => void;
  onCancelDownload?: () => void;
  onRetry?: () => void;
}

export function ModelDownloadProgress({
  progress,
  isDownloading,
  error,
  onStartDownload,
  onCancelDownload,
  onRetry,
}: ModelDownloadProgressProps) {
  const { colors } = useTheme();

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Format seconds to human readable
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      return mins === 1 ? '1 minute' : `${mins} minutes`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.errorBg }]}>
          <Ionicons name="alert-circle" size={24} color={colors.error} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Download Failed</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {error}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.accent }]}
          onPress={onRetry || onStartDownload}
        >
          <Text style={styles.actionButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Downloading state
  if (isDownloading && progress) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.downloadContent}>
          <View style={styles.downloadHeader}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.title, { color: colors.textPrimary, marginLeft: spacing[2] }]}>
              Setting up Smart Insights
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressBarContainer, { backgroundColor: colors.bgInteractive }]}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: colors.accent,
                  width: `${progress.percentage}%`,
                },
              ]}
            />
          </View>

          <View style={styles.progressDetails}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              Downloading AI model ({formatBytes(progress.bytesDownloaded)} of{' '}
              {formatBytes(progress.totalBytes)})
            </Text>
            <Text style={[styles.progressPercent, { color: colors.accent }]}>
              {progress.percentage}%
            </Text>
          </View>

          <Text style={[styles.timeRemaining, { color: colors.textTertiary }]}>
            {progress.estimatedSecondsRemaining > 0
              ? `About ${formatTime(progress.estimatedSecondsRemaining)} remaining`
              : 'Almost done...'}
          </Text>

          <Text style={[styles.infoText, { color: colors.textTertiary }]}>
            This is a one-time download. Insights will work offline after this.
          </Text>

          {onCancelDownload && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.borderDefault }]}
              onPress={onCancelDownload}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Not downloaded state - show download prompt
  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
        <Ionicons name="cloud-download-outline" size={24} color={colors.accent} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Download AI Model</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          ~1 GB download required for personalized insights
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.accent }]}
        onPress={onStartDownload}
      >
        <Ionicons name="download-outline" size={16} color="#FFFFFF" />
        <Text style={styles.actionButtonText}>Download</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  content: {
    flex: 1,
    marginBottom: spacing[3],
  },
  title: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  subtitle: {
    ...typography.body.small,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  downloadContent: {
    width: '100%',
  },
  downloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  progressText: {
    ...typography.body.small,
    flex: 1,
  },
  progressPercent: {
    ...typography.body.small,
    fontWeight: '600',
  },
  timeRemaining: {
    ...typography.caption,
    marginBottom: spacing[3],
  },
  infoText: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  cancelButton: {
    alignSelf: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  cancelButtonText: {
    ...typography.body.small,
  },
});
