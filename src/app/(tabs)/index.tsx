import { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_ORDER } from '@/constants/mealTypes';
import { useFoodLogStore, useSettingsStore } from '@/stores';
import { CalorieRing } from '@/components/ui/CalorieRing';
import { MacroSummary } from '@/components/food/MacroSummary';
import { MealSection } from '@/components/food/MealSection';
import { LogEntry, QuickAddEntry } from '@/types/domain';

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
    loadEntriesForDate,
    deleteLogEntry,
    deleteQuickEntry,
    getEntriesByMeal,
    getQuickEntriesByMeal,
  } = useFoodLogStore();

  const { settings, loadSettings, isLoaded: settingsLoaded } = useSettingsStore();

  // Load data on mount
  useEffect(() => {
    loadSettings();
    loadEntriesForDate(selectedDate);
  }, []);

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

  // Format date for display
  const formatDate = (dateStr: string): string => {
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

  // Goals from settings
  const goals = {
    calories: settings.dailyCalorieGoal,
    protein: settings.dailyProteinGoal,
    carbs: settings.dailyCarbsGoal,
    fat: settings.dailyFatGoal,
  };

  // Handlers
  const handleAddFood = (mealType: MealType) => {
    router.push({
      pathname: '/add-food',
      params: { mealType, date: selectedDate },
    });
  };

  const handleEntryPress = (entry: LogEntry) => {
    router.push({
      pathname: '/edit-entry',
      params: { entryId: entry.id, type: 'log' },
    });
  };

  const handleQuickAddPress = (entry: QuickAddEntry) => {
    router.push({
      pathname: '/edit-entry',
      params: { entryId: entry.id, type: 'quick' },
    });
  };

  const handleDeleteEntry = async (entry: LogEntry) => {
    await deleteLogEntry(entry.id);
  };

  const handleDeleteQuickAdd = async (entry: QuickAddEntry) => {
    await deleteQuickEntry(entry.id);
  };

  const hasEntries = entries.length > 0 || quickAddEntries.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.dateNav}
          onLongPress={goToToday}
        >
          <Pressable onPress={() => navigateDate('prev')}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
            {formatDate(selectedDate)}
          </Text>
          <Pressable
            onPress={() => navigateDate('next')}
            disabled={isToday}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isToday ? colors.textTertiary : colors.textSecondary}
            />
          </Pressable>
        </Pressable>
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
            variant={hasEntries ? 'detailed' : 'compact'}
          />
        </View>

        {/* Meal Sections or Empty State */}
        {hasEntries ? (
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
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              What will you eat today?
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap a meal section to add food
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateText: {
    ...typography.title.medium,
    minWidth: 120,
    textAlign: 'center',
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
  mealsContainer: {
    gap: spacing[2],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[12],
    gap: spacing[3],
  },
  emptyTitle: {
    ...typography.title.medium,
    marginTop: spacing[4],
  },
  emptySubtitle: {
    ...typography.body.medium,
  },
});
