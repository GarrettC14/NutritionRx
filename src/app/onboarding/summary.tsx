import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useProfileStore, useWeightStore, useSettingsStore, useGoalStore } from '@/stores';
import { GoalType } from '@/types/domain';
import { tdeeCalculator, MacroTargets } from '@/services/tdeeCalculator';

const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;

export default function SummaryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    goalType: string;
    targetWeight?: string;
    rate: string;
  }>();

  const { profile, completeOnboarding } = useProfileStore();
  const { latestEntry } = useWeightStore();
  const { settings, setDailyGoals } = useSettingsStore();
  const { createGoal } = useGoalStore();

  const [isLoading, setIsLoading] = useState(false);
  const [macros, setMacros] = useState<MacroTargets | null>(null);
  const [tdee, setTdee] = useState<number>(0);

  const goalType = (params.goalType as GoalType) || 'lose';
  const targetWeightKg = params.targetWeight ? parseFloat(params.targetWeight) : undefined;
  const ratePercent = parseFloat(params.rate) || 0;
  const currentWeightKg = latestEntry?.weightKg || 70;
  const isLbs = settings.weightUnit === 'lbs';

  useEffect(() => {
    if (!profile) return;

    // Calculate age from date of birth
    const calculateAge = (dob: Date): number => {
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    };

    const age = profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : 30;

    const calculatedTdee = tdeeCalculator.calculateTDEE({
      sex: profile.sex || 'male',
      ageYears: age,
      heightCm: profile.heightCm || 170,
      weightKg: currentWeightKg,
      activityLevel: profile.activityLevel || 'moderately_active',
    });

    setTdee(calculatedTdee);

    const calculatedMacros = tdeeCalculator.calculateMacros({
      sex: profile.sex || 'male',
      ageYears: age,
      heightCm: profile.heightCm || 170,
      weightKg: currentWeightKg,
      activityLevel: profile.activityLevel || 'moderately_active',
      goalType,
      targetRatePercent: ratePercent,
    });

    setMacros(calculatedMacros);
  }, [profile, currentWeightKg, goalType, ratePercent]);

  const handleComplete = async () => {
    if (!macros || !profile) return;

    setIsLoading(true);
    try {
      // Calculate age from date of birth
      const calculateAge = (dob: Date): number => {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      };

      const age = profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : 30;

      // Save daily goals to settings
      await setDailyGoals({
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      });

      // Create the goal using the store's calculation methods
      await createGoal({
        type: goalType,
        targetWeightKg,
        targetRatePercent: ratePercent,
        currentWeightKg,
        sex: profile.sex || 'male',
        heightCm: profile.heightCm || 170,
        age,
        activityLevel: profile.activityLevel || 'moderately_active',
      });

      // Mark onboarding as complete
      await completeOnboarding();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const goalLabel = goalType === 'lose'
    ? 'Lose Weight'
    : goalType === 'gain'
      ? 'Gain Weight'
      : 'Maintain Weight';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '100%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>9 of 9</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.checkIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            You're all set!
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Here's your personalized plan based on your inputs.
          </Text>
        </View>

        {/* Goal Summary */}
        <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>YOUR GOAL</Text>
          <Text style={[styles.goalLabel, { color: colors.textPrimary }]}>{goalLabel}</Text>
          {targetWeightKg && (
            <Text style={[styles.targetWeight, { color: colors.textSecondary }]}>
              Target: {isLbs ? kgToLbs(targetWeightKg) : targetWeightKg} {isLbs ? 'lbs' : 'kg'}
            </Text>
          )}
        </View>

        {/* Calorie Target */}
        {macros && (
          <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
              DAILY CALORIE TARGET
            </Text>
            <View style={styles.calorieDisplay}>
              <Text style={[styles.calorieValue, { color: colors.accent }]}>
                {macros.calories.toLocaleString()}
              </Text>
              <Text style={[styles.calorieUnit, { color: colors.textSecondary }]}>kcal</Text>
            </View>
            {goalType !== 'maintain' && (
              <Text style={[styles.calorieNote, { color: colors.textTertiary }]}>
                TDEE ({tdee.toLocaleString()}) {goalType === 'lose' ? '-' : '+'}{' '}
                {Math.abs(tdee - macros.calories)} kcal
              </Text>
            )}
          </View>
        )}

        {/* Macro Targets */}
        {macros && (
          <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>MACRO TARGETS</Text>
            <View style={styles.macroGrid}>
              <MacroItem
                label="Protein"
                value={macros.protein}
                color={colors.protein}
                textColor={colors.textPrimary}
              />
              <MacroItem
                label="Carbs"
                value={macros.carbs}
                color={colors.carbs}
                textColor={colors.textPrimary}
              />
              <MacroItem
                label="Fat"
                value={macros.fat}
                color={colors.fat}
                textColor={colors.textPrimary}
              />
            </View>
          </View>
        )}

        {/* Adaptive note */}
        <View style={[styles.note, { backgroundColor: colors.bgInteractive }]}>
          <Ionicons name="sparkles" size={20} color={colors.accent} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            These targets will automatically adjust based on your actual results each week.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Start Tracking"
          onPress={handleComplete}
          loading={isLoading}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

interface MacroItemProps {
  label: string;
  value: number;
  color: string;
  textColor: string;
}

function MacroItem({ label, value, color, textColor }: MacroItemProps) {
  return (
    <View style={styles.macroItem}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={[styles.macroValue, { color: textColor }]}>{value}g</Text>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
    </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
    gap: spacing[4],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  checkIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    ...typography.display.small,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.large,
    textAlign: 'center',
  },
  card: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  cardTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  goalLabel: {
    ...typography.title.large,
  },
  targetWeight: {
    ...typography.body.medium,
    marginTop: spacing[1],
  },
  calorieDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  calorieValue: {
    ...typography.metric.large,
  },
  calorieUnit: {
    ...typography.title.medium,
  },
  calorieNote: {
    ...typography.caption,
    marginTop: spacing[2],
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  macroDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroValue: {
    ...typography.title.medium,
  },
  macroLabel: {
    ...typography.caption,
    fontWeight: '500',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  noteText: {
    ...typography.body.small,
    flex: 1,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
  },
});
