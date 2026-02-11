/**
 * Daily Category Chips
 * Horizontal filter chips for daily question categories
 */

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { DailyQuestionCategory } from '../types/dailyInsights.types';
import { DAILY_CATEGORY_COLORS, DAILY_CATEGORY_LABELS } from '../constants/dailyCategoryColors';

interface DailyCategoryChipsProps {
  categories: DailyQuestionCategory[];
  selectedCategory: DailyQuestionCategory | null;
  onSelectCategory: (category: DailyQuestionCategory | null) => void;
}

export function DailyCategoryChips({
  categories,
  selectedCategory,
  onSelectCategory,
}: DailyCategoryChipsProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {/* All chip */}
      <TouchableOpacity
        onPress={() => onSelectCategory(null)}
        style={[
          styles.chip,
          selectedCategory === null
            ? { backgroundColor: colors.accent }
            : { backgroundColor: 'transparent', borderColor: colors.borderDefault, borderWidth: 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`All categories${selectedCategory === null ? ', selected' : ''}`}
      >
        <Text
          style={[
            styles.chipText,
            { color: selectedCategory === null ? '#fff' : colors.textSecondary },
          ]}
        >
          All
        </Text>
      </TouchableOpacity>

      {categories.map((category) => {
        const isSelected = selectedCategory === category;
        const catColor = DAILY_CATEGORY_COLORS[category];

        return (
          <TouchableOpacity
            key={category}
            onPress={() => onSelectCategory(isSelected ? null : category)}
            style={[
              styles.chip,
              isSelected
                ? { backgroundColor: catColor }
                : { backgroundColor: 'transparent', borderColor: catColor + '50', borderWidth: 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${DAILY_CATEGORY_LABELS[category]}${isSelected ? ', selected' : ''}`}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? '#fff' : catColor },
              ]}
            >
              {DAILY_CATEGORY_LABELS[category]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  scrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
