/**
 * Micronutrient Snapshot Widget
 * Shows top 3 nutrient gaps with actionable food suggestions
 * Premium feature - shows locked state for free users
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { useMicronutrientStore, useSubscriptionStore } from '@/stores';
import { useStatusColors } from '@/hooks/useStatusColor';
import { contrastTextColor } from '@/utils/colorUtils';
import { WidgetProps } from '@/types/dashboard';
import { LockedContentArea } from '@/components/premium';
import { NUTRIENT_BY_ID } from '@/data/nutrients';
import { NutrientIntake } from '@/types/micronutrients';

interface NutrientGap {
  id: string;
  name: string;
  percent: number;
  foodSuggestions: string[];
}

// Priority nutrients to focus on for gaps
const PRIORITY_NUTRIENTS = [
  'vitamin_d',
  'iron',
  'magnesium',
  'calcium',
  'omega_3_ala',
  'vitamin_b12',
  'zinc',
  'fiber',
  'vitamin_a',
  'vitamin_c',
  'potassium',
  'folate',
];

export function MicronutrientSnapshotWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPremium } = useSubscriptionStore();
  const {
    dailyIntake,
    loadDailyIntake,
    loadProfile,
    isLoaded,
  } = useMicronutrientStore();

  // Load data on mount
  useEffect(() => {
    if (!isLoaded) {
      loadProfile();
    }
    const today = new Date().toISOString().split('T')[0];
    loadDailyIntake(today);
  }, [isLoaded, loadProfile, loadDailyIntake]);

  // Calculate top gaps and strengths
  const { topGaps, topStrengths, overallStatus, suggestion } = useMemo(() => {
    if (!dailyIntake || dailyIntake.nutrients.length === 0) {
      return {
        topGaps: [],
        topStrengths: [],
        overallStatus: 'no_data' as const,
        suggestion: null,
      };
    }

    // Filter to priority nutrients and sort by percent
    const priorityIntakes = dailyIntake.nutrients
      .filter(n => PRIORITY_NUTRIENTS.includes(n.nutrientId))
      .map(intake => {
        const definition = NUTRIENT_BY_ID[intake.nutrientId];
        return {
          id: intake.nutrientId,
          name: definition?.name || intake.nutrientId,
          percent: Math.round(intake.percentOfTarget),
          foodSuggestions: definition?.foodSources || [],
        };
      });

    // Sort ascending for gaps (lowest first)
    const sortedByPercent = [...priorityIntakes].sort((a, b) => a.percent - b.percent);

    // Get top 3 gaps (under 80%)
    const gaps = sortedByPercent
      .filter(n => n.percent < 80)
      .slice(0, 3);

    // Get top 3 strengths (over 80%)
    const strengths = [...priorityIntakes]
      .sort((a, b) => b.percent - a.percent)
      .filter(n => n.percent >= 80)
      .slice(0, 3);

    // Determine overall status
    const status = gaps.length === 0 ? 'on_track' : 'gaps_found';

    // Generate suggestion for top gap
    const topGap = gaps[0];
    let suggestionText = null;
    if (topGap && topGap.foodSuggestions.length > 0) {
      const foods = topGap.foodSuggestions.slice(0, 2).join(' or ');
      const nutrientName = topGap.name.replace(/\(.*\)/, '').trim();
      suggestionText = `Add ${foods.toLowerCase()} for ${nutrientName}`;
    }

    return {
      topGaps: gaps,
      topStrengths: strengths,
      overallStatus: status,
      suggestion: suggestionText,
    };
  }, [dailyIntake]);

  const handlePress = () => {
    if (!isEditMode && isPremium) {
      router.push('/(tabs)/progress');
    }
  };

  const handleLogFood = () => {
    if (!isEditMode && isPremium) {
      router.push('/add-food');
    }
  };

  const { palette: statusPalette } = useStatusColors();
  const styles = createStyles(colors);

  // Get color based on percentage — uses status color tokens
  const getProgressColor = (percent: number): string => {
    if (percent < 50) return statusPalette.belowTarget;
    if (percent < 80) return statusPalette.approachingTarget;
    return statusPalette.onTarget;
  };

  // Render a single nutrient row
  const renderNutrientRow = (gap: NutrientGap) => {
    const progressColor = getProgressColor(gap.percent);
    const displayPercent = Math.min(gap.percent, 100);

    return (
      <View key={gap.id} style={styles.nutrientRow}>
        <Text style={styles.nutrientName} numberOfLines={1}>
          {gap.name.replace(/\(.*\)/, '').trim()}
        </Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                { width: `${displayPercent}%`, backgroundColor: progressColor },
              ]}
            />
          </View>
        </View>
        <Text style={[styles.percentText, { color: progressColor }]}>
          {gap.percent}%
        </Text>
      </View>
    );
  };

  // Content based on status
  const renderContent = () => {
    // No data state
    if (overallStatus === 'no_data' || !dailyIntake || dailyIntake.totalFoodsLogged === 0) {
      return (
        <View style={styles.noDataContent}>
          <Text style={styles.noDataText}>
            Log meals to see your nutrient balance
          </Text>
          <TouchableOpacity
            style={[styles.logButton, { backgroundColor: colors.accent }]}
            onPress={handleLogFood}
            disabled={isEditMode}
            accessibilityRole="button"
            accessibilityLabel="Log food to track nutrients"
          >
            <Text style={styles.logButtonText}>Log Food</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // On track state
    if (overallStatus === 'on_track') {
      return (
        <View style={styles.onTrackContent}>
          <View style={styles.onTrackHeader}>
            <Ionicons name="checkmark-circle" size={18} color={statusPalette.onTarget} />
            <Text style={styles.onTrackText}>
              You're hitting your targets today!
            </Text>
          </View>
          {topStrengths.map(renderNutrientRow)}
          <Text style={styles.encouragement}>Keep it up!</Text>
        </View>
      );
    }

    // Gaps found state
    return (
      <View style={styles.gapsContent} accessibilityLiveRegion="polite">
        {topGaps.map(renderNutrientRow)}

        {suggestion && (
          <View style={styles.suggestionContainer}>
            <Ionicons name="bulb-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        )}
      </View>
    );
  };

  const contentArea = (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode}
      style={styles.contentTouchable}
      accessibilityRole="button"
      accessibilityLabel="View micronutrient details"
    >
      {renderContent()}
    </TouchableOpacity>
  );

  // Header title based on status
  const headerTitle = overallStatus === 'on_track' ? 'Nutrient Balance' : "Today's Nutrient Gaps";

  return (
    <View style={styles.container}>
      {/* Header - dimmed when locked */}
      <View
        style={[styles.header, !isPremium && styles.headerLocked]}
        pointerEvents={isPremium ? 'auto' : 'none'}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.premiumGoldMuted }]}>
            <Ionicons name="nutrition-outline" size={20} color={colors.premiumGold} />
          </View>
          <Text style={styles.title}>{headerTitle}</Text>
        </View>
        {overallStatus === 'on_track' && (
          <Ionicons name="checkmark-circle" size={20} color={statusPalette.onTarget} />
        )}
      </View>

      {/* Content - locked for non-premium */}
      {isPremium ? (
        contentArea
      ) : (
        <View style={styles.lockedWrapper}>
          <LockedContentArea
            context="micronutrient_snapshot"
            message="Upgrade to unlock"
            minHeight={100}
          >
            {contentArea}
          </LockedContentArea>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.bgElevated,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    headerLocked: {
      opacity: 0.5,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    lockedWrapper: {
      marginHorizontal: -16,
      marginBottom: -16,
    },
    contentTouchable: {
      minHeight: 80,
    },
    // Nutrient rows
    nutrientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    nutrientName: {
      width: 90,
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    progressContainer: {
      flex: 1,
      marginHorizontal: 10,
    },
    progressBackground: {
      height: 6,
      backgroundColor: colors.borderDefault,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    percentText: {
      width: 40,
      textAlign: 'right',
      fontSize: 13,
      fontWeight: '600',
    },
    // Gaps content
    gapsContent: {},
    // Suggestion
    suggestionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderDefault,
      marginTop: 6,
    },
    suggestionText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
    },
    // On track content
    onTrackContent: {},
    onTrackHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    onTrackText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    encouragement: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: 8,
    },
    // No data content
    noDataContent: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    noDataText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
      textAlign: 'center',
    },
    logButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    logButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
