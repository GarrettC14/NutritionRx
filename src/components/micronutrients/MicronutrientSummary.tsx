/**
 * MicronutrientSummary Component
 * Overview card showing micronutrient status with category breakdown
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { NutrientIntake, NutrientCategory } from '@/types/micronutrients';
import { NUTRIENTS_BY_CATEGORY, CATEGORY_DISPLAY_NAMES } from '@/data/nutrients';
import { LockedContentArea } from '@/components/premium';
import { useStatusColors } from '@/hooks/useStatusColor';
import { withAlpha } from '@/utils/colorUtils';
import { STATUS_DISPLAY_LABELS } from '@/constants/statusDisplay';

interface MicronutrientSummaryProps {
  nutrients: NutrientIntake[];
  isPremium?: boolean;
}

interface CategorySummary {
  category: NutrientCategory;
  name: string;
  total: number;
  deficient: number;
  low: number;
  adequate: number;
  optimal: number;
  high: number;
  excessive: number;
  averagePercent: number;
}

export function MicronutrientSummary({
  nutrients,
  isPremium = false,
}: MicronutrientSummaryProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { getStatusColor, palette: statusPalette } = useStatusColors();

  // Calculate category summaries
  const categorySummaries: CategorySummary[] = React.useMemo(() => {
    const categories: NutrientCategory[] = ['vitamins', 'minerals', 'fatty_acids', 'other'];

    return categories.map(category => {
      const categoryNutrients = NUTRIENTS_BY_CATEGORY[category];
      const categoryIntakes = nutrients.filter(n =>
        categoryNutrients.some(cn => cn.id === n.nutrientId)
      );

      const counts = {
        deficient: 0,
        low: 0,
        adequate: 0,
        optimal: 0,
        high: 0,
        excessive: 0,
      };

      let totalPercent = 0;

      for (const intake of categoryIntakes) {
        counts[intake.status]++;
        totalPercent += intake.percentOfTarget;
      }

      return {
        category,
        name: CATEGORY_DISPLAY_NAMES[category],
        total: categoryIntakes.length,
        ...counts,
        averagePercent: categoryIntakes.length > 0
          ? totalPercent / categoryIntakes.length
          : 0,
      };
    });
  }, [nutrients]);

  // Overall stats
  const overallStats = React.useMemo(() => {
    const stats = {
      total: nutrients.length,
      belowTarget: 0,
      onTarget: 0,
      aboveTarget: 0,
    };

    for (const nutrient of nutrients) {
      if (nutrient.status === 'deficient' || nutrient.status === 'low') stats.belowTarget++;
      else if (nutrient.status === 'optimal') stats.onTarget++;
      else if (nutrient.status === 'excessive' || nutrient.status === 'high') stats.aboveTarget++;
    }

    return stats;
  }, [nutrients]);

  const getCategoryIcon = (category: NutrientCategory): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'vitamins': return 'sunny-outline';
      case 'minerals': return 'diamond-outline';
      case 'amino_acids': return 'fitness-outline';
      case 'fatty_acids': return 'water-outline';
      case 'other': return 'ellipsis-horizontal-outline';
    }
  };

  // Get mini bar color based on average percent
  const getMiniBarColor = (averagePercent: number): string => {
    if (averagePercent >= 75) return statusPalette.onTarget;
    if (averagePercent >= 50) return statusPalette.approachingTarget;
    return statusPalette.belowTarget;
  };

  // Content to show (either directly or blurred)
  const contentArea = (
    <>
      {/* Quick stats */}
      <View style={styles.quickStats}>
        {overallStats.belowTarget > 0 && (
          <View style={[styles.statBadge, { backgroundColor: withAlpha(statusPalette.belowTarget, 0.12) }]}>
            <View style={[styles.statDot, { backgroundColor: statusPalette.belowTarget }]} />
            <Text style={[styles.statText, { color: statusPalette.belowTarget }]}>
              {overallStats.belowTarget} {STATUS_DISPLAY_LABELS.deficient.toLowerCase()}
            </Text>
          </View>
        )}
        {overallStats.onTarget > 0 && (
          <View style={[styles.statBadge, { backgroundColor: withAlpha(statusPalette.onTarget, 0.12) }]}>
            <View style={[styles.statDot, { backgroundColor: statusPalette.onTarget }]} />
            <Text style={[styles.statText, { color: statusPalette.onTarget }]}>
              {overallStats.onTarget} {STATUS_DISPLAY_LABELS.optimal.toLowerCase()}
            </Text>
          </View>
        )}
        {overallStats.aboveTarget > 0 && (
          <View style={[styles.statBadge, { backgroundColor: withAlpha(statusPalette.aboveTarget, 0.12) }]}>
            <View style={[styles.statDot, { backgroundColor: statusPalette.aboveTarget }]} />
            <Text style={[styles.statText, { color: statusPalette.aboveTarget }]}>
              {overallStats.aboveTarget} {STATUS_DISPLAY_LABELS.high.toLowerCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Category breakdown */}
      <View style={styles.categories} accessibilityLiveRegion="polite">
        {categorySummaries.map(summary => (
          <View
            key={summary.category}
            style={[styles.categoryCard, { backgroundColor: colors.bgPrimary }]}
          >
            <View style={styles.categoryHeader}>
              <Ionicons
                name={getCategoryIcon(summary.category)}
                size={18}
                color={colors.accent}
              />
              <Text
                style={[styles.categoryName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {summary.name}
              </Text>
            </View>

            {/* Mini progress bar */}
            <View style={[styles.miniBar, { backgroundColor: colors.bgInteractive }]}>
              <View
                style={[
                  styles.miniBarFill,
                  {
                    width: `${Math.min(summary.averagePercent, 100)}%`,
                    backgroundColor: getMiniBarColor(summary.averagePercent),
                  },
                ]}
              />
            </View>

            <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
              {Math.round(summary.averagePercent)}% avg
            </Text>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      {/* Header with overall status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="nutrition-outline" size={24} color={colors.accent} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Micronutrients
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {nutrients.length} nutrients tracked
            </Text>
          </View>
        </View>
        {isPremium && (
          <TouchableOpacity
            onPress={() => router.push('/micronutrients')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="View all micronutrients"
          >
            <Text style={[styles.viewAll, { color: colors.accent }]}>
              View All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content area - locked for non-premium */}
      {isPremium ? (
        contentArea
      ) : (
        <View style={styles.lockedWrapper}>
          <LockedContentArea
            context="micronutrients"
            message="Upgrade to unlock"
            minHeight={150}
          >
            {contentArea}
          </LockedContentArea>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
  },
  viewAll: {
    ...typography.body.small,
    fontWeight: '600',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  headerText: {
    gap: 2,
  },
  title: {
    ...typography.title.small,
  },
  subtitle: {
    ...typography.caption,
  },
  lockedWrapper: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  quickStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    ...typography.caption,
    fontWeight: '500',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  categoryName: {
    ...typography.body.small,
    fontWeight: '500',
    flex: 1,
  },
  miniBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  categoryPercent: {
    ...typography.caption,
  },
});
