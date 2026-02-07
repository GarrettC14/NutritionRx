/**
 * Streak Badge Widget
 * Displays consecutive days of logging
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useFoodLogStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';

export function StreakBadgeWidget({ config, isEditMode }: WidgetProps) {
  const { colors } = useTheme();
  const { streak } = useFoodLogStore();

  const currentStreak = streak ?? 0;
  const hasStreak = currentStreak > 0;
  const isHotStreak = currentStreak >= 7;

  const styles = createStyles(colors, isHotStreak);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={hasStreak ? 'flame' : 'flame-outline'}
          size={24}
          color={isHotStreak ? '#FF6B35' : hasStreak ? colors.warning : colors.textTertiary}
        />
      </View>

      <View style={styles.info} accessibilityLiveRegion="polite">
        <Text style={styles.streakNumber}>{currentStreak}</Text>
        <Text style={styles.label}>day streak</Text>
      </View>

      {isHotStreak && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>On fire!</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any, isHotStreak: boolean) =>
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
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isHotStreak ? 'rgba(255, 107, 53, 0.15)' : colors.bgInteractive,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    info: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    streakNumber: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    badge: {
      backgroundColor: 'rgba(255, 107, 53, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FF6B35',
    },
  });
