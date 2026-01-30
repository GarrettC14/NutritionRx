import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useProfileStore, useGoalStore, useSettingsStore, useWeightStore } from '@/stores';
import { EatingStyle, ProteinPriority } from '@/types/domain';
import { macroCalculator } from '@/services/macroCalculator';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface EatingStyleOption {
  value: EatingStyle;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  ratio: string;
}

interface ProteinPriorityOption {
  value: ProteinPriority;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  gPerLb: number;
}

const EATING_STYLE_OPTIONS: EatingStyleOption[] = [
  {
    value: 'flexible',
    icon: 'options-outline',
    label: 'Flexible',
    description: 'Balanced split between carbs and fats',
    ratio: '50% carbs / 50% fat',
  },
  {
    value: 'carb_focused',
    icon: 'flash-outline',
    label: 'Carb Focused',
    description: 'Higher carbs for energy-demanding activities',
    ratio: '65% carbs / 35% fat',
  },
  {
    value: 'fat_focused',
    icon: 'water-outline',
    label: 'Fat Focused',
    description: 'Higher fats, capped at 150g carbs',
    ratio: '35% carbs / 65% fat',
  },
  {
    value: 'very_low_carb',
    icon: 'flame-outline',
    label: 'Very Low Carb',
    description: 'Keto-style, maximum 50g carbs per day',
    ratio: '10% carbs / 90% fat',
  },
];

const PROTEIN_PRIORITY_OPTIONS: ProteinPriorityOption[] = [
  {
    value: 'standard',
    icon: 'person-outline',
    label: 'Standard',
    description: 'For sedentary or light activity lifestyle',
    gPerLb: 0.6,
  },
  {
    value: 'active',
    icon: 'walk-outline',
    label: 'Active',
    description: 'For regular moderate exercise',
    gPerLb: 0.75,
  },
  {
    value: 'athletic',
    icon: 'barbell-outline',
    label: 'Athletic',
    description: 'For intense training or endurance sports',
    gPerLb: 0.9,
  },
  {
    value: 'maximum',
    icon: 'trophy-outline',
    label: 'Maximum',
    description: 'For muscle building or strength athletes',
    gPerLb: 1.0,
  },
];

