/**
 * Fasting Timer Widget
 * Displays current fasting/eating window status with countdown timer
 * Premium feature - shows locked state for free users
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useFastingStore, useSubscriptionStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';
import { LockedContentArea } from '@/components/premium';

type FastingState = 'fasting' | 'eating' | 'complete' | 'not_configured';

interface FastingPhase {
  label: string;
  icon: string;
}

const FASTING_PHASES: Record<string, FastingPhase> = {
  fed: { label: 'Fed state', icon: '🍽️' },
  fat_burning: { label: 'Fat burning mode', icon: '🔥' },
  ketosis: { label: 'Ketosis beginning', icon: '⚡' },
  deep_ketosis: { label: 'Deep ketosis', icon: '✨' },
};

function getFastingPhase(hoursElapsed: number): FastingPhase {
  if (hoursElapsed < 4) return FASTING_PHASES.fed;
  if (hoursElapsed < 12) return FASTING_PHASES.fat_burning;
  if (hoursElapsed < 18) return FASTING_PHASES.ketosis;
  return FASTING_PHASES.deep_ketosis;
}

export function FastingTimerWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPremium } = useSubscriptionStore();
  const {
    config: fastingConfig,
    activeSession,
    stats,
    loadConfig,
    isLoaded,
    getTimeRemaining,
    getProgressPercent,
    isInEatingWindow,
    isCurrentlyFasting,
    startFast,
    endFast,
  } = useFastingStore();

  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number } | null>(null);
  const [progress, setProgress] = useState(0);

  // Load fasting config on mount
  useEffect(() => {
    if (!isLoaded) {
      loadConfig();
    }
  }, [isLoaded, loadConfig]);

  // Update timer every second
  useEffect(() => {
    const updateTimer = () => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);
      setProgress(getProgressPercent());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [getTimeRemaining, getProgressPercent, activeSession]);

  // Handle app state changes for accurate timer
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Recalculate timer when app comes to foreground
        setTimeRemaining(getTimeRemaining());
        setProgress(getProgressPercent());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [getTimeRemaining, getProgressPercent]);

  // Determine current state
  const getCurrentState = useCallback((): FastingState => {
    if (!fastingConfig || !fastingConfig.enabled) {
      return 'not_configured';
    }

    if (isCurrentlyFasting()) {
      const remaining = getTimeRemaining();
      if (remaining && remaining.totalMinutes <= 0) {
        return 'complete';
      }
      return 'fasting';
    }

    return 'eating';
  }, [fastingConfig, isCurrentlyFasting, getTimeRemaining]);

  const currentState = getCurrentState();

  const handlePress = () => {
    if (!isEditMode && isPremium) {
      router.push('/settings/fasting');
    }
  };

  const handleStartFast = async () => {
    if (!isEditMode && isPremium) {
      await startFast();
    }
  };

  const handleEndFast = async () => {
    if (!isEditMode && isPremium) {
      await endFast('completed');
    }
  };

  // Calculate hours elapsed for fasting phase
  const getHoursElapsed = () => {
    if (!activeSession) return 0;
    const startTime = new Date(activeSession.startTime);
    const now = new Date();
    return (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  };

  const formatTime = (hours: number, minutes: number): string => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatTimeString = (timeString: string): string => {
    const [hour, minute] = timeString.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const styles = createStyles(colors);

  // Fasting state colors
  const stateColors = {
    fasting: '#4CAF50', // Sage green
    eating: '#E07A5F', // Terracotta
    complete: '#4CAF50',
    not_configured: colors.textTertiary,
  };

  const stateColor = stateColors[currentState];

  // Content area based on state
  const renderContent = () => {
    switch (currentState) {
      case 'not_configured':
        return (
          <View style={styles.notConfiguredContent}>
            <Text style={styles.notConfiguredText}>
              Set up fasting in Settings
            </Text>
            <TouchableOpacity
              style={[styles.setupButton, { borderColor: colors.accent }]}
              onPress={handlePress}
              disabled={isEditMode}
            >
              <Text style={[styles.setupButtonText, { color: colors.accent }]}>
                Configure
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'complete':
        return (
          <View style={styles.completeContent}>
            <Text style={styles.completeEmoji}>🎉</Text>
            <Text style={styles.completeText}>Fast complete!</Text>
            {stats?.currentStreak && stats.currentStreak > 1 && (
              <Text style={styles.streakText}>
                {stats.currentStreak} day streak
              </Text>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: stateColor }]}
              onPress={handleEndFast}
              disabled={isEditMode}
            >
              <Text style={styles.actionButtonText}>End Fast</Text>
            </TouchableOpacity>
          </View>
        );

      case 'fasting':
        const hoursElapsed = getHoursElapsed();
        const phase = getFastingPhase(hoursElapsed);

        return (
          <View style={styles.timerContent}>
            {/* Large countdown */}
            <Text style={[styles.timerText, { color: colors.textPrimary }]}>
              {timeRemaining ? formatTime(timeRemaining.hours, timeRemaining.minutes) : '--:--'}
            </Text>
            <Text style={styles.timerLabel}>remaining</Text>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBackground, { backgroundColor: `${stateColor}25` }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%`, backgroundColor: stateColor },
                  ]}
                />
              </View>
            </View>

            {/* Time context */}
            {fastingConfig && activeSession && (
              <Text style={styles.timeContext}>
                Started {formatTimeString(new Date(activeSession.startTime).toTimeString().slice(0, 5))}
              </Text>
            )}

            {/* Fasting phase */}
            <View style={styles.phaseContainer}>
              <Text style={styles.phaseText}>
                {phase.icon} {phase.label}
              </Text>
            </View>
          </View>
        );

      case 'eating':
        return (
          <View style={styles.eatingContent}>
            <Text style={styles.eatingText}>Eating window open</Text>
            {fastingConfig && (
              <Text style={styles.windowTime}>
                Until {formatTimeString(fastingConfig.typicalEatEnd)}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: stateColor }]}
              onPress={handleStartFast}
              disabled={isEditMode}
            >
              <Text style={styles.actionButtonText}>Start Fast</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  const contentArea = (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode || currentState === 'not_configured'}
      style={styles.contentTouchable}
    >
      {renderContent()}
    </TouchableOpacity>
  );

  // State labels
  const stateLabels: Record<FastingState, string> = {
    fasting: 'FASTING',
    eating: 'EATING WINDOW',
    complete: 'COMPLETE',
    not_configured: 'FASTING TIMER',
  };

  const stateIcons: Record<FastingState, keyof typeof Ionicons.glyphMap> = {
    fasting: 'time-outline',
    eating: 'restaurant-outline',
    complete: 'checkmark-circle-outline',
    not_configured: 'timer-outline',
  };

  return (
    <View style={styles.container}>
      {/* Header - dimmed when locked */}
      <View
        style={[styles.header, !isPremium && styles.headerLocked]}
        pointerEvents={isPremium ? 'auto' : 'none'}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${stateColor}20` }]}>
            <Ionicons name={stateIcons[currentState]} size={20} color={stateColor} />
          </View>
          <Text style={[styles.stateLabel, { color: stateColor }]}>
            {stateLabels[currentState]}
          </Text>
        </View>
        {fastingConfig && currentState !== 'not_configured' && (
          <View style={[styles.protocolBadge, { backgroundColor: colors.bgInteractive }]}>
            <Text style={styles.protocolText}>{fastingConfig.protocol}</Text>
          </View>
        )}
      </View>

      {/* Content - locked for non-premium */}
      {isPremium ? (
        contentArea
      ) : (
        <View style={styles.lockedWrapper}>
          <LockedContentArea
            context="fasting_timer"
            message="Upgrade to unlock"
            minHeight={100}
          >
            {contentArea}
          </LockedContentArea>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgElevated,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerLocked: {
      opacity: 0.5,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stateLabel: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1,
    },
    protocolBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    protocolText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    lockedWrapper: {
      marginHorizontal: -16,
      marginBottom: -16,
    },
    contentTouchable: {
      minHeight: 80,
    },
    // Timer content (fasting state)
    timerContent: {
      alignItems: 'center',
    },
    timerText: {
      fontSize: 42,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
      letterSpacing: 2,
    },
    timerLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    progressContainer: {
      width: '100%',
      marginTop: 14,
    },
    progressBackground: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    timeContext: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 10,
    },
    phaseContainer: {
      marginTop: 8,
    },
    phaseText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    // Eating window content
    eatingContent: {
      alignItems: 'center',
    },
    eatingText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    windowTime: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    actionButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      marginTop: 14,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    // Complete content
    completeContent: {
      alignItems: 'center',
    },
    completeEmoji: {
      fontSize: 36,
    },
    completeText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 8,
    },
    streakText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    // Not configured content
    notConfiguredContent: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    notConfiguredText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    setupButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
    },
    setupButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
