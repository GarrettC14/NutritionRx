import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore, useSettingsStore, useWeightStore, useGoalStore, useOnboardingStore } from '@/stores';
import { useLegalAcknowledgment } from '@/features/legal/hooks/useLegalAcknowledgment';

export default function AppInitializer() {
  const { colors } = useTheme();

  const { profile, loadProfile, isLoaded: profileLoaded } = useProfileStore();
  const { loadSettings, isLoaded: settingsLoaded } = useSettingsStore();
  const { loadEntries: loadWeightEntries } = useWeightStore();
  const { loadActiveGoal } = useGoalStore();
  const { loadOnboarding, isComplete: onboardingComplete, isLoaded: onboardingLoaded, migrateFromLegacy } = useOnboardingStore();
  const { isLoading: legalLoading, needsAcknowledgment } = useLegalAcknowledgment();

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Load all required data
        await Promise.all([
          loadProfile(),
          loadSettings(),
          loadWeightEntries(),
          loadActiveGoal(),
          loadOnboarding(),
        ]);
        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsInitialized(true); // Still proceed to avoid blocking
      }
    };

    initialize();
  }, []);

  // Legacy migration: if old profile flags exist but onboarding store isn't complete, migrate
  useEffect(() => {
    if (!isInitialized || !profileLoaded || !onboardingLoaded) return;
    if (!onboardingComplete && (profile?.hasCompletedOnboarding || profile?.onboardingSkipped)) {
      migrateFromLegacy();
    }
  }, [isInitialized, profileLoaded, onboardingLoaded]);

  // Show loading spinner while initializing
  if (!isInitialized || !profileLoaded || !onboardingLoaded || legalLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  // Check if legal acknowledgment is needed (first priority)
  if (needsAcknowledgment) {
    return <Redirect href="/legal-acknowledgment" />;
  }

  // Redirect based on onboarding status (single source of truth)
  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
