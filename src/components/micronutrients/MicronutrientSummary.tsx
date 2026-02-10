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
      deficient: 0,
      low: 0,
      optimal: 0,
      excessive: 0,
    };

    for (const nutrient of nutrients) {
      if (nutrient.status === 'deficient') stats.deficient++;
      else if (nutrient.status === 'low') stats.low++;
      else if (nutrient.status === 'optimal') stats.optimal++;
      else if (nutrient.status === 'excessive' || nutrient.status === 'high') stats.excessive++;
    }

    return stats;
  }, [nutrients]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'deficient': return colors.error;
      case 'low': return colors.warning;
      case 'optimal': return colors.success;
      case 'excessive': return colors.error;
      default: return colors.textTertiary;
    }
  };

  const getCategoryIcon = (category: NutrientCategory): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'vitamins': return 'sunny-outline';
      case 'minerals': return 'diamond-outline';
      case 'amino_acids': return 'fitness-outline';
      case 'fatty_acids': return 'water-outline';
      case 'other': return 'ellipsis-horizontal-outline';
    }
  };

  // Content to show (either directly or blurred)
  const contentArea = (
    <>
      {/* Quick stats */}
      <View style={styles.quickStats}>
        {overallStats.deficient > 0 && (
          <View style={[styles.statBadge, { backgroundColor: colors.errorBg }]}>
            <View style={[styles.statDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.statText, { color: colors.error }]}>
              {overallStats.deficient} low
            </Text>
          </View>
        )}
        {overallStats.optimal > 0 && (
          <View style={[styles.statBadge, { backgroundColor: colors.successBg }]}>
            <View style={[styles.statDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statText, { color: colors.success }]}>
              {overallStats.optimal} optimal
            </Text>
          </View>
        )}
        {overallStats.excessive > 0 && (
          <View style={[styles.statBadge, { backgroundColor: colors.warningBg }]}>
            <View style={[styles.statDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.statText, { color: colors.warning }]}>
              {overallStats.excessive} high
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
                    backgroundColor:
                      summary.averagePercent >= 75
                        ? colors.success
                        : summary.averagePercent >= 50
                        ? colors.warning
                        : colors.error,
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
