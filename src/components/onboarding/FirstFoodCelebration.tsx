import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useOnboardingStore, useSettingsStore } from '@/stores';

interface FirstFoodCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
  caloriesLogged: number;
}

export function FirstFoodCelebration({
  visible,
  onDismiss,
  caloriesLogged,
}: FirstFoodCelebrationProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const { shouldShowCelebration } = useOnboardingStore();
  const { settings } = useSettingsStore();

  const showProgressBar = shouldShowCelebration();
  const calorieGoal = settings.dailyCalorieGoal;
  const progressPercent = Math.min((caloriesLogged / calorieGoal) * 100, 100);

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onDismiss();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleDismiss} accessibilityRole="button" accessibilityLabel="Dismiss celebration">
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            entering={reducedMotion ? undefined : ZoomIn.duration(300).springify().damping(15)}
            style={[styles.card, { backgroundColor: colors.bgElevated }]}
          >
            {/* Icon */}
            <Animated.View entering={reducedMotion ? undefined : FadeIn.delay(200)} style={{ marginBottom: spacing[4] }}>
              <Ionicons name="trophy-outline" size={56} color={colors.accent} />
            </Animated.View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              First food logged!
            </Text>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              You're off to a great start.{'\n'}Tracking gets easier with practice.
            </Text>

            {/* Progress Bar (only for users with a goal) */}
            {showProgressBar && (
              <View style={[styles.progressContainer, { backgroundColor: colors.bgSecondary }]}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  Today's Progress
                </Text>
                <View style={[styles.progressBarTrack, { backgroundColor: colors.ringTrack }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: colors.accent,
                        width: `${progressPercent}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.textPrimary }]}>
                  {caloriesLogged.toLocaleString()} / {calorieGoal.toLocaleString()} calories
                </Text>
              </View>
            )}

            {/* Button */}
            <View style={styles.buttonContainer}>
              <Button
                label="Continue"
                onPress={handleDismiss}
                fullWidth
              />
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
  },
  title: {
    ...typography.display.small,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.medium,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  progressContainer: {
    width: '100%',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[6],
  },
  progressLabel: {
    ...typography.body.small,
    marginBottom: spacing[2],
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    marginBottom: spacing[2],
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    ...typography.body.small,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
  },
});
