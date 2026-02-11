import { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { useOnboardingStore } from '@/stores';
import { OnboardingScreen, OnboardingRadioCard } from '@/components/onboarding';

const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number): number => Math.round((lbs / 2.20462) * 100) / 100;

const MIN_TARGET_KG = 36;

interface RateOption {
  value: number;
  label: string;
  testID: string;
}

const loseRateOptions: RateOption[] = [
  { value: 0.25, label: 'Slow', testID: 'onboarding-rate-slow' },
  { value: 0.5, label: 'Moderate', testID: 'onboarding-rate-moderate' },
  { value: 0.75, label: 'Aggressive', testID: 'onboarding-rate-aggressive' },
];

const gainRateOptions: RateOption[] = [
  { value: 0.25, label: 'Slow', testID: 'onboarding-rate-slow' },
  { value: 0.5, label: 'Moderate', testID: 'onboarding-rate-moderate' },
];

function getRateSubtitle(
  ratePercent: number,
  currentWeightKg: number,
  weightUnit: 'lbs' | 'kg',
  label: string,
): string {
  const weeklyChangeKg = (currentWeightKg * ratePercent) / 100;
  const display =
    weightUnit === 'lbs'
      ? `${(weeklyChangeKg * 2.20462).toFixed(1)} lb`
      : `${weeklyChangeKg.toFixed(1)} kg`;

  if (label === 'Slow') return `~${display}/week \u00B7 Easiest to maintain`;
  if (label === 'Moderate') return `~${display}/week \u00B7 Recommended for most people`;
  return `~${display}/week \u00B7 Faster, but harder to sustain`;
}

function formatEta(currentWeightKg: number, targetWeightKg: number, ratePercent: number): string | null {
  if (!targetWeightKg || !currentWeightKg || ratePercent <= 0) return null;

  const weeklyKg = (currentWeightKg * ratePercent) / 100;
  if (weeklyKg <= 0) return null;

  const weeksToGoal = Math.abs(currentWeightKg - targetWeightKg) / weeklyKg;
  const roundedWeeks = Math.ceil(weeksToGoal);

  if (roundedWeeks <= 0) return null;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + roundedWeeks * 7);
  const monthYear = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return `At this rate, you'll reach your goal in about ~${roundedWeeks} weeks (${monthYear})`;
}

export default function TargetScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { draft, updateDraft } = useOnboardingStore();

  const isLbs = draft.weightUnit === 'lbs';
  const isLose = draft.goalPath === 'lose';
  const currentWeightKg = draft.currentWeightKg ?? 80;

  // Initialize target weight from draft (convert for display)
  const [targetWeightText, setTargetWeightText] = useState<string>(() => {
    if (draft.targetWeightKg) {
      const display = isLbs ? kgToLbs(draft.targetWeightKg) : draft.targetWeightKg;
      return display.toFixed(0);
    }
    return '';
  });

  const [selectedRate, setSelectedRate] = useState<number>(draft.targetRatePercent || 0.5);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const rateOptions = isLose ? loseRateOptions : gainRateOptions;

  // Parse target weight to kg
  const targetWeightKg = useMemo(() => {
    if (!targetWeightText) return null;
    const parsed = parseFloat(targetWeightText);
    if (isNaN(parsed) || parsed <= 0) return null;
    return isLbs ? lbsToKg(parsed) : parsed;
  }, [targetWeightText, isLbs]);

  // ETA computation
  const etaText = useMemo(() => {
    if (!targetWeightKg) return null;
    return formatEta(currentWeightKg, targetWeightKg, selectedRate);
  }, [currentWeightKg, targetWeightKg, selectedRate]);

  // Validation
  const validate = (): boolean => {
    if (!targetWeightText) {
      setValidationMessage('Please enter a target weight.');
      return false;
    }

    const parsed = parseFloat(targetWeightText);
    if (isNaN(parsed) || parsed <= 0) {
      setValidationMessage('Please enter a valid weight.');
      return false;
    }

    const weightKg = isLbs ? lbsToKg(parsed) : parsed;

    if (weightKg < MIN_TARGET_KG) {
      const minDisplay = isLbs ? `${Math.round(kgToLbs(MIN_TARGET_KG))} lbs` : `${MIN_TARGET_KG} kg`;
      setValidationMessage(`Target weight must be at least ${minDisplay}.`);
      return false;
    }

    if (isLose && weightKg >= currentWeightKg) {
      setValidationMessage('For a weight loss goal, target should be below your current weight.');
      return false;
    }

    if (!isLose && weightKg <= currentWeightKg) {
      setValidationMessage('For a weight gain goal, target should be above your current weight.');
      return false;
    }

    setValidationMessage(null);
    return true;
  };

  const handleSelectRate = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedRate(value);
  };

  const handleContinue = () => {
    if (!validate()) return;

    updateDraft({
      targetWeightKg,
      targetRatePercent: selectedRate,
      lastCompletedScreen: 'target',
    });
    router.push('/onboarding/your-plan');
  };

  const handleBack = () => {
    router.back();
  };

  const continueDisabled = !targetWeightText || parseFloat(targetWeightText) <= 0;

  return (
    <OnboardingScreen
      screenTestID="onboarding-target-screen"
      title="Set your target"
      step={7}
      totalSteps={8}
      onBack={handleBack}
      onContinue={handleContinue}
      continueDisabled={continueDisabled}
      backTestID="onboarding-target-back-button"
      continueTestID="onboarding-target-continue-button"
      keyboardAvoiding
    >
      {/* Target weight input */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          Target weight
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.bgSecondary, borderRadius: borderRadius.md }]}>
          <TextInput
            testID="onboarding-target-weight"
            style={[styles.input, { color: colors.textPrimary }]}
            value={targetWeightText}
            onChangeText={(text) => {
              setTargetWeightText(text);
              setValidationMessage(null);
            }}
            placeholder={isLbs ? 'e.g. 160' : 'e.g. 72'}
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>
            {isLbs ? 'lbs' : 'kg'}
          </Text>
        </View>
        {validationMessage && (
          <Text style={[styles.validationText, { color: colors.textSecondary }]}>
            {validationMessage}
          </Text>
        )}
      </View>

      {/* Weekly rate */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          Weekly rate
        </Text>
        <View style={styles.options}>
          {rateOptions.map((option) => (
            <OnboardingRadioCard
              key={option.value}
              testID={option.testID}
              label={option.label}
              subtitle={getRateSubtitle(option.value, currentWeightKg, draft.weightUnit, option.label)}
              selected={selectedRate === option.value}
              onPress={() => handleSelectRate(option.value)}
            />
          ))}
        </View>
      </View>

      {/* ETA display */}
      {etaText && (
        <View style={styles.etaContainer}>
          <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.etaText, { color: colors.textTertiary }]}>
            {etaText}
          </Text>
        </View>
      )}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing[6],
  },
  sectionLabel: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
  },
  input: {
    flex: 1,
    fontSize: 17,
    padding: 0,
  },
  unitLabel: {
    ...typography.body.medium,
    marginLeft: spacing[2],
  },
  validationText: {
    ...typography.body.small,
    marginTop: spacing[2],
  },
  options: {
    gap: spacing[3],
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  etaText: {
    ...typography.body.small,
    flex: 1,
  },
});
