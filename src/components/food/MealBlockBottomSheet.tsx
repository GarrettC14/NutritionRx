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
import { getMealTypeName } from '@/constants/mealTypes';

// Inline feature flag — flip when recipe system (Phase 2) is merged
const RECIPES_ENABLED = true;

export interface MealBlockBottomSheetProps {
  mealType: string;
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
      `Clear ${getMealTypeName(mealType)}?`,
      `This will remove all ${entryCount} ${entryCount === 1 ? 'item' : 'items'} from ${getMealTypeName(mealType)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: onClearMeal },
      ],
    );
  };

  const mealLabel = getMealTypeName(mealType);

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
          <View style={styles.menuIconContainer}>
            <Ionicons name="restaurant-outline" size={20} color={colors.textPrimary} />
          </View>
          <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
            Quick Add
          </Text>
        </Pressable>

        {/* Add Alcohol — always visible */}
        <Pressable style={styles.menuItem} onPress={handleAddAlcohol}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="beer-outline" size={20} color={colors.textPrimary} />
          </View>
          <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
            Add Alcohol
          </Text>
        </Pressable>

        {/* Save as Recipe — only when ≥2 entries AND recipes enabled */}
        {RECIPES_ENABLED && entryCount >= 2 && (
          <Pressable style={styles.menuItem} onPress={handleSaveAsRecipe}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="clipboard-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
              Save as Recipe
            </Text>
          </Pressable>
        )}

        {/* Copy Meal — only when ≥1 entry */}
        {hasEntries && (
          <Pressable style={styles.menuItem} onPress={handleCopyMeal}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="copy-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
              Copy Meal...
            </Text>
          </Pressable>
        )}

        {/* Clear Meal — only when ≥1 entry */}
        {hasEntries && (
          <Pressable style={styles.menuItem} onPress={handleClearMeal}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </View>
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
  menuIconContainer: {
    width: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  menuItemText: {
    ...typography.body.large,
  },
});
