import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from '@/hooks/useRouter';
import { useFoodSearchStore } from '@/stores/foodSearchStore';
import type { FoodItem } from '@/types/domain';

/**
 * Maximum number of recent food chips to display.
 * The store may return up to 20 (SEARCH_SETTINGS.recentLimit),
 * but the quick-access row is capped at 5 for compactness.
 */
const RECENT_CHIPS_LIMIT = 5;

const NAME_MAX_LENGTH = 20;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function truncateName(name: string): string {
  if (name.length <= NAME_MAX_LENGTH) return name;
  return name.substring(0, NAME_MAX_LENGTH - 1).trimEnd() + '\u2026';
}

function formatBaseServing(food: FoodItem): string {
  const size = food.servingSize;
  const unit = food.servingUnit;
  const sizeStr = size % 1 === 0 ? String(size) : size.toFixed(1);
  return `${sizeStr} ${unit}`;
}

function buildChipLabel(food: FoodItem): { name: string; serving: string } {
  let displayName = food.name;

  if (food.brand) {
    const withBrand = `${food.name} (${food.brand})`;
    if (withBrand.length <= NAME_MAX_LENGTH) {
      displayName = withBrand;
    }
  }

  return {
    name: truncateName(displayName),
    serving: formatBaseServing(food),
  };
}

// ---------------------------------------------------------------------------
// Chip Component
// ---------------------------------------------------------------------------

interface RecentFoodChipProps {
  food: FoodItem;
  onPress: (food: FoodItem) => void;
}

function RecentFoodChip({ food, onPress }: RecentFoodChipProps) {
  const { name, serving } = buildChipLabel(food);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: scale.value < 1 ? '#D4E2CF' : '#EBF2E8',
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Pressable
      onPress={() => onPress(food)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Log ${name}, ${serving}`}
      hitSlop={{ top: 4, bottom: 4 }}
    >
      <Animated.View style={[styles.chip, animatedStyle]}>
        <Text style={styles.chipText} numberOfLines={1}>
          {name}
          <Text style={styles.chipSeparator}> · </Text>
          {serving}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Row Component
// ---------------------------------------------------------------------------

interface RecentFoodsRowProps {
  mealType?: string;
  date?: string;
}

export function RecentFoodsRow({ mealType, date }: RecentFoodsRowProps) {
  const router = useRouter();
  const recentFoods = useFoodSearchStore((state) => state.recentFoods);

  const foods = (recentFoods ?? []).slice(0, RECENT_CHIPS_LIMIT);

  const handleChipPress = useCallback(
    (food: FoodItem) => {
      const params: Record<string, string> = { foodId: food.id };
      if (mealType) params.mealType = mealType;
      if (date) params.date = date;

      router.push({
        pathname: '/add-food/log',
        params,
      });
    },
    [router, mealType, date]
  );

  if (foods.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label} accessibilityRole="header">
        Recent
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        decelerationRate="fast"
        keyboardShouldPersistTaps="handled"
        accessibilityRole="list"
      >
        {foods.map((food) => (
          <RecentFoodChip
            key={food.id}
            food={food}
            onPress={handleChipPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  scrollContent: {
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#EBF2E8',
    borderWidth: 1,
    borderColor: '#D4E2CF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3D3D3D',
  },
  chipSeparator: {
    color: '#999999',
  },
});
