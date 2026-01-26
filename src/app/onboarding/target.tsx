import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useWeightStore, useSettingsStore } from '@/stores';
import { GoalType } from '@/types/domain';

const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number): number => Math.round((lbs / 2.20462) * 100) / 100;

export default function TargetScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ goalType: string }>();
  const { latestEntry } = useWeightStore();
  const { settings } = useSettingsStore();

  const goalType = (params.goalType as GoalType) || 'lose';
  const isLbs = settings.weightUnit === 'lbs';
  const currentWeightKg = latestEntry?.weightKg || 70;

  // Calculate a reasonable default target (10% loss/gain)
  const defaultTargetKg = goalType === 'lose'
    ? currentWeightKg * 0.9
    : currentWeightKg * 1.1;

  const [target, setTarget] = useState(
    isLbs
      ? kgToLbs(defaultTargetKg).toFixed(0)
      : defaultTargetKg.toFixed(0)
  );

  const getTargetInKg = (): number => {
    const value = parseFloat(target) || 0;
    return isLbs ? lbsToKg(value) : value;
  };

  const handleTargetChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      setTarget(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setTarget(cleaned);
    }
  };

  const handleSkip = () => {
    router.push({
      pathname: '/onboarding/rate',
      params: { goalType, targetWeight: '' },
    });
  };

  const handleContinue = () => {
    const targetKg = getTargetInKg();
    router.push({
      pathname: '/onboarding/rate',
      params: { goalType, targetWeight: targetKg.toString() },
    });
  };

  const targetKg = getTargetInKg();
  const weightDiff = targetKg - currentWeightKg;

  const isValidDirection = goalType === 'lose'
    ? weightDiff < 0
    : weightDiff > 0;

  const isValidRange = targetKg >= 30 && targetKg <= 300;
  const isValid = isValidRange && isValidDirection;

  // Convert for display
  const currentDisplay = isLbs
    ? `${kgToLbs(currentWeightKg).toFixed(1)} lbs`
    : `${currentWeightKg.toFixed(1)} kg`;

  const diffDisplay = isLbs
    ? `${kgToLbs(Math.abs(weightDiff)).toFixed(1)} lbs`
    : `${Math.abs(weightDiff).toFixed(1)} kg`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '77%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>7 of 11</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          What's your target weight?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This is optional. You can always change it later.
        </Text>

        {/* Current Weight Display */}
        <View style={[styles.currentWeight, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>
            Current weight
          </Text>
          <Text style={[styles.currentValue, { color: colors.textPrimary }]}>
            {currentDisplay}
          </Text>
        </View>

        {/* Target Input */}
        <View style={[styles.inputCard, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Target weight
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={target}
              onChangeText={handleTargetChange}
              keyboardType="decimal-pad"
              placeholder={isLbs ? '150' : '68'}
              placeholderTextColor={colors.textTertiary}
              maxLength={5}
            />
            <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>
              {isLbs ? 'lbs' : 'kg'}
            </Text>
          </View>
        </View>

        {/* Weight to lose/gain */}
        {targetKg > 0 && (
          <View style={styles.diffDisplay}>
            <Text style={[styles.diffLabel, { color: colors.textTertiary }]}>
              {goalType === 'lose' ? 'To lose:' : 'To gain:'}
            </Text>
            <Text
              style={[
                styles.diffValue,
                { color: isValidDirection ? colors.accent : colors.warning },
              ]}
            >
              {diffDisplay}
            </Text>
          </View>
        )}

        {!isValidDirection && targetKg > 0 && (
          <Text style={[styles.warning, { color: colors.warning }]}>
            Target should be {goalType === 'lose' ? 'lower' : 'higher'} than current weight
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={!isValid}
          fullWidth
        />
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Skip - I'll set this later
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    ...typography.caption,
  },
  content: {
    flex: 1,
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[8],
    alignItems: 'center',
  },
  title: {
    ...typography.display.small,
    marginBottom: spacing[2],
    alignSelf: 'flex-start',
  },
  subtitle: {
    ...typography.body.large,
    marginBottom: spacing[6],
    alignSelf: 'flex-start',
  },
  currentWeight: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing[4],
  },
  currentLabel: {
    ...typography.caption,
    marginBottom: spacing[1],
  },
  currentValue: {
    ...typography.title.large,
  },
  inputCard: {
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    width: '100%',
    alignItems: 'center',
  },
  inputLabel: {
    ...typography.caption,
    marginBottom: spacing[2],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing[2],
  },
  input: {
    ...typography.metric.large,
    textAlign: 'center',
    minWidth: 100,
  },
  inputUnit: {
    ...typography.title.large,
  },
  diffDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  diffLabel: {
    ...typography.body.medium,
  },
  diffValue: {
    ...typography.title.medium,
  },
  warning: {
    ...typography.body.medium,
    marginTop: spacing[3],
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
    gap: spacing[3],
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  skipText: {
    ...typography.body.medium,
  },
});
