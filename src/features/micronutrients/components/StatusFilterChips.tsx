/**
 * StatusFilterChips
 * Horizontal row of tappable filter chips for nutrient status
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { NutrientStatus } from '@/types/micronutrients';

interface StatusFilterChipsProps {
  selectedStatuses: NutrientStatus[];
  onToggle: (status: NutrientStatus | 'all') => void;
}

const FILTER_OPTIONS: Array<{
  key: NutrientStatus | 'all';
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'deficient', label: 'Needs Attention' },
  { key: 'low', label: 'Below Target' },
  { key: 'optimal', label: 'On Track' },
  { key: 'high', label: 'Above Target' },
];

export function StatusFilterChips({ selectedStatuses, onToggle }: StatusFilterChipsProps) {
  const { colors } = useTheme();

  const isAllSelected = selectedStatuses.length === 0;

  const getChipColor = (key: NutrientStatus | 'all'): string => {
    switch (key) {
      case 'deficient': return colors.error;
      case 'low': return colors.warning;
      case 'optimal': return colors.success;
      case 'high': return colors.warning;
      default: return colors.accent;
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTER_OPTIONS.map(option => {
        const isSelected = option.key === 'all'
          ? isAllSelected
          : selectedStatuses.includes(option.key as NutrientStatus);
        const chipColor = getChipColor(option.key);

        return (
          <Pressable
            key={option.key}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? `${chipColor}20` : colors.bgSecondary,
                borderColor: isSelected ? chipColor : colors.borderDefault,
              },
            ]}
            onPress={() => onToggle(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Filter: ${option.label}`}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? chipColor : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
