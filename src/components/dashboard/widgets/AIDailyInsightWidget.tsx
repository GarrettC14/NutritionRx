/**
 * AI Daily Insight Widget (Redesigned)
 * Template-generated headline — never depends on LLM.
 * Taps open /daily-insights screen for full question-based experience.
 * Premium feature - shows locked state for free users.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSubscriptionStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';
import { LockedContentArea } from '@/components/premium';
import { useDailyInsightData } from '@/features/insights/hooks/useDailyInsightData';
import { useDailyInsightStore } from '@/features/insights/stores/dailyInsightStore';

export function AIDailyInsightWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPremium } = useSubscriptionStore();
  const { headline, isLoaded, data } = useDailyInsightData();

  const handleRefresh = useCallback(async () => {
    await useDailyInsightStore.getState().refreshData();
  }, []);

  const handlePress = () => {
    if (!isEditMode && isPremium) {
      router.push('/daily-insights');
    }
  };

  const styles = createStyles(colors);

  const renderContent = () => {
    // Loading state
    if (!isLoaded) {
      return (
        <View style={styles.loadingContainer}>
          <View style={[styles.skeletonLine, { backgroundColor: colors.bgInteractive }]} />
          <View
            style={[
              styles.skeletonLine,
              styles.skeletonShort,
              { backgroundColor: colors.bgInteractive },
            ]}
          />
        </View>
      );
    }

    // Empty state — no meals logged
    if (!data || data.todayMealCount === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="leaf-outline" size={22} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Log your first meal to unlock today's insights.
          </Text>
        </View>
      );
    }

    // Headline display
    return (
      <View style={styles.headlineContainer}>
        <View style={styles.headlineRow}>
          <Ionicons name={headline.icon as any} size={22} color={colors.accent} />
          <Text style={[styles.headlineText, { color: colors.textPrimary }]}>
            {headline.text}
          </Text>
        </View>
        <Text style={[styles.cta, { color: colors.accent }]}>
          Explore Today's Insights →
        </Text>
      </View>
    );
  };

  const contentArea = (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={isEditMode ? 1 : 0.8}
      disabled={isEditMode}
      style={styles.contentTouchable}
    >
      {renderContent()}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[styles.header, !isPremium && styles.headerLocked]}
        pointerEvents={isPremium ? 'auto' : 'none'}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}20` }]}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
          </View>
          <Text style={styles.title}>Daily Insight</Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isEditMode}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content - locked for non-premium */}
      {isPremium ? (
        contentArea
      ) : (
        <View style={styles.lockedWrapper}>
          <LockedContentArea
            context="ai_daily_insight"
            message="Upgrade to unlock"
            minHeight={80}
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
      marginBottom: 12,
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
      minHeight: 60,
    },
    // Loading skeleton
    loadingContainer: {
      gap: 8,
      paddingVertical: 4,
    },
    skeletonLine: {
      height: 14,
      borderRadius: 4,
      width: '100%',
    },
    skeletonShort: {
      width: '60%',
    },
    // Empty state
    emptyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    emptyIcon: {
      width: 22,
    },
    emptyText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
    },
    // Headline display
    headlineContainer: {
      gap: 10,
    },
    headlineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    headlineIcon: {
      marginTop: 2,
    },
    headlineText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
    },
    cta: {
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
    },
  });
