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
  const size = 56;
  const strokeWidth = 6;
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
      style={styles.container}
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode}
    >
      <View style={styles.ringContainer}>
        <Svg width={size} height={size}>
          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`${colors.protein}30`}
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
        <View style={styles.ringContent}>
          <Text style={styles.ringValue}>{Math.round(progress * 100)}%</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title}>Protein</Text>
        <Text style={styles.stats}>
          {proteinConsumed}g / {proteinTarget}g
        </Text>
        <Text style={styles.remaining}>{remaining}g to go</Text>
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
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    ringContainer: {
      position: 'relative',
      width: 56,
      height: 56,
      marginRight: 14,
    },
    ringContent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringValue: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    info: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    stats: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    remaining: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
  });
