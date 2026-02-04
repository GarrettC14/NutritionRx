/**
 * ModelDownloadProgress Component
 * Shows download progress for the LLM model
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface ModelDownloadProgressProps {
  progress: number;
  isDownloading: boolean;
  onCancel: () => void;
}

export function ModelDownloadProgress({ progress, isDownloading, onCancel }: ModelDownloadProgressProps) {
  const { colors } = useTheme();

  if (!isDownloading) return null;
  console.log(`[LLM:DownloadProgress] Render — progress=${progress}%`);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Downloading AI Model</Text>
        </View>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.borderDefault }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.accent, width: `${Math.min(progress, 100)}%` },
          ]}
        />
      </View>

      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
        {progress}% complete
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
