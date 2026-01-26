import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useWeightStore, useSettingsStore } from '@/stores';
import { GoalType } from '@/types/domain';
import { tdeeCalculator } from '@/services/tdeeCalculator';

const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;

interface RateOption {
  value: number;
  label: string;
  description: string;
}

export default function RateScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ goalType: string; targetWeight?: string }>();
  const { latestEntry } = useWeightStore();
  const { settings } = useSettingsStore();

  const goalType = (params.goalType as GoalType) || 'lose';
  const targetWeightKg = params.targetWeight ? parseFloat(params.targetWeight) : undefined;
  const currentWeightKg = latestEntry?.weightKg || 70;
  const isLbs = settings.weightUnit === 'lbs';

  const [selectedRate, setSelectedRate] = useState<number | null>(
    goalType === 'maintain' ? 0 : 0.5
  );

  const rateOptions: RateOption[] = goalType === 'maintain'
    ? [{ value: 0, label: 'Maintain', description: 'Keep your current weight' }]
    : goalType === 'lose'
      ? [
          {
            value: 0.25,
            label: 'Slow & Steady',
            description: `~${isLbs ? kgToLbs(currentWeightKg * 0.0025).toFixed(1) : (currentWeightKg * 0.0025).toFixed(2)} ${isLbs ? 'lbs' : 'kg'}/week`,
          },
          {
            value: 0.5,
            label: 'Moderate',
            description: `~${isLbs ? kgToLbs(currentWeightKg * 0.005).toFixed(1) : (currentWeightKg * 0.005).toFixed(2)} ${isLbs ? 'lbs' : 'kg'}/week`,
          },
          {
            value: 0.75,
            label: 'Faster',
            description: `~${isLbs ? kgToLbs(currentWeightKg * 0.0075).toFixed(1) : (currentWeightKg * 0.0075).toFixed(2)} ${isLbs ? 'lbs' : 'kg'}/week`,
          },
          {
            value: 1.0,
            label: 'Aggressive',
            description: `~${isLbs ? kgToLbs(currentWeightKg * 0.01).toFixed(1) : (currentWeightKg * 0.01).toFixed(2)} ${isLbs ? 'lbs' : 'kg'}/week`,
          },
        ]
      : [
          {
            value: 0.25,
            label: 'Lean Gains',
            description: `~${isLbs ? kgToLbs(currentWeightKg * 0.0025).toFixed(1) : (currentWeightKg * 0.0025).toFixed(2)} ${isLbs ? 'lbs' : 'kg'}/week`,
          },
          {
            value: 0.5,
            label: 'Standard Bulk',
            description: `~${isLbs ? kgToLbs(currentWeightKg * 0.005).toFixed(1) : (currentWeightKg * 0.005).toFixed(2)} ${isLbs ? 'lbs' : 'kg'}/week`,
          },
        ];

  // Calculate time to goal
  const timeToGoal = targetWeightKg && selectedRate
    ? tdeeCalculator.calculateTimeToGoal(currentWeightKg, targetWeightKg, selectedRate)
    : null;

  const handleContinue = () => {
    if (selectedRate === null) return;
    router.push({
      pathname: '/onboarding/eating-style',
      params: {
        goalType,
        targetWeight: targetWeightKg?.toString() || '',
        rate: selectedRate.toString(),
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '88%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>8 of 11</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {goalType === 'maintain'
            ? 'Ready to maintain'
            : `How fast do you want to ${goalType === 'lose' ? 'lose' : 'gain'}?`}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {goalType === 'maintain'
            ? 'We\'ll calculate your maintenance calories.'
            : 'Slower rates are more sustainable and preserve muscle.'}
        </Text>

        <ScrollView
          style={styles.optionsList}
          contentContainerStyle={styles.optionsContent}
          showsVerticalScrollIndicator={false}
        >
          {rateOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor:
                    selectedRate === option.value ? colors.accent + '20' : colors.bgSecondary,
                  borderColor:
                    selectedRate === option.value ? colors.accent : 'transparent',
                },
              ]}
              onPress={() => setSelectedRate(option.value)}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: selectedRate === option.value ? colors.accent : colors.textPrimary },
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              {selectedRate === option.value && (
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
              )}
            </Pressable>
          ))}
        </ScrollView>

        {/* Time estimate */}
        {timeToGoal && selectedRate && selectedRate > 0 && (
          <View style={[styles.estimate, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.estimateText, { color: colors.textSecondary }]}>
              Estimated time to goal: {timeToGoal.months} months ({timeToGoal.weeks} weeks)
            </Text>
          </View>
        )}

        {goalType === 'lose' && selectedRate === 1.0 && (
          <View style={[styles.warning, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              Aggressive rates can be hard to maintain. Consider a moderate pace.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={selectedRate === null}
          fullWidth
        />
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
    paddingTop: spacing[6],
  },
  title: {
    ...typography.display.small,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.large,
    marginBottom: spacing[6],
  },
  optionsList: {
    flex: 1,
  },
  optionsContent: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing[3],
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  optionDescription: {
    ...typography.body.small,
  },
  estimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginTop: spacing[2],
  },
  estimateText: {
    ...typography.body.small,
    flex: 1,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginTop: spacing[2],
  },
  warningText: {
    ...typography.body.small,
    flex: 1,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
  },
});
