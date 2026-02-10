import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useGoalStore, useSettingsStore, useWeightStore, useProfileStore } from '@/stores';
import { GoalType, PlanningMode } from '@/types/domain';
import { RATE_OPTIONS, TIMELINE_SAFETY } from '@/constants/defaults';
import {
  calculateTimelineRate,
  calculateEstimatedCompletion,
  getSuggestedDate,
} from '@/stores/goalStore';
import { TestIDs, settingsRateOption } from '@/constants/testIDs';

const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number): number => Math.round((lbs / 2.20462) * 100) / 100;

const PLANNING_MODE_OPTIONS: { value: PlanningMode; label: string }[] = [
  { value: 'rate', label: 'Weekly pace' },
  { value: 'timeline', label: 'Target date' },
];

const QUICK_SELECT_WEEKS = [4, 8, 12] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function addWeeks(weeks: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function GoalsSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    activeGoal,
    createGoal,
    completeGoal,
    isLoading,
    loadActiveGoal,
    currentWeightKg: storeCurrentWeightKg,
    currentWeightLastUpdated,
    loadCurrentWeight,
    updateCurrentWeight,
  } = useGoalStore();
  const { settings } = useSettingsStore();
  const { latestEntry } = useWeightStore();
  const { profile } = useProfileStore();

  const isLbs = settings.weightUnit === 'lbs';

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState<GoalType>(activeGoal?.type || 'lose');
  const [targetWeight, setTargetWeight] = useState('');
  const [selectedRate, setSelectedRate] = useState(activeGoal?.targetRatePercent || 0.5);
  const [currentWeight, setCurrentWeight] = useState('');
  const [planningMode, setPlanningMode] = useState<PlanningMode>('rate');
  const [targetDate, setTargetDate] = useState<Date>(addWeeks(8));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSafetyCard, setShowSafetyCard] = useState(false);
  const [userAcceptedUnsafeRate, setUserAcceptedUnsafeRate] = useState(false);

  const hasInitialized = useRef(false);

  // Derived current weight (from input, store, or activeGoal)
  const resolvedCurrentWeightKg = useMemo(() => {
    if (currentWeight) {
      const parsed = parseFloat(currentWeight);
      if (!isNaN(parsed) && parsed > 0) {
        return isLbs ? lbsToKg(parsed) : parsed;
      }
    }
    return storeCurrentWeightKg ?? latestEntry?.weightKg ?? null;
  }, [currentWeight, storeCurrentWeightKg, latestEntry, isLbs]);

  const hasCurrentWeight = resolvedCurrentWeightKg !== null;

  useEffect(() => {
    loadActiveGoal();
    loadCurrentWeight();
  }, []);

  // Initialize from active goal on first load
  useEffect(() => {
    if (activeGoal && !hasInitialized.current) {
      setSelectedGoalType(activeGoal.type);
      setSelectedRate(activeGoal.targetRatePercent);
      setPlanningMode(activeGoal.planningMode ?? 'rate');
      if (activeGoal.targetDate) {
        setTargetDate(new Date(activeGoal.targetDate + 'T00:00:00'));
      }
      if (activeGoal.targetWeightKg) {
        setTargetWeight(
          isLbs
            ? kgToLbs(activeGoal.targetWeightKg).toFixed(0)
            : activeGoal.targetWeightKg.toFixed(0)
        );
      }
      hasInitialized.current = true;
    }
  }, [activeGoal, isLbs]);

  // Initialize current weight input from store
  useEffect(() => {
    if (storeCurrentWeightKg && !currentWeight) {
      setCurrentWeight(
        isLbs
          ? kgToLbs(storeCurrentWeightKg).toFixed(0)
          : storeCurrentWeightKg.toFixed(0)
      );
    }
  }, [storeCurrentWeightKg, isLbs]);

  // Derived values for timeline calculations
  const targetWeightKg = useMemo(() => {
    if (!targetWeight) return null;
    const parsed = parseFloat(targetWeight);
    if (isNaN(parsed) || parsed <= 0) return null;
    return isLbs ? lbsToKg(parsed) : parsed;
  }, [targetWeight, isLbs]);

  // Directional validation: warn if target weight contradicts goal type
  const directionalWarning = useMemo(() => {
    if (!resolvedCurrentWeightKg || !targetWeightKg) return null;
    if (selectedGoalType === 'lose' && targetWeightKg >= resolvedCurrentWeightKg) {
      return 'Your target weight is higher than your current weight. Did you mean to gain?';
    }
    if (selectedGoalType === 'gain' && targetWeightKg <= resolvedCurrentWeightKg) {
      return 'Your target weight is lower than your current weight. Did you mean to lose?';
    }
    return null;
  }, [resolvedCurrentWeightKg, targetWeightKg, selectedGoalType]);

  const timelineInfo = useMemo(() => {
    if (!resolvedCurrentWeightKg || !targetWeightKg) return null;
    const targetDateStr = toISODate(targetDate);
    const { weeklyRateKg, totalWeeks } = calculateTimelineRate(
      resolvedCurrentWeightKg,
      targetWeightKg,
      targetDateStr
    );
    const weeklyRateLbs = kgToLbs(weeklyRateKg);
    return { weeklyRateKg, weeklyRateLbs, totalWeeks };
  }, [resolvedCurrentWeightKg, targetWeightKg, targetDate]);

  const estimatedCompletion = useMemo(() => {
    if (!resolvedCurrentWeightKg || !targetWeightKg || selectedRate === 0) return null;
    return calculateEstimatedCompletion(resolvedCurrentWeightKg, targetWeightKg, selectedRate);
  }, [resolvedCurrentWeightKg, targetWeightKg, selectedRate]);

  const suggestedDate = useMemo(() => {
    if (!resolvedCurrentWeightKg || !targetWeightKg || selectedGoalType === 'maintain') return null;
    return getSuggestedDate(resolvedCurrentWeightKg, targetWeightKg, selectedGoalType);
  }, [resolvedCurrentWeightKg, targetWeightKg, selectedGoalType]);

  // Check safety when timeline info changes
  useEffect(() => {
    if (!timelineInfo || !resolvedCurrentWeightKg || planningMode !== 'timeline') {
      setShowSafetyCard(false);
      return;
    }
    const maxKg = selectedGoalType === 'lose'
      ? TIMELINE_SAFETY.maxWeeklyLossKg
      : TIMELINE_SAFETY.maxWeeklyGainKg;
    setShowSafetyCard(timelineInfo.weeklyRateKg > maxKg);
    if (timelineInfo.weeklyRateKg <= maxKg) {
      setUserAcceptedUnsafeRate(false);
    }
  }, [timelineInfo, resolvedCurrentWeightKg, planningMode, selectedGoalType]);

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

  const handleCurrentWeightBlur = useCallback(async () => {
    if (!currentWeight) return;
    const parsed = parseFloat(currentWeight);
    if (isNaN(parsed) || parsed <= 0) return;

    const weightKg = isLbs ? lbsToKg(parsed) : parsed;

    // Validate bounds: 30-300 kg / 66-660 lbs
    const minKg = 30;
    const maxKg = 300;
    if (weightKg < minKg || weightKg > maxKg) return;

    await updateCurrentWeight(weightKg);
  }, [currentWeight, isLbs, updateCurrentWeight]);

  const handleTargetChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setTargetWeight(cleaned);
  };

  const handleCurrentWeightChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setCurrentWeight(cleaned);
  };

  const handlePlanningModeChange = (mode: PlanningMode) => {
    if (mode === 'timeline' && planningMode === 'rate') {
      // Pre-populate date from estimated completion
      if (estimatedCompletion) {
        setTargetDate(new Date(estimatedCompletion + 'T00:00:00'));
      }
    } else if (mode === 'rate' && planningMode === 'timeline') {
      // Pre-select closest rate option from timeline rate
      if (timelineInfo && resolvedCurrentWeightKg) {
        const ratePercent = (timelineInfo.weeklyRateKg / resolvedCurrentWeightKg) * 100;
        const closest = getRateOptions().reduce((prev, curr) =>
          Math.abs(curr.value - ratePercent) < Math.abs(prev.value - ratePercent) ? curr : prev
        );
        setSelectedRate(closest.value);
      }
    }
    setPlanningMode(mode);
    setUserAcceptedUnsafeRate(false);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const handleUseSuggestedDate = () => {
    if (suggestedDate) {
      setTargetDate(new Date(suggestedDate + 'T00:00:00'));
      setUserAcceptedUnsafeRate(false);
    }
  };

  const handleKeepDate = () => {
    setUserAcceptedUnsafeRate(true);
  };

  const handleSave = async () => {
    if (!profile) {
      Alert.alert('Profile Required', 'Please complete your profile first.');
      return;
    }

    // For lose/gain, require explicit weight. For maintain, allow fallback.
    const weightForGoal = resolvedCurrentWeightKg
      ?? (selectedGoalType === 'maintain' ? (activeGoal?.startWeightKg ?? 70) : null);
    if (!weightForGoal) {
      Alert.alert('Weight Required', 'Please enter your current weight.');
      return;
    }

    try {
      if (activeGoal) {
        await completeGoal();
      }

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

      const finalTargetWeightKg = targetWeight
        ? isLbs
          ? lbsToKg(parseFloat(targetWeight))
          : parseFloat(targetWeight)
        : undefined;

      const isTimeline = planningMode === 'timeline' && selectedGoalType !== 'maintain';
      const targetDateStr = isTimeline ? toISODate(targetDate) : undefined;

      // For timeline mode, derive rate; for rate mode, use selected rate
      let rateForGoal = selectedGoalType === 'maintain' ? 0 : selectedRate;
      if (isTimeline && finalTargetWeightKg && weightForGoal) {
        const { weeklyRateKg } = calculateTimelineRate(
          weightForGoal,
          finalTargetWeightKg,
          targetDateStr!
        );
        rateForGoal = (weeklyRateKg / weightForGoal) * 100;
      }

      await createGoal({
        type: selectedGoalType,
        targetWeightKg: finalTargetWeightKg,
        targetRatePercent: rateForGoal,
        currentWeightKg: weightForGoal,
        sex: profile.sex || 'male',
        heightCm: profile.heightCm || 170,
        age,
        activityLevel: profile.activityLevel || 'moderately_active',
        planningMode: selectedGoalType === 'maintain' ? 'rate' : planningMode,
        targetDate: targetDateStr,
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    }
  };

  const currentWeightDisplay = resolvedCurrentWeightKg
    ? isLbs
      ? `${kgToLbs(resolvedCurrentWeightKg).toFixed(1)} lbs`
      : `${resolvedCurrentWeightKg.toFixed(1)} kg`
    : '—';

  const lastUpdatedText = currentWeightLastUpdated
    ? (() => {
        const days = daysAgo(currentWeightLastUpdated);
        if (days === 0) return 'Updated today';
        if (days === 1) return 'Updated yesterday';
        return `Updated ${days} days ago`;
      })()
    : null;

  const minimumTargetDate = addWeeks(1);

  // ====== RENDER: VIEW MODE ======
  if (activeGoal && !isEditing) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Your Goal',
            headerStyle: { backgroundColor: colors.bgPrimary },
            headerTintColor: colors.textPrimary,
            headerLeft: () => (
              <Pressable onPress={() => router.back()} testID={TestIDs.SettingsGoals.BackButton}>
                <Ionicons name="chevron-back" size={24} color={colors.accent} />
              </Pressable>
            ),
          }}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.container, { backgroundColor: colors.bgPrimary }]}
          testID={TestIDs.SettingsGoals.Screen}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            testID={TestIDs.SettingsGoals.ScrollView}
          >
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
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
                    <View>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                        {currentWeightDisplay}
                      </Text>
                      {lastUpdatedText && (
                        <Text style={[styles.detailSublabel, { color: colors.textTertiary }]}>
                          {lastUpdatedText}
                        </Text>
                      )}
                    </View>
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
                        Planning
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                        {activeGoal.planningMode === 'timeline' && activeGoal.targetDate
                          ? `Aiming for ~${formatDate(activeGoal.targetDate)}`
                          : RATE_OPTIONS.find(r => r.value === activeGoal.targetRatePercent)?.label ||
                            `${activeGoal.targetRatePercent.toFixed(1)}%/week`}
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
                  testID={TestIDs.SettingsGoals.EditButton}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  // ====== RENDER: EDIT MODE ======
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Your Goal',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} testID={TestIDs.SettingsGoals.BackButton}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        testID={TestIDs.SettingsGoals.Screen}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          testID={TestIDs.SettingsGoals.ScrollView}
        >
          {/* Current Weight Field (for lose/gain) */}
          {selectedGoalType !== 'maintain' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
                CURRENT WEIGHT
              </Text>
              <View style={[styles.inputCard, { backgroundColor: colors.bgSecondary }]}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={currentWeight}
                    onChangeText={handleCurrentWeightChange}
                    onBlur={handleCurrentWeightBlur}
                    keyboardType="decimal-pad"
                    placeholder={isLbs ? '170' : '77'}
                    placeholderTextColor={colors.textTertiary}
                    maxLength={5}
                  />
                  <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>
                    {isLbs ? 'lbs' : 'kg'}
                  </Text>
                </View>
                <Text style={[styles.currentNote, { color: colors.textTertiary }]}>
                  {lastUpdatedText || 'Enter your current weight to get started'}
                </Text>
              </View>
            </View>
          )}

          {/* Goal Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
              GOAL TYPE
            </Text>
            <View style={styles.optionGrid} accessible={true} accessibilityLabel="Goal type selection">
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
                  testID={option.value === 'lose' ? TestIDs.SettingsGoals.GoalLose : option.value === 'maintain' ? TestIDs.SettingsGoals.GoalMaintain : TestIDs.SettingsGoals.GoalGain}
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
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
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
                    testID={TestIDs.SettingsGoals.TargetWeightInput}
                  />
                  <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>
                    {isLbs ? 'lbs' : 'kg'}
                  </Text>
                </View>
                {resolvedCurrentWeightKg && (
                  <Text style={[styles.currentNote, { color: colors.textTertiary }]}>
                    Current: {currentWeightDisplay}
                  </Text>
                )}
                {directionalWarning && (
                  <Text style={[styles.warningText, { color: colors.warning }]}>
                    {directionalWarning}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Planning Mode Toggle (hidden for maintain) */}
          {selectedGoalType !== 'maintain' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
                HOW DO YOU WANT TO PLAN?
              </Text>
              <SegmentedControl
                options={PLANNING_MODE_OPTIONS}
                value={planningMode}
                onChange={handlePlanningModeChange}
              />
            </View>
          )}

          {/* Rate Mode */}
          {selectedGoalType !== 'maintain' && planningMode === 'rate' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
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
                    testID={settingsRateOption(String(option.value))}
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

              {/* Estimated completion */}
              {estimatedCompletion && (
                <View style={[styles.infoCard, { backgroundColor: colors.bgSecondary }]}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    At this pace, you could reach your goal around ~{formatDate(estimatedCompletion)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Timeline Mode */}
          {selectedGoalType !== 'maintain' && planningMode === 'timeline' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
                TARGET DATE
              </Text>

              {/* Date display card */}
              <Pressable
                style={[styles.dateCard, { backgroundColor: colors.bgSecondary }]}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.dateCardContent}>
                  <Text style={[styles.dateCardLabel, { color: colors.textSecondary }]}>
                    Aiming for
                  </Text>
                  <Text style={[styles.dateCardValue, { color: colors.textPrimary }]}>
                    {formatDate(toISODate(targetDate))}
                  </Text>
                </View>
                <Ionicons name="calendar" size={22} color={colors.accent} />
              </Pressable>

              {/* Date picker */}
              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={targetDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={minimumTargetDate}
                    textColor={colors.textPrimary}
                  />
                  {Platform.OS === 'ios' && (
                    <Button
                      label="Done"
                      variant="secondary"
                      onPress={() => setShowDatePicker(false)}
                      style={{ marginTop: spacing[3] }}
                    />
                  )}
                </View>
              )}

              {/* Quick-select chips */}
              <View style={styles.chipRow}>
                {QUICK_SELECT_WEEKS.map((weeks) => {
                  const chipDate = addWeeks(weeks);
                  const isSelected = Math.abs(targetDate.getTime() - chipDate.getTime()) < 2 * 24 * 60 * 60 * 1000;
                  return (
                    <Pressable
                      key={weeks}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? colors.accent + '20' : colors.bgElevated,
                          borderColor: isSelected ? colors.accent : 'transparent',
                        },
                      ]}
                      onPress={() => setTargetDate(chipDate)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? colors.accent : colors.textSecondary },
                        ]}
                      >
                        {weeks} weeks
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Derived info */}
              {timelineInfo && (
                <View style={[styles.infoCard, { backgroundColor: colors.bgSecondary }]}>
                  <View style={styles.infoCardColumn}>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      That's about {Math.round(timelineInfo.totalWeeks)} weeks from now
                    </Text>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      About {isLbs
                        ? `${timelineInfo.weeklyRateLbs.toFixed(1)} lbs`
                        : `${timelineInfo.weeklyRateKg.toFixed(2)} kg`}/week
                    </Text>
                  </View>
                </View>
              )}

              {/* Safety Card */}
              {showSafetyCard && !userAcceptedUnsafeRate && (
                <View style={[styles.safetyCard, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>
                  <View style={styles.safetyHeader}>
                    <Ionicons name="heart" size={20} color={colors.warning} />
                    <Text style={[styles.safetyTitle, { color: colors.warning }]}>
                      Let's take it easy
                    </Text>
                  </View>
                  <Text style={[styles.safetyText, { color: colors.textSecondary }]}>
                    That pace is faster than what's generally recommended for sustainable progress. A gentler timeline often leads to better long-term results.
                  </Text>
                  {suggestedDate && (
                    <Text style={[styles.safetySuggestion, { color: colors.textSecondary }]}>
                      A safer pace would aim for around {formatDate(suggestedDate)}.
                    </Text>
                  )}
                  <View style={styles.safetyButtons}>
                    <Button
                      label="Use suggested date"
                      variant="secondary"
                      onPress={handleUseSuggestedDate}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="Keep my date"
                      variant="ghost"
                      onPress={handleKeepDate}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}

              {/* Rate capped note */}
              {showSafetyCard && userAcceptedUnsafeRate && (
                <View style={[styles.infoCard, { backgroundColor: colors.warningBg }]}>
                  <Ionicons name="information-circle" size={18} color={colors.warning} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Your pace will be capped at a safe maximum rate to protect your health.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Summary Card */}
          {hasCurrentWeight && selectedGoalType !== 'maintain' && targetWeightKg && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
                YOUR PLAN
              </Text>
              <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                      {currentWeight || '—'} {isLbs ? 'lbs' : 'kg'}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Now</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={colors.textTertiary} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.accent }]}>
                      {targetWeight} {isLbs ? 'lbs' : 'kg'}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Goal</Text>
                  </View>
                </View>

                {planningMode === 'timeline' && timelineInfo && (
                  <Text style={[styles.summaryDetail, { color: colors.textSecondary }]}>
                    {Math.abs(parseFloat(targetWeight) - parseFloat(currentWeight || '0')).toFixed(0)} {isLbs ? 'lbs' : 'kg'} over ~{Math.round(timelineInfo.totalWeeks)} weeks
                  </Text>
                )}

                {planningMode === 'rate' && estimatedCompletion && (
                  <Text style={[styles.summaryDetail, { color: colors.textSecondary }]}>
                    Aiming for ~{formatDate(estimatedCompletion)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Prompt when no current weight */}
          {!hasCurrentWeight && selectedGoalType !== 'maintain' && (
            <View style={[styles.infoCard, { backgroundColor: colors.bgSecondary, marginTop: spacing[2] }]}>
              <Ionicons name="scale-outline" size={18} color={colors.textTertiary} />
              <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                Enter your current weight above to see calorie and macro calculations.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {isEditing && (
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setIsEditing(false)}
              fullWidth
              style={{ marginBottom: spacing[3] }}
              testID={TestIDs.SettingsGoals.CancelButton}
            />
          )}
          <Button
            label={activeGoal ? 'Update Goal' : 'Set Goal'}
            onPress={handleSave}
            loading={isLoading}
            fullWidth
            testID={TestIDs.SettingsGoals.SaveButton}
          />
        </View>
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
  detailSublabel: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 2,
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
  warningText: {
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
  // Timeline mode styles
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  dateCardContent: {
    gap: spacing[1],
  },
  dateCardLabel: {
    ...typography.caption,
  },
  dateCardValue: {
    ...typography.title.medium,
    fontWeight: '600',
  },
  datePickerContainer: {
    marginTop: spacing[2],
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  chipText: {
    ...typography.body.small,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  infoCardColumn: {
    gap: spacing[1],
  },
  infoText: {
    ...typography.body.small,
    flex: 1,
  },
  safetyCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  safetyTitle: {
    ...typography.body.large,
    fontWeight: '600',
  },
  safetyText: {
    ...typography.body.small,
    lineHeight: 20,
  },
  safetySuggestion: {
    ...typography.body.small,
    fontWeight: '600',
  },
  safetyButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  summaryItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  summaryValue: {
    ...typography.title.medium,
    fontWeight: '700',
  },
  summaryLabel: {
    ...typography.caption,
  },
  summaryDetail: {
    ...typography.body.small,
    textAlign: 'center',
  },
});
