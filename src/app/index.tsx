import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore, useSettingsStore, useWeightStore, useGoalStore } from '@/stores';

export default function AppInitializer() {
  const { colors } = useTheme();

  const { profile, loadProfile, isLoaded: profileLoaded } = useProfileStore();
  const { loadSettings, isLoaded: settingsLoaded } = useSettingsStore();
  const { loadEntries: loadWeightEntries } = useWeightStore();
  const { loadActiveGoal } = useGoalStore();

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
        ]);
        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsInitialized(true); // Still proceed to avoid blocking
      }
    };

    initialize();
  }, []);

  // Show loading spinner while initializing
  if (!isInitialized || !profileLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  // Check if onboarding is needed
  const needsOnboarding = !profile?.hasCompletedOnboarding && !profile?.onboardingSkipped;

  // Redirect based on onboarding status
  if (needsOnboarding) {
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
