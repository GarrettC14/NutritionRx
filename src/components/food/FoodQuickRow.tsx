import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FoodItem, FoodItemWithServing } from '@/types/domain';
import { useTheme } from '@/hooks/useTheme';

interface FoodQuickRowProps {
  food: FoodItem | FoodItemWithServing;
  servingHint?: { size: number; unit: string };
  onPress: () => void;
  onQuickLog?: () => void;
}

function formatServingAmount(size: number, unit: string): string {
  const sizeValue = Number.isInteger(size) ? String(size) : size.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  return `${sizeValue} ${unit}`;
}

function formatCalories(calories: number, serving: { size: number; unit: string }, food: FoodItem): number {
  if (!serving.size || !food.servingSize) return Math.round(calories);
  return Math.round(calories * (serving.size / food.servingSize));
}

export function FoodQuickRow({
  food,
  servingHint,
  onPress,
  onQuickLog,
}: FoodQuickRowProps) {
  const { colors } = useTheme();
  const shouldShowQuickLog = Boolean(onQuickLog && servingHint);

  const servingText = servingHint ? formatServingAmount(servingHint.size, servingHint.unit) : '';
  const calories = servingHint
    ? formatCalories(food.calories, servingHint, food)
    : food.calories;

  const handleQuickLog = () => {
    if (!shouldShowQuickLog || !onQuickLog || !servingHint) return;
    onQuickLog();
  };

  return (
    <Pressable
      style={[styles.row, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.borderDefault }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Log ${food.name}${servingText ? `, ${servingText}` : ''}`}
    >
      <View style={styles.textArea}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {food.name}
          </Text>
          <Text style={[styles.calories, { color: colors.textSecondary }]} numberOfLines={1}>
            {calories} cal
          </Text>
        </View>

        <Text style={[styles.subtext, { color: colors.textTertiary }]} numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ''}
          {servingText}
        </Text>
      </View>

      {shouldShowQuickLog && servingHint ? (
        <Pressable
          style={[styles.quickButton, { backgroundColor: colors.accent }]}
          onPress={handleQuickLog}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Quick log ${food.name}, ${servingText}`}
        >
          <Text style={styles.quickButtonText}>+</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textArea: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  calories: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  subtext: {
    fontSize: 13,
  },
  quickButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
  },
});
