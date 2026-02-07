/**
 * DeficiencyAlertCard Component
 * Displays a nutrient deficiency alert with dismiss option
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { getSeverityColor, getSeverityIcon } from '../services/DeficiencyCalculator';
import type { DeficiencyCheck } from '../types/insights.types';

interface DeficiencyAlertCardProps {
  alert: DeficiencyCheck;
  onDismiss: () => void;
}

export function DeficiencyAlertCard({ alert, onDismiss }: DeficiencyAlertCardProps) {
  const { colors, isDark } = useTheme();
  const severityColors = getSeverityColor(alert.severity);
  const icon = getSeverityIcon(alert.severity);

  // Adjust colors for dark mode
  const bgColor = isDark
    ? alert.severity === 'concern'
      ? 'rgba(248, 81, 73, 0.15)'
      : alert.severity === 'warning'
        ? 'rgba(210, 153, 34, 0.15)'
        : 'rgba(100, 181, 246, 0.15)'
    : severityColors.bg;

  const borderColor = isDark
    ? alert.severity === 'concern'
      ? 'rgba(248, 81, 73, 0.3)'
      : alert.severity === 'warning'
        ? 'rgba(210, 153, 34, 0.3)'
        : 'rgba(100, 181, 246, 0.3)'
    : severityColors.border;

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.textPrimary} />
          <Text style={[styles.nutrientName, { color: colors.textPrimary }]}>{alert.nutrientName}</Text>
          <View style={[styles.badge, { backgroundColor: isDark ? colors.bgInteractive : severityColors.border }]}>
            <Text style={[styles.badgeText, { color: isDark ? colors.textSecondary : severityColors.text }]}>
              {Math.round(alert.percentOfRDA)}% of target
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={`Dismiss ${alert.nutrientName} alert`}>
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.message, { color: colors.textPrimary }]}>{alert.message}</Text>

      {alert.foodSuggestions.length > 0 && (
        <View style={styles.foodsRow}>
          <Ionicons name="nutrition-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.foodsText, { color: colors.textSecondary }]}>
            Try: {alert.foodSuggestions.slice(0, 3).join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    gap: 6,
  },
  nutrientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  foodsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foodsText: {
    fontSize: 13,
    flex: 1,
  },
});
