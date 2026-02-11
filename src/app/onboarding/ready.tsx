import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { TestIDs } from '@/constants/testIDs';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useOnboardingStore, useSettingsStore } from '@/stores';

interface ActionOption {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  testID: string;
}

const actionOptions: ActionOption[] = [
  {
    icon: 'camera-outline',
    label: 'Scan a barcode',
    route: '/add-food/scan',
    testID: TestIDs.Onboarding.ReadyScanBarcode,
  },
  {
    icon: 'search-outline',
    label: 'Search for a food',
    route: '/add-food',
    testID: TestIDs.Onboarding.ReadySearchFood,
  },
  {
    icon: 'eye-outline',
    label: 'Explore the app first',
    route: '/(tabs)',
    testID: TestIDs.Onboarding.ReadyExploreApp,
  },
];

export default function ReadyScreen() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const { completeOnboarding, goalPath, energyUnit, weightUnit } = useOnboardingStore();
  const { setWeightUnit } = useSettingsStore();

  const [isLoading, setIsLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState<string | null>(null);

  const handleAction = async (route: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setActiveRoute(route);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      // Complete onboarding with current preferences
      await completeOnboarding(goalPath || 'track', energyUnit, weightUnit);

      // Also update the settings store weight unit for consistency
      await setWeightUnit(weightUnit);

      // Navigate to the chosen destination
      router.replace(route as any);
    } catch (error) {
      Alert.alert(
        'Setup Error',
        'Something went wrong while saving your preferences. Please try again.',
      );
    } finally {
      setIsLoading(false);
      setActiveRoute(null);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView testID={TestIDs.Onboarding.ReadyScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable testID={TestIDs.Onboarding.ReadyBackButton} onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Checkmark with animation */}
        <Animated.View
          entering={reducedMotion ? undefined : ZoomIn.duration(400).delay(200)}
          style={[styles.checkContainer, { backgroundColor: colors.success + '20' }]}
        >
          <Ionicons name="checkmark" size={48} color={colors.success} />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={reducedMotion ? undefined : FadeIn.duration(400).delay(400)}
          style={[styles.title, { color: colors.textPrimary }]}
        >
          You're ready!
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={reducedMotion ? undefined : FadeIn.duration(400).delay(500)}
          style={[styles.subtitle, { color: colors.textSecondary }]}
        >
          How would you like to start?
        </Animated.Text>

        {/* Action Options */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(400).delay(600)}
          style={styles.options}
        >
          {actionOptions.map((option) => {
            const isActive = activeRoute === option.route;
            return (
              <Pressable
                key={option.route}
                testID={option.testID}
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.bgSecondary, opacity: isLoading && !isActive ? 0.5 : 1 },
                ]}
                onPress={() => handleAction(option.route)}
                disabled={isLoading}
              >
                <Ionicons name={option.icon} size={24} color={colors.accent} style={{ marginRight: spacing[3] }} />
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                  {isActive ? 'Setting up...' : option.label}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            );
          })}
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
  optionLabel: {
    ...typography.body.large,
    fontWeight: '500',
    flex: 1,
  },
});
