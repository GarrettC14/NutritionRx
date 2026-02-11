import { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { useOnboardingStore } from '@/stores';
import { OnboardingScreen, OnboardingRadioCard } from '@/components/onboarding';
import { ProteinPriority } from '@/types/domain';

const PROTEIN_G_PER_KG: Record<ProteinPriority, number> = {
  standard: 1.32,
  active: 1.65,
  athletic: 1.98,
  maximum: 2.2,
};

interface ProteinOption {
  value: ProteinPriority;
  label: string;
  description: string;
  testID: string;
}

const proteinOptions: ProteinOption[] = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'General health',
    testID: 'onboarding-protein-standard',
  },
  {
    value: 'active',
    label: 'Active',
    description: 'Regular exercise',
    testID: 'onboarding-protein-active',
  },
  {
    value: 'athletic',
    label: 'Athletic',
    description: 'Intense training',
    testID: 'onboarding-protein-athletic',
  },
  {
    value: 'maximum',
    label: 'Maximum',
    description: 'Bodybuilding or cutting',
    testID: 'onboarding-protein-maximum',
  },
];

function getScreenOrder(goalPath: string | null): string[] {
  const base = ['goal', 'about-you', 'body-stats', 'activity', 'eating-style', 'protein'];
  if (goalPath === 'lose' || goalPath === 'gain') {
    return [...base, 'target', 'your-plan'];
  }
  return [...base, 'your-plan'];
}

export default function ProteinScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { draft, updateDraft } = useOnboardingStore();

  const [selected, setSelected] = useState<ProteinPriority>(draft.proteinPriority ?? 'active');

  const totalSteps = getScreenOrder(draft.goalPath).length;
  const weightKg = draft.currentWeightKg ?? 80;

  const proteinSubtitles = useMemo(() => {
    const subtitles: Record<ProteinPriority, string> = {} as Record<ProteinPriority, string>;
    for (const option of proteinOptions) {
      const grams = Math.round(weightKg * PROTEIN_G_PER_KG[option.value]);
      subtitles[option.value] = `~${grams}g/day \u00B7 ${option.description}`;
    }
    return subtitles;
  }, [weightKg]);

  const handleSelect = (value: ProteinPriority) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelected(value);
  };

  const handleContinue = () => {
    updateDraft({ proteinPriority: selected, lastCompletedScreen: 'protein' });
    if (draft.goalPath === 'lose' || draft.goalPath === 'gain') {
      router.push('/onboarding/target');
    } else {
      router.push('/onboarding/your-plan');
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <OnboardingScreen
      screenTestID="onboarding-protein-screen"
      title="How much protein do you want?"
      subtitle="Higher protein helps preserve muscle, especially when losing weight."
      step={6}
      totalSteps={totalSteps}
      onBack={handleBack}
      onContinue={handleContinue}
      backTestID="onboarding-protein-back-button"
      continueTestID="onboarding-protein-continue-button"
    >
      <View style={styles.options}>
        {proteinOptions.map((option) => (
          <OnboardingRadioCard
            key={option.value}
            testID={option.testID}
            label={option.label}
            subtitle={proteinSubtitles[option.value]}
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
