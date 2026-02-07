/**
 * Nutrition Overview Widget
 * Combined calorie ring + macro bars in a single unified card
 * This is the "original" design that shows everything together
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useGoalStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';
import { TestIDs } from '@/constants/testIDs';

interface MacroData {
  name: string;
  consumed: number;
  target: number;
  color: string;
}

export function NutritionOverviewWidget({ config, isEditMode }: WidgetProps) {
  const { colors } = useTheme();
  const { totals } = useDailyNutrition();
  const { calorieGoal, proteinGoal, carbGoal, fatGoal } = useGoalStore();

  const [view, setView] = useState<'consumed' | 'remaining'>('consumed');

  // Calorie calculations
  const caloriesConsumed = Math.round(totals.calories);
  const calorieTarget = calorieGoal || 2000;
  const caloriesRemaining = Math.max(0, calorieTarget - caloriesConsumed);
  const calorieProgress = calorieTarget > 0 ? Math.min(caloriesConsumed / calorieTarget, 1) : 0;
  const isOver = caloriesConsumed > calorieTarget;
  const overAmount = isOver ? caloriesConsumed - calorieTarget : 0;

  // Ring calculations
  const ringSize = 180;
  const strokeWidth = 12;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference * (1 - calorieProgress);
  const center = ringSize / 2;

  // Macro data
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

  const handleRingPress = () => {
    if (isEditMode) return;
    setView(view === 'consumed' ? 'remaining' : 'consumed');
  };

  // Determine what to show in center
  const primaryValue = view === 'consumed' ? caloriesConsumed : caloriesRemaining;
  const primaryLabel = view === 'consumed' ? 'CONSUMED' : 'REMAINING';

  let secondaryText: string;
  if (isOver) {
    secondaryText = `${overAmount.toLocaleString()} over goal`;
  } else if (view === 'consumed') {
    secondaryText = `${caloriesRemaining.toLocaleString()} left`;
  } else {
    secondaryText = `${caloriesConsumed.toLocaleString()} eaten`;
  }

  const styles = createStyles(colors);

  return (
    <View testID={TestIDs.Widget.NutritionOverview} style={styles.container}>
      {/* Calorie Ring Section */}
      <Pressable
        onPress={handleRingPress}
        style={styles.ringSection}
        disabled={isEditMode}
        accessibilityRole="button"
        accessibilityLabel={`Calorie ring showing ${primaryValue.toLocaleString()} ${primaryLabel.toLowerCase()}. Tap to toggle view`}
      >
        <View style={[styles.ringContainer, { width: ringSize, height: ringSize }]}>
          <Svg width={ringSize} height={ringSize} style={StyleSheet.absoluteFill}>
            {/* Track */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.ringTrack}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={isOver ? colors.warning : colors.ringFill}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
            />
          </Svg>

          {/* Center Content */}
          <View style={styles.centerContent} accessibilityLiveRegion="polite">
            <Text style={[styles.label, { color: colors.textTertiary }]}>
              {primaryLabel}
            </Text>
            <Text style={[styles.primaryValue, { color: colors.textPrimary }]}>
              {primaryValue.toLocaleString()}
            </Text>
            <Text style={[styles.secondaryText, { color: isOver ? colors.warning : colors.textSecondary }]}>
              {secondaryText}
            </Text>
          </View>
        </View>

        {/* Page Indicator */}
        <View style={styles.pageIndicator}>
          <View
            style={[
              styles.dot,
              { backgroundColor: view === 'consumed' ? colors.accent : colors.borderDefault },
            ]}
          />
          <View
            style={[
              styles.dot,
              { backgroundColor: view === 'remaining' ? colors.accent : colors.borderDefault },
            ]}
          />
        </View>
      </Pressable>

      {/* Goal Text */}
      <Text style={[styles.goalText, { color: colors.textTertiary }]}>
        Daily goal: {calorieTarget.toLocaleString()} cal
      </Text>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />

      {/* Macro Bars Section */}
      <View style={styles.macroSection}>
        {macros.map((macro) => {
          const progress = Math.min(macro.consumed / macro.target, 1);
          const remaining = Math.max(0, macro.target - macro.consumed);

          return (
            <View key={macro.name} style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
                  <Text style={[styles.macroName, { color: colors.textPrimary }]}>
                    {macro.name}
                  </Text>
                </View>
                <Text style={[styles.macroValues, { color: colors.textSecondary }]}>
                  {macro.consumed}g / {macro.target}g
                </Text>
              </View>

              <View style={[styles.progressBackground, { backgroundColor: colors.bgInteractive }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%`, backgroundColor: macro.color },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgElevated,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    ringSection: {
      alignItems: 'center',
    },
    ringContainer: {
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    centerContent: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    primaryValue: {
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: -1,
      lineHeight: 40,
    },
    secondaryText: {
      fontSize: 13,
      fontWeight: '500',
      marginTop: 2,
    },
    pageIndicator: {
      flexDirection: 'row',
      marginTop: 10,
      gap: 5,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    goalText: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 6,
    },
    divider: {
      height: 1,
      marginVertical: 16,
    },
    macroSection: {
      gap: 12,
    },
    macroRow: {},
    macroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    macroLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    macroDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    macroName: {
      fontSize: 14,
      fontWeight: '500',
    },
    macroValues: {
      fontSize: 13,
    },
    progressBackground: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
  });
