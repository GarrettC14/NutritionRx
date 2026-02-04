/**
 * Mini Calendar
 * 7-dot calendar showing daily calorie status with color coding
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { DayData, DayStatus } from '../types/weeklyInsights.types';
import { DAY_ABBREVIATIONS } from '../utils/weekUtils';

// Appendix B color mapping
const STATUS_COLORS: Record<DayStatus, string> = {
  on_target: '#8FAE7E',      // Sage green
  no_data: '#D5D5D5',        // Light gray
  over_high: '#C67B5C',      // Terracotta
  over_moderate: '#D4B896',   // Tan
  under_moderate: '#92B4CC',  // Light blue
  under_low: '#7BA3BF',      // Soft blue
};

interface MiniCalendarProps {
  days: DayData[];
  calorieTarget: number;
  large?: boolean;
}

function getDayStatus(day: DayData, target: number): DayStatus {
  if (!day.isLogged || day.mealCount === 0) return 'no_data';
  if (target <= 0) return 'no_data';

  const percent = (day.calories / target) * 100;
  if (percent >= 85 && percent <= 115) return 'on_target';
  if (percent > 130) return 'over_high';
  if (percent > 115) return 'over_moderate';
  if (percent < 70) return 'under_low';
  return 'under_moderate';
}

export function MiniCalendar({ days, calorieTarget, large = false }: MiniCalendarProps) {
  const { colors } = useTheme();
  const dotSize = large ? 28 : 24;

  return (
    <View style={styles.container}>
      {days.map((day, index) => {
        const status = getDayStatus(day, calorieTarget);
        const color = STATUS_COLORS[status];

        return (
          <View key={day.date} style={styles.dayColumn}>
            <Text style={[styles.dayLabel, { color: colors.textTertiary }]}>
              {DAY_ABBREVIATIONS[index]}
            </Text>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: color,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  dot: {},
});
