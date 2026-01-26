import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useGoalStore, useSettingsStore, useWeightStore, useProfileStore } from '@/stores';
import { GoalType } from '@/types/domain';
import { ACTIVITY_OPTIONS, RATE_OPTIONS } from '@/constants/defaults';

const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number): number => Math.round((lbs / 2.20462) * 100) / 100;

export default function GoalsSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { activeGoal, createGoal, completeGoal, isLoading, loadActiveGoal } = useGoalStore();
  const { settings } = useSettingsStore();
  const { latestEntry } = useWeightStore();
  const { profile } = useProfileStore();

  const isLbs = settings.weightUnit === 'lbs';
  const currentWeightKg = latestEntry?.weightKg || activeGoal?.startWeightKg || 70;

  const [selectedGoalType, setSelectedGoalType] = useState<GoalType>(activeGoal?.type || 'lose');
  const [targetWeight, setTargetWeight] = useState('');
  const [selectedRate, setSelectedRate] = useState(activeGoal?.targetRatePercent || 0.5);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadActiveGoal();
  }, []);

  useEffect(() => {
    if (activeGoal) {
      setSelectedGoalType(activeGoal.type);
      setSelectedRate(activeGoal.targetRatePercent);
      if (activeGoal.targetWeightKg) {
        setTargetWeight(
          isLbs
            ? kgToLbs(activeGoal.targetWeightKg).toFixed(0)
            : activeGoal.targetWeightKg.toFixed(0)
        );
      }
    }
  }, [activeGoal, isLbs]);

  const goalTypeOptions: { value: GoalType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'lose', label: 'Lose Weight', icon: 'trending-down' },
    { value: 'maintain', label: 'Maintain', icon: 'swap-horizontal' },
    { value: 'gain', label: 'Gain Weight', icon: 'trending-up' },
  ];

  const getRateOptions = () => {
    if (selectedGoalType === 'maintain') return [];
    if (selectedGoalType === 'gain') {
      return RATE_OPTIONS.filter(r => r.value <= 0.5);
    }
    return RATE_OPTIONS;
  };

  const handleSave = async () => {
    if (!profile) {
      Alert.alert('Profile Required', 'Please complete your profile first.');
      return;
    }

    try {
      // Complete existing goal if there is one
      if (activeGoal) {
        await completeGoal();
      }

      // Calculate age
      let age = 30;
      if (profile.dateOfBirth) {
        const today = new Date();
        const birthDate = profile.dateOfBirth;
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      const targetWeightKg = targetWeight
        ? isLbs
          ? lbsToKg(parseFloat(targetWeight))
          : parseFloat(targetWeight)
        : undefined;

      await createGoal({
        type: selectedGoalType,
        targetWeightKg,
        targetRatePercent: selectedGoalType === 'maintain' ? 0 : selectedRate,
        currentWeightKg,
        sex: profile.sex || 'male',
        heightCm: profile.heightCm || 170,
        age,
        activityLevel: profile.activityLevel || 'moderately_active',
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    }
  };

  const handleTargetChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setTargetWeight(cleaned);
  };

  const currentDisplay = isLbs
    ? `${kgToLbs(currentWeightKg).toFixed(1)} lbs`
    : `${currentWeightKg.toFixed(1)} kg`;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Your Goal',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Goal Display */}
          {activeGoal && !isEditing ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                CURRENT GOAL
              </Text>
              <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
                <View style={styles.goalHeader}>
                  <Ionicons
                    name={
                      activeGoal.type === 'lose'
                        ? 'trending-down'
                        : activeGoal.type === 'gain'
                          ? 'trending-up'
                          : 'swap-horizontal'
                    }
                    size={24}
                    color={colors.accent}
                  />
                  <Text style={[styles.goalType, { color: colors.textPrimary }]}>
                    {activeGoal.type === 'lose'
                      ? 'Lose Weight'
                      : activeGoal.type === 'gain'
                        ? 'Gain Weight'
                        : 'Maintain Weight'}
                  </Text>
                </View>

                <View style={styles.goalDetails}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Current weight
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {currentDisplay}
                    </Text>
                  </View>

                  {activeGoal.targetWeightKg && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Target weight
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                        {isLbs
                          ? `${kgToLbs(activeGoal.targetWeightKg).toFixed(1)} lbs`
                          : `${activeGoal.targetWeightKg.toFixed(1)} kg`}
                      </Text>
                    </View>
                  )}

                  {activeGoal.type !== 'maintain' && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Rate
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                        {RATE_OPTIONS.find(r => r.value === activeGoal.targetRatePercent)?.label ||
                          `${activeGoal.targetRatePercent}%/week`}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Daily calories
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.accent }]}>
                      {activeGoal.currentTargetCalories.toLocaleString()} kcal
                    </Text>
                  </View>

                  <View style={styles.macroRow}>
                    <View style={styles.macroItem}>
                      <Text style={[styles.macroValue, { color: colors.protein }]}>
                        {activeGoal.currentProteinG}g
                      </Text>
                      <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                        Protein
                      </Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={[styles.macroValue, { color: colors.carbs }]}>
                        {activeGoal.currentCarbsG}g
                      </Text>
                      <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                        Carbs
                      </Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={[styles.macroValue, { color: colors.fat }]}>
                        {activeGoal.currentFatG}g
                      </Text>
                      <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                        Fat
                      </Text>
                    </View>
                  </View>
                </View>

                <Button
                  label="Edit Goal"
                  variant="secondary"
                  onPress={() => setIsEditing(true)}
                  fullWidth
                />
              </View>
            </View>
          ) : (
            <>
              {/* Goal Type Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  GOAL TYPE
                </Text>
                <View style={styles.optionGrid}>
                  {goalTypeOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.goalOption,
                        {
                          backgroundColor:
                            selectedGoalType === option.value
                              ? colors.accent + '20'
                              : colors.bgSecondary,
                          borderColor:
                            selectedGoalType === option.value ? colors.accent : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedGoalType(option.value)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={24}
                        color={
                          selectedGoalType === option.value ? colors.accent : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.goalOptionLabel,
                          {
                            color:
                              selectedGoalType === option.value
                                ? colors.accent
                                : colors.textPrimary,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Target Weight (optional for lose/gain) */}
              {selectedGoalType !== 'maintain' && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    TARGET WEIGHT (OPTIONAL)
                  </Text>
                  <View style={[styles.inputCard, { backgroundColor: colors.bgSecondary }]}>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        value={targetWeight}
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
                    <Text style={[styles.currentNote, { color: colors.textTertiary }]}>
                      Current: {currentDisplay}
                    </Text>
                  </View>
                </View>
              )}

              {/* Rate Selection */}
              {selectedGoalType !== 'maintain' && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    RATE
                  </Text>
                  <View style={styles.rateOptions}>
                    {getRateOptions().map((option) => (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.rateOption,
                          {
                            backgroundColor:
                              selectedRate === option.value
                                ? colors.accent + '20'
                                : colors.bgSecondary,
                            borderColor:
                              selectedRate === option.value ? colors.accent : 'transparent',
                          },
                        ]}
                        onPress={() => setSelectedRate(option.value)}
                      >
                        <View style={styles.rateContent}>
                          <Text
                            style={[
                              styles.rateLabel,
                              {
                                color:
                                  selectedRate === option.value
                                    ? colors.accent
                                    : colors.textPrimary,
                              },
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text style={[styles.rateDescription, { color: colors.textSecondary }]}>
                            {option.description}
                          </Text>
                        </View>
                        {selectedRate === option.value && (
                          <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Footer */}
        {(isEditing || !activeGoal) && (
          <View style={styles.footer}>
            {isEditing && (
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setIsEditing(false)}
                fullWidth
                style={{ marginBottom: spacing[3] }}
              />
            )}
            <Button
              label={activeGoal ? 'Update Goal' : 'Set Goal'}
              onPress={handleSave}
              loading={isLoading}
              fullWidth
            />
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: componentSpacing.screenEdgePadding,
    gap: spacing[6],
  },
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[4],
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  goalType: {
    ...typography.title.large,
  },
  goalDetails: {
    gap: spacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.body.medium,
  },
  detailValue: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  macroItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  macroValue: {
    ...typography.title.medium,
  },
  macroLabel: {
    ...typography.caption,
  },
  optionGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  goalOption: {
    flex: 1,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 2,
  },
  goalOptionLabel: {
    ...typography.body.small,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
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
  currentNote: {
    ...typography.caption,
    marginTop: spacing[2],
  },
  rateOptions: {
    gap: spacing[3],
  },
  rateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing[3],
  },
  rateContent: {
    flex: 1,
  },
  rateLabel: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  rateDescription: {
    ...typography.body.small,
  },
  footer: {
    padding: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
});
