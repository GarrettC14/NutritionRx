/**
 * NutrientDetailSheet
 * Bottom sheet showing full detail for a single nutrient
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { NutrientDefinition, NutrientIntake, NutrientStatus, NutrientTarget } from '@/types/micronutrients';
import { useMicronutrientStore } from '@/stores/micronutrientStore';
import { ContributorsList } from './ContributorsList';
import { Button } from '@/components/ui';

interface NutrientDetailSheetProps {
  nutrient: NutrientDefinition | null;
  intake: NutrientIntake | null;
  target: NutrientTarget | null;
  date: string;
  onClose: () => void;
  onEditTarget: () => void;
}

const STATUS_LABELS: Record<NutrientStatus, string> = {
  deficient: 'Needs attention',
  low: 'Below target',
  adequate: 'Getting there',
  optimal: 'On track',
  high: 'Above target',
  excessive: 'Above recommended range',
};

const STATUS_ICONS: Record<NutrientStatus, keyof typeof Ionicons.glyphMap> = {
  deficient: 'alert-circle-outline',
  low: 'arrow-down-outline',
  adequate: 'trending-up-outline',
  optimal: 'checkmark-circle-outline',
  high: 'arrow-up-outline',
  excessive: 'alert-circle-outline',
};

export function NutrientDetailSheet({
  nutrient,
  intake,
  target,
  date,
  onClose,
  onEditTarget,
}: NutrientDetailSheetProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const contributors = useMicronutrientStore(s => s.contributors);
  const loadContributors = useMicronutrientStore(s => s.loadContributors);
  const [contributorsLoading, setContributorsLoading] = useState(false);

  // Load contributors when sheet opens
  useEffect(() => {
    if (nutrient) {
      setContributorsLoading(true);
      loadContributors(date, nutrient.id).finally(() => setContributorsLoading(false));
    }
  }, [nutrient, date, loadContributors]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const getStatusColor = (status: NutrientStatus): string => {
    switch (status) {
      case 'deficient': return colors.error;
      case 'low': return colors.warning;
      case 'adequate': return colors.accent;
      case 'optimal': return colors.success;
      case 'high': return colors.warning;
      case 'excessive': return colors.error;
    }
  };

  if (!nutrient) return null;

  const status = intake?.status ?? 'adequate';
  const statusColor = getStatusColor(status);
  const amount = intake?.amount ?? 0;
  const targetAmount = target?.targetAmount ?? 0;
  const percent = intake?.percentOfTarget ?? 0;
  const barWidth = Math.min(percent, 200);
  const upperLimit = target?.upperLimit;

  // Calculate marker positions for the bar
  const targetMarkerPos = targetAmount > 0 ? Math.min((targetAmount / (targetAmount * 2)) * 100, 100) : 50;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.textTertiary }}
      backgroundStyle={{ backgroundColor: colors.bgElevated }}
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing[8] }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {nutrient.name}
          </Text>
          <View style={styles.statusRow}>
            <Text style={[styles.amountText, { color: colors.textPrimary }]}>
              {formatAmount(amount, nutrient.unit)} of {formatAmount(targetAmount, nutrient.unit)}
            </Text>
            <Text style={[styles.dot, { color: colors.textTertiary }]}> · </Text>
            <Text style={[styles.percentText, { color: statusColor }]}>
              {Math.round(percent)}%
            </Text>
            <Text style={[styles.dot, { color: colors.textTertiary }]}> · </Text>
            <Ionicons name={STATUS_ICONS[status]} size={14} color={statusColor} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {STATUS_LABELS[status]}
            </Text>
          </View>
        </View>

        {/* Progress bar with markers */}
        <View style={styles.barSection}>
          <View style={[styles.barTrack, { backgroundColor: colors.bgInteractive }]}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(barWidth / 2, 100)}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
            {/* Target marker at 50% (represents 100% of target) */}
            <View style={[styles.marker, { left: '50%', backgroundColor: colors.textTertiary }]} />
            {/* Upper limit marker if applicable */}
            {upperLimit && targetAmount > 0 && (
              <View
                style={[
                  styles.marker,
                  {
                    left: `${Math.min((upperLimit / (targetAmount * 2)) * 100, 98)}%`,
                    backgroundColor: colors.error,
                  },
                ]}
              />
            )}
          </View>
          <View style={styles.barLabels}>
            <Text style={[styles.barLabel, { color: colors.textTertiary }]}>0</Text>
            <Text style={[styles.barLabel, { color: colors.textTertiary }]}>
              Target: {formatAmount(targetAmount, nutrient.unit)}
            </Text>
            {upperLimit && (
              <Text style={[styles.barLabel, { color: colors.error }]}>
                Max: {formatAmount(upperLimit, nutrient.unit)}
              </Text>
            )}
          </View>
        </View>

        {/* Description */}
        {nutrient.description && (
          <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="book-outline" size={16} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                What it does
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
              {nutrient.description}
            </Text>
          </View>
        )}

        {/* Food sources */}
        {nutrient.foodSources && nutrient.foodSources.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="leaf-outline" size={16} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Good food sources
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
              {nutrient.foodSources.join(', ')}
            </Text>
          </View>
        )}

        {/* Today's contributors */}
        <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="bar-chart-outline" size={16} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Today's contributors
            </Text>
          </View>
          <ContributorsList
            contributors={contributors}
            unit={nutrient.unit}
            isLoading={contributorsLoading}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Edit Target"
            variant="secondary"
            size="md"
            onPress={onEditTarget}
          />
        </View>

        {/* Custom target indicator */}
        {target?.isCustom && (
          <Text style={[styles.customNote, { color: colors.textTertiary }]}>
            Using custom target (default: DRI-based)
          </Text>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function formatAmount(value: number, unit: string): string {
  if (unit === 'mcg') return `${Math.round(value)} mcg`;
  if (unit === 'mg') return value >= 1000 ? `${(value / 1000).toFixed(1)} g` : `${Math.round(value)} mg`;
  if (unit === 'g') return `${value.toFixed(1)} g`;
  return `${Math.round(value)} ${unit}`;
}

const styles = StyleSheet.create({
  content: {
    padding: spacing[5],
    gap: spacing[4],
  },
  header: {
    gap: spacing[2],
  },
  name: {
    ...typography.title.large,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  amountText: {
    ...typography.body.medium,
  },
  dot: {
    ...typography.body.medium,
  },
  percentText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  statusLabel: {
    ...typography.body.small,
    fontWeight: '500',
  },
  barSection: {
    gap: spacing[1],
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'visible',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  marker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 14,
    borderRadius: 1,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabel: {
    ...typography.caption,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  cardTitle: {
    ...typography.title.small,
  },
  cardBody: {
    ...typography.body.medium,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  customNote: {
    ...typography.caption,
    textAlign: 'center',
  },
});
