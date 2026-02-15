/**
 * MealBlockBottomSheet — Context menu for meal blocks.
 * Opened via the ⋮ button on each meal section header.
 *
 * Menu items are conditionally shown based on entry count and feature flags.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_LABELS } from '@/constants/mealTypes';

// Inline feature flag — flip when recipe system (Phase 2) is merged
const RECIPES_ENABLED = true;

export interface MealBlockBottomSheetProps {
  mealType: MealType;
  date: string;
  entryCount: number;
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  onQuickAdd: () => void;
  onAddAlcohol: () => void;
  onSaveAsRecipe: () => void;
  onCopyMeal: () => void;
  onClearMeal: () => void;
}

export function MealBlockBottomSheet({
  mealType,
  date,
  entryCount,
  bottomSheetRef,
  onQuickAdd,
  onAddAlcohol,
  onSaveAsRecipe,
  onCopyMeal,
  onClearMeal,
}: MealBlockBottomSheetProps) {
  const { colors, isDark } = useTheme();
  const hasEntries = entryCount > 0;

  const snapPoints = useMemo(() => ['40%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const handleQuickAdd = () => {
    bottomSheetRef.current?.close();
    onQuickAdd();
  };

  const handleAddAlcohol = () => {
    bottomSheetRef.current?.close();
    onAddAlcohol();
  };

  const handleSaveAsRecipe = () => {
    bottomSheetRef.current?.close();
    onSaveAsRecipe();
  };

  const handleCopyMeal = () => {
    bottomSheetRef.current?.close();
    onCopyMeal();
  };

  const handleClearMeal = () => {
    bottomSheetRef.current?.close();
    Alert.alert(
      `Clear ${MEAL_TYPE_LABELS[mealType]}?`,
      `This will remove all ${entryCount} ${entryCount === 1 ? 'item' : 'items'} from ${MEAL_TYPE_LABELS[mealType]}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: onClearMeal },
      ],
    );
  };

  const mealLabel = MEAL_TYPE_LABELS[mealType];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.bgElevated }}
      handleIndicatorStyle={{ backgroundColor: colors.textTertiary }}
    >
      <BottomSheetView style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {mealLabel}
        </Text>

        {/* Quick Add — always visible */}
        <Pressable style={styles.menuItem} onPress={handleQuickAdd}>
          <Text style={styles.menuIcon}>🍽</Text>
          <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
            Quick Add
          </Text>
        </Pressable>

        {/* Add Alcohol — always visible */}
        <Pressable style={styles.menuItem} onPress={handleAddAlcohol}>
          <Text style={styles.menuIcon}>🍺</Text>
          <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
            Add Alcohol
          </Text>
        </Pressable>

        {/* Save as Recipe — only when ≥2 entries AND recipes enabled */}
        {RECIPES_ENABLED && entryCount >= 2 && (
          <Pressable style={styles.menuItem} onPress={handleSaveAsRecipe}>
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
              Save as Recipe
            </Text>
          </Pressable>
        )}

        {/* Copy Meal — only when ≥1 entry */}
        {hasEntries && (
          <Pressable style={styles.menuItem} onPress={handleCopyMeal}>
            <Text style={styles.menuIcon}>📄</Text>
            <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
              Copy Meal...
            </Text>
          </Pressable>
        )}

        {/* Clear Meal — only when ≥1 entry */}
        {hasEntries && (
          <Pressable style={styles.menuItem} onPress={handleClearMeal}>
            <Text style={styles.menuIcon}>🗑</Text>
            <Text style={[styles.menuItemText, { color: colors.error }]}>
              Clear Meal
            </Text>
          </Pressable>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  title: {
    ...typography.title.small,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
  },
  menuIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  menuItemText: {
    ...typography.body.large,
  },
});
