import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import * as Haptics from 'expo-haptics';
import { spacing } from '@/constants/spacing';
import { useOnboardingStore } from '@/stores';
import { OnboardingScreen, OnboardingRadioCard } from '@/components/onboarding';
import { ExperienceLevel } from '@/types/domain';
import { getNextStep } from '@/utils/onboarding';
import { ONBOARDING_SUBTITLES } from '@/constants/onboarding-copy';

interface ExperienceOption {
  value: ExperienceLevel;
  label: string;
  subtitle: string;
  testID: string;
}

const experienceOptions: ExperienceOption[] = [
  {
    value: 'beginner',
    label: 'Beginner',
    subtitle: 'New to tracking — keep it simple',
    testID: 'onboarding-experience-beginner',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    subtitle: 'Some experience with nutrition tracking',
    testID: 'onboarding-experience-intermediate',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    subtitle: 'Experienced — I want full control',
    testID: 'onboarding-experience-advanced',
  },
];

export default function ExperienceScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useOnboardingStore();

  const [selected, setSelected] = useState<ExperienceLevel>(
    draft.experienceLevel ?? 'intermediate',
  );

  const handleSelect = (value: ExperienceLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelected(value);
  };

  const handleContinue = () => {
    updateDraft({ experienceLevel: selected, lastCompletedScreen: 'experience' });
    const next = getNextStep('experience', draft.goalPath, selected);
    if (next) {
      router.push(`/onboarding/${next}` as any);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <OnboardingScreen
      screenTestID="onboarding-experience-screen"
      title="What's your tracking experience?"
      subtitle={ONBOARDING_SUBTITLES.experience}
      onBack={handleBack}
      onContinue={handleContinue}
      backTestID="onboarding-experience-back-button"
      continueTestID="onboarding-experience-continue-button"
    >
      <View style={styles.options}>
        {experienceOptions.map((option) => (
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

const styles = StyleSheet.create({
  options: {
    gap: spacing[3],
  },
});