export default function NutritionSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { showConfirm } = useConfirmDialog();
  const { profile, updateProfile, isLoading, loadProfile } = useProfileStore();
  const { activeGoal, updateGoalTargets, loadActiveGoal } = useGoalStore();
  const { setDailyGoals } = useSettingsStore();
  const { latestEntry } = useWeightStore();

  const [eatingStyle, setEatingStyle] = useState<EatingStyle>(
    profile?.eatingStyle || 'flexible'
  );
  const [proteinPriority, setProteinPriority] = useState<ProteinPriority>(
    profile?.proteinPriority || 'active'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentWeightKg = latestEntry?.weightKg || 70;
  const currentWeightLbs = currentWeightKg * 2.20462;

  useEffect(() => {
    loadProfile();
    loadActiveGoal();
  }, []);

  useEffect(() => {
    if (profile) {
      setEatingStyle(profile.eatingStyle);
      setProteinPriority(profile.proteinPriority);
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update profile
      await updateProfile({
        eatingStyle,
        proteinPriority,
      });

      // Recalculate macros if there's an active goal
      if (activeGoal) {
        const newMacros = macroCalculator.calculateMacros({
          weightKg: currentWeightKg,
          targetCalories: activeGoal.currentTargetCalories,
          eatingStyle,
          proteinPriority,
        });

        // Update goal targets
        await updateGoalTargets(activeGoal.currentTdeeEstimate, activeGoal.currentTargetCalories, {
          protein: newMacros.protein,
          carbs: newMacros.carbs,
          fat: newMacros.fat,
        });

        // Update daily goals in settings
        await setDailyGoals({
          calories: activeGoal.currentTargetCalories,
          protein: newMacros.protein,
          carbs: newMacros.carbs,
          fat: newMacros.fat,
        });
      }

      setIsEditing(false);
      showConfirm({
        title: 'Success',
        message: 'Nutrition preferences updated. Your macro targets have been recalculated.',
        icon: '✅',
        confirmLabel: 'OK',
        cancelLabel: null,
        onConfirm: () => {},
      });
    } catch (error) {
      console.error('Failed to update nutrition preferences:', error);
      showConfirm({
        title: 'Error',
        message: 'Failed to update preferences. Please try again.',
        icon: '❌',
        confirmLabel: 'OK',
        cancelLabel: null,
        confirmStyle: 'destructive',
        onConfirm: () => {},
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get protein example based on current weight
  const getProteinExample = (gPerLb: number): string => {
    const proteinGrams = Math.round(currentWeightLbs * gPerLb);
    return `${proteinGrams}g for your weight`;
  };

  // Preview macros based on current selections
  const previewMacros = activeGoal
    ? macroCalculator.calculateMacros({
        weightKg: currentWeightKg,
        targetCalories: activeGoal.currentTargetCalories,
        eatingStyle,
        proteinPriority,
      })
    : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Nutrition Preferences',
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
          {/* View Mode */}
          {!isEditing ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                YOUR PREFERENCES
              </Text>
              <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
                <View style={styles.profileRow}>
                  <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>
                    Eating Style
                  </Text>
                  <Text style={[styles.profileValue, { color: colors.textPrimary }]}>
                    {macroCalculator.getEatingStyleLabel(profile?.eatingStyle || 'flexible')}
                  </Text>
                </View>

                <View style={styles.profileRow}>
                  <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>
                    Protein Priority
                  </Text>
                  <Text style={[styles.profileValue, { color: colors.textPrimary }]}>
                    {macroCalculator.getProteinPriorityLabel(profile?.proteinPriority || 'active')}
                  </Text>
                </View>

                <Button
                  label="Edit Preferences"
                  variant="secondary"
                  onPress={() => setIsEditing(true)}
                  fullWidth
                />
              </View>

              {/* Current Macros Display */}
              {activeGoal && (
                <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
                  <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
                    CURRENT MACRO TARGETS
                  </Text>
                  <View style={styles.macroGrid}>
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
                      <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs</Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={[styles.macroValue, { color: colors.fat }]}>
                        {activeGoal.currentFatG}g
                      </Text>
                      <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fat</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={[styles.infoCard, { backgroundColor: colors.bgInteractive }]}>
                <Ionicons name="information-circle" size={20} color={colors.accent} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Changing your nutrition preferences will recalculate your daily macro targets
                  while keeping your calorie goal the same.
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Edit Mode */}
              {/* Eating Style Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  EATING STYLE
                </Text>
                <Text style={[styles.sectionDescription, { color: colors.textTertiary }]}>
                  How remaining calories (after protein) are split between carbs and fat
                </Text>
                <View style={styles.optionsList}>
                  {EATING_STYLE_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.option,
                        {
                          backgroundColor:
                            eatingStyle === option.value
                              ? colors.accent + '20'
                              : colors.bgSecondary,
                          borderColor:
                            eatingStyle === option.value ? colors.accent : 'transparent',
                        },
                      ]}
                      onPress={() => setEatingStyle(option.value)}
                    >
                      <View
                        style={[
                          styles.optionIcon,
                          {
                            backgroundColor:
                              eatingStyle === option.value ? colors.accent : colors.bgPrimary,
                          },
                        ]}
                      >
                        <Ionicons
                          name={option.icon}
                          size={20}
                          color={
                            eatingStyle === option.value ? '#FFFFFF' : colors.textSecondary
                          }
                        />
                      </View>
                      <View style={styles.optionContent}>
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color:
                                eatingStyle === option.value
                                  ? colors.accent
                                  : colors.textPrimary,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                          {option.description}
                        </Text>
                        <Text style={[styles.optionRatio, { color: colors.textTertiary }]}>
                          {option.ratio}
                        </Text>
                      </View>
                      {eatingStyle === option.value && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Protein Priority Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  PROTEIN PRIORITY
                </Text>
                <Text style={[styles.sectionDescription, { color: colors.textTertiary }]}>
                  How much protein based on your body weight
                </Text>
                <View style={styles.optionsList}>
                  {PROTEIN_PRIORITY_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.option,
                        {
                          backgroundColor:
                            proteinPriority === option.value
                              ? colors.accent + '20'
                              : colors.bgSecondary,
                          borderColor:
                            proteinPriority === option.value ? colors.accent : 'transparent',
                        },
                      ]}
                      onPress={() => setProteinPriority(option.value)}
                    >
                      <View
                        style={[
                          styles.optionIcon,
                          {
                            backgroundColor:
                              proteinPriority === option.value ? colors.accent : colors.bgPrimary,
                          },
                        ]}
                      >
                        <Ionicons
                          name={option.icon}
                          size={20}
                          color={
                            proteinPriority === option.value ? '#FFFFFF' : colors.textSecondary
                          }
                        />
                      </View>
                      <View style={styles.optionContent}>
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color:
                                proteinPriority === option.value
                                  ? colors.accent
                                  : colors.textPrimary,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                          {option.description}
                        </Text>
                        <View style={styles.optionMeta}>
                          <Text style={[styles.optionRatio, { color: colors.textTertiary }]}>
                            {option.gPerLb}g per lb
                          </Text>
                          <Text style={[styles.optionExample, { color: colors.accent }]}>
                            {getProteinExample(option.gPerLb)}
                          </Text>
                        </View>
                      </View>
                      {proteinPriority === option.value && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Preview */}
              {previewMacros && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    NEW MACRO PREVIEW
                  </Text>
                  <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
                    <View style={styles.macroGrid}>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: colors.protein }]}>
                          {previewMacros.protein}g
                        </Text>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                          Protein
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: colors.carbs }]}>
                          {previewMacros.carbs}g
                        </Text>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                          Carbs
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: colors.fat }]}>
                          {previewMacros.fat}g
                        </Text>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                          Fat
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.previewNote, { color: colors.textTertiary }]}>
                      Calorie target remains: {activeGoal?.currentTargetCalories} kcal
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Footer */}
        {isEditing && (
          <View style={styles.footer}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => {
                setEatingStyle(profile?.eatingStyle || 'flexible');
                setProteinPriority(profile?.proteinPriority || 'active');
                setIsEditing(false);
              }}
              fullWidth
              style={{ marginBottom: spacing[3] }}
            />
            <Button
              label="Save Changes"
              onPress={handleSave}
              loading={isSaving}
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
    paddingBottom: spacing[8],
  },
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    ...typography.body.small,
    marginBottom: spacing[1],
  },
  card: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[4],
  },
  cardTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  profileLabel: {
    ...typography.body.medium,
  },
  profileValue: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  infoText: {
    ...typography.body.small,
    flex: 1,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  macroValue: {
    ...typography.title.large,
  },
  macroLabel: {
    ...typography.caption,
  },
  optionsList: {
    gap: spacing[3],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing[3],
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: spacing[1],
  },
  optionRatio: {
    ...typography.caption,
  },
  optionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionExample: {
    ...typography.caption,
    fontWeight: '600',
  },
  previewNote: {
    ...typography.body.small,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  footer: {
    padding: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
});
