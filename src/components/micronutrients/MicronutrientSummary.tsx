/**
 * MicronutrientSummary Component
 * Overview card showing micronutrient status with category breakdown
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { NutrientIntake, NutrientCategory } from '@/types/micronutrients';
import { NUTRIENTS_BY_CATEGORY, CATEGORY_DISPLAY_NAMES } from '@/data/nutrients';

interface MicronutrientSummaryProps {
  nutrients: NutrientIntake[];
  onPress?: () => void;
  onCategoryPress?: (category: NutrientCategory) => void;
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
  onPress,
  onCategoryPress,
  isPremium = false,
}: MicronutrientSummaryProps) {
  const { colors } = useTheme();

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
      case 'deficient': return '#E53935';
      case 'low': return '#FB8C00';
      case 'optimal': return '#43A047';
      case 'excessive': return '#E53935';
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

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      {/* Header with overall status */}
      <Pressable style={styles.header} onPress={onPress}>
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
        {onPress && (
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        )}
      </Pressable>

      {/* Quick stats */}
      <View style={styles.quickStats}>
        {overallStats.deficient > 0 && (
          <View style={[styles.statBadge, { backgroundColor: '#E5393520' }]}>
            <View style={[styles.statDot, { backgroundColor: '#E53935' }]} />
            <Text style={[styles.statText, { color: '#E53935' }]}>
              {overallStats.deficient} low
            </Text>
          </View>
        )}
        {overallStats.optimal > 0 && (
          <View style={[styles.statBadge, { backgroundColor: '#43A04720' }]}>
            <View style={[styles.statDot, { backgroundColor: '#43A047' }]} />
            <Text style={[styles.statText, { color: '#43A047' }]}>
              {overallStats.optimal} optimal
            </Text>
          </View>
        )}
        {overallStats.excessive > 0 && (
          <View style={[styles.statBadge, { backgroundColor: '#FB8C0020' }]}>
            <View style={[styles.statDot, { backgroundColor: '#FB8C00' }]} />
            <Text style={[styles.statText, { color: '#FB8C00' }]}>
              {overallStats.excessive} high
            </Text>
          </View>
        )}
      </View>

      {/* Category breakdown */}
      <View style={styles.categories}>
        {categorySummaries.map(summary => (
          <Pressable
            key={summary.category}
            style={[styles.categoryCard, { backgroundColor: colors.bgPrimary }]}
            onPress={() => onCategoryPress?.(summary.category)}
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
            <View style={[styles.miniBar, { backgroundColor: colors.bgTertiary }]}>
              <View
                style={[
                  styles.miniBarFill,
                  {
                    width: `${Math.min(summary.averagePercent, 100)}%`,
                    backgroundColor:
                      summary.averagePercent >= 75
                        ? '#43A047'
                        : summary.averagePercent >= 50
                        ? '#FB8C00'
                        : '#E53935',
                  },
                ]}
              />
            </View>

            <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
              {Math.round(summary.averagePercent)}% avg
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Premium upsell for amino acids */}
      {!isPremium && (
        <View style={[styles.premiumBanner, { backgroundColor: colors.bgInteractive }]}>
          <Ionicons name="lock-closed" size={14} color={colors.accent} />
          <Text style={[styles.premiumText, { color: colors.textSecondary }]}>
            Unlock 40+ amino acids & detailed tracking
          </Text>
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
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[3],
  },
  premiumText: {
    ...typography.caption,
  },
});
