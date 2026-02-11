import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { useOnboardingStore } from '@/stores';
import { OnboardingScreen, OnboardingSegmentedToggle } from '@/components/onboarding';

// ─── Screen order logic ──────────────────────────────────────────

function getScreenOrder(goalPath: string | null): string[] {
  const base = ['goal', 'about-you', 'body-stats', 'activity', 'eating-style', 'protein'];
  if (goalPath === 'lose' || goalPath === 'gain') {
    return [...base, 'target', 'your-plan'];
  }
  return [...base, 'your-plan'];
}

// ─── Unit conversion helpers ─────────────────────────────────────

const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 10) / 10;
const cmToFtIn = (cm: number) => {
  const totalInches = cm / 2.54;
  return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
};
const ftInToCm = (feet: number, inches: number) =>
  Math.round((feet * 12 + inches) * 2.54 * 10) / 10;

// ─── Validation ranges ──────────────────────────────────────────

const HEIGHT_RANGE = { minCm: 61, maxCm: 244 }; // 2'0" - 8'0"
const WEIGHT_RANGE = { minKg: 23, maxKg: 318 }; // ~50 - ~700 lbs

// ─── Unit option types ──────────────────────────────────────────

type HeightUnit = 'ft_in' | 'cm';
type WeightUnit = 'lbs' | 'kg';

const heightUnitOptions: { value: HeightUnit; label: string; testID: string }[] = [
  { value: 'ft_in', label: 'ft/in', testID: 'onboarding-height-unit' },
  { value: 'cm', label: 'cm', testID: 'onboarding-height-unit' },
];

const weightUnitOptions: { value: WeightUnit; label: string; testID: string }[] = [
  { value: 'lbs', label: 'lbs', testID: 'onboarding-weight-unit' },
  { value: 'kg', label: 'kg', testID: 'onboarding-weight-unit' },
];

// ─── Component ───────────────────────────────────────────────────

