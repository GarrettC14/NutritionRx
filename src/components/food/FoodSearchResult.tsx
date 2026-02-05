import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { FoodItem } from '@/types/domain';

interface FoodSearchResultProps {
  food: FoodItem;
  testID?: string;
  onPress: () => void;
}

export function FoodSearchResult({ food, testID, onPress }: FoodSearchResultProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      testID={testID}
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
          {food.brand && (
            <Text
              style={[styles.brand, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {food.brand}
            </Text>
          )}
          <Text style={[styles.serving, { color: colors.textTertiary }]}>
            {food.servingSize} {food.servingUnit}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.calorieContainer}>
          <Text style={[styles.calories, { color: colors.textPrimary }]}>
            {food.calories}
          </Text>
          <Text style={[styles.calorieUnit, { color: colors.textSecondary }]}>
            kcal
          </Text>
        </View>

        {food.usdaNutrientCount > 0 && (
          <View style={[styles.nutrientBadge, { backgroundColor: colors.accent + '20' }]}>
            <Ionicons name="checkmark" size={10} color={colors.accent} />
            <Text style={[styles.nutrientBadgeText, { color: colors.accent }]}>
              {food.usdaNutrientCount}
            </Text>
          </View>
        )}
      </View>

      {food.source === 'usda' && (
        <View style={[styles.sourceBadge, { backgroundColor: colors.accent + '15' }]}>
          <Text style={[styles.sourceBadgeText, { color: colors.accent }]}>USDA</Text>
        </View>
      )}

      {food.isVerified && food.source !== 'usda' && (
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
  brand: {
    ...typography.caption,
    maxWidth: 150,
  },
  serving: {
    ...typography.caption,
    fontSize: 11,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  calorieContainer: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  nutrientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    gap: 2,
  },
  nutrientBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
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
