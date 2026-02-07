/**
 * Protein Focus Widget
 * Displays protein-only progress ring for users focused on protein intake
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useGoalStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';
import { TestIDs } from '@/constants/testIDs';

export function ProteinFocusWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { totals } = useDailyNutrition();
  const { proteinGoal } = useGoalStore();

  const proteinConsumed = Math.round(totals.protein);
  const proteinTarget = proteinGoal || 150;
  const remaining = Math.max(0, proteinTarget - proteinConsumed);
  const progress = Math.min(proteinConsumed / proteinTarget, 1);

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
      testID={TestIDs.Widget.ProteinFocus}
      style={styles.container}
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode}
      accessibilityRole="button"
      accessibilityLabel={`Protein: ${proteinConsumed}g consumed of ${proteinTarget}g goal, ${remaining}g remaining`}
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
            stroke={colors.protein}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.ringContent} accessibilityLiveRegion="polite">
          <Text style={styles.remainingNumber}>{remaining}g</Text>
          <Text style={styles.remainingLabel}>remaining</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.title}>Protein</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{proteinConsumed}g</Text>
            <Text style={styles.statLabel}>consumed</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{proteinTarget}g</Text>
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
