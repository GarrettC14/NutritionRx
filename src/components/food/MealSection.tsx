import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { LogEntry, QuickAddEntry } from '@/types/domain';
import { MealType, MEAL_TYPE_LABELS } from '@/constants/mealTypes';
import { FoodEntryCard } from './FoodEntryCard';

interface MealSectionProps {
  mealType: MealType;
  entries: LogEntry[];
  quickAddEntries: QuickAddEntry[];
  onAddPress: (mealType: MealType) => void;
  onEntryPress?: (entry: LogEntry) => void;
  onQuickAddPress?: (entry: QuickAddEntry) => void;
  onDeleteEntry?: (entry: LogEntry) => void;
  onDeleteQuickAdd?: (entry: QuickAddEntry) => void;
}

export function MealSection({
  mealType,
  entries,
  quickAddEntries,
  onAddPress,
  onEntryPress,
  onQuickAddPress,
  onDeleteEntry,
  onDeleteQuickAdd,
}: MealSectionProps) {
  const { colors } = useTheme();

  const totalCalories =
    entries.reduce((sum, e) => sum + e.calories, 0) +
    quickAddEntries.reduce((sum, e) => sum + e.calories, 0);

  const hasEntries = entries.length > 0 || quickAddEntries.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {MEAL_TYPE_LABELS[mealType]}
        </Text>
        <View style={styles.headerRight}>
          {totalCalories > 0 && (
            <Text style={[styles.totalCalories, { color: colors.textSecondary }]}>
              {totalCalories} kcal
            </Text>
          )}
          <Pressable
            style={[styles.addButton, { borderColor: colors.border }]}
            onPress={() => onAddPress(mealType)}
            hitSlop={8}
          >
            <Ionicons name="add" size={20} color={colors.accent} />
          </Pressable>
        </View>
      </View>

      {/* Entries */}
      {hasEntries ? (
        <View style={styles.entriesList}>
          {entries.map((entry) => (
            <FoodEntryCard
              key={entry.id}
              entry={entry}
              onPress={() => onEntryPress?.(entry)}
              onDelete={onDeleteEntry ? () => onDeleteEntry(entry) : undefined}
            />
          ))}
          {quickAddEntries.map((entry) => (
            <FoodEntryCard
              key={entry.id}
              entry={entry}
              onPress={() => onQuickAddPress?.(entry)}
              onDelete={onDeleteQuickAdd ? () => onDeleteQuickAdd(entry) : undefined}
            />
          ))}
        </View>
      ) : (
        <Pressable
          style={[styles.emptyState, { backgroundColor: colors.bgSecondary }]}
          onPress={() => onAddPress(mealType)}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            Add food
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  title: {
    ...typography.title.small,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  totalCalories: {
    ...typography.caption,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entriesList: {
    gap: spacing[2],
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.md,
  },
  emptyText: {
    ...typography.body.medium,
  },
});
