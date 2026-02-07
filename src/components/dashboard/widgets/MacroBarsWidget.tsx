/**
 * Macro Bars Widget
 * Displays protein, carbs, and fat progress as horizontal bars
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useGoalStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';

interface MacroData {
  name: string;
  consumed: number;
  target: number;
  color: string;
}

export function MacroBarsWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { totals } = useDailyNutrition();
  const { proteinGoal, carbGoal, fatGoal } = useGoalStore();

  const macros: MacroData[] = [
    {
      name: 'Protein',
      consumed: Math.round(totals.protein),
      target: proteinGoal || 150,
      color: colors.protein,
    },
    {
      name: 'Carbs',
      consumed: Math.round(totals.carbs),
      target: carbGoal || 250,
      color: colors.carbs,
    },
    {
      name: 'Fat',
      consumed: Math.round(totals.fat),
      target: fatGoal || 65,
      color: colors.fat,
    },
  ];

  const handlePress = () => {
    if (!isEditMode) {
      router.push('/');
    }
  };

  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode}
      accessibilityRole="button"
      accessibilityLabel="View macro details"
    >
      <Text style={styles.title}>Macros</Text>

      <View style={styles.macroList} accessibilityLiveRegion="polite">
        {macros.map((macro) => {
          const progress = Math.min(macro.consumed / macro.target, 1);
          const remaining = Math.max(0, macro.target - macro.consumed);

          return (
            <View key={macro.name} style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>{macro.name}</Text>
                <Text style={styles.macroValues}>
                  <Text style={styles.consumed}>{macro.consumed}g</Text>
                  <Text style={styles.separator}> / </Text>
                  <Text style={styles.target}>{macro.target}g</Text>
                </Text>
              </View>

              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%`, backgroundColor: macro.color },
                  ]}
                />
              </View>

              <Text style={styles.remaining}>{remaining}g left</Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgElevated,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    macroList: {
      gap: 14,
    },
    macroRow: {},
    macroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    macroName: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    macroValues: {
      fontSize: 14,
    },
    consumed: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    separator: {
      color: colors.textTertiary,
    },
    target: {
      color: colors.textSecondary,
    },
    progressBackground: {
      height: 8,
      backgroundColor: colors.bgInteractive,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    remaining: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
      textAlign: 'right',
    },
  });