export default function BodyStatsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { draft, updateDraft } = useOnboardingStore();

  // Height state
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(draft.heightUnit);
  const [heightCmText, setHeightCmText] = useState<string>(() => {
    if (draft.heightCm !== null) {
      if (draft.heightUnit === 'cm') return String(draft.heightCm);
      return String(draft.heightCm); // internal is always cm
    }
    return '';
  });
  const [feetText, setFeetText] = useState<string>(() => {
    if (draft.heightCm !== null && draft.heightUnit === 'ft_in') {
      return String(cmToFtIn(draft.heightCm).feet);
    }
    return '';
  });
  const [inchesText, setInchesText] = useState<string>(() => {
    if (draft.heightCm !== null && draft.heightUnit === 'ft_in') {
      return String(cmToFtIn(draft.heightCm).inches);
    }
    return '';
  });

  // Weight state
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(draft.weightUnit);
  const [weightText, setWeightText] = useState<string>(() => {
    if (draft.currentWeightKg !== null) {
      if (draft.weightUnit === 'kg') return String(draft.currentWeightKg);
      return String(kgToLbs(draft.currentWeightKg));
    }
    return '';
  });

  // ─── Derived values ──────────────────────────────────────────

  const getHeightCm = useCallback((): number | null => {
    if (heightUnit === 'cm') {
      const val = parseFloat(heightCmText);
      return isNaN(val) ? null : val;
    }
    const feet = parseInt(feetText, 10);
    const inches = parseInt(inchesText, 10);
    if (isNaN(feet)) return null;
    return ftInToCm(feet, isNaN(inches) ? 0 : inches);
  }, [heightUnit, heightCmText, feetText, inchesText]);

  const getWeightKg = useCallback((): number | null => {
    const val = parseFloat(weightText);
    if (isNaN(val)) return null;
    return weightUnit === 'kg' ? val : lbsToKg(val);
  }, [weightUnit, weightText]);

  // ─── Validation ───────────────────────────────────────────────

  const heightCm = getHeightCm();
  const weightKg = getWeightKg();

  const isHeightValid =
    heightCm !== null && heightCm >= HEIGHT_RANGE.minCm && heightCm <= HEIGHT_RANGE.maxCm;
  const isWeightValid =
    weightKg !== null && weightKg >= WEIGHT_RANGE.minKg && weightKg <= WEIGHT_RANGE.maxKg;
  const isValid = isHeightValid && isWeightValid;

  const totalSteps = getScreenOrder(draft.goalPath).length;

  // ─── Unit toggle handlers ─────────────────────────────────────

  const handleHeightUnitChange = (newUnit: HeightUnit) => {
    if (newUnit === heightUnit) return;

    const currentCm = getHeightCm();
    setHeightUnit(newUnit);

    if (currentCm !== null) {
      if (newUnit === 'ft_in') {
        const { feet, inches } = cmToFtIn(currentCm);
        setFeetText(String(feet));
        setInchesText(String(inches));
      } else {
        setHeightCmText(String(Math.round(currentCm)));
      }
    }
  };

  const handleWeightUnitChange = (newUnit: WeightUnit) => {
    if (newUnit === weightUnit) return;

    const currentKg = getWeightKg();
    setWeightUnit(newUnit);

    if (currentKg !== null) {
      if (newUnit === 'lbs') {
        setWeightText(String(kgToLbs(currentKg)));
      } else {
        setWeightText(String(currentKg));
      }
    }
  };

  // ─── Continue ─────────────────────────────────────────────────

  const handleContinue = () => {
    if (heightCm === null || weightKg === null) return;

    updateDraft({
      heightCm,
      currentWeightKg: weightKg,
      weightUnit,
      heightUnit,
      lastCompletedScreen: 'body-stats',
    });

    router.push('/onboarding/activity');
  };

  return (
    <OnboardingScreen
      title="Your current stats"
      subtitle="We'll use these to calculate your daily targets."
      step={3}
      totalSteps={totalSteps}
      onBack={() => router.back()}
      onContinue={handleContinue}
      continueDisabled={!isValid}
      continueTestID="onboarding-body-stats-continue-button"
      screenTestID="onboarding-body-stats-screen"
      backTestID="onboarding-body-stats-back-button"
      infoText="Smart defaults based on your locale. Change anytime in Settings."
      keyboardAvoiding={true}
    >
      {/* Height section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Height</Text>

        <OnboardingSegmentedToggle
          options={heightUnitOptions}
          value={heightUnit}
          onChange={handleHeightUnitChange}
        />

        <View style={styles.inputRow}>
          {heightUnit === 'ft_in' ? (
            <>
              <View style={styles.inputGroup}>
                <TextInput
                  testID="onboarding-height"
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.bgSecondary,
                      borderColor: colors.borderDefault,
                    },
                  ]}
                  value={feetText}
                  onChangeText={setFeetText}
                  placeholder="5"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={1}
                  returnKeyType="next"
                />
                <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>ft</Text>
              </View>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.bgSecondary,
                      borderColor: colors.borderDefault,
                    },
                  ]}
                  value={inchesText}
                  onChangeText={setInchesText}
                  placeholder="10"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={2}
                  returnKeyType="done"
                />
                <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>in</Text>
              </View>
            </>
          ) : (
            <View style={styles.inputGroup}>
              <TextInput
                testID="onboarding-height"
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.bgSecondary,
                    borderColor: colors.borderDefault,
                  },
                ]}
                value={heightCmText}
                onChangeText={setHeightCmText}
                placeholder="170"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                maxLength={3}
                returnKeyType="done"
              />
              <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>cm</Text>
            </View>
          )}
        </View>
      </View>

      {/* Weight section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Current weight</Text>

        <OnboardingSegmentedToggle
          options={weightUnitOptions}
          value={weightUnit}
          onChange={handleWeightUnitChange}
        />

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <TextInput
              testID="onboarding-weight"
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.borderDefault,
                },
              ]}
              value={weightText}
              onChangeText={setWeightText}
              placeholder={weightUnit === 'lbs' ? '160' : '73'}
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              maxLength={5}
              returnKeyType="done"
            />
            <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>
              {weightUnit}
            </Text>
          </View>
        </View>
      </View>
    </OnboardingScreen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

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
    gap: spacing[3],
    marginTop: spacing[4],
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  input: {
    flex: 1,
    ...typography.body.large,
    fontWeight: '500',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    textAlign: 'center',
  },
  unitLabel: {
    ...typography.body.medium,
    fontWeight: '500',
    minWidth: 24,
  },
});
