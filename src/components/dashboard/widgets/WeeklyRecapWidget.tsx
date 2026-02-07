/**
 * Weekly Insights Widget (formerly Weekly Recap)
 * Thin gateway widget: mini calendar + CTA
 * Fetches full week data from repository for accurate dot colors.
 * Tapping CTA navigates to /weekly-insights for full question-driven experience
 * Premium-only with locked state for free users
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useFoodLogStore, useGoalStore, useSubscriptionStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';
import { LockedContentArea } from '@/components/premium';
import { MiniCalendar } from '@/features/weekly-insights/components/MiniCalendar';
import type { DayData } from '@/features/weekly-insights/types/weeklyInsights.types';
import { getWeekStart, addDays, getDayOfWeek, getDayName } from '@/features/weekly-insights/utils/weekUtils';
import { WeeklyDataCollector } from '@/features/weekly-insights/services/WeeklyDataCollector';

export function WeeklyRecapWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPremium } = useSubscriptionStore();
  const { streak } = useFoodLogStore();
  const { calorieGoal } = useGoalStore();

  const [days, setDays] = useState<DayData[]>([]);
  const [daysLogged, setDaysLogged] = useState(0);
  const [calorieTarget, setCalorieTarget] = useState(calorieGoal || 2000);

  // Fetch full week data from repository
  useEffect(() => {
    let cancelled = false;
    const weekStart = getWeekStart();

    WeeklyDataCollector.collect(weekStart)
      .then((collected) => {
        if (cancelled) return;
        setDays(collected.days);
        setDaysLogged(collected.loggedDayCount);
        setCalorieTarget(collected.calorieTarget);
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: show empty week
        const fallbackDays: DayData[] = [];
        for (let i = 0; i < 7; i++) {
          const date = addDays(weekStart, i);
          const dow = getDayOfWeek(date);
          fallbackDays.push({
            date,
            dayOfWeek: dow,
            dayName: getDayName(dow),
            isLogged: false,
            isComplete: false,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            water: 0,
            mealCount: 0,
            foods: [],
          });
        }
        setDays(fallbackDays);
      });

    return () => {
      cancelled = true;
    };
  }, [calorieGoal]);

  const handleExplore = () => {
    if (!isEditMode && isPremium) {
      router.push('/weekly-insights');
    }
  };

  const styles = createStyles(colors);

  const renderContent = () => {
    if (daysLogged === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data logged this week yet</Text>
          <Text style={styles.emptySubtext}>Start tracking to see your weekly insights</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        {/* Mini calendar */}
        <View style={styles.calendarSection}>
          <MiniCalendar days={days} calorieTarget={calorieTarget} />
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleExplore}
          activeOpacity={0.7}
          style={[styles.ctaButton, { backgroundColor: `${colors.accent}12` }]}
          disabled={isEditMode}
          accessibilityRole="button"
          accessibilityLabel="Explore your weekly insights"
        >
          <Text style={[styles.ctaText, { color: colors.accent }]}>
            Explore your week
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
      </View>
    );
  };

  const contentArea = (
    <View style={styles.contentTouchable}>
      {renderContent()}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[styles.header, !isPremium && styles.headerLocked]}
        pointerEvents={isPremium ? 'auto' : 'none'}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.premiumGoldMuted }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.premiumGold} />
          </View>
          <View>
            <Text style={styles.title}>Weekly Insights</Text>
            <Text style={styles.subtitle}>This week's summary</Text>
          </View>
        </View>
        {(streak ?? 0) >= 3 && (
          <View style={[styles.streakBadge, { backgroundColor: '#4CAF5020' }]}>
            <Ionicons name="flame" size={14} color="#4CAF50" />
            <Text style={[styles.streakText, { color: '#4CAF50' }]}>
              {streak}
            </Text>
          </View>
        )}
      </View>

      {/* Content - locked for non-premium */}
      {isPremium ? (
        contentArea
      ) : (
        <View style={styles.lockedWrapper}>
          <LockedContentArea
            context="weekly_recap"
            message="Upgrade to unlock"
            minHeight={180}
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
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    streakText: {
      fontSize: 12,
      fontWeight: '600',
    },
    lockedWrapper: {
      marginHorizontal: -16,
      marginBottom: -16,
    },
    contentTouchable: {
      minHeight: 160,
    },
    contentContainer: {},
    calendarSection: {
      marginBottom: 16,
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    ctaText: {
      fontSize: 14,
      fontWeight: '600',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 30,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
