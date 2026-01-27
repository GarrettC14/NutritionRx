import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useOnboardingStore } from '@/stores';
import { EnergyUnit } from '@/repositories/onboardingRepository';

type WeightUnit = 'lbs' | 'kg';

interface ToggleOption<T> {
  value: T;
  label: string;
}

const energyOptions: ToggleOption<EnergyUnit>[] = [
  { value: 'calories', label: 'Calories' },
  { value: 'kilojoules', label: 'Kilojoules' },
];

const weightOptions: ToggleOption<WeightUnit>[] = [
  { value: 'lbs', label: 'lbs' },
  { value: 'kg', label: 'kg' },
];

interface ToggleButtonGroupProps<T> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

function ToggleButtonGroup<T extends string>({
  options,
  value,
  onChange,
}: ToggleButtonGroupProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.toggleGroup, { backgroundColor: colors.bgSecondary }]}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.toggleButton,
            value === option.value && { backgroundColor: colors.accent },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onChange(option.value);
          }}
        >
          <Text
            style={[
              styles.toggleButtonText,
              { color: value === option.value ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { energyUnit, weightUnit, setEnergyUnit, setWeightUnit } = useOnboardingStore();

  const handleContinue = () => {
    router.push('/onboarding/ready');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          A few quick preferences
        </Text>

        {/* Energy Unit */}
        <View style={styles.preferenceSection}>
          <Text style={[styles.preferenceLabel, { color: colors.textPrimary }]}>
            Energy unit
          </Text>
          <ToggleButtonGroup
            options={energyOptions}
            value={energyUnit}
            onChange={setEnergyUnit}
          />
        </View>

        {/* Weight Unit */}
        <View style={styles.preferenceSection}>
          <Text style={[styles.preferenceLabel, { color: colors.textPrimary }]}>
            Weight unit
          </Text>
          <ToggleButtonGroup
            options={weightOptions}
            value={weightUnit}
            onChange={setWeightUnit}
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleContinue}
          fullWidth
        />
        <Text style={[styles.footerNote, { color: colors.textTertiary }]}>
          You can change these later
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
  title: {
    ...typography.display.medium,
    marginBottom: spacing[8],
  },
  preferenceSection: {
    marginBottom: spacing[6],
  },
  preferenceLabel: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  toggleGroup: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing[1],
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  toggleButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
    paddingTop: spacing[4],
  },
  footerNote: {
    ...typography.body.small,
    textAlign: 'center',
    marginTop: spacing[3],
  },
});
