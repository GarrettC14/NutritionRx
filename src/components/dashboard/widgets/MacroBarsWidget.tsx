/**
 * Macro Bars Widget
 * Displays protein, carbs, and fat progress as horizontal bars
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAdjustedDailyNutrition as useDailyNutrition } from '@/hooks/useAdjustedDailyNutrition';
import { useResolvedTargets } from '@/hooks/useResolvedTargets';
import { useStatusColors } from '@/hooks/useStatusColor';
import { getProgressZone, ZONE_COLORS, getZoneStatusText } from '@/utils/progressZones';
import { WidgetProps } from '@/types/dashboard';

interface MacroData {
  name: string;
  consumed: number;
  target: number;
  color: string;
}

export const MacroBarsWidget = React.memo(function MacroBarsWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { totals } = useDailyNutrition();
  const { protein: proteinTarget, carbs: carbTarget, fat: fatTarget } = useResolvedTargets();
  const { palette } = useStatusColors();

  const macros: MacroData[] = [
    {
      name: 'Protein',
      consumed: Math.round(totals.protein),
      target: proteinTarget,
      color: colors.protein,
    },
    {
      name: 'Carbs',
      consumed: Math.round(totals.carbs),
      target: carbTarget,
      color: colors.carbs,
    },
    {
      name: 'Fat',
      consumed: Math.round(totals.fat),
      target: fatTarget,
      color: colors.fat,
    },
  ];

  const handlePress = () => {
    if (!isEditMode) {
      router.push('/');
    }
  };

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode}
      accessibilityRole="button"
      accessibilityLabel="View macro details"
    >
      <Text style={styles.title}>Macros</Text>

      <View style={styles.macroList} accessibilityLiveRegion="polite">
        {macros.map((macro) => {
          const progress = Math.min(macro.consumed / macro.target, 1);
          const remaining = Math.max(0, macro.target - macro.consumed);
          const zone = getProgressZone(macro.consumed, macro.target);
          const zoneColor = palette[ZONE_COLORS[zone]];
          const zoneText = getZoneStatusText(zone);

          return (
            <View key={macro.name} style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>{macro.name}</Text>
                <Text style={styles.macroValues}>
                  <Text style={styles.consumed}>{macro.consumed}g</Text>
                  <Text style={styles.separator}> / </Text>
                  <Text style={styles.target}>{macro.target}g</Text>
                </Text>
              </View>

              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%`, backgroundColor: zoneColor },
                  ]}
                />
              </View>

              <View style={styles.macroFooter}>
                <Text style={[styles.zoneLabel, { color: zoneColor }]}>{zoneText}</Text>
                <Text style={styles.remaining}>{remaining}g left</Text>
              </View>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
});

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.borderDefault,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    macroList: {
      gap: 14,
    },
    macroRow: {},
    macroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    macroName: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    macroValues: {
      fontSize: 14,
    },
    consumed: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    separator: {
      color: colors.textTertiary,
    },
    target: {
      color: colors.textSecondary,
    },
    progressBackground: {
      height: 8,
      backgroundColor: colors.bgInteractive,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    macroFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    zoneLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    remaining: {
      fontSize: 12,
      color: colors.textTertiary,
    },
  });
