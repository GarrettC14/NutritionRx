import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { ACTIVITY_MULTIPLIERS, CALORIE_FLOORS, CALORIES_PER_KG } from '@/constants/defaults';
import { macroCalculator } from '@/services/macroCalculator';
import { useOnboardingStore, useGoalStore } from '@/stores';
import { profileRepository, weightRepository, settingsRepository, GoalType } from '@/repositories';
import { onboardingRepository, GoalPath } from '@/repositories/onboardingRepository';
import { OnboardingScreen } from '@/components/onboarding';

// ============================================================
// Helpers
// ============================================================

function getScreenOrder(goalPath: string | null): string[] {
  const base = ['goal', 'about-you', 'body-stats', 'activity', 'eating-style', 'protein'];
  if (goalPath === 'lose' || goalPath === 'gain') {
    return [...base, 'target', 'your-plan'];
  }
  return [...base, 'your-plan'];
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function calculateBMR(weightKg: number, heightCm: number, age: number, sex: 'male' | 'female'): number {
  const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? baseBMR + 5 : baseBMR - 161;
}

function calculateTDEE(bmr: number, activityLevel: keyof typeof ACTIVITY_MULTIPLIERS): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

function calculateTargetCalories(
  tdee: number,
  goalType: GoalType,
  ratePercent: number,
  sex: 'male' | 'female',
  weightKg: number,
): number {
  const weeklyKgChange = (ratePercent / 100) * weightKg;
  const dailyDeficitOrSurplus = (weeklyKgChange * CALORIES_PER_KG) / 7;

  let targetCalories: number;
  switch (goalType) {
    case 'lose':
      targetCalories = tdee - dailyDeficitOrSurplus;
      break;
    case 'gain':
      targetCalories = tdee + dailyDeficitOrSurplus;
      break;
    case 'maintain':
    default:
      targetCalories = tdee;
      break;
  }

  const floor = CALORIE_FLOORS[sex];
  return Math.max(targetCalories, floor);
}

// ============================================================
// Summary Screen
// ============================================================

export default function YourPlanScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { draft, updateDraft, clearDraft } = useOnboardingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const screenOrder = getScreenOrder(draft.goalPath);
  const totalSteps = screenOrder.length;
  const step = totalSteps; // last screen

  const goalType: GoalType = draft.goalPath === 'track' ? 'maintain' : (draft.goalPath as GoalType) ?? 'maintain';
  const isTrack = draft.goalPath === 'track';

  // Calculate plan values for display
  const plan = useMemo(() => {
    const weight = draft.currentWeightKg ?? 80;
    const height = draft.heightCm ?? 170;
    const sex = draft.sex ?? 'male';
    const age = draft.dateOfBirth ? calculateAge(draft.dateOfBirth) : 30;
    const activity = draft.activityLevel ?? 'moderately_active';
    const eating = draft.eatingStyle ?? 'flexible';
    const protein = draft.proteinPriority ?? 'active';
    const rate = draft.targetRatePercent;

    const bmr = calculateBMR(weight, height, age, sex);
    const tdee = calculateTDEE(bmr, activity);
    const targetCalories = calculateTargetCalories(tdee, goalType, rate, sex, weight);
    const roundedCalories = Math.round(targetCalories);

    const macros = macroCalculator.calculateMacrosWithBreakdown({
      weightKg: weight,
      targetCalories: roundedCalories,
      eatingStyle: eating,
      proteinPriority: protein,
    });

    // Deficit/surplus
    const dailyDifference = Math.abs(Math.round(tdee - roundedCalories));

    // ETA for lose/gain
    let etaWeeks: number | null = null;
    let etaDate: string | null = null;
    if ((draft.goalPath === 'lose' || draft.goalPath === 'gain') && draft.targetWeightKg && rate > 0) {
      const weeklyKg = (weight * rate) / 100;
      if (weeklyKg > 0) {
        etaWeeks = Math.round(Math.abs(weight - draft.targetWeightKg) / weeklyKg);
        const d = new Date();
        d.setDate(d.getDate() + etaWeeks * 7);
        etaDate = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      }
    }

    // Calorie floor hit?
    const floor = CALORIE_FLOORS[sex];
    const hitFloor = roundedCalories <= floor;

    return {
      tdee: Math.round(tdee),
      calories: roundedCalories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      proteinPercent: macros.proteinPercent,
      carbsPercent: macros.carbsPercent,
      fatPercent: macros.fatPercent,
      dailyDifference,
      etaWeeks,
      etaDate,
      hitFloor,
      targetWeightDisplay: draft.targetWeightKg
        ? draft.weightUnit === 'lbs'
          ? `${Math.round(draft.targetWeightKg * 2.20462)} lbs`
          : `${Math.round(draft.targetWeightKg)} kg`
        : null,
    };
  }, [draft, goalType]);

  // ─── Completion Handler ───────────────────────────────────────

  const handleStartTracking = async () => {
    // Validate required inputs
    if (
      !draft.sex ||
      !draft.dateOfBirth ||
      !draft.heightCm ||
      !draft.currentWeightKg ||
      !draft.activityLevel ||
      !draft.eatingStyle ||
      !draft.proteinPriority
    ) {
      Alert.alert('Missing Information', 'Some required information is missing. Please go back and fill in all fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const age = calculateAge(draft.dateOfBirth);
      const mappedGoalType: GoalType = draft.goalPath === 'track' ? 'maintain' : (draft.goalPath as GoalType);

      // 1. Profile (single merged write — includes hasCompletedOnboarding)
      await profileRepository.update({
        sex: draft.sex!,
        dateOfBirth: draft.dateOfBirth!,
        heightCm: draft.heightCm!,
        activityLevel: draft.activityLevel!,
        eatingStyle: draft.eatingStyle!,
        proteinPriority: draft.proteinPriority!,
        hasCompletedOnboarding: true,
      });

      // 2. Create goal (goalStore calculates TDEE/macros, re-throws on error)
      await useGoalStore.getState().createGoal({
        type: mappedGoalType,
        currentWeightKg: draft.currentWeightKg!,
        targetWeightKg:
          (draft.goalPath === 'lose' || draft.goalPath === 'gain') && draft.targetWeightKg != null
            ? draft.targetWeightKg
            : undefined,
        targetRatePercent: draft.targetRatePercent,
        sex: draft.sex!,
        heightCm: draft.heightCm!,
        age,
        activityLevel: draft.activityLevel!,
        eatingStyle: draft.eatingStyle!,
        proteinPriority: draft.proteinPriority!,
      });

      // 3. Seed weight entry
      await weightRepository.create({
        date: new Date().toISOString().split('T')[0],
        weightKg: draft.currentWeightKg!,
      });

      // 4. Height unit setting
      await settingsRepository.set('height_unit', draft.heightUnit);

      // 5. Onboarding completion settings (writes: complete, completed_at,
      //    goal_path, energy_unit, weight_unit — called directly so errors
      //    propagate instead of being swallowed by the store)
      await onboardingRepository.completeOnboarding(
        draft.goalPath as GoalPath,
        draft.energyUnit,
        draft.weightUnit,
      );

      // Sync onboarding store in memory (no additional DB writes)
      useOnboardingStore.setState({
        isComplete: true,
        goalPath: draft.goalPath as GoalPath,
        energyUnit: draft.energyUnit,
        weightUnit: draft.weightUnit,
        isLoading: false,
        error: null,
      });

      clearDraft();
      router.replace('/(tabs)');
    } catch (error) {
      if (__DEV__) console.error('[Onboarding] Completion failed:', error);
      Alert.alert(
        'Something went wrong',
        'We couldn\'t save your information. Please try again.',
        [{ text: 'Try Again', onPress: () => setIsSubmitting(false) }],
      );
      return;
    }

    setIsSubmitting(false);
  };

  // ─── Header text by goal path ─────────────────────────────────

  const headerTitle = isTrack ? 'Here\'s a starting point' : 'Your plan is ready';

  // ─── Detail lines by goal path ────────────────────────────────

  const renderDetailLines = () => {
    const lines: { label: string; value: string }[] = [
      { label: 'Estimated TDEE', value: `${plan.tdee.toLocaleString()} cal/day` },
    ];

    if (draft.goalPath === 'lose') {
      lines.push({ label: 'Daily deficit', value: `${plan.dailyDifference.toLocaleString()} cal/day` });
    } else if (draft.goalPath === 'gain') {
      lines.push({ label: 'Daily surplus', value: `${plan.dailyDifference.toLocaleString()} cal/day` });
    }

    if (plan.etaWeeks && plan.etaDate && plan.targetWeightDisplay) {
      lines.push({
        label: 'Goal',
        value: draft.goalPath === 'lose'
          ? `Lose to ${plan.targetWeightDisplay} in ~${plan.etaWeeks} weeks`
          : `Gain to ${plan.targetWeightDisplay} in ~${plan.etaWeeks} weeks`,
      });
    }

    return lines;
  };

  return (
    <OnboardingScreen
      title={headerTitle}
      step={step}
      totalSteps={totalSteps}
      onBack={() => router.back()}
      onContinue={handleStartTracking}
      continueLabel="Start Tracking"
      continueLoading={isSubmitting}
      continueDisabled={isSubmitting}
      backTestID="onboarding-your-plan-back-button"
      continueTestID="onboarding-start-tracking"
      screenTestID="onboarding-your-plan-screen"
    >
      {/* Main calorie card */}
      <View style={[styles.planCard, { backgroundColor: colors.bgSecondary }]}>
        {/* Calorie target */}
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
          {isTrack ? 'Suggested Intake' : 'Daily Calorie Target'}
        </Text>
        <Text style={[styles.calorieValue, { color: colors.textPrimary }]}>
          {plan.calories.toLocaleString()} cal
        </Text>

        {/* Macro breakdown */}
        <View style={styles.macroRow}>
          <View style={styles.macroItem}>
            <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
              {plan.protein}g
            </Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
              Protein
            </Text>
            <Text style={[styles.macroPercent, { color: colors.textTertiary }]}>
              {plan.proteinPercent}%
            </Text>
          </View>
          <View style={[styles.macroDivider, { backgroundColor: colors.borderDefault }]} />
          <View style={styles.macroItem}>
            <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
              {plan.carbs}g
            </Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
              Carbs
            </Text>
            <Text style={[styles.macroPercent, { color: colors.textTertiary }]}>
              {plan.carbsPercent}%
            </Text>
          </View>
          <View style={[styles.macroDivider, { backgroundColor: colors.borderDefault }]} />
          <View style={styles.macroItem}>
            <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
              {plan.fat}g
            </Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
              Fat
            </Text>
            <Text style={[styles.macroPercent, { color: colors.textTertiary }]}>
              {plan.fatPercent}%
            </Text>
          </View>
        </View>

        {/* Detail lines */}
        <View style={styles.detailSection}>
          <Text style={[styles.detailHeader, { color: colors.textSecondary }]}>
            Based on:
          </Text>
          {renderDetailLines().map((line, i) => (
            <View key={i} style={styles.detailRow}>
              <Text style={[styles.detailBullet, { color: colors.textTertiary }]}>•</Text>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {line.label}: {line.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Calorie floor warning */}
      {plan.hitFloor && (
        <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
          <Ionicons name="information-circle" size={18} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            We've set a minimum safe target. Consider a slower rate for sustainable results.
          </Text>
        </View>
      )}

      {/* Info text */}
      <View style={styles.bottomInfo}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
        <Text style={[styles.bottomInfoText, { color: colors.textTertiary }]}>
          {isTrack
            ? 'Adjust anytime in Settings — there\'s no wrong answer.'
            : 'These are starting estimates. We\'ll help you adjust as you go.'}
        </Text>
      </View>
    </OnboardingScreen>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  planCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  cardLabel: {
    ...typography.body.medium,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  calorieValue: {
    ...typography.metric.medium,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    ...typography.title.large,
    marginBottom: spacing[1],
  },
  macroLabel: {
    ...typography.body.small,
    marginBottom: spacing[1],
  },
  macroPercent: {
    ...typography.caption,
  },
  macroDivider: {
    width: 1,
    height: 40,
  },
  detailSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.15)',
    paddingTop: spacing[4],
  },
  detailHeader: {
    ...typography.body.small,
    fontWeight: '500',
    marginBottom: spacing[2],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  detailBullet: {
    ...typography.body.small,
    lineHeight: 20,
  },
  detailText: {
    ...typography.body.small,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  warningText: {
    ...typography.body.small,
    flex: 1,
  },
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    paddingHorizontal: spacing[1],
  },
  bottomInfoText: {
    ...typography.body.small,
    flex: 1,
  },
});
