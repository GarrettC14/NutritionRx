/**
 * Today's Meals Widget
 * Shows a collapsible list of meals logged today
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
// Uses entriesByMeal entry calories (label values) directly — calorie method adjustment applies at totals level only.
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { WidgetProps } from '@/types/dashboard';
import { MealType, MEAL_TYPE_ORDER, MEAL_TYPE_LABELS } from '@/constants/mealTypes';
import { LogEntry } from '@/types/domain';

interface MealSection {
  type: MealType;
  label: string;
  items: Array<{
    id: string;
    name: string;
    calories: number;
  }>;
  totalCalories: number;
}

export function TodaysMealsWidget({ config, isEditMode }: WidgetProps) {
  const { colors } = useTheme();
  const { entriesByMeal } = useDailyNutrition();
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  // Group entries by meal type
  const mealSections: MealSection[] = MEAL_TYPE_ORDER.map((mealType: MealType) => {
    const entries: LogEntry[] = entriesByMeal[mealType] || [];
    const items = entries.map((entry: LogEntry) => ({
      id: entry.id,
      name: entry.foodName || 'Unknown food',
      calories: Math.round(entry.calories),
    }));
    const totalCalories = items.reduce((sum: number, item: { calories: number }) => sum + item.calories, 0);

    return {
      type: mealType,
      label: MEAL_TYPE_LABELS[mealType],
      items,
      totalCalories,
    };
  });

  const toggleMeal = (mealType: string) => {
    if (isEditMode) return;
    setExpandedMeal(expandedMeal === mealType ? null : mealType);
  };

  const styles = createStyles(colors);

  const hasAnyMeals = mealSections.some((m) => m.items.length > 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Meals</Text>

      {!hasAnyMeals ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No meals logged yet today. Tap to add your first meal!
          </Text>
        </View>
      ) : (
        <View style={styles.mealList}>
          {mealSections.map((meal) => {
            const isExpanded = expandedMeal === meal.type;
            const hasItems = meal.items.length > 0;

            return (
              <View key={meal.type} style={styles.mealSection}>
                <TouchableOpacity
                  style={styles.mealHeader}
                  onPress={() => toggleMeal(meal.type)}
                  disabled={!hasItems || isEditMode}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${meal.label}, ${hasItems ? `${meal.items.length} item${meal.items.length !== 1 ? 's' : ''}, ${meal.totalCalories} calories` : 'no items logged'}`}
                >
                  <View style={styles.mealInfo}>
                    <Text
                      style={[
                        styles.mealName,
                        !hasItems && styles.mealNameEmpty,
                      ]}
                    >
                      {meal.label}
                    </Text>
                    {hasItems && (
                      <Text style={styles.itemCount}>
                        {meal.items.length} item{meal.items.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                  <View style={styles.mealRight}>
                    <Text style={styles.mealCalories}>
                      {hasItems ? `${meal.totalCalories} cal` : '--'}
                    </Text>
                    {hasItems && (
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textSecondary}
                      />
                    )}
                  </View>
                </TouchableOpacity>

                {isExpanded && hasItems && (
                  <View style={styles.itemList}>
                    {meal.items.map((item, index) => (
                      <View
                        key={item.id}
                        style={[
                          styles.item,
                          index === meal.items.length - 1 && styles.lastItem,
                        ]}
                      >
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemCalories}>{item.calories} cal</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    mealList: {
      gap: 2,
    },
    mealSection: {},
    mealHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
    },
    mealInfo: {
      flex: 1,
    },
    mealName: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    mealNameEmpty: {
      color: colors.textTertiary,
    },
    itemCount: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    mealRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    mealCalories: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    itemList: {
      paddingLeft: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    item: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDefault,
    },
    lastItem: {
      borderBottomWidth: 0,
    },
    itemName: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      marginRight: 12,
    },
    itemCalories: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    emptyState: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
    },
  });
