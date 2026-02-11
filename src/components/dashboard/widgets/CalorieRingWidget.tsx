/**
 * Calorie Ring Widget
 * Displays daily calorie progress as a circular ring
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useResolvedTargets } from '@/hooks/useResolvedTargets';
import { WidgetProps } from '@/types/dashboard';
import { TestIDs } from '@/constants/testIDs';

export function CalorieRingWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { totals } = useDailyNutrition();
  const { calories: calorieTarget } = useResolvedTargets();

  const caloriesConsumed = Math.round(totals.calories);

  const remaining = Math.max(0, calorieTarget - caloriesConsumed);
  const progress = Math.min(caloriesConsumed / calorieTarget, 1);

  // Ring calculations
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  const handlePress = () => {
    if (!isEditMode) {
      router.push('/');
    }
  };

  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      testID={TestIDs.Widget.CalorieRing}
      style={styles.container}
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode}
      accessibilityRole="button"
      accessibilityLabel={`Calories: ${caloriesConsumed} consumed of ${calorieTarget} goal, ${remaining} remaining`}
    >
      <View style={styles.ringContainer}>
        <Svg width={size} height={size}>
          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.ringTrack}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.ringFill}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.ringContent} accessibilityLiveRegion="polite">
          <Text style={styles.remainingNumber}>{remaining}</Text>
          <Text style={styles.remainingLabel}>remaining</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.title}>Calories</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {caloriesConsumed.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>consumed</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {calorieTarget.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>goal</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgElevated,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    ringContainer: {
      position: 'relative',
      width: 120,
      height: 120,
      marginRight: 20,
    },
    ringContent: {
      position: 'absolute',
      top: 15,
      left: 15,
      right: 15,
      bottom: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    remainingNumber: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    remainingLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    details: {
      flex: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stat: {
      flex: 1,
    },
    statValue: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    divider: {
      width: 1,
      height: 32,
      backgroundColor: colors.borderDefault,
      marginHorizontal: 16,
    },
  });
