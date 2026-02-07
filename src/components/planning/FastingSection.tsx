import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { useFastingStore } from '@/stores';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { FastingTimer } from './FastingTimer';
import { PremiumGate } from '@/components/premium/PremiumGate';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FASTING_GREEN = '#9CAF88';

interface FastingSectionProps {
  defaultExpanded?: boolean;
}

function formatTimeRemaining(hours: number, minutes: number): string {
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function FastingSectionContent({ defaultExpanded = false }: FastingSectionProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { showConfirm } = useConfirmDialog();
  const {
    config,
    activeSession,
    stats,
    loadConfig,
    loadStats,
    startFast,
    endFast,
    getTimeRemaining,
    getProgressPercent,
    isLoaded,
  } = useFastingStore();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    totalMinutes: number;
  } | null>(null);

  // Chevron rotation animation
  const rotation = useSharedValue(defaultExpanded ? 90 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Load data on mount
  useEffect(() => {
    loadConfig();
    loadStats();
  }, []);

  // Update time remaining every minute
  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(getTimeRemaining());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [activeSession, getTimeRemaining]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    rotation.value = withTiming(isExpanded ? 0 : 90, { duration: 200 });
    setIsExpanded(!isExpanded);
  };

  const handleStartFast = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await startFast();
  };

  const handleEndFast = () => {
    const progress = getProgressPercent();
    const targetHours = activeSession?.targetHours || 16;

    if (progress < 100) {
      const hoursCompleted = Math.round((progress / 100) * targetHours * 10) / 10;
      showConfirm({
        title: 'End Fast Early?',
        message: `You've fasted for ${hoursCompleted} hours. Your goal was ${targetHours} hours.\n\nProgress still counts! Every hour of fasting has benefits.`,
        icon: 'timer-outline',
        cancelLabel: 'Keep Going',
        confirmLabel: 'End Fast',
        onConfirm: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          await endFast('ended_early');
        },
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      endFast('completed');
    }
  };

  const handleEditTimes = () => {
    // Navigate to edit times modal or show bottom sheet
    router.push('/settings/fasting');
  };

  const handleViewStats = () => {
    router.push('/settings/fasting');
  };

  // Don't render if fasting is not enabled
  if (!isLoaded || !config?.enabled) {
    return null;
  }

  const progress = getProgressPercent();
  const isFasting = activeSession !== null;
  const isComplete = progress >= 100;

  // Determine display state
  let statusText = 'Start Fast';
  let statusSubtext = '';

  if (isFasting) {
    if (isComplete) {
      statusText = 'Complete!';
      statusSubtext = 'Tap to end fast';
    } else if (timeRemaining) {
      statusText = formatTimeRemaining(timeRemaining.hours, timeRemaining.minutes);
      statusSubtext = 'remaining';
    }
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault },
      ]}
    >
      {/* Collapsible Header */}
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Animated.View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Fasting</Text>
          {isComplete && (
            <View style={[styles.completeBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark" size={12} color={colors.success} />
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {isFasting && timeRemaining ? (
            <Text style={[styles.timeText, { color: FASTING_GREEN }]}>
              {formatTimeRemaining(timeRemaining.hours, timeRemaining.minutes)} left
            </Text>
          ) : (
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {config.protocol}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Timer Visualization */}
          <View style={styles.timerContainer}>
            <FastingTimer progress={progress} isFasting={isFasting} size={160} strokeWidth={10}>
              <View style={styles.timerCenter}>
                <Text style={[styles.timerMainText, { color: colors.textPrimary }]}>
                  {statusText}
                </Text>
                {statusSubtext && (
                  <Text style={[styles.timerSubText, { color: colors.textSecondary }]}>
                    {statusSubtext}
                  </Text>
                )}
              </View>
            </FastingTimer>
          </View>

          {/* Fast Info */}
          {isFasting && activeSession && (
            <View style={styles.fastInfo}>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Started: {formatTime(new Date(activeSession.startTime))}
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Goal: {activeSession.targetHours}h fast
              </Text>
            </View>
          )}

          {/* Streak Display */}
          {stats && stats.currentStreak > 0 && (
            <View style={[styles.streakBanner, { backgroundColor: colors.bgInteractive }]}>
              <Ionicons name="flame" size={16} color="#FF6B6B" />
              <Text style={[styles.streakText, { color: colors.textPrimary }]}>
                {stats.currentStreak} day streak
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {isFasting ? (
              <>
                <Pressable
                  style={[styles.secondaryButton, { backgroundColor: colors.bgInteractive }]}
                  onPress={handleEditTimes}
                >
                  <Ionicons name="time-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                    Edit Times
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.primaryButton,
                    { backgroundColor: isComplete ? colors.success : FASTING_GREEN },
                  ]}
                  onPress={handleEndFast}
                >
                  <Ionicons name={isComplete ? 'checkmark' : 'stop'} size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    {isComplete ? 'Complete Fast' : 'End Early'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.secondaryButton, { backgroundColor: colors.bgInteractive }]}
                  onPress={handleViewStats}
                >
                  <Ionicons name="stats-chart-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                    View Stats
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: FASTING_GREEN }]}
                  onPress={handleStartFast}
                >
                  <Ionicons name="timer-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Start Fast</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export function FastingSection(props: FastingSectionProps) {
  const { isPremium } = useSubscriptionStore();
  const { colors } = useTheme();
  const router = useRouter();
  const { config, isLoaded, loadConfig } = useFastingStore();

  useEffect(() => {
    if (!isLoaded) {
      loadConfig();
    }
  }, [isLoaded, loadConfig]);

  // Don't show anything if not loaded yet or fasting is not enabled
  if (!isLoaded) return null;

  // Show locked preview for free users
  if (!isPremium) {
    return (
      <PremiumGate context="planning">
        <View
          style={[
            styles.container,
            { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault },
          ]}
        >
          <View style={styles.lockedHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="timer-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Fasting</Text>
            </View>
            <View style={styles.lockedRight}>
              <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />
            </View>
          </View>
        </View>
      </PremiumGate>
    );
  }

  // Only show if fasting is enabled
  if (!config?.enabled) {
    return null;
  }

  return <FastingSectionContent {...props} />;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
  },
  lockedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  lockedRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.body.large,
    fontWeight: '600',
  },
  completeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[4],
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: spacing[4],
  },
  timerCenter: {
    alignItems: 'center',
  },
  timerMainText: {
    ...typography.title.large,
    fontWeight: '600',
  },
  timerSubText: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  fastInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  infoText: {
    ...typography.body.small,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    marginBottom: spacing[3],
  },
  streakText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
  },
  secondaryButtonText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    ...typography.body.medium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
