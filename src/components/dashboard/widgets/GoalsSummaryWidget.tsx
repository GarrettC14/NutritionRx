/**
 * Goals Summary Widget
 * Displays calorie goal, weight goal, and rate progress
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useGoalStore, useWeightStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';

export function GoalsSummaryWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { calorieGoal, proteinGoal, targetWeight, weeklyGoal } = useGoalStore();
  const { entries: weights } = useWeightStore();

  const currentWeight = weights.length > 0
    ? weights.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].weightKg
    : null;

  const weightToGo = currentWeight && targetWeight
    ? Math.abs(currentWeight - targetWeight)
    : null;

  const isLosingWeight = currentWeight && targetWeight
    ? currentWeight > targetWeight
    : null;

  const handlePress = () => {
    if (!isEditMode) {
      router.push('/settings/goals');
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
      <View style={styles.header}>
        <Text style={styles.title}>Your Goals</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>

      <View style={styles.goalsGrid}>
        {/* Calorie Goal */}
        <View style={styles.goalItem}>
          <View style={[styles.goalIcon, { backgroundColor: `${colors.calories}20` }]}>
            <Ionicons name="flame-outline" size={16} color={colors.calories} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalLabel}>Daily Calories</Text>
            <Text style={styles.goalValue}>
              {calorieGoal ? `${calorieGoal.toLocaleString()} cal` : 'Not set'}
            </Text>
          </View>
        </View>

        {/* Protein Goal */}
        <View style={styles.goalItem}>
          <View style={[styles.goalIcon, { backgroundColor: `${colors.protein}20` }]}>
            <Ionicons name="barbell-outline" size={16} color={colors.protein} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalLabel}>Daily Protein</Text>
            <Text style={styles.goalValue}>
              {proteinGoal ? `${proteinGoal}g` : 'Not set'}
            </Text>
          </View>
        </View>

        {/* Weight Goal */}
        <View style={styles.goalItem}>
          <View style={[styles.goalIcon, { backgroundColor: `${colors.accent}20` }]}>
            <Ionicons name="scale-outline" size={16} color={colors.accent} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalLabel}>Target Weight</Text>
            <Text style={styles.goalValue}>
              {targetWeight ? `${targetWeight} lbs` : 'Not set'}
            </Text>
          </View>
        </View>

        {/* Weekly Rate */}
        <View style={styles.goalItem}>
          <View style={[styles.goalIcon, { backgroundColor: `${colors.success}20` }]}>
            <Ionicons
              name={isLosingWeight ? 'trending-down' : 'trending-up'}
              size={16}
              color={colors.success}
            />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalLabel}>Weekly Rate</Text>
            <Text style={styles.goalValue}>
              {weeklyGoal ? `${weeklyGoal} lbs/wk` : 'Not set'}
            </Text>
          </View>
        </View>
      </View>

      {weightToGo !== null && (
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            {weightToGo.toFixed(1)} lbs to go to reach your goal
          </Text>
        </View>
      )}
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    goalsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    goalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '47%',
      gap: 10,
    },
    goalIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goalInfo: {
      flex: 1,
    },
    goalLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 1,
    },
    goalValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    progressSection: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.borderDefault,
    },
    progressText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
