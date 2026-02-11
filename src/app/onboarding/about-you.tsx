import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { TestIDs } from '@/constants/testIDs';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { useOnboardingStore } from '@/stores';
import { OnboardingScreen, OnboardingSegmentedToggle } from '@/components/onboarding';
import { DateOfBirthPicker } from '@/components/ui/DateOfBirthPicker';

// ─── Screen order logic ──────────────────────────────────────────

function getScreenOrder(goalPath: string | null): string[] {
  const base = ['goal', 'about-you', 'body-stats', 'activity', 'eating-style', 'protein'];
  if (goalPath === 'lose' || goalPath === 'gain') {
    return [...base, 'target', 'your-plan'];
  }
  return [...base, 'your-plan'];
}

// ─── Helpers ─────────────────────────────────────────────────────

const MINIMUM_AGE = 13;

function getAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

function formatDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Sex options ─────────────────────────────────────────────────

type Sex = 'male' | 'female';

const sexOptions: { value: Sex; label: string; testID: string }[] = [
  { value: 'male', label: 'Male', testID: 'onboarding-sex-male' },
  { value: 'female', label: 'Female', testID: 'onboarding-sex-female' },
];

// ─── Component ───────────────────────────────────────────────────

export default function AboutYouScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { draft, updateDraft } = useOnboardingStore();

  // Initialize from draft (supports resume)
  const [sex, setSex] = useState<Sex | null>(draft.sex);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    draft.dateOfBirth ? parseDateString(draft.dateOfBirth) : null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Maximum date: today (cannot be born in the future)
  const maximumDate = useMemo(() => new Date(), []);

  // Validation
  const age = dateOfBirth ? getAge(dateOfBirth) : null;
  const isUnderAge = age !== null && age < MINIMUM_AGE;
  const isValid = sex !== null && dateOfBirth !== null && !isUnderAge;

  const totalSteps = getScreenOrder(draft.goalPath).length;

  const handleDateSelect = (date: Date) => {
    setDateOfBirth(date);
  };

  const handleContinue = () => {
    if (!sex || !dateOfBirth) return;

    updateDraft({
      sex,
      dateOfBirth: toDateString(dateOfBirth),
      lastCompletedScreen: 'about-you',
    });

    router.push('/onboarding/body-stats');
  };

  return (
    <OnboardingScreen
      title="A little about you"
      subtitle="This helps us estimate your daily calorie needs more accurately."
      step={2}
      totalSteps={totalSteps}
      onBack={() => router.back()}
      onContinue={handleContinue}
      continueDisabled={!isValid}
      continueTestID="onboarding-about-you-continue-button"
      screenTestID="onboarding-about-you-screen"
      backTestID="onboarding-about-you-back-button"
      infoText="Used only for metabolism estimates. You can change this anytime in Settings."
      keyboardAvoiding={false}
    >
      {/* Sex selector */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Sex</Text>
        <OnboardingSegmentedToggle
          options={sexOptions}
          value={sex ?? ('' as Sex)}
          onChange={(value: Sex) => setSex(value)}
        />
      </View>

      {/* Date of birth */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Date of birth</Text>
        <Pressable
          testID="onboarding-dob"
          style={[
            styles.dateButton,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.borderDefault,
            },
          ]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text
            style={[
              styles.dateButtonText,
              {
                color: dateOfBirth ? colors.textPrimary : colors.textTertiary,
              },
            ]}
          >
            {dateOfBirth ? formatDate(dateOfBirth) : 'Select your date of birth'}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Under-age message */}
      {isUnderAge && (
        <View style={[styles.warningContainer, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            NutritionRx is designed for ages 13 and up.
          </Text>
        </View>
      )}

      {/* Date of birth picker modal */}
      <DateOfBirthPicker
        visible={showDatePicker}
        value={dateOfBirth}
        onSelect={handleDateSelect}
        onClose={() => setShowDatePicker(false)}
        maximumDate={maximumDate}
      />
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  dateButtonText: {
    ...typography.body.large,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  warningText: {
    ...typography.body.small,
    flex: 1,
  },
});
