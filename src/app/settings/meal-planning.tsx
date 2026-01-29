import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useMealPlanStore, useSubscriptionStore } from '@/stores';
import { PlannedMeal, MealSlot } from '@/types/planning';
import { PremiumGate } from '@/components/premium';

const SAGE_GREEN = '#9CAF88';

const MEAL_SLOTS: { slot: MealSlot; label: string; icon: string }[] = [
  { slot: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { slot: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { slot: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { slot: 'snacks', label: 'Snacks', icon: 'cafe-outline' },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStart + 'T12:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
}

function formatDayNumber(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.getDate().toString();
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

function isPastDate(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

export default function MealPlanningScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isPremium } = useSubscriptionStore();
  const {
    settings,
    weekMeals,
    selectedWeekStart,
    loadSettings,
    loadWeekMeals,
    navigateWeek,
    updateSettings,
    enableMealPlanning,
    disableMealPlanning,
    deletePlannedMeal,
    copyDayToDate,
    clearDay,
    getMealsGroupedBySlot,
    isLoaded,
  } = useMealPlanStore();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [copySourceDate, setCopySourceDate] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadSettings();
    loadWeekMeals();
  }, []);

  const weekDates = getWeekDates(selectedWeekStart);

  const handleToggleEnabled = async (value: boolean) => {
    if (value) {
      await enableMealPlanning();
    } else {
      await disableMealPlanning();
    }
  };

  const handleToggleShowOnToday = async (value: boolean) => {
    await updateSettings({ showOnToday: value });
  };

  const handleDayPress = (date: string) => {
    setSelectedDate(date);
    setShowDayMenu(true);
  };

  const handleAddMeal = (date: string, slot: MealSlot) => {
    setShowDayMenu(false);
    router.push({
      pathname: '/add-planned-meal',
      params: { date, mealSlot: slot },
    });
  };

  const handleCopyDay = () => {
    if (!selectedDate) return;
    setCopySourceDate(selectedDate);
    setShowDayMenu(false);
    Alert.alert(
      'Copy Day',
      'Tap another day to paste these meals, or tap the same day again to cancel.',
      [{ text: 'OK' }]
    );
  };

  const handlePasteDay = async (targetDate: string) => {
    if (!copySourceDate || copySourceDate === targetDate) {
      setCopySourceDate(null);
      return;
    }

    try {
      await copyDayToDate(copySourceDate, targetDate);
      setCopySourceDate(null);
      Alert.alert('Copied', 'Meals have been copied successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy meals. Please try again.');
    }
  };

  const handleClearDay = async () => {
    if (!selectedDate) return;
    setShowDayMenu(false);

    Alert.alert(
      'Clear Day',
      'Are you sure you want to remove all planned meals for this day?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearDay(selectedDate);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear day. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteMeal = (meal: PlannedMeal) => {
    Alert.alert(
      'Delete Meal',
      `Remove ${meal.foodName} from your meal plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlannedMeal(meal.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete meal.');
            }
          },
        },
      ]
    );
  };

  const getDayMealCount = (date: string): number => {
    return weekMeals.filter((m: PlannedMeal) => m.date === date).length;
  };

  const getDayCalories = (date: string): number => {
    return weekMeals
      .filter((m: PlannedMeal) => m.date === date)
      .reduce((sum: number, m: PlannedMeal) => sum + m.calories, 0);
  };

  const selectedDayMeals = selectedDate ? getMealsGroupedBySlot(selectedDate) : null;

  if (!isLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Meal Planning',
            headerStyle: { backgroundColor: colors.bgPrimary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const content = (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Enable Toggle */}
      <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
              Enable Meal Planning
            </Text>
            <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
              Plan your meals in advance
            </Text>
          </View>
          <Switch
            value={settings?.enabled ?? false}
            onValueChange={handleToggleEnabled}
            trackColor={{ false: colors.bgElevated, true: SAGE_GREEN }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {settings?.enabled && (
        <>
          {/* Show on Today Tab Toggle */}
          <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                  Show on Today Tab
                </Text>
                <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                  Display planned meals on the main screen
                </Text>
              </View>
              <Switch
                value={settings?.showOnToday ?? true}
                onValueChange={handleToggleShowOnToday}
                trackColor={{ false: colors.bgElevated, true: SAGE_GREEN }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Week Navigation */}
          <View style={styles.weekNavigation}>
            <Pressable
              style={styles.weekNavButton}
              onPress={() => navigateWeek('prev')}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.weekLabel, { color: colors.textPrimary }]}>
              {formatWeekRange(selectedWeekStart)}
            </Text>
            <Pressable
              style={styles.weekNavButton}
              onPress={() => navigateWeek('next')}
            >
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Copy Mode Indicator */}
          {copySourceDate && (
            <View style={[styles.copyModeBar, { backgroundColor: SAGE_GREEN }]}>
              <Ionicons name="copy-outline" size={18} color="#fff" />
              <Text style={styles.copyModeText}>
                Tap a day to paste meals
              </Text>
              <Pressable onPress={() => setCopySourceDate(null)}>
                <Ionicons name="close-circle" size={22} color="#fff" />
              </Pressable>
            </View>
          )}

          {/* Week Grid */}
          <View style={[styles.weekGrid, { backgroundColor: colors.bgSecondary }]}>
            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {DAY_NAMES.map((name, index) => (
                <View key={name} style={styles.dayHeader}>
                  <Text
                    style={[
                      styles.dayName,
                      { color: colors.textSecondary },
                      isToday(weekDates[index]) && { color: SAGE_GREEN },
                    ]}
                  >
                    {name}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day Cells */}
            <View style={styles.dayCells}>
              {weekDates.map((date, index) => {
                const mealCount = getDayMealCount(date);
                const calories = getDayCalories(date);
                const isTodayDate = isToday(date);
                const isPast = isPastDate(date);
                const isCopySource = date === copySourceDate;

                return (
                  <Pressable
                    key={date}
                    style={[
                      styles.dayCell,
                      { borderColor: colors.borderDefault },
                      isTodayDate && { borderColor: SAGE_GREEN, borderWidth: 2 },
                      isCopySource && { backgroundColor: SAGE_GREEN + '20' },
                    ]}
                    onPress={() => {
                      if (copySourceDate) {
                        handlePasteDay(date);
                      } else {
                        handleDayPress(date);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: colors.textPrimary },
                        isPast && { color: colors.textTertiary },
                        isTodayDate && { color: SAGE_GREEN },
                      ]}
                    >
                      {formatDayNumber(date)}
                    </Text>
                    {mealCount > 0 ? (
                      <>
                        <Text style={[styles.mealCount, { color: colors.textSecondary }]}>
                          {mealCount} meal{mealCount !== 1 ? 's' : ''}
                        </Text>
                        <Text style={[styles.dayCalories, { color: SAGE_GREEN }]}>
                          {calories} cal
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.emptyDay, { color: colors.textTertiary }]}>
                        No meals
                      </Text>
                    )}
                    {!isPast && !copySourceDate && (
                      <View style={[styles.addIndicator, { backgroundColor: colors.bgElevated }]}>
                        <Ionicons name="add" size={14} color={colors.textSecondary} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={[styles.instructionsText, { color: colors.textTertiary }]}>
              Tap a day to add meals or manage existing plans. Long-press to quickly copy.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Meal Planning',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['bottom']}>
        {isPremium ? (
          content
        ) : (
          <PremiumGate context="planning">
            {content}
          </PremiumGate>
        )}
      </SafeAreaView>

      {/* Day Detail Modal */}
      <Modal
        visible={showDayMenu && selectedDate !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDayMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDayMenu(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Pressable onPress={() => setShowDayMenu(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Meal Slots */}
              {MEAL_SLOTS.map(({ slot, label, icon }) => {
                const meals = selectedDayMeals?.[slot] || [];

                return (
                  <View key={slot} style={styles.mealSlotSection}>
                    <View style={styles.mealSlotHeader}>
                      <Ionicons name={icon as any} size={18} color={SAGE_GREEN} />
                      <Text style={[styles.mealSlotLabel, { color: colors.textPrimary }]}>
                        {label}
                      </Text>
                      <Pressable
                        style={[styles.addMealButton, { backgroundColor: SAGE_GREEN }]}
                        onPress={() => handleAddMeal(selectedDate!, slot)}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                      </Pressable>
                    </View>

                    {meals.length > 0 ? (
                      meals.map((meal: PlannedMeal) => (
                        <View
                          key={meal.id}
                          style={[styles.mealItem, { backgroundColor: colors.bgElevated }]}
                        >
                          <View style={styles.mealItemInfo}>
                            <Text style={[styles.mealItemName, { color: colors.textPrimary }]}>
                              {meal.foodName}
                            </Text>
                            <Text style={[styles.mealItemMacros, { color: colors.textSecondary }]}>
                              {meal.calories} cal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => handleDeleteMeal(meal)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                          </Pressable>
                        </View>
                      ))
                    ) : (
                      <Text style={[styles.noMeals, { color: colors.textTertiary }]}>
                        No meals planned
                      </Text>
                    )}
                  </View>
                );
              })}

              {/* Day Actions */}
              <View style={styles.dayActions}>
                <Pressable
                  style={[styles.dayActionButton, { backgroundColor: colors.bgElevated }]}
                  onPress={handleCopyDay}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.dayActionText, { color: colors.textPrimary }]}>
                    Copy Day
                  </Text>
                </Pressable>

                {getDayMealCount(selectedDate!) > 0 && (
                  <Pressable
                    style={[styles.dayActionButton, { backgroundColor: colors.bgElevated }]}
                    onPress={handleClearDay}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                    <Text style={[styles.dayActionText, { color: colors.error }]}>
                      Clear Day
                    </Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body.medium,
  },
  section: {
    marginHorizontal: componentSpacing.screenEdgePadding,
    marginTop: spacing[4],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  toggleLabel: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  toggleDescription: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: componentSpacing.screenEdgePadding,
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },
  weekNavButton: {
    padding: spacing[2],
  },
  weekLabel: {
    ...typography.title.small,
  },
  copyModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginHorizontal: componentSpacing.screenEdgePadding,
    marginBottom: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
  },
  copyModeText: {
    ...typography.body.small,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  weekGrid: {
    marginHorizontal: componentSpacing.screenEdgePadding,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
  },
  dayName: {
    ...typography.caption,
    fontWeight: '600',
  },
  dayCells: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  dayCell: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    ...typography.body.large,
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  mealCount: {
    ...typography.caption,
  },
  dayCalories: {
    ...typography.caption,
    fontWeight: '600',
  },
  emptyDay: {
    ...typography.caption,
    textAlign: 'center',
  },
  addIndicator: {
    position: 'absolute',
    bottom: spacing[1],
    right: spacing[1],
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructions: {
    marginHorizontal: componentSpacing.screenEdgePadding,
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
  instructionsText: {
    ...typography.body.small,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingTop: spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  modalTitle: {
    ...typography.title.medium,
  },
  modalScroll: {
    paddingHorizontal: spacing[4],
  },
  mealSlotSection: {
    marginBottom: spacing[4],
  },
  mealSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  mealSlotLabel: {
    ...typography.body.medium,
    fontWeight: '600',
    flex: 1,
  },
  addMealButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  mealItemInfo: {
    flex: 1,
  },
  mealItemName: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  mealItemMacros: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  noMeals: {
    ...typography.body.small,
    fontStyle: 'italic',
    marginLeft: spacing[6],
  },
  dayActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
    marginBottom: spacing[6],
  },
  dayActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  dayActionText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
});
