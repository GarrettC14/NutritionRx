/**
 * StatusFilterChips
 * Horizontal row of tappable filter chips for nutrient status
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { NutrientStatus } from '@/types/micronutrients';
import { withAlpha } from '@/utils/colorUtils';
import { useStatusColors } from '@/hooks/useStatusColor';

interface StatusFilterChipsProps {
  selectedStatuses: NutrientStatus[];
  onToggle: (status: NutrientStatus | 'all') => void;
}

interface FilterChip {
  key: string;
  label: string;
  matches: NutrientStatus[];
}

const FILTER_CHIPS: FilterChip[] = [
  { key: 'all', label: 'All', matches: [] },
  { key: 'low', label: 'Below target', matches: ['deficient', 'low'] },
  { key: 'adequate', label: 'Getting there', matches: ['adequate'] },
  { key: 'optimal', label: 'Well nourished', matches: ['optimal'] },
  { key: 'high', label: 'Above target', matches: ['high', 'excessive'] },
];

export function StatusFilterChips({ selectedStatuses, onToggle }: StatusFilterChipsProps) {
  const { colors } = useTheme();
  const { palette } = useStatusColors();

  const isAllSelected = selectedStatuses.length === 0;

  const getChipColor = (key: string): string => {
    switch (key) {
      case 'low': return palette.needsNourishing;
      case 'adequate': return palette.gettingThere;
      case 'optimal': return palette.wellNourished;
      case 'high': return palette.aboveTarget;
      default: return colors.accent;
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTER_CHIPS.map(chip => {
        const isSelected = chip.key === 'all'
          ? isAllSelected
          : chip.matches.some(s => selectedStatuses.includes(s));
        const chipColor = getChipColor(chip.key);

        return (
          <Pressable
            key={chip.key}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? withAlpha(chipColor, 0.15) : colors.bgSecondary,
                borderColor: isSelected ? chipColor : colors.borderDefault,
              },
            ]}
            onPress={() => {
              if (chip.key === 'all') {
                onToggle('all');
              } else {
                // Toggle the first match status — the handler in the parent
                // will expand to include related statuses
                onToggle(chip.matches[0]);
              }
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Filter: ${chip.label}`}
            accessibilityHint={`Filters nutrients to show those with ${chip.label} status`}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={14} color={chipColor} style={styles.checkmark} />
            )}
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? chipColor : colors.textSecondary },
              ]}
            >
              {chip.label}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  checkmark: {
    marginRight: 4,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
