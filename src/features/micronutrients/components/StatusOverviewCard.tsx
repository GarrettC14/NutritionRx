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
import { withAlpha } from '@/utils/colorUtils';
import { useStatusColors } from '@/hooks/useStatusColor';
import { STATUS_DISPLAY_LABELS, STATUS_ICONS } from '@/constants/statusDisplay';

interface StatusOverviewCardProps {
  counts: Record<NutrientStatus, number>;
  onStatusPress?: (status: NutrientStatus) => void;
}

const STATUS_CONFIG: Array<{ status: NutrientStatus }> = [
  { status: 'deficient' },
  { status: 'low' },
  { status: 'adequate' },
  { status: 'optimal' },
  { status: 'high' },
  { status: 'excessive' },
];

export function StatusOverviewCard({ counts, onStatusPress }: StatusOverviewCardProps) {
  const { colors } = useTheme();
  const { getStatusColor } = useStatusColors();

  const visibleItems = STATUS_CONFIG.filter(
    item => counts[item.status] > 0 || item.status === 'optimal'
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <View style={styles.badges}>
        {visibleItems.map(item => {
          const color = getStatusColor(item.status);
          const displayCount = counts[item.status];
          const label = STATUS_DISPLAY_LABELS[item.status];
          const icon = STATUS_ICONS[item.status] as keyof typeof Ionicons.glyphMap;

          if (displayCount === 0 && item.status !== 'optimal') return null;

          return (
            <Pressable
              key={item.status}
              style={[styles.badge, { backgroundColor: withAlpha(color, 0.08) }]}
              onPress={() => onStatusPress?.(item.status)}
              accessibilityRole="button"
              accessibilityLabel={`${displayCount} ${label}`}
            >
              <Ionicons name={icon} size={14} color={color} />
              <Text style={[styles.badgeCount, { color }]}>{displayCount}</Text>
              <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
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
