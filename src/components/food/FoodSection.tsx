import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FoodItem, FoodItemWithServing } from '@/types/domain';
import { useTheme } from '@/hooks/useTheme';
import { FoodQuickRow } from './FoodQuickRow';

interface FoodSectionProps {
  title: string;
  icon?: string;
  foods: (FoodItem | FoodItemWithServing)[];
  maxVisible?: number;
  isLoading?: boolean;
  onFoodPress: (food: FoodItem) => void;
  onQuickLog: (food: FoodItem | FoodItemWithServing, serving: { size: number; unit: string }) => void;
  onSeeAll?: () => void;
  getServingHint: (food: FoodItem | FoodItemWithServing) => { size: number; unit: string } | undefined;
  testID?: string;
}

const SKELETON_ROWS = 2;

function formatTitle(title: string): string {
  return title.toUpperCase();
}

export function FoodSection({
  title,
  icon,
  foods,
  maxVisible = 5,
  isLoading = false,
  onFoodPress,
  onQuickLog,
  onSeeAll,
  getServingHint,
  testID,
}: FoodSectionProps) {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasMore = foods.length > maxVisible;
  const shouldRenderAll = hasMore && isExpanded;
  const visibleFoods = shouldRenderAll ? foods : foods.slice(0, maxVisible);

  if (foods.length === 0 && !isLoading) {
    return null;
  }

  const handleSeeAllPress = () => {
    if (onSeeAll) {
      onSeeAll();
      return;
    }

    if (hasMore) {
      setIsExpanded((prev) => !prev);
    }
  };

  const showSeeAll = hasMore || Boolean(onSeeAll);
  const seeAllLabel = onSeeAll
    ? 'See All'
    : isExpanded
      ? 'Show Less'
      : 'See All';

  return (
    <View testID={testID} style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textTertiary }]}>{formatTitle(icon ? `${icon} ${title}` : title)}</Text>
        {showSeeAll ? (
          <Pressable onPress={handleSeeAllPress}>
            <Text style={[styles.seeAll, { color: colors.accent }]}>{seeAllLabel} &gt;</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
              <View key={`skeleton-${index}`} style={[styles.skeleton, { backgroundColor: colors.bgInteractive }]} />
            ))}
          </View>
        ) : (
          visibleFoods.map((food) => {
            const servingHint = getServingHint(food);
            return (
              <FoodQuickRow
                key={food.id}
                food={food}
                servingHint={servingHint}
                onPress={() => onFoodPress(food as FoodItem)}
                onQuickLog={
                  servingHint ? () => onQuickLog(food, servingHint) : undefined
                }
              />
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  seeAll: {
    fontSize: 12,
  },
  sectionCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  skeletonContainer: {
    gap: 1,
    paddingVertical: 4,
  },
  skeleton: {
    height: 72,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 8,
  },
});
