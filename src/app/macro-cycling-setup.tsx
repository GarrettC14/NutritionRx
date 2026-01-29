import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useMacroCycleStore, useSettingsStore, useSubscriptionStore } from '@/stores';
import { MacroCyclePatternType, DayTargets, MacroAdjustment } from '@/types/planning';
import { PremiumGate } from '@/components/premium';
import { MacroCyclingSetupSkeleton } from '@/components/ui/Skeleton';

const SAGE_GREEN = '#9CAF88';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface PatternOption {
  value: MacroCyclePatternType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PATTERN_OPTIONS: PatternOption[] = [
  {
    value: 'training_rest',
    label: 'Training / Rest Days',
    description: 'Higher targets on workout days',
    icon: 'barbell-outline',
  },
  {
    value: 'high_low_carb',
    label: 'High / Low Carb',
    description: 'Alternate between carb levels',
    icon: 'swap-horizontal-outline',
  },
  {
    value: 'custom',
    label: 'Custom Weekly Schedule',
    description: 'Set targets for each day',
    icon: 'calendar-outline',
  },
];

export default function MacroCyclingSetupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isPremium } = useSubscriptionStore();
  const { config, enableCycling, disableCycling, calculateDayTargets, loadConfig, isLoaded } = useMacroCycleStore();
  const { settings } = useSettingsStore();

  // Base targets from settings
  const baseTargets: DayTargets = {
    calories: settings.dailyCalorieGoal || 2200,
    protein: settings.dailyProteinGoal || 165,
    carbs: settings.dailyCarbsGoal || 220,
    fat: settings.dailyFatGoal || 73,
  };

  // Wizard state
  const [step, setStep] = useState(1);
  const [patternType, setPatternType] = useState<MacroCyclePatternType>(
    config?.patternType || 'training_rest'
  );
  const [markedDays, setMarkedDays] = useState<number[]>(
    config?.markedDays || [1, 3, 5] // Default: Mon, Wed, Fri
  );
  const [adjustment, setAdjustment] = useState<MacroAdjustment>({
    calories: 300,
    protein: 0,
    carbs: 50,
    fat: 0,
  });
  const [customTargets, setCustomTargets] = useState<{ [day: number]: DayTargets }>(
    config?.dayTargets || {}
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  // Redirect to paywall if not premium
  useEffect(() => {
    if (!isPremium) {
      router.replace('/paywall?context=planning');
    }
  }, [isPremium]);

  // Initialize custom targets with base values
  useEffect(() => {
    if (patternType === 'custom' && Object.keys(customTargets).length === 0) {
      const initial: { [day: number]: DayTargets } = {};
      for (let i = 0; i < 7; i++) {
        initial[i] = { ...baseTargets };
      }
      setCustomTargets(initial);
    }
  }, [patternType]);

  // Show skeleton while loading
  if (!isLoaded) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Macro Cycling Setup',
            headerStyle: { backgroundColor: colors.bgPrimary },
            headerTintColor: colors.textPrimary,
            presentation: 'modal',
            headerLeft: () => (
              <Pressable onPress={() => router.back()}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            ),
          }}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        >
          <MacroCyclingSetupSkeleton />
        </SafeAreaView>
      </>
    );
  }

  const toggleDay = (day: number) => {
    if (markedDays.includes(day)) {
      setMarkedDays(markedDays.filter((d) => d !== day));
    } else {
      setMarkedDays([...markedDays, day]);
    }
  };

  const updateCustomTarget = (day: number, field: keyof DayTargets, value: string) => {
    const numValue = parseInt(value) || 0;
    setCustomTargets({
      ...customTargets,
      [day]: {
        ...customTargets[day],
        [field]: numValue,
      },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let dayTargets: { [day: number]: DayTargets };

      if (patternType === 'custom') {
        dayTargets = customTargets;
      } else {
        dayTargets = calculateDayTargets(baseTargets, patternType, markedDays, adjustment);
      }

      await enableCycling(patternType, markedDays, dayTargets);
      Alert.alert('Success', 'Macro cycling has been enabled!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to save macro cycling:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    Alert.alert('Disable Macro Cycling?', 'Your daily targets will return to the base values.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable',
        style: 'destructive',
        onPress: async () => {
          await disableCycling();
          router.back();
        },
      },
    ]);
  };

  // Calculate preview targets
  const getPreviewTargets = () => {
    if (patternType === 'custom') {
      return customTargets;
    }
    return calculateDayTargets(baseTargets, patternType, markedDays, adjustment);
  };

  const calculateWeeklyAverage = () => {
    const targets = getPreviewTargets();
    let total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (let i = 0; i < 7; i++) {
      const dayTarget = targets[i] || baseTargets;
      total.calories += dayTarget.calories;
      total.protein += dayTarget.protein;
      total.carbs += dayTarget.carbs;
      total.fat += dayTarget.fat;
    }
    return {
      calories: Math.round(total.calories / 7),
      protein: Math.round(total.protein / 7),
      carbs: Math.round(total.carbs / 7),
      fat: Math.round(total.fat / 7),
    };
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        Choose a Cycling Pattern
      </Text>
      <View style={styles.optionsList}>
        {PATTERN_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.optionCard,
              {
                backgroundColor:
                  patternType === option.value ? SAGE_GREEN + '20' : colors.bgSecondary,
                borderColor: patternType === option.value ? SAGE_GREEN : 'transparent',
              },
            ]}
            onPress={() => setPatternType(option.value)}
          >
            <View
              style={[
                styles.optionIcon,
                {
                  backgroundColor: patternType === option.value ? SAGE_GREEN : colors.bgInteractive,
                },
              ]}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={patternType === option.value ? '#FFFFFF' : colors.textSecondary}
              />
            </View>
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionLabel,
                  { color: patternType === option.value ? SAGE_GREEN : colors.textPrimary },
                ]}
              >
                {option.label}
              </Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {option.description}
              </Text>
            </View>
            {patternType === option.value && (
              <Ionicons name="checkmark-circle" size={24} color={SAGE_GREEN} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderStep2TrainingRest = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        Select Your Training Days
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        These days will have higher targets.
      </Text>

      {/* Day Pills */}
      <View style={styles.dayPills}>
        {DAY_LABELS.map((label, index) => (
          <Pressable
            key={index}
            style={[
              styles.dayPill,
              {
                backgroundColor: markedDays.includes(index) ? SAGE_GREEN : colors.bgSecondary,
                borderColor: markedDays.includes(index) ? SAGE_GREEN : colors.borderDefault,
              },
            ]}
            onPress={() => toggleDay(index)}
          >
            <Text
              style={[
                styles.dayPillText,
                { color: markedDays.includes(index) ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Adjustment Section */}
      <View style={styles.adjustmentSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          TRAINING DAY ADJUSTMENT
        </Text>
        <View style={[styles.adjustmentCard, { backgroundColor: colors.bgSecondary }]}>
          <AdjustmentRow
            label="Calories"
            value={adjustment.calories}
            onChange={(v) => setAdjustment({ ...adjustment, calories: v })}
            colors={colors}
          />
          <AdjustmentRow
            label="Carbs"
            value={adjustment.carbs}
            unit="g"
            onChange={(v) => setAdjustment({ ...adjustment, carbs: v })}
            colors={colors}
          />
          <AdjustmentRow
            label="Protein"
            value={adjustment.protein}
            unit="g"
            onChange={(v) => setAdjustment({ ...adjustment, protein: v })}
            colors={colors}
          />
          <AdjustmentRow
            label="Fat"
            value={adjustment.fat}
            unit="g"
            onChange={(v) => setAdjustment({ ...adjustment, fat: v })}
            colors={colors}
          />
        </View>
        <Text style={[styles.adjustmentNote, { color: colors.textTertiary }]}>
          Rest days use your base targets.
        </Text>
      </View>
    </View>
  );

  const renderStep2HighLowCarb = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        Set Up Carb Cycling
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Select your high carb days.
      </Text>

      {/* Day Pills */}
      <View style={styles.dayPills}>
        {DAY_LABELS.map((label, index) => (
          <Pressable
            key={index}
            style={[
              styles.dayPill,
              {
                backgroundColor: markedDays.includes(index) ? SAGE_GREEN : colors.bgSecondary,
                borderColor: markedDays.includes(index) ? SAGE_GREEN : colors.borderDefault,
              },
            ]}
            onPress={() => toggleDay(index)}
          >
            <Text
              style={[
                styles.dayPillText,
                { color: markedDays.includes(index) ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Carb Adjustment */}
      <View style={styles.adjustmentSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          HIGH CARB DAY
        </Text>
        <View style={[styles.adjustmentCard, { backgroundColor: colors.bgSecondary }]}>
          <AdjustmentRow
            label="Carbs"
            value={adjustment.carbs}
            unit="g"
            prefix="+"
            onChange={(v) => setAdjustment({ ...adjustment, carbs: v })}
            colors={colors}
          />
          <AdjustmentRow
            label="Fat"
            value={adjustment.fat}
            unit="g"
            onChange={(v) => setAdjustment({ ...adjustment, fat: v })}
            colors={colors}
          />
        </View>
        <Text style={[styles.adjustmentNote, { color: colors.textTertiary }]}>
          Calories stay balanced between high and low days.
        </Text>
      </View>
    </View>
  );

  const renderStep2Custom = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        Custom Weekly Targets
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Start with your base targets, then adjust each day as needed.
      </Text>

      <ScrollView style={styles.customList} showsVerticalScrollIndicator={false}>
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const targets = customTargets[day] || baseTargets;
          const isModified =
            targets.calories !== baseTargets.calories ||
            targets.protein !== baseTargets.protein ||
            targets.carbs !== baseTargets.carbs ||
            targets.fat !== baseTargets.fat;

          return (
            <View
              key={day}
              style={[styles.customDayCard, { backgroundColor: colors.bgSecondary }]}
            >
              <View style={styles.customDayHeader}>
                <Text style={[styles.customDayName, { color: colors.textPrimary }]}>
                  {DAY_NAMES[day]}
                </Text>
                {isModified && (
                  <Ionicons name="pencil" size={14} color={SAGE_GREEN} />
                )}
              </View>
              <View style={styles.customDayInputs}>
                <CustomInput
                  label="Cal"
                  value={targets.calories.toString()}
                  onChange={(v) => updateCustomTarget(day, 'calories', v)}
                  colors={colors}
                />
                <CustomInput
                  label="P"
                  value={targets.protein.toString()}
                  onChange={(v) => updateCustomTarget(day, 'protein', v)}
                  colors={colors}
                />
                <CustomInput
                  label="C"
                  value={targets.carbs.toString()}
                  onChange={(v) => updateCustomTarget(day, 'carbs', v)}
                  colors={colors}
                />
                <CustomInput
                  label="F"
                  value={targets.fat.toString()}
                  onChange={(v) => updateCustomTarget(day, 'fat', v)}
                  colors={colors}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderStep3Review = () => {
    const preview = getPreviewTargets();
    const average = calculateWeeklyAverage();

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
          Review Your Cycle
        </Text>

        <View style={[styles.reviewCard, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>
            Pattern: {PATTERN_OPTIONS.find((p) => p.value === patternType)?.label}
          </Text>

          {patternType === 'training_rest' && (
            <>
              <View style={styles.reviewSection}>
                <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>
                  TRAINING DAYS ({markedDays.map((d) => DAY_LABELS[d]).join(', ')})
                </Text>
                <Text style={[styles.reviewTargets, { color: SAGE_GREEN }]}>
                  {baseTargets.calories + adjustment.calories} cal • {baseTargets.protein + adjustment.protein}g P • {baseTargets.carbs + adjustment.carbs}g C • {baseTargets.fat + adjustment.fat}g F
                </Text>
              </View>
              <View style={styles.reviewSection}>
                <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>
                  REST DAYS
                </Text>
                <Text style={[styles.reviewTargets, { color: colors.textSecondary }]}>
                  {baseTargets.calories} cal • {baseTargets.protein}g P • {baseTargets.carbs}g C • {baseTargets.fat}g F
                </Text>
              </View>
            </>
          )}

          {patternType === 'high_low_carb' && (
            <>
              <View style={styles.reviewSection}>
                <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>
                  HIGH CARB DAYS ({markedDays.map((d) => DAY_LABELS[d]).join(', ')})
                </Text>
                <Text style={[styles.reviewTargets, { color: SAGE_GREEN }]}>
                  {baseTargets.carbs + adjustment.carbs}g carbs • {baseTargets.fat + adjustment.fat}g fat
                </Text>
              </View>
              <View style={styles.reviewSection}>
                <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>
                  LOW CARB DAYS
                </Text>
                <Text style={[styles.reviewTargets, { color: colors.textSecondary }]}>
                  {baseTargets.carbs - Math.round(adjustment.carbs * 0.67)}g carbs • {baseTargets.fat - Math.round(adjustment.fat * 0.67)}g fat
                </Text>
              </View>
            </>
          )}

          <View style={[styles.averageSection, { borderTopColor: colors.borderDefault }]}>
            <Text style={[styles.averageLabel, { color: colors.textSecondary }]}>
              Weekly Average
            </Text>
            <Text style={[styles.averageValue, { color: colors.textPrimary }]}>
              {average.calories} cal/day
            </Text>
          </View>
        </View>

        <Text style={[styles.reviewNote, { color: colors.textTertiary }]}>
          You can edit this anytime in settings.
        </Text>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        if (patternType === 'training_rest') return renderStep2TrainingRest();
        if (patternType === 'high_low_carb') return renderStep2HighLowCarb();
        return renderStep2Custom();
      case 3:
        return renderStep3Review();
      default:
        return renderStep1();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Macro Cycling Setup',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          presentation: 'modal',
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                {
                  backgroundColor: s <= step ? SAGE_GREEN : colors.bgInteractive,
                },
              ]}
            />
          ))}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderCurrentStep()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {config?.enabled && step === 1 && (
            <Button
              label="Disable Cycling"
              variant="secondary"
              onPress={handleDisable}
              fullWidth
              style={{ marginBottom: spacing[3] }}
            />
          )}
          <View style={styles.footerButtons}>
            {step > 1 && (
              <Button
                label="Back"
                variant="secondary"
                onPress={() => setStep(step - 1)}
                style={{ flex: 1, marginRight: spacing[2] }}
              />
            )}
            {step < 3 ? (
              <Button
                label="Continue"
                onPress={() => setStep(step + 1)}
                style={{ flex: step > 1 ? 1 : undefined }}
                fullWidth={step === 1}
              />
            ) : (
              <Button
                label="Enable Macro Cycling"
                onPress={handleSave}
                loading={isSaving}
                style={{ flex: 1 }}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

function AdjustmentRow({
  label,
  value,
  unit,
  prefix,
  onChange,
  colors,
}: {
  label: string;
  value: number;
  unit?: string;
  prefix?: string;
  onChange: (value: number) => void;
  colors: any;
}) {
  const increment = label === 'Calories' ? 50 : 5;

  return (
    <View style={adjustmentStyles.row}>
      <Text style={[adjustmentStyles.label, { color: colors.textPrimary }]}>{label}</Text>
      <View style={adjustmentStyles.controls}>
        <Pressable
          style={[adjustmentStyles.button, { backgroundColor: colors.bgInteractive }]}
          onPress={() => onChange(value - increment)}
        >
          <Ionicons name="remove" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={[adjustmentStyles.value, { color: SAGE_GREEN }]}>
          {prefix || ''}{value >= 0 ? '+' : ''}{value}{unit || ''}
        </Text>
        <Pressable
          style={[adjustmentStyles.button, { backgroundColor: colors.bgInteractive }]}
          onPress={() => onChange(value + increment)}
        >
          <Ionicons name="add" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

function CustomInput({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: any;
}) {
  return (
    <View style={customInputStyles.container}>
      <Text style={[customInputStyles.label, { color: colors.textTertiary }]}>{label}</Text>
      <TextInput
        style={[
          customInputStyles.input,
          { backgroundColor: colors.bgInteractive, color: colors.textPrimary },
        ]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        selectTextOnFocus
      />
    </View>
  );
}

const adjustmentStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  label: {
    ...typography.body.medium,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    ...typography.body.medium,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'center',
  },
});

const customInputStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    ...typography.caption,
    marginBottom: spacing[1],
  },
  input: {
    width: '100%',
    height: 36,
    borderRadius: borderRadius.sm,
    textAlign: 'center',
    ...typography.body.small,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: componentSpacing.screenEdgePadding,
  },
  stepContent: {
    gap: spacing[4],
  },
  stepTitle: {
    ...typography.title.medium,
    textAlign: 'center',
  },
  stepDescription: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  optionsList: {
    gap: spacing[3],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing[3],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body.large,
    fontWeight: '600',
  },
  optionDescription: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  dayPills: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  dayPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  dayPillText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  adjustmentSection: {
    marginTop: spacing[4],
    gap: spacing[2],
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adjustmentCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  adjustmentNote: {
    ...typography.body.small,
    textAlign: 'center',
  },
  customList: {
    maxHeight: 400,
  },
  customDayCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  customDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  customDayName: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  customDayInputs: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  reviewCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  reviewLabel: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  reviewSection: {
    gap: spacing[1],
  },
  reviewSectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewTargets: {
    ...typography.body.medium,
  },
  averageSection: {
    borderTopWidth: 1,
    paddingTop: spacing[3],
    marginTop: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  averageLabel: {
    ...typography.body.medium,
  },
  averageValue: {
    ...typography.body.large,
    fontWeight: '600',
  },
  reviewNote: {
    ...typography.body.small,
    textAlign: 'center',
  },
  footer: {
    padding: componentSpacing.screenEdgePadding,
    paddingTop: spacing[3],
  },
  footerButtons: {
    flexDirection: 'row',
  },
});
