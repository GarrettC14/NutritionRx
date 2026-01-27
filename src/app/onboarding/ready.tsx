import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useOnboardingStore, useSettingsStore } from '@/stores';

interface ActionOption {
  emoji: string;
  label: string;
  route: string;
}

const actionOptions: ActionOption[] = [
  {
    emoji: '📷',
    label: 'Scan a barcode',
    route: '/add-food/scan',
  },
  {
    emoji: '🔍',
    label: 'Search for a food',
    route: '/add-food',
  },
  {
    emoji: '👀',
    label: 'Explore the app first',
    route: '/(tabs)',
  },
];

export default function ReadyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { completeOnboarding, goalPath, energyUnit, weightUnit } = useOnboardingStore();
  const { setWeightUnit } = useSettingsStore();

  const handleAction = async (route: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Complete onboarding with current preferences
    await completeOnboarding(goalPath || 'track', energyUnit, weightUnit);

    // Also update the settings store weight unit for consistency
    await setWeightUnit(weightUnit);

    // Navigate to the chosen destination
    router.replace(route as any);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Checkmark with animation */}
        <Animated.View
          entering={ZoomIn.duration(400).delay(200)}
          style={[styles.checkContainer, { backgroundColor: colors.success + '20' }]}
        >
          <Ionicons name="checkmark" size={48} color={colors.success} />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeIn.duration(400).delay(400)}
          style={[styles.title, { color: colors.textPrimary }]}
        >
          You're ready!
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeIn.duration(400).delay(500)}
          style={[styles.subtitle, { color: colors.textSecondary }]}
        >
          How would you like to start?
        </Animated.Text>

        {/* Action Options */}
        <Animated.View
          entering={FadeIn.duration(400).delay(600)}
          style={styles.options}
        >
          {actionOptions.map((option, index) => (
            <Pressable
              key={option.route}
              style={[
                styles.optionCard,
                { backgroundColor: colors.bgSecondary },
              ]}
              onPress={() => handleAction(option.route)}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                {option.label}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[8],
    alignItems: 'center',
  },
  checkContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    ...typography.display.medium,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.large,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  options: {
    width: '100%',
    gap: spacing[3],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: spacing[3],
  },
  optionLabel: {
    ...typography.body.large,
    fontWeight: '500',
    flex: 1,
  },
});
