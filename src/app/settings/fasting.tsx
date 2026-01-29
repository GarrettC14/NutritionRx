import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useFastingStore, useSubscriptionStore } from '@/stores';
import { FastingProtocol, FastingSession } from '@/types/planning';
import { PremiumGate } from '@/components/premium';

const FASTING_GREEN = '#9CAF88';

interface ProtocolOption {
  value: FastingProtocol;
  label: string;
  description: string;
  fastHours: number;
  eatHours: number;
}

const PROTOCOL_OPTIONS: ProtocolOption[] = [
  {
    value: '16:8',
    label: '16:8',
    description: 'Most popular, beginner-friendly',
    fastHours: 16,
    eatHours: 8,
  },
  {
    value: '18:6',
    label: '18:6',
    description: 'Intermediate fasting window',
    fastHours: 18,
    eatHours: 6,
  },
  {
    value: '20:4',
    label: '20:4',
    description: 'Warrior Diet, one main meal',
    fastHours: 20,
    eatHours: 4,
  },
  {
    value: '14:10',
    label: '14:10',
    description: 'Gentle start to fasting',
    fastHours: 14,
    eatHours: 10,
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Set your own fasting window',
    fastHours: 0,
    eatHours: 0,
  },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function FastingSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    config,
    stats,
    recentSessions,
    loadConfig,
    loadStats,
    loadRecentSessions,
    updateConfig,
    enableFasting,
    disableFasting,
    isLoaded,
  } = useFastingStore();

  const { isPremium } = useSubscriptionStore();

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [customHours, setCustomHours] = useState(16);

  // Load data on mount
  useEffect(() => {
    loadConfig();
    loadStats();
    loadRecentSessions();
  }, []);

  useEffect(() => {
    if (config?.customFastHours) {
      setCustomHours(config.customFastHours);
    }
  }, [config]);

  const handleToggleEnabled = async (value: boolean) => {
    if (value) {
      await enableFasting();
    } else {
      await disableFasting();
    }
  };

  const handleProtocolSelect = async (protocol: FastingProtocol) => {
    if (protocol === 'custom') {
      await updateConfig({ protocol, customFastHours: customHours });
    } else {
      await updateConfig({ protocol });
    }
  };

  const handleStartTimeChange = async (_: any, date?: Date) => {
    setShowStartPicker(false);
    if (date && config) {
      const hours = date.getHours().toString().padStart(2, '0');
      const mins = date.getMinutes().toString().padStart(2, '0');
      await updateConfig({ typicalEatStart: `${hours}:${mins}` });
    }
  };

  const handleEndTimeChange = async (_: any, date?: Date) => {
    setShowEndPicker(false);
    if (date && config) {
      const hours = date.getHours().toString().padStart(2, '0');
      const mins = date.getMinutes().toString().padStart(2, '0');
      await updateConfig({ typicalEatEnd: `${hours}:${mins}` });
    }
  };

  const parseTimeString = (timeStr: string): Date => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    return date;
  };

  const handleNotificationToggle = async (
    key: 'windowOpens' | 'windowClosesSoon' | 'fastComplete',
    value: boolean
  ) => {
    if (!config) return;
    await updateConfig({
      notifications: {
        ...config.notifications,
        [key]: value,
      },
    });
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Fasting Settings',
            headerStyle: { backgroundColor: colors.bgPrimary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Fasting Settings',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      >
        {isPremium ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Enable Toggle */}
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleContent}>
                  <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                    Fasting Timer
                  </Text>
                  <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                    Track your intermittent fasting windows
                  </Text>
                </View>
                <Switch
                  value={config?.enabled ?? false}
                  onValueChange={handleToggleEnabled}
                  trackColor={{ false: colors.bgInteractive, true: FASTING_GREEN }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {config?.enabled && (
            <>
              {/* Protocol Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  FASTING PROTOCOL
                </Text>
                <View style={styles.optionsList}>
                  {PROTOCOL_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor:
                            config.protocol === option.value
                              ? FASTING_GREEN + '20'
                              : colors.bgSecondary,
                          borderColor:
                            config.protocol === option.value ? FASTING_GREEN : 'transparent',
                        },
                      ]}
                      onPress={() => handleProtocolSelect(option.value)}
                    >
                      <View style={styles.optionContent}>
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color:
                                config.protocol === option.value
                                  ? FASTING_GREEN
                                  : colors.textPrimary,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                          {option.description}
                        </Text>
                        {option.value !== 'custom' && (
                          <Text style={[styles.optionMeta, { color: colors.textTertiary }]}>
                            Fast {option.fastHours}h / Eat {option.eatHours}h
                          </Text>
                        )}
                      </View>
                      {config.protocol === option.value && (
                        <Ionicons name="checkmark-circle" size={24} color={FASTING_GREEN} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Eating Window */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  TYPICAL EATING WINDOW
                </Text>
                <Text style={[styles.sectionDescription, { color: colors.textTertiary }]}>
                  This helps us show your progress based on your usual schedule.
                </Text>
                <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
                  <Pressable
                    style={styles.timeRow}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={[styles.timeLabel, { color: colors.textPrimary }]}>
                      Start eating
                    </Text>
                    <View style={styles.timeValue}>
                      <Text style={[styles.timeText, { color: colors.accent }]}>
                        {config.typicalEatStart
                          ? formatTime(parseTimeString(config.typicalEatStart))
                          : '12:00 PM'}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </View>
                  </Pressable>

                  <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />

                  <Pressable
                    style={styles.timeRow}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text style={[styles.timeLabel, { color: colors.textPrimary }]}>
                      Stop eating
                    </Text>
                    <View style={styles.timeValue}>
                      <Text style={[styles.timeText, { color: colors.accent }]}>
                        {config.typicalEatEnd
                          ? formatTime(parseTimeString(config.typicalEatEnd))
                          : '8:00 PM'}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* Notifications */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  NOTIFICATIONS
                </Text>
                <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
                  <View style={styles.notificationRow}>
                    <Text style={[styles.notificationLabel, { color: colors.textPrimary }]}>
                      Eating window opens
                    </Text>
                    <Switch
                      value={config.notifications.windowOpens}
                      onValueChange={(v) => handleNotificationToggle('windowOpens', v)}
                      trackColor={{ false: colors.bgInteractive, true: FASTING_GREEN }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />

                  <View style={styles.notificationRow}>
                    <Text style={[styles.notificationLabel, { color: colors.textPrimary }]}>
                      Eating window closes soon
                    </Text>
                    <Switch
                      value={config.notifications.windowClosesSoon}
                      onValueChange={(v) => handleNotificationToggle('windowClosesSoon', v)}
                      trackColor={{ false: colors.bgInteractive, true: FASTING_GREEN }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />

                  <View style={styles.notificationRow}>
                    <Text style={[styles.notificationLabel, { color: colors.textPrimary }]}>
                      Fast completed
                    </Text>
                    <Switch
                      value={config.notifications.fastComplete}
                      onValueChange={(v) => handleNotificationToggle('fastComplete', v)}
                      trackColor={{ false: colors.bgInteractive, true: FASTING_GREEN }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              </View>

              {/* Stats */}
              {stats && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    STATISTICS
                  </Text>
                  <View style={[styles.statsCard, { backgroundColor: colors.bgSecondary }]}>
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: FASTING_GREEN }]}>
                          {stats.currentStreak}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                          Current Streak
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                          {stats.longestStreak}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                          Longest Streak
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                          {stats.totalFastingHours}h
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                          Total Hours
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                          {stats.averageFastHours}h
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                          Avg Fast
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                          {stats.totalFastsCompleted}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                          Fasts Completed
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                          {stats.completionRate}%
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                          Completion Rate
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Recent History */}
              {recentSessions.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    RECENT FASTS
                  </Text>
                  <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
                    {recentSessions.slice(0, 7).map((session: FastingSession, index: number) => (
                      <View key={session.id}>
                        {index > 0 && (
                          <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />
                        )}
                        <View style={styles.historyRow}>
                          <View style={styles.historyLeft}>
                            <Text style={[styles.historyDate, { color: colors.textPrimary }]}>
                              {formatDate(session.startTime)}
                            </Text>
                            <Text style={[styles.historyTime, { color: colors.textSecondary }]}>
                              {session.actualHours
                                ? formatDuration(session.actualHours)
                                : 'In progress'}
                            </Text>
                          </View>
                          <View style={styles.historyRight}>
                            {session.status === 'completed' && (
                              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                            )}
                            {session.status === 'ended_early' && (
                              <Ionicons name="time" size={20} color={colors.warning} />
                            )}
                            {session.status === 'active' && (
                              <Ionicons name="timer" size={20} color={FASTING_GREEN} />
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
        ) : (
          <PremiumGate context="planning">
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.section}>
                <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleContent}>
                      <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                        Fasting Timer
                      </Text>
                      <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                        Track your intermittent fasting windows
                      </Text>
                    </View>
                    <Ionicons name="lock-closed" size={20} color={colors.textTertiary} />
                  </View>
                </View>
              </View>
            </ScrollView>
          </PremiumGate>
        )}

        {/* Time Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={config?.typicalEatStart ? parseTimeString(config.typicalEatStart) : new Date()}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={handleStartTimeChange}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={config?.typicalEatEnd ? parseTimeString(config.typicalEatEnd) : new Date()}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={handleEndTimeChange}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: componentSpacing.screenEdgePadding,
    gap: spacing[6],
    paddingBottom: spacing[8],
  },
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    ...typography.body.small,
    marginBottom: spacing[1],
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  toggleContent: {
    flex: 1,
    gap: spacing[1],
  },
  toggleTitle: {
    ...typography.body.large,
    fontWeight: '600',
  },
  toggleDescription: {
    ...typography.body.small,
  },
  optionsList: {
    gap: spacing[3],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  optionDescription: {
    ...typography.body.small,
    marginBottom: spacing[1],
  },
  optionMeta: {
    ...typography.caption,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  timeLabel: {
    ...typography.body.medium,
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  timeText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  notificationLabel: {
    ...typography.body.medium,
  },
  statsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[3],
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.title.large,
    fontWeight: '600',
  },
  statLabel: {
    ...typography.caption,
    marginTop: spacing[1],
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  historyTime: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  historyRight: {
    marginLeft: spacing[3],
  },
});
