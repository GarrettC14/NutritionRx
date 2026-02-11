/**
 * NutrientBar Component
 * Visual progress bar for nutrient intake with status colors
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { NutrientStatus } from '@/types/micronutrients';
import { NutrientDefinition } from '@/types/micronutrients';
import { useStatusColors } from '@/hooks/useStatusColor';
import { STATUS_DISPLAY_LABELS } from '@/constants/statusDisplay';
import { contrastTextColor } from '@/utils/colorUtils';

interface NutrientBarProps {
  nutrient: NutrientDefinition;
  amount: number;
  target: number;
  percentOfTarget: number;
  status: NutrientStatus;
  onPress?: () => void;
  compact?: boolean;
}

export function NutrientBar({
  nutrient,
  amount,
  target,
  percentOfTarget,
  status,
  onPress,
  compact = false,
}: NutrientBarProps) {
  const { colors } = useTheme();
  const { getStatusColor } = useStatusColors();

  const statusColor = getStatusColor(status);
  const barWidth = Math.min(percentOfTarget, 100);
  const showOverflow = percentOfTarget > 100;

  const formatAmount = (value: number, unit: string): string => {
    if (unit === 'mcg') {
      return `${Math.round(value)}${unit}`;
    } else if (unit === 'mg') {
      return value >= 1000
        ? `${(value / 1000).toFixed(1)}g`
        : `${Math.round(value)}${unit}`;
    } else if (unit === 'g') {
      return `${value.toFixed(1)}${unit}`;
    }
    return `${Math.round(value)}${unit}`;
  };

  const Content = (
    <>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          <Text
            style={[
              compact ? styles.nameCompact : styles.name,
              { color: colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {nutrient.shortName}
          </Text>
          {!compact && (
            <Text style={[styles.fullName, { color: colors.textTertiary }]}>
              {nutrient.name}
            </Text>
          )}
        </View>

        <View style={styles.valueContainer}>
          <Text
            style={[
              compact ? styles.valueCompact : styles.value,
              { color: colors.textPrimary },
            ]}
          >
            {formatAmount(amount, nutrient.unit)}
          </Text>
          <Text style={[styles.target, { color: colors.textTertiary }]}>
            / {formatAmount(target, nutrient.unit)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.barContainer, { backgroundColor: colors.bgInteractive }]}>
        <View
          style={[
            styles.bar,
            {
              width: `${barWidth}%`,
              backgroundColor: statusColor,
            },
          ]}
        />
        {/* Target marker at 100% */}
        <View style={[styles.targetMarker, { backgroundColor: colors.textTertiary }]} />

        {/* Overflow indicator */}
        {showOverflow && (
          <View style={[styles.overflowIndicator, { backgroundColor: statusColor }]}>
            <Text style={[styles.overflowText, { color: contrastTextColor(statusColor) }]}>
              {Math.round(percentOfTarget)}%
            </Text>
          </View>
        )}
      </View>

      {/* Percentage and status */}
      {!compact && (
        <View style={styles.footer}>
          <Text style={[styles.percent, { color: statusColor }]}>
            {Math.round(percentOfTarget)}%
          </Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {STATUS_DISPLAY_LABELS[status]}
          </Text>
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={[
          styles.container,
          compact && styles.containerCompact,
          { backgroundColor: colors.bgSecondary },
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${nutrient.name}, ${Math.round(percentOfTarget)}% of target, ${STATUS_DISPLAY_LABELS[status]}`}
      >
        {Content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        { backgroundColor: colors.bgSecondary },
      ]}
    >
      {Content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  containerCompact: {
    padding: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  nameContainer: {
    flex: 1,
    marginRight: spacing[2],
  },
  name: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  nameCompact: {
    ...typography.body.small,
    fontWeight: '500',
  },
  fullName: {
    ...typography.caption,
    marginTop: 2,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  valueCompact: {
    ...typography.body.small,
    fontWeight: '500',
  },
  target: {
    ...typography.caption,
    marginLeft: 2,
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  targetMarker: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 2,
    height: '100%',
    opacity: 0.5,
  },
  overflowIndicator: {
    position: 'absolute',
    right: 4,
    top: -2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  overflowText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  percent: {
    ...typography.caption,
    fontWeight: '600',
  },
  status: {
    ...typography.caption,
    fontWeight: '500',
  },
});
