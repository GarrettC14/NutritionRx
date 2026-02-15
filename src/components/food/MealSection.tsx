import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { LogEntry, QuickAddEntry } from '@/types/domain';
import { MealType, getMealTypeName } from '@/constants/mealTypes';
import { TestIDs, mealAddFoodButton, mealCopyButton, mealEntryItem } from '@/constants/testIDs';
import { FoodEntryCard } from './FoodEntryCard';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MealSectionProps {
  mealType: string;
  mealTypeName?: string;
  entries: LogEntry[];
  quickAddEntries: QuickAddEntry[];
  onAddPress: (mealType: string) => void;
  onEntryPress?: (entry: LogEntry) => void;
  onQuickAddPress?: (entry: QuickAddEntry) => void;
  onDeleteEntry?: (entry: LogEntry) => void;
  onDeleteQuickAdd?: (entry: QuickAddEntry) => void;
  onMenuPress?: (mealType: string) => void;
  defaultExpanded?: boolean;
}

const MEAL_SECTION_TEST_IDS: Record<string, string | undefined> = {
  [MealType.Breakfast]: TestIDs.Meal.BreakfastSection,
  [MealType.Lunch]: TestIDs.Meal.LunchSection,
  [MealType.Dinner]: TestIDs.Meal.DinnerSection,
  [MealType.Snack]: TestIDs.Meal.SnackSection,
};

export const MealSection = React.memo(function MealSection({
  mealType,
  entries,
  quickAddEntries,
  onAddPress,
  onEntryPress,
  onQuickAddPress,
  onDeleteEntry,
  onDeleteQuickAdd,
  onMenuPress,
  defaultExpanded = false,
  mealTypeName,
}: MealSectionProps) {
  const { colors } = useTheme();
  const displayName = mealTypeName ?? getMealTypeName(mealType);
  const reducedMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Chevron rotation animation
  const rotation = useSharedValue(defaultExpanded ? 90 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const totalCalories =
    entries.reduce((sum, e) => sum + e.calories, 0) +
    quickAddEntries.reduce((sum, e) => sum + e.calories, 0);

  const itemCount = entries.length + quickAddEntries.length;
  const hasEntries = itemCount > 0;

  const toggleExpanded = () => {
    if (!reducedMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    rotation.value = reducedMotion
      ? (isExpanded ? 0 : 90)
      : withTiming(isExpanded ? 0 : 90, { duration: 200 });
    setIsExpanded(!isExpanded);
  };

  const handleAddPress = (e: any) => {
    e.stopPropagation();
    onAddPress(mealType);
  };

  const handleMenuPress = (e: any) => {
    e.stopPropagation();
    onMenuPress?.(mealType);
  };

  return (
    <View testID={MEAL_SECTION_TEST_IDS[mealType]} style={[styles.container, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
      {/* Collapsible Header */}
      <Pressable
        style={styles.header}
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, ${totalCalories} calories, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.headerLeft}>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Animated.View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {displayName}
          </Text>
          {!isExpanded && hasEntries && (
            <Text style={[styles.itemCount, { color: colors.textTertiary }]}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.totalCalories, { color: colors.textSecondary }]}>
            {totalCalories} cal
          </Text>
          {/* ⋮ Menu Button */}
          <Pressable
            style={[styles.menuButton, { backgroundColor: colors.bgInteractive }]}
            onPress={handleMenuPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${displayName} options menu`}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={colors.textSecondary} />
          </Pressable>
          {/* + Add Button */}
          <Pressable
            testID={mealAddFoodButton(mealType)}
            style={[styles.addButton, { backgroundColor: colors.bgInteractive }]}
            onPress={handleAddPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Add food to ${displayName}`}
          >
            <Ionicons name="add" size={18} color={colors.accent} />
          </Pressable>
        </View>
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {hasEntries ? (
            <View style={styles.entriesList}>
              {entries.map((entry) => (
                <FoodEntryCard
                  key={entry.id}
                  entry={entry}
                  testID={mealEntryItem(entry.id)}
                  onPress={() => onEntryPress?.(entry)}
                  onDelete={onDeleteEntry ? () => onDeleteEntry(entry) : undefined}
                />
              ))}
              {quickAddEntries.map((entry) => (
                <FoodEntryCard
                  key={entry.id}
                  entry={entry}
                  testID={mealEntryItem(entry.id)}
                  onPress={() => onQuickAddPress?.(entry)}
                  onDelete={onDeleteQuickAdd ? () => onDeleteQuickAdd(entry) : undefined}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No foods logged yet
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  title: {
    ...typography.body.large,
    fontWeight: '600',
  },
  itemCount: {
    ...typography.caption,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  totalCalories: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  menuButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
  },
  entriesList: {
    gap: spacing[2],
  },
  emptyState: {
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body.medium,
  },
});
