import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { LogEntry, QuickAddEntry } from '@/types/domain';

interface FoodEntryCardProps {
  entry: LogEntry | QuickAddEntry;
  onPress?: () => void;
  onDelete?: () => void;
}

function isLogEntry(entry: LogEntry | QuickAddEntry): entry is LogEntry {
  return 'foodName' in entry;
}

export function FoodEntryCard({ entry, onPress, onDelete }: FoodEntryCardProps) {
  const { colors } = useTheme();

  const isQuickAdd = !isLogEntry(entry);
  const title = isLogEntry(entry) ? entry.foodName : (entry.description || 'Quick Add');
  const subtitle = isLogEntry(entry)
    ? entry.foodBrand
      ? `${entry.foodBrand} • ${entry.servings} serving${entry.servings !== 1 ? 's' : ''}`
      : `${entry.servings} serving${entry.servings !== 1 ? 's' : ''}`
    : undefined;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.bgSecondary },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={isQuickAdd ? 'flash' : 'restaurant'}
          size={20}
          color={colors.textSecondary}
        />
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.calorieContainer}>
        <Text style={[styles.calories, { color: colors.textPrimary }]}>
          {entry.calories}
        </Text>
        <Text style={[styles.calorieUnit, { color: colors.textSecondary }]}>
          kcal
        </Text>
      </View>

      {onDelete && (
        <Pressable
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
        </Pressable>
      )}
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
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: spacing[1],
  },
  title: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  subtitle: {
    ...typography.caption,
  },
  calorieContainer: {
    alignItems: 'flex-end',
  },
  calories: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  calorieUnit: {
    ...typography.caption,
    fontSize: 10,
  },
  deleteButton: {
    marginLeft: spacing[1],
  },
});
