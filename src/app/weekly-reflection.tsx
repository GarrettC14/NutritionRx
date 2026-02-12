import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useGoalStore, useSettingsStore } from '@/stores';
import { DataQuality } from '@/types/domain';
import { TestIDs } from '@/constants/testIDs';

export default function WeeklyReflectionScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const {
    activeGoal,
    pendingReflection,
    acceptReflection,
    declineReflection,
    loadPendingReflection,
    isLoading,
  } = useGoalStore();
  const { settings } = useSettingsStore();

  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPendingReflection();
  }, []);

  const handleAccept = async () => {
    if (!pendingReflection) return;

    try {
      await acceptReflection(pendingReflection.id, notes || undefined);
      Alert.alert(
        'Targets Updated',
        'Your daily targets have been adjusted based on your progress.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      if (__DEV__) console.error('Failed to accept reflection:', error);
      Alert.alert('Error', 'Failed to update targets. Please try again.');
    }
  };

  const handleDecline = async () => {
    if (!pendingReflection) return;

    try {
      await declineReflection(pendingReflection.id, notes || undefined);
      router.back();
    } catch (error) {
      if (__DEV__) console.error('Failed to decline reflection:', error);
      Alert.alert('Error', 'Failed to decline. Please try again.');
    }
  };

  const getDataQualityColor = (quality?: DataQuality): string => {
    switch (quality) {
      case 'good':
        return colors.success;
      case 'partial':
        return colors.warning;
      case 'insufficient':
        return colors.error;
      default:
        return colors.textTertiary;
    }
  };

  const getDataQualityLabel = (quality?: DataQuality): string => {
    switch (quality) {
      case 'good':
        return 'Good Data';
      case 'partial':
        return 'Partial Data';
      case 'insufficient':
        return 'Insufficient Data';
      default:
        return 'Unknown';
    }
  };

  const formatWeight = (weightKg?: number): string => {
    if (!weightKg) return '--';
    if (settings.weightUnit === 'lbs') {
      return `${(weightKg * 2.20462).toFixed(1)} lbs`;
    }
    return `${weightKg.toFixed(1)} kg`;
  };

  // No pending reflection
  if (!pendingReflection) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Weekly Check-in</Text>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.emptyContent}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All caught up!</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            No pending weekly check-ins. Keep tracking and we'll notify you when it's time for your
            next review.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasCalorieAdjustment =
    pendingReflection.newTargetCalories &&
    activeGoal &&
    pendingReflection.newTargetCalories !== activeGoal.currentTargetCalories;

  return (
    <SafeAreaView testID={TestIDs.Reflection.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Week {pendingReflection.weekNumber} Check-in
        </Text>
        <Pressable testID={TestIDs.Reflection.CloseButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Data Quality Badge */}
        <View
          style={[
            styles.qualityBadge,
            { backgroundColor: getDataQualityColor(pendingReflection.dataQuality) + '20' },
          ]}
        >
          <Ionicons
            name={
              pendingReflection.dataQuality === 'good'
                ? 'checkmark-circle'
                : pendingReflection.dataQuality === 'partial'
                  ? 'alert-circle'
                  : 'close-circle'
            }
            size={20}
            color={getDataQualityColor(pendingReflection.dataQuality)}
          />
          <Text
            style={[styles.qualityText, { color: getDataQualityColor(pendingReflection.dataQuality) }]}
          >
            {getDataQualityLabel(pendingReflection.dataQuality)}
          </Text>
        </View>

        {/* Week Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>THIS WEEK</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {pendingReflection.daysLogged || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Days Logged</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {pendingReflection.daysWeighed || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Weigh-ins</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {pendingReflection.avgCalorieIntake?.toLocaleString() || '--'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Calories</Text>
            </View>
          </View>

          {/* Weight Change */}
          {pendingReflection.weightChangeKg !== undefined && (
            <View style={[styles.weightChange, { borderTopColor: colors.bgInteractive }]}>
              <Text style={[styles.weightChangeLabel, { color: colors.textSecondary }]}>
                Weight Change
              </Text>
              <Text
                style={[
                  styles.weightChangeValue,
                  {
                    color:
                      pendingReflection.weightChangeKg < 0
                        ? colors.success
                        : pendingReflection.weightChangeKg > 0
                          ? colors.warning
                          : colors.textPrimary,
                  },
                ]}
              >
                {pendingReflection.weightChangeKg > 0 ? '+' : ''}
                {formatWeight(pendingReflection.weightChangeKg)}
              </Text>
            </View>
          )}
        </View>

        {/* Recommendation Card */}
        {hasCalorieAdjustment && (
          <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>RECOMMENDATION</Text>

            <View style={styles.adjustmentRow}>
              <View style={styles.adjustmentItem}>
                <Text style={[styles.adjustmentLabel, { color: colors.textSecondary }]}>
                  Current
                </Text>
                <Text style={[styles.adjustmentValue, { color: colors.textPrimary }]}>
                  {activeGoal?.currentTargetCalories.toLocaleString()} kcal
                </Text>
              </View>

              <Ionicons name="arrow-forward" size={24} color={colors.textTertiary} />

              <View style={styles.adjustmentItem}>
                <Text style={[styles.adjustmentLabel, { color: colors.textSecondary }]}>
                  Suggested
                </Text>
                <Text style={[styles.adjustmentValue, { color: colors.accent }]}>
                  {pendingReflection.newTargetCalories?.toLocaleString()} kcal
                </Text>
              </View>
            </View>

            <Text style={[styles.adjustmentNote, { color: colors.textTertiary }]}>
              Based on your actual results, we recommend adjusting your daily target to help you
              reach your goals.
            </Text>
          </View>
        )}

        {/* No Change Needed */}
        {!hasCalorieAdjustment && (
          <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.noChangeContent}>
              <Ionicons name="thumbs-up" size={32} color={colors.success} />
              <Text style={[styles.noChangeTitle, { color: colors.textPrimary }]}>
                You're on track!
              </Text>
              <Text style={[styles.noChangeText, { color: colors.textSecondary }]}>
                Your current targets are working well. Keep up the great work!
              </Text>
            </View>
          </View>
        )}

        {/* Notes Input */}
        <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
            NOTES (OPTIONAL)
          </Text>
          <TextInput
            testID={TestIDs.Reflection.NotesInput}
            style={[
              styles.notesInput,
              { color: colors.textPrimary, borderColor: colors.bgInteractive },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did this week feel?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {hasCalorieAdjustment ? (
          <>
            <Button
              testID={TestIDs.Reflection.KeepTargetsButton}
              label="Keep Current Targets"
              variant="secondary"
              onPress={handleDecline}
              fullWidth
              style={{ marginBottom: spacing[3] }}
              loading={isLoading}
            />
            <Button
              testID={TestIDs.Reflection.AcceptNewButton}
              label="Accept New Targets"
              onPress={handleAccept}
              fullWidth
              loading={isLoading}
            />
          </>
        ) : (
          <Button
            testID={TestIDs.Reflection.DoneButton}
            label="Done"
            onPress={() => router.back()}
            fullWidth
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  headerTitle: {
    ...typography.title.large,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: componentSpacing.screenEdgePadding,
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: componentSpacing.screenEdgePadding,
    gap: spacing[3],
  },
  emptyTitle: {
    ...typography.title.large,
    marginTop: spacing[4],
  },
  emptySubtitle: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  qualityText: {
    ...typography.body.small,
    fontWeight: '600',
  },
  card: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[4],
  },
  cardTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  statValue: {
    ...typography.title.large,
  },
  statLabel: {
    ...typography.caption,
  },
  weightChange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[4],
    borderTopWidth: 1,
  },
  weightChangeLabel: {
    ...typography.body.medium,
  },
  weightChangeValue: {
    ...typography.title.medium,
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustmentItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  adjustmentLabel: {
    ...typography.caption,
  },
  adjustmentValue: {
    ...typography.title.medium,
  },
  adjustmentNote: {
    ...typography.body.small,
  },
  noChangeContent: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  noChangeTitle: {
    ...typography.title.medium,
  },
  noChangeText: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  notesInput: {
    ...typography.body.medium,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    padding: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
});
