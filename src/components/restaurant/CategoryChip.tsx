import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

// Valid Ionicons names used for category icons
const CATEGORY_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  burger: 'fast-food-outline',
  chicken: 'fast-food-outline',
  breakfast: 'sunny-outline',
  fries: 'fast-food-outline',
  drink: 'cafe-outline',
  dessert: 'ice-cream-outline',
  bowl: 'restaurant-outline',
  burrito: 'restaurant-outline',
  quesadilla: 'restaurant-outline',
  side: 'ellipsis-horizontal-outline',
  coffee: 'cafe-outline',
  espresso: 'cafe-outline',
  'cold-drink': 'water-outline',
  food: 'restaurant-outline',
  bakery: 'restaurant-outline',
  salad: 'leaf-outline',
  sub: 'restaurant-outline',
  wrap: 'restaurant-outline',
  taco: 'restaurant-outline',
  star: 'star-outline',
  nachos: 'restaurant-outline',
  soup: 'restaurant-outline',
  sandwich: 'restaurant-outline',
  hotdog: 'fast-food-outline',
  main: 'restaurant-outline',
  appetizer: 'restaurant-outline',
};

interface CategoryChipProps {
  label: string;
  iconName?: string;
  isSelected: boolean;
  onPress: () => void;
  testID?: string;
}

export function CategoryChip({ label, iconName, isSelected, onPress, testID }: CategoryChipProps) {
  const { colors } = useTheme();
  const resolvedIcon = iconName ? CATEGORY_ICON_MAP[iconName] : undefined;

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isSelected ? colors.accent : colors.bgSecondary,
          borderColor: isSelected ? colors.accent : colors.borderDefault,
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {resolvedIcon && (
        <Ionicons
          name={resolvedIcon}
          size={14}
          color={isSelected ? '#FFFFFF' : colors.textSecondary}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing[1],
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...typography.caption,
    fontWeight: '500',
  },
});
