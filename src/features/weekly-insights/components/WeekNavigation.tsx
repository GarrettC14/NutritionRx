/**
 * Week Navigation
 * Prev/next week arrows with formatted date range
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { formatWeekRange, isCurrentWeek, addDays } from '../utils/weekUtils';

interface WeekNavigationProps {
  weekStart: string;
  onNavigate: (weekStart: string) => void;
}

export function WeekNavigation({ weekStart, onNavigate }: WeekNavigationProps) {
  const { colors } = useTheme();
  const isCurrent = isCurrentWeek(weekStart);

  const goToPrevWeek = () => {
    onNavigate(addDays(weekStart, -7));
  };

  const goToNextWeek = () => {
    if (!isCurrent) {
      onNavigate(addDays(weekStart, 7));
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={goToPrevWeek}
        style={styles.arrowButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={[styles.dateRange, { color: colors.textPrimary }]}>
          {formatWeekRange(weekStart)}
        </Text>
        {isCurrent && (
          <Text style={[styles.currentLabel, { color: colors.accent }]}>
            This Week
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={goToNextWeek}
        style={styles.arrowButton}
        disabled={isCurrent}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isCurrent ? colors.borderDefault : colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  arrowButton: {
    padding: 4,
  },
  center: {
    alignItems: 'center',
  },
  dateRange: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
