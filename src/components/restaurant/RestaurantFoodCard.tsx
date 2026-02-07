import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { RestaurantFood } from '@/types/restaurant';

interface RestaurantFoodCardProps {
  food: RestaurantFood;
  onPress: () => void;
}

export function RestaurantFoodCard({ food, onPress }: RestaurantFoodCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      testID={`restaurant-menu-item-${food.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${food.name}, ${food.nutrition.calories} calories`}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.bgSecondary },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {food.name}
        </Text>
        <View style={styles.detailsRow}>
          {food.categoryName && (
            <Text
              style={[styles.category, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {food.categoryName}
            </Text>
          )}
          <Text style={[styles.serving, { color: colors.textTertiary }]}>
            {food.serving.size}
          </Text>
        </View>
        {/* Macro summary */}
        <View style={styles.macroRow}>
          <Text style={[styles.macro, { color: colors.textSecondary }]}>
            P: {food.nutrition.protein}g
          </Text>
          <Text style={[styles.macro, { color: colors.textSecondary }]}>
            C: {food.nutrition.carbohydrates}g
          </Text>
          <Text style={[styles.macro, { color: colors.textSecondary }]}>
            F: {food.nutrition.fat}g
          </Text>
        </View>
      </View>

      <View style={styles.calorieContainer}>
        <Text style={[styles.calories, { color: colors.textPrimary }]}>
          {food.nutrition.calories}
        </Text>
        <Text style={[styles.calorieUnit, { color: colors.textSecondary }]}>
          kcal
        </Text>
      </View>

      {food.metadata.isVerified && (
        <Ionicons
          name="checkmark-circle"
          size={16}
          color={colors.success}
          style={styles.verifiedIcon}
        />
      )}

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[3],
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
    gap: spacing[1],
  },
  name: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  category: {
    ...typography.caption,
    maxWidth: 120,
  },
  serving: {
    ...typography.caption,
    fontSize: 11,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  macro: {
    ...typography.caption,
    fontSize: 11,
  },
  calorieContainer: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  calories: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  calorieUnit: {
    ...typography.caption,
    fontSize: 10,
  },
  verifiedIcon: {
    marginRight: -spacing[1],
  },
});
