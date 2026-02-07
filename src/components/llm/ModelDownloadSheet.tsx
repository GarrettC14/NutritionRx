/**
 * ModelDownloadSheet
 * Reusable modal for downloading the on-device AI model.
 * Used by AIDailyInsightWidget, Settings, and Chat screens.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { LLMService } from '@/features/insights/services/LLMService';
import { useDailyInsightStore } from '@/features/insights/stores/dailyInsightStore';

interface ModelDownloadSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
}

type SheetState = 'idle' | 'downloading' | 'complete' | 'error';

export function ModelDownloadSheet({ visible, onDismiss, onComplete }: ModelDownloadSheetProps) {
  const { colors } = useTheme();
  const [sheetState, setSheetState] = useState<SheetState>('idle');
  const [progress, setProgress] = useState(0);
  const [modelSize, setModelSize] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch model size when sheet becomes visible
  React.useEffect(() => {
    if (visible && !modelSize) {
      LLMService.getModelSize().then((bytes) => {
        if (bytes > 0) {
          setModelSize(`~${Math.round(bytes / (1024 * 1024))} MB`);
        }
      });
    }
    if (!visible) {
      // Reset state when closed
      setSheetState('idle');
      setProgress(0);
      setErrorMessage(null);
    }
  }, [visible, modelSize]);

  const handleDownload = useCallback(async () => {
    setSheetState('downloading');
    setProgress(0);
    setErrorMessage(null);
    useDailyInsightStore.setState({ llmStatus: 'downloading' });

    try {
      const result = await LLMService.downloadModel((p) => {
        setProgress(p.percentage);
      });

      if (result.success) {
        useDailyInsightStore.setState({ llmStatus: 'ready' });
        setSheetState('complete');
        // Auto-dismiss after brief delay
        setTimeout(() => {
          onComplete();
          onDismiss();
        }, 600);
      } else {
        useDailyInsightStore.setState({ llmStatus: 'not_downloaded' });
        setErrorMessage(result.error ?? 'Download failed');
        setSheetState('error');
      }
    } catch {
      useDailyInsightStore.setState({ llmStatus: 'not_downloaded' });
      setErrorMessage('Download failed. Please try again.');
      setSheetState('error');
    }
  }, [onComplete, onDismiss]);

  const handleCancel = useCallback(() => {
    LLMService.cancelDownload();
    useDailyInsightStore.setState({ llmStatus: 'not_downloaded' });
    setSheetState('idle');
    setProgress(0);
    onDismiss();
  }, [onDismiss]);

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={sheetState === 'downloading' ? undefined : onDismiss}
    >
      <Pressable
        style={styles.overlay}
        onPress={sheetState === 'downloading' ? undefined : onDismiss}
      >
        <Pressable style={[styles.sheet, { backgroundColor: colors.bgElevated }]}>
          {/* Header icon */}
          <View style={[styles.iconCircle, { backgroundColor: colors.premiumGoldMuted }]}>
            {sheetState === 'complete' ? (
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            ) : (
              <Ionicons name="cloud-download-outline" size={36} color={colors.premiumGold} />
            )}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {sheetState === 'complete' ? 'Download Complete' : 'Download AI Model'}
          </Text>

          {/* Subtitle / status */}
          {sheetState === 'idle' && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              A small on-device model for personalized nutrition insights.
              {modelSize ? ` ${modelSize} download.` : ''}
            </Text>
          )}

          {sheetState === 'downloading' && (
            <View style={styles.progressSection}>
              <View style={[styles.progressTrack, { backgroundColor: colors.bgInteractive }]}>
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
          )}

          {sheetState === 'complete' && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              AI insights are now available.
            </Text>
          )}

          {sheetState === 'error' && (
            <Text style={[styles.subtitle, { color: colors.error }]}>
              {errorMessage}
            </Text>
          )}

          {/* Actions */}
          {sheetState === 'idle' && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              onPress={handleDownload}
              accessibilityRole="button"
              accessibilityLabel="Download AI model"
            >
              <Text style={styles.primaryButtonText}>Download</Text>
            </TouchableOpacity>
          )}

          {sheetState === 'downloading' && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.borderDefault }]}
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel download"
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          )}

          {sheetState === 'error' && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              onPress={handleDownload}
              accessibilityRole="button"
              accessibilityLabel="Retry download"
            >
              <Text style={styles.primaryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    sheet: {
      width: '100%',
      maxWidth: 340,
      borderRadius: 20,
      padding: 28,
      alignItems: 'center',
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: 24,
    },
    progressSection: {
      width: '100%',
      marginBottom: 24,
      gap: 8,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressText: {
      fontSize: 13,
      textAlign: 'center',
    },
    primaryButton: {
      width: '100%',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      width: '100%',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
