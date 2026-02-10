/**
 * StatusOverviewCard
 * Summary badges showing counts by nutrient status
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { NutrientStatus } from '@/types/micronutrients';

interface StatusOverviewCardProps {
  counts: Record<NutrientStatus, number>;
  onStatusPress?: (status: NutrientStatus) => void;
}

const STATUS_CONFIG: Array<{
  status: NutrientStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { status: 'deficient', label: 'Needs attention', icon: 'alert-circle-outline' },
  { status: 'low', label: 'Below target', icon: 'arrow-down-outline' },
  { status: 'optimal', label: 'On track', icon: 'checkmark-circle-outline' },
  { status: 'high', label: 'Above target', icon: 'arrow-up-outline' },
];

export function StatusOverviewCard({ counts, onStatusPress }: StatusOverviewCardProps) {
  const { colors } = useTheme();

  const getStatusColor = (status: NutrientStatus): string => {
    switch (status) {
      case 'deficient': return colors.error;
      case 'low': return colors.warning;
      case 'optimal': return colors.success;
      case 'high': return colors.warning;
      case 'excessive': return colors.error;
      default: return colors.textTertiary;
    }
  };

  const visibleItems = STATUS_CONFIG.filter(
    item => counts[item.status] > 0 || item.status === 'optimal'
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <View style={styles.badges}>
        {visibleItems.map(item => {
          const color = getStatusColor(item.status);
          const count = counts[item.status] + (
            item.status === 'deficient' ? 0 :
            item.status === 'low' ? counts.deficient : // Include deficient in low count display
            item.status === 'high' ? counts.excessive : 0
          );
          const displayCount = item.status === 'low'
            ? counts.low + counts.deficient
            : item.status === 'high'
            ? counts.high + counts.excessive
            : counts[item.status];

          if (displayCount === 0 && item.status !== 'optimal') return null;

          return (
            <Pressable
              key={item.status}
              style={[styles.badge, { backgroundColor: `${color}15` }]}
              onPress={() => onStatusPress?.(item.status)}
              accessibilityRole="button"
              accessibilityLabel={`${displayCount} ${item.label}`}
            >
              <Ionicons name={item.icon} size={14} color={color} />
              <Text style={[styles.badgeCount, { color }]}>{displayCount}</Text>
              <Text style={[styles.badgeLabel, { color }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  badgeCount: {
    ...typography.body.small,
    fontWeight: '700',
  },
  badgeLabel: {
    ...typography.caption,
    fontWeight: '500',
  },
});
