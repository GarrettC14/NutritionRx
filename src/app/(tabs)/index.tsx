import { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_ORDER } from '@/constants/mealTypes';
import { useFoodLogStore, useSettingsStore, useWaterStore, useMacroCycleStore } from '@/stores';
import { CalorieRing } from '@/components/ui/CalorieRing';
import { MacroSummary } from '@/components/food/MacroSummary';
import { MealSection } from '@/components/food/MealSection';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { TodayScreenSkeleton } from '@/components/ui/Skeleton';
import { WaterSection } from '@/components/water';
import { FastingSection, PlannedMealsSection } from '@/components/planning';
import { LogEntry, QuickAddEntry } from '@/types/domain';
import { DayTargets } from '@/types/planning';

export default function TodayScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // Stores
  const {
    selectedDate,
    setSelectedDate,
    entries,
    quickAddEntries,
    dailyTotals,
    streak,
    isLoaded: dataLoaded,
    loadEntriesForDate,
    loadStreak,
    deleteLogEntry,
    deleteQuickEntry,
    getEntriesByMeal,
    getQuickEntriesByMeal,
    copyMealToDate,
    copyDayToDate,
  } = useFoodLogStore();

  const { settings, loadSettings, isLoaded: settingsLoaded } = useSettingsStore();
  const { loadTodayWater, loadWaterSettings, isLoaded: waterLoaded } = useWaterStore();
  const {
    config: macroCycleConfig,
    loadConfig: loadMacroCycleConfig,
    getTargetsForDate,
    getDayType,
    isLoaded: macroCycleLoaded,
  } = useMacroCycleStore();

  // State
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [adjustedTargets, setAdjustedTargets] = useState<DayTargets | null>(null);

  // Show skeleton until data, settings, water, and macro cycle are loaded
  const isReady = dataLoaded && settingsLoaded && waterLoaded && macroCycleLoaded;

  // Load data on mount
  useEffect(() => {
    loadSettings();
    loadEntriesForDate(selectedDate);
    loadStreak();
    loadWaterSettings();
    loadTodayWater();
    loadMacroCycleConfig();
  }, []);

  // Load adjusted targets when date or settings change
  useEffect(() => {
    if (!settingsLoaded) return;

    const baseTargets: DayTargets = {
      calories: settings.dailyCalorieGoal,
      protein: settings.dailyProteinGoal,
      carbs: settings.dailyCarbsGoal,
      fat: settings.dailyFatGoal,
    };

    getTargetsForDate(selectedDate, baseTargets).then(setAdjustedTargets);
  }, [selectedDate, settingsLoaded, settings, macroCycleConfig]);

  // Date navigation
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    const newDate = current.toISOString().split('T')[0];
    setSelectedDate(newDate);
  }, [selectedDate, setSelectedDate]);

  const goToToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, [setSelectedDate]);

  // Format date for display - full format "Monday, January 27"
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format date for modal title
  const formatDateShort = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Get entries by meal
  const entriesByMeal = getEntriesByMeal();
  const quickEntriesByMeal = getQuickEntriesByMeal();

  // Goals from settings (use adjusted targets if macro cycling is enabled)
  const baseGoals = {
    calories: settings.dailyCalorieGoal,
    protein: settings.dailyProteinGoal,
    carbs: settings.dailyCarbsGoal,
    fat: settings.dailyFatGoal,
  };

  const goals = adjustedTargets || baseGoals;

  // Get day type for macro cycling badge
  const selectedDayOfWeek = new Date(selectedDate + 'T12:00:00').getDay();
  const dayType = macroCycleConfig?.enabled ? getDayType(selectedDayOfWeek) : null;

  // Day type display info
  const getDayTypeDisplay = () => {
    if (!dayType) return null;
    switch (dayType) {
      case 'training':
        return { label: 'Training Day', icon: 'barbell-outline' as const };
      case 'rest':
        return { label: 'Rest Day', icon: 'leaf-outline' as const };
      case 'high_carb':
        return { label: 'High Carb', icon: 'trending-up-outline' as const };
      case 'low_carb':
        return { label: 'Low Carb', icon: 'trending-down-outline' as const };
      case 'custom':
        return { label: 'Custom', icon: 'settings-outline' as const };
      default:
        return null;
    }
  };

  const dayTypeDisplay = getDayTypeDisplay();

  // Handlers
  const handleAddFood = (mealType: MealType) => {
    router.push({
      pathname: '/add-food',
      params: { mealType, date: selectedDate },
    });
  };

  const handleEntryPress = (entry: LogEntry) => {
    router.push({
      pathname: '/log-entry/[id]',
      params: { id: entry.id },
    });
  };

  const handleQuickAddPress = (entry: QuickAddEntry) => {
    router.push({
      pathname: '/log-entry/[id]',
      params: { id: entry.id },
    });
  };

  const handleDeleteEntry = async (entry: LogEntry) => {
    await deleteLogEntry(entry.id);
  };

  const handleDeleteQuickAdd = async (entry: QuickAddEntry) => {
    await deleteQuickEntry(entry.id);
  };

  const handleCopyMeal = async (mealType: MealType) => {
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      await copyMealToDate(mealType, tomorrowStr);
      Alert.alert('Copied', `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} copied to tomorrow.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy meal. Please try again.');
    }
  };

  const handleCopyDay = async () => {
    setShowDayMenu(false);
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      await copyDayToDate(selectedDate, tomorrowStr);
      Alert.alert('Copied', 'All meals copied to tomorrow.');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy day. Please try again.');
    }
  };

  const hasEntries = entries.length > 0 || quickAddEntries.length > 0;

  // Show skeleton while loading
  if (!isReady) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <TodayScreenSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {/* Row 1: Navigation arrows + Date */}
        <View style={styles.dateRow}>
          <Pressable
            style={styles.navButton}
            onPress={() => navigateDate('prev')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </Pressable>
          <Pressable onLongPress={goToToday} style={styles.dateContainer}>
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {formatDate(selectedDate)}
            </Text>
          </Pressable>
          <Pressable
            style={styles.navButton}
            onPress={() => navigateDate('next')}
            disabled={isToday}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isToday ? colors.textTertiary : colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Row 2: Day type badge and/or Streak badge (centered) */}
        {(dayTypeDisplay || streak > 0) && (
          <View style={styles.badgesRow}>
            {dayTypeDisplay && (
              <View style={[styles.dayTypeBadge, { backgroundColor: colors.bgSecondary }]}>
                <Ionicons name={dayTypeDisplay.icon} size={14} color={colors.accent} />
                <Text style={[styles.dayTypeBadgeText, { color: colors.textSecondary }]}>
                  {dayTypeDisplay.label}
                </Text>
              </View>
            )}
            {streak > 0 && <StreakBadge streakDays={streak} />}
          </View>
        )}

        {/* Day menu button - shown when there are entries */}
        {hasEntries && (
          <Pressable
            style={styles.dayMenuButton}
            onPress={() => setShowDayMenu(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Calorie Ring */}
        <View style={styles.ringContainer}>
          <CalorieRing
            consumed={dailyTotals.calories}
            target={goals.calories}
            size={220}
            strokeWidth={14}
          />
        </View>

        {/* Macro Summary */}
        <View style={styles.macroSection}>
          <MacroSummary
            totals={dailyTotals}
            goals={goals}
            variant="detailed"
          />
        </View>

        {/* Water Section */}
        <View style={styles.waterSection}>
          <WaterSection />
        </View>

        {/* Fasting Section */}
        <View style={styles.fastingSection}>
          <FastingSection />
        </View>

        {/* Planned Meals Section */}
        <View style={styles.plannedMealsSection}>
          <PlannedMealsSection />
        </View>

        {/* Meal Sections - Always show all, collapsed by default */}
        <View style={styles.mealsContainer}>
          {MEAL_TYPE_ORDER.map((mealType) => (
            <MealSection
              key={mealType}
              mealType={mealType}
              entries={entriesByMeal[mealType]}
              quickAddEntries={quickEntriesByMeal[mealType]}
              onAddPress={handleAddFood}
              onEntryPress={handleEntryPress}
              onQuickAddPress={handleQuickAddPress}
              onDeleteEntry={handleDeleteEntry}
              onDeleteQuickAdd={handleDeleteQuickAdd}
              onCopyMeal={handleCopyMeal}
            />
          ))}
        </View>
      </ScrollView>

      {/* Day Menu Modal */}
      <Modal
        visible={showDayMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDayMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDayMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
              {formatDateShort(selectedDate)}
            </Text>
            <Pressable
              style={styles.menuItem}
              onPress={handleCopyDay}
            >
              <Ionicons name="copy-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                Copy All Meals to Tomorrow
              </Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => setShowDayMenu(false)}
            >
              <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateContainer: {
    paddingHorizontal: spacing[2],
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    ...typography.title.medium,
    textAlign: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  dayTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  dayTypeBadgeText: {
    ...typography.caption,
  },
  dayMenuButton: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    marginTop: spacing[1],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: 100,
  },
  ringContainer: {
    alignItems: 'center',
    marginVertical: spacing[4],
  },
  macroSection: {
    marginBottom: spacing[6],
  },
  waterSection: {
    marginBottom: spacing[6],
  },
  fastingSection: {
    marginBottom: spacing[6],
  },
  plannedMealsSection: {
    marginBottom: spacing[6],
  },
  mealsContainer: {
    gap: spacing[3],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '80%',
    maxWidth: 320,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  menuTitle: {
    ...typography.title.small,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
  },
  menuItemText: {
    ...typography.body.medium,
  },
});
