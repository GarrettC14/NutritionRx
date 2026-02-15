import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useMacroCycleStore, useSettingsStore, useSubscriptionStore } from '@/stores';
import { useResolvedTargets } from '@/hooks/useResolvedTargets';
import { BudgetBarChart } from '@/components/budget/BudgetBarChart';
import { DayEditor } from '@/components/budget/DayEditor';
import { MacroBreakdownAccordion } from '@/components/budget/MacroBreakdownAccordion';
import { WeeklyTotalHeader } from '@/components/budget/WeeklyTotalHeader';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

export default function WeeklyBudgetScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { showConfirm } = useConfirmDialog();
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const {
    redistributionDays,
    weeklyTotal,
    isRedistributionActive,
    config,
    initializeRedistribution,
    adjustDay,
    toggleDayLock,
    resetRedistribution,
    saveRedistribution,
    loadRedistribution,
  } = useMacroCycleStore();
  const { settings } = useSettingsStore();
  const { calories, protein, carbs, fat } = useResolvedTargets();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFirstUse, setIsFirstUse] = useState(false);

  // Premium guard
  useEffect(() => {
    if (!isPremium) {
      router.replace('/paywall?context=calorie_budget');
    }
  }, [isPremium]);

  // Initialize or load redistribution data
  useEffect(() => {
    if (!isPremium) return;

    if (config?.patternType === 'redistribution' && config.enabled) {
      loadRedistribution();
    } else if (!isRedistributionActive || redistributionDays.length === 0) {
      const startDay = config?.redistributionStartDay ?? 0;
      initializeRedistribution(calories, protein, carbs, fat, protein, startDay);
      setIsFirstUse(true);
    }
  }, [isPremium]);

  // Goal change detection
  useEffect(() => {
    if (redistributionDays.length === 7 && isRedistributionActive) {
      const storedWeekly = redistributionDays.reduce((s, d) => s + d.calories, 0);
      const baseWeekly = calories * 7;
      if (Math.abs(storedWeekly - baseWeekly) > 50) {
        showConfirm({
          title: 'Goal Changed',
          message: 'Your calorie goal has changed. Update your weekly budget?',
          icon: 'refresh-outline',
          confirmLabel: 'Update',
          cancelLabel: 'Keep Current',
          onConfirm: () => {
            const startDay = config?.redistributionStartDay ?? 0;
            initializeRedistribution(calories, protein, carbs, fat, protein, startDay);
          },
        });
      }
    }
  }, [calories]);

  const proteinFloor = protein;
  const dailyAverage = weeklyTotal > 0 ? Math.round(weeklyTotal / 7) : calories;

  const handleCaloriesChange = (newCalories: number) => {
    if (selectedIndex === null) return;
    const result = adjustDay(selectedIndex, newCalories, proteinFloor);
    if (result === null) {
      showConfirm({
        title: 'Cannot Adjust',
        message: "Can't redistribute this much. Try unlocking more days or making a smaller adjustment.",
        icon: 'alert-circle-outline',
        confirmLabel: 'OK',
        cancelLabel: null,
        onConfirm: () => {},
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveRedistribution();
      showConfirm({
        title: 'Saved',
        message: 'Your weekly calorie budget has been saved.',
        icon: 'checkmark-circle',
        confirmLabel: 'OK',
        cancelLabel: null,
        onConfirm: () => router.back(),
      });
    } catch {
      showConfirm({
        title: 'Error',
        message: 'Failed to save budget. Please try again.',
        icon: 'alert-circle-outline',
        confirmLabel: 'OK',
        cancelLabel: null,
        confirmStyle: 'destructive',
        onConfirm: () => {},
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedDay = selectedIndex !== null ? redistributionDays[selectedIndex] : null;

  if (!isPremium) return null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Weekly Calorie Budget
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <WeeklyTotalHeader total={weeklyTotal} />

          <BudgetBarChart
            days={redistributionDays}
            selectedIndex={selectedIndex}
            weeklyTotal={weeklyTotal}
            onSelectDay={setSelectedIndex}
            onToggleLock={toggleDayLock}
          />

          {selectedDay && (
            <>
              <DayEditor
                day={selectedDay}
                dailyAverage={dailyAverage}
                onCaloriesChange={handleCaloriesChange}
              />
              <MacroBreakdownAccordion
                day={selectedDay}
                proteinFloor={proteinFloor}
              />
            </>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              label="Reset to Equal"
              variant="secondary"
              onPress={resetRedistribution}
              fullWidth
            />
            <Button
              label="Save Budget"
              onPress={handleSave}
              loading={isSaving}
              fullWidth
            />
          </View>

          {isFirstUse && (
            <View style={[styles.infoCard, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Weekly averages matter more than daily perfection. This planner helps you be
                flexible — not restrictive.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    height: componentSpacing.headerHeight,
  },
  headerTitle: {
    ...typography.title.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: componentSpacing.screenEdgePadding,
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  actions: {
    gap: spacing[3],
    marginTop: spacing[2],
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
});
