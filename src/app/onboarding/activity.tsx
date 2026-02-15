import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import * as Haptics from 'expo-haptics';
import { spacing } from '@/constants/spacing';
import { useOnboardingStore } from '@/stores';
import { ActivityLevel } from '@/constants/defaults';
import { OnboardingScreen, OnboardingRadioCard } from '@/components/onboarding';
import { ONBOARDING_SUBTITLES } from '@/constants/onboarding-copy';

// ─── Activity options ────────────────────────────────────────────

interface ActivityOption {
  value: ActivityLevel;
  label: string;
  subtitle: string;
  testID: string;
}

const activityOptions: ActivityOption[] = [
  {
    value: 'sedentary',
    label: 'Not very active',
    subtitle: 'Desk job, not much movement',
    testID: 'onboarding-activity-sedentary',
  },
  {
    value: 'lightly_active',
    label: 'A little active',
    subtitle: 'Some walking, light exercise 1-2x/week',
    testID: 'onboarding-activity-lightly',
  },
  {
    value: 'moderately_active',
    label: 'Fairly active',
    subtitle: 'Regular exercise 3-4x/week',
    testID: 'onboarding-activity-moderately',
  },
  {
    value: 'very_active',
    label: 'Very active',
    subtitle: 'Hard workouts 5-6x/week',
    testID: 'onboarding-activity-very',
  },
  {
    value: 'extremely_active',
    label: 'Extremely active',
    subtitle: 'Intense daily training or physical job',
    testID: 'onboarding-activity-extremely',
  },
];

const DEFAULT_ACTIVITY: ActivityLevel = 'moderately_active';

// ─── Component ───────────────────────────────────────────────────

export default function ActivityScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useOnboardingStore();

  // Initialize from draft if resuming, otherwise default to moderately_active
  const [selected, setSelected] = useState<ActivityLevel>(
    draft.activityLevel ?? DEFAULT_ACTIVITY,
  );

  const handleSelect = (value: ActivityLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelected(value);
  };

  const handleContinue = () => {
    updateDraft({
      activityLevel: selected,
      lastCompletedScreen: 'activity',
    });

    router.push('/onboarding/experience');
  };

  return (
    <OnboardingScreen
      title="How active are you?"
      subtitle={ONBOARDING_SUBTITLES.activity}
      onBack={() => router.back()}
      onContinue={handleContinue}
      continueTestID="onboarding-activity-continue-button"
      screenTestID="onboarding-activity-screen"
      backTestID="onboarding-activity-back-button"
      infoText="Not sure? Start lower — we'll help you adjust based on your results."
    >
      <View style={styles.options}>
        {activityOptions.map((option) => (
          <OnboardingRadioCard
            key={option.value}
            testID={option.testID}
            label={option.label}
            subtitle={option.subtitle}
            selected={selected === option.value}
            onPress={() => handleSelect(option.value)}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  options: {
    gap: spacing[3],
  },
});
