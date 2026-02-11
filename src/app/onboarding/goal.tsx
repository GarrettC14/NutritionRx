import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { TestIDs } from '@/constants/testIDs';
import { spacing } from '@/constants/spacing';
import { useOnboardingStore } from '@/stores';
import { GoalPath } from '@/repositories/onboardingRepository';
import { OnboardingScreen, OnboardingRadioCard } from '@/components/onboarding';

// ─── Screen order logic ──────────────────────────────────────────

function getScreenOrder(goalPath: string | null): string[] {
  const base = ['goal', 'about-you', 'body-stats', 'activity', 'eating-style', 'protein'];
  if (goalPath === 'lose' || goalPath === 'gain') {
    return [...base, 'target', 'your-plan'];
  }
  return [...base, 'your-plan'];
}

// ─── Goal options ────────────────────────────────────────────────

interface GoalOption {
  value: GoalPath;
  label: string;
  subtitle: string;
  testID: string;
}

const goalOptions: GoalOption[] = [
  {
    value: 'lose',
    label: 'Lose weight',
    subtitle: 'Track calories to reach your goal',
    testID: TestIDs.Onboarding.GoalOptionLose,
  },
  {
    value: 'maintain',
    label: 'Maintain weight',
    subtitle: 'Keep your nutrition balanced',
    testID: TestIDs.Onboarding.GoalOptionMaintain,
  },
  {
    value: 'gain',
    label: 'Build muscle',
    subtitle: 'Optimize protein and calories',
    testID: TestIDs.Onboarding.GoalOptionBuild,
  },
  {
    value: 'track',
    label: 'Just track what I eat',
    subtitle: 'No specific goal in mind',
    testID: TestIDs.Onboarding.GoalOptionTrack,
  },
];

// Goals that use the target screen
const GOALS_WITH_TARGET: GoalPath[] = ['lose', 'gain'];

// ─── Component ───────────────────────────────────────────────────

export default function GoalPathScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useOnboardingStore();

  // Initialize from draft (supports resume)
  const [selected, setSelected] = useState<GoalPath | null>(draft.goalPath);

  const handleSelect = (value: GoalPath) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelected(value);
  };

  const handleContinue = () => {
    if (!selected) return;

    // If the goal changed FROM lose/gain TO maintain/track, clear target fields
    const previousGoal = draft.goalPath;
    const hadTarget = previousGoal !== null && GOALS_WITH_TARGET.includes(previousGoal);
    const needsTarget = GOALS_WITH_TARGET.includes(selected);

    if (hadTarget && !needsTarget) {
      updateDraft({
        goalPath: selected,
        targetWeightKg: null,
        targetRatePercent: 0,
        lastCompletedScreen: 'goal',
      });
    } else {
      updateDraft({
        goalPath: selected,
        lastCompletedScreen: 'goal',
      });
    }

    router.push('/onboarding/about-you');
  };

  const totalSteps = getScreenOrder(selected).length;

  return (
    <OnboardingScreen
      title={"What brings you to\nNutritionRx?"}
      step={1}
      totalSteps={totalSteps}
      onContinue={handleContinue}
      continueDisabled={selected === null}
      continueTestID={TestIDs.Onboarding.GoalContinueButton}
      screenTestID={TestIDs.Onboarding.GoalScreen}
    >
      <View style={styles.options}>
        {goalOptions.map((option) => (
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
