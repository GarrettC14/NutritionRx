/**
 * Premium Micronutrient Preview
 * Soft preview card for free users showing blurred rows and CTA.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { spacing, borderRadius } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { NutrientDefinition, NutrientIntake, NutrientStatus } from '@/types/micronutrients';

type DailyIntakeMap = Record<string, NutrientIntake>;

interface PremiumMicronutrientPreviewProps {
  premiumNutrients: NutrientDefinition[];
  dailyIntake: DailyIntakeMap;
}

const PREVIEW_NUTRIENT_IDS = ['zinc', 'omega_3_dha', 'folate', 'vitamin_e'];

const formatAmount = (value: number, unit: NutrientDefinition['unit']): string => {
  if (unit === 'mcg') return `${Math.round(value)}${unit}`;
  if (unit === 'mg') return value >= 1000 ? `${(value / 1000).toFixed(1)}g` : `${Math.round(value)}${unit}`;
  if (unit === 'g') return `${value.toFixed(1)}${unit}`;
  return `${Math.round(value)}${unit}`;
};

export function PremiumMicronutrientPreview({
  premiumNutrients,
  dailyIntake,
}: PremiumMicronutrientPreviewProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const previewRows = useMemo(
    () =>
      PREVIEW_NUTRIENT_IDS.map((id) => premiumNutrients.find((n) => n.id === id))
        .filter((n): n is NutrientDefinition => Boolean(n))
        .map((definition) => {
          const intake = dailyIntake[definition.id];
          return {
            definition,
            amount: intake?.amount ?? 0,
            percentOfTarget: intake?.percentOfTarget ?? 0,
            status: (intake?.status ?? 'no_data') as NutrientStatus,
          };
        }),
    [premiumNutrients, dailyIntake]
  );

  const goToPaywall = () => router.push('/paywall?context=micronutrients');

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.bgSecondary, borderColor: colors.premiumGoldMuted },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.lockBadge, { backgroundColor: colors.premiumGoldMuted }]}>
          <Ionicons name="lock-closed" size={14} color={colors.premiumGold} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Full Micronutrient Dashboard
        </Text>
      </View>

      <View style={styles.rows}>
        {previewRows.map((item) => {
          const statusWidth = Math.min(Math.max(item.percentOfTarget, 0), 100);

          return (
            <Pressable
              key={item.definition.id}
              style={styles.previewRow}
              onPress={goToPaywall}
              accessibilityRole="button"
              accessibilityLabel={`Unlock ${item.definition.name}`}
            >
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text
                    style={[styles.rowName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.definition.name}
                  </Text>
                  <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
                    {formatAmount(item.amount, item.definition.unit)}
                  </Text>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: colors.borderDefault }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${statusWidth}%`, backgroundColor: '#9ca3af' },
                    ]}
                  />
                </View>

                <View style={styles.rowFooter}>
                  <Text style={[styles.rowPercent, { color: colors.textSecondary }]}>
                    {Math.round(item.percentOfTarget)}%
                  </Text>
                </View>
              </View>

              <BlurView
                intensity={12}
                tint={isDark ? 'dark' : 'light'}
                style={styles.rowBlur}
              />
              <View style={styles.rowMask} />
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.moreText, { color: colors.textSecondary }]}>
        + 11 more nutrients
      </Text>

      <Pressable
        onPress={goToPaywall}
        style={[styles.cta, { borderColor: colors.premiumGold }]}
        accessibilityRole="button"
        accessibilityLabel="See what you're missing"
      >
        <Text style={[styles.ctaText, { color: colors.premiumGold }]}>
          See What You're Missing →
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  lockBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  rows: {
    gap: spacing[2],
  },
  previewRow: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  rowContent: {
    padding: spacing[3],
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  rowName: {
    ...typography.body.small,
    flex: 1,
    fontWeight: '500',
  },
  rowValue: {
    ...typography.body.small,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  rowFooter: {
    marginTop: spacing[1],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowPercent: {
    ...typography.caption,
    fontWeight: '700',
  },
  moreText: {
    ...typography.body.small,
    textAlign: 'center',
    fontWeight: '600',
  },
  rowBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  rowMask: {
    ...StyleSheet.absoluteFillObject,
  },
  cta: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  ctaText: {
    ...typography.body.small,
    fontWeight: '600',
  },
});
