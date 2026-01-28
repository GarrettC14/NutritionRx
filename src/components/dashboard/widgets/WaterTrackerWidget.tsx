/**
 * Water Tracker Widget
 * Interactive widget for tracking daily water intake
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useWaterStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';

export function WaterTrackerWidget({ config, isEditMode }: WidgetProps) {
  const { colors } = useTheme();
  const dailyGoal = config?.dailyGoal ?? 8;

  const { todayIntake, addWater } = useWaterStore();
  const waterIntake = todayIntake?.glasses ?? 0;

  const handleAddWater = async () => {
    if (isEditMode) return;

    await addWater(1);

    if (waterIntake + 1 >= dailyGoal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const progress = Math.min(waterIntake / dailyGoal, 1);
  const waterColor = '#5BA4D9';

  const styles = createStyles(colors, waterColor);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="water" size={22} color={waterColor} />
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>Water</Text>
          <Text style={styles.count}>
            {waterIntake} of {dailyGoal} glasses
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>

      {/* Add button */}
      <TouchableOpacity
        style={[styles.addButton, isEditMode && styles.addButtonDisabled]}
        onPress={handleAddWater}
        disabled={isEditMode}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any, waterColor: string) =>
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
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: `${waterColor}20`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
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
    count: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    progressContainer: {
      position: 'absolute',
      bottom: -8,
      left: 54,
      right: 60,
      height: 4,
    },
    progressBackground: {
      height: 4,
      backgroundColor: `${waterColor}25`,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: waterColor,
      borderRadius: 2,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: waterColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    addButtonDisabled: {
      opacity: 0.5,
    },
  });
