import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { useMealPlanStore, useSubscriptionStore } from '@/stores';
import { PlannedMeal, MealSlot } from '@/types/planning';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

const SAGE_GREEN = '#9CAF88';

const SLOT_ICONS: Record<MealSlot, string> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snacks: 'cafe-outline',
};

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export function PlannedMealsSection() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isPremium } = useSubscriptionStore();
  const { showConfirm } = useConfirmDialog();
  const {
    settings,
    todayMeals,
    loadSettings,
    loadTodayMeals,
    markMealAsLogged,
    markMealAsSkipped,
    isLoaded,
  } = useMealPlanStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const contentHeight = useSharedValue(0);

  // Animated style must be called before any early returns (Rules of Hooks)
  const animatedContentStyle = useAnimatedStyle(() => ({
    maxHeight: isExpanded ? withTiming(500, { duration: 300 }) : withTiming(0, { duration: 200 }),
    opacity: isExpanded ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 200 }),
    overflow: 'hidden',
  }));

  // Load data on mount
  useEffect(() => {
    loadSettings();
    loadTodayMeals();
  }, []);

  // Get pending meals (not yet logged or skipped)
  const pendingMeals = todayMeals.filter(m => m.status === 'planned');
  const loggedMeals = todayMeals.filter(m => m.status === 'logged');
  const skippedMeals = todayMeals.filter(m => m.status === 'skipped');

  // Don't render if:
  // - Not loaded yet
  // - Not premium
  // - Meal planning is disabled
  // - showOnToday is false
  // - No meals planned for today
  if (!isLoaded || !isPremium || !settings?.enabled || !settings?.showOnToday || todayMeals.length === 0) {
    return null;
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLogMeal = (meal: PlannedMeal) => {
    showConfirm({
      title: 'Log This Meal',
      message: `Mark "${meal.foodName}" as logged?`,
      icon: '✅',
      confirmLabel: 'Log',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        await markMealAsLogged(meal.id);
      },
    });
  };

  const handleSkipMeal = (meal: PlannedMeal) => {
    showConfirm({
      title: 'Skip This Meal',
      message: `Skip "${meal.foodName}" from today's plan?`,
      icon: '⏭️',
      confirmLabel: 'Skip',
      cancelLabel: 'Cancel',
      confirmStyle: 'destructive',
      onConfirm: async () => {
        await markMealAsSkipped(meal.id);
      },
    });
  };

  const handleViewMealPlanning = () => {
    router.push('/settings/meal-planning');
  };

  // Group meals by slot
  const mealsBySlot: Record<MealSlot, PlannedMeal[]> = {
    breakfast: pendingMeals.filter(m => m.mealSlot === 'breakfast'),
    lunch: pendingMeals.filter(m => m.mealSlot === 'lunch'),
    dinner: pendingMeals.filter(m => m.mealSlot === 'dinner'),
    snacks: pendingMeals.filter(m => m.mealSlot === 'snacks'),
  };

  const totalPending = pendingMeals.length;
  const totalCalories = pendingMeals.reduce((sum, m) => sum + m.calories, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      {/* Header - always visible */}
      <Pressable style={styles.header} onPress={handleToggle}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: SAGE_GREEN + '20' }]}>
            <Ionicons name="calendar-outline" size={20} color={SAGE_GREEN} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Planned Meals
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {totalPending > 0
                ? `${totalPending} meal${totalPending !== 1 ? 's' : ''} remaining • ${totalCalories} cal`
                : 'All meals completed'}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      {/* Expandable Content */}
      <Animated.View style={animatedContentStyle}>
        <View style={styles.content}>
          {/* Pending Meals */}
          {totalPending > 0 ? (
            <>
              {(Object.keys(mealsBySlot) as MealSlot[]).map((slot) => {
                const meals = mealsBySlot[slot];
                if (meals.length === 0) return null;

                return (
                  <View key={slot} style={styles.slotSection}>
                    <View style={styles.slotHeader}>
                      <Ionicons
                        name={SLOT_ICONS[slot] as any}
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.slotLabel, { color: colors.textSecondary }]}>
                        {SLOT_LABELS[slot]}
                      </Text>
                    </View>
                    {meals.map((meal) => (
                      <View
                        key={meal.id}
                        style={[styles.mealItem, { backgroundColor: colors.bgElevated }]}
                      >
                        <View style={styles.mealInfo}>
                          <Text
                            style={[styles.mealName, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {meal.foodName}
                          </Text>
                          <Text style={[styles.mealMacros, { color: colors.textSecondary }]}>
                            {meal.calories} cal • {meal.protein}g P
                          </Text>
                        </View>
                        <View style={styles.mealActions}>
                          <Pressable
                            style={[styles.actionButton, { backgroundColor: SAGE_GREEN }]}
                            onPress={() => handleLogMeal(meal)}
                          >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </Pressable>
                          <Pressable
                            style={[styles.actionButton, { backgroundColor: colors.bgSecondary }]}
                            onPress={() => handleSkipMeal(meal)}
                          >
                            <Ionicons name="close" size={16} color={colors.textSecondary} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.completedState}>
              <Ionicons name="checkmark-circle" size={32} color={SAGE_GREEN} />
              <Text style={[styles.completedText, { color: colors.textSecondary }]}>
                All planned meals completed!
              </Text>
            </View>
          )}

          {/* Summary if meals have been logged/skipped */}
          {(loggedMeals.length > 0 || skippedMeals.length > 0) && (
            <View style={[styles.summary, { borderTopColor: colors.borderDefault }]}>
              {loggedMeals.length > 0 && (
                <Text style={[styles.summaryText, { color: colors.textTertiary }]}>
                  {loggedMeals.length} logged
                </Text>
              )}
              {skippedMeals.length > 0 && (
                <Text style={[styles.summaryText, { color: colors.textTertiary }]}>
                  {skippedMeals.length} skipped
                </Text>
              )}
            </View>
          )}

          {/* View All Link */}
          <Pressable style={styles.viewAllLink} onPress={handleViewMealPlanning}>
            <Text style={[styles.viewAllText, { color: SAGE_GREEN }]}>
              View Meal Planning
            </Text>
            <Ionicons name="chevron-forward" size={16} color={SAGE_GREEN} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  slotSection: {
    marginBottom: spacing[3],
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  slotLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  mealMacros: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  mealActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedState: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  completedText: {
    ...typography.body.medium,
  },
  summary: {
    flexDirection: 'row',
    gap: spacing[4],
    paddingTop: spacing[3],
    marginTop: spacing[2],
    borderTopWidth: 1,
  },
  summaryText: {
    ...typography.body.small,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[3],
    marginTop: spacing[2],
  },
  viewAllText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
});
