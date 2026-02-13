import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import * as Haptics from 'expo-haptics';
import { spacing } from '@/constants/spacing';
import { useOnboardingStore } from '@/stores';
import { OnboardingScreen, OnboardingRadioCard } from '@/components/onboarding';
import { EatingStyle } from '@/types/domain';
import { ONBOARDING_SUBTITLES } from '@/constants/onboarding-copy';

interface EatingStyleOption {
  value: EatingStyle;
  label: string;
  subtitle: string;
  testID: string;
}

const eatingStyleOptions: EatingStyleOption[] = [
  {
    value: 'flexible',
    label: 'Flexible',
    subtitle: 'A balanced mix of carbs and fats',
    testID: 'onboarding-eating-flexible',
  },
  {
    value: 'carb_focused',
    label: 'Carb-Focused',
    subtitle: 'More carbs for energy and performance',
    testID: 'onboarding-eating-carb',
  },
  {
    value: 'fat_focused',
    label: 'Fat-Focused',
    subtitle: 'More fats, moderate carbs',
    testID: 'onboarding-eating-fat',
  },
  {
    value: 'very_low_carb',
    label: 'Very Low Carb',
    subtitle: 'Under 50g carbs (keto-friendly)',
    testID: 'onboarding-eating-lowcarb',
  },
];

export default function EatingStyleScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useOnboardingStore();

  const [selected, setSelected] = useState<EatingStyle>(draft.eatingStyle ?? 'flexible');

  const handleSelect = (value: EatingStyle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelected(value);
  };

  const handleContinue = () => {
    updateDraft({ eatingStyle: selected, lastCompletedScreen: 'eating-style' });
    router.push('/onboarding/protein');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <OnboardingScreen
      screenTestID="onboarding-eating-style-screen"
      title="How do you like to eat?"
      subtitle={ONBOARDING_SUBTITLES['eating-style']}
      onBack={handleBack}
      onContinue={handleContinue}
      backTestID="onboarding-eating-style-back-button"
      continueTestID="onboarding-eating-style-continue-button"
    >
      <View style={styles.options}>
        {eatingStyleOptions.map((option) => (
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
