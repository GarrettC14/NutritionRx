/**
 * Weekly Recap Widget
 * Shows weekly summary with stats, trends, and AI-generated insights
 * Large widget - Premium feature with locked state for free users
 * Uses on-device LLM for personalized weekly analysis with fallback to templates
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useFoodLogStore, useGoalStore, useSubscriptionStore, useWaterStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';
import { LockedContentArea } from '@/components/premium';
import { LLMService } from '@/features/insights/services/LLMService';
import { useInsightsStore } from '@/features/insights/stores/insightsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WeeklyStats {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  daysLogged: number;
  totalMeals: number;
  calorieStreak: number;
  proteinStreak: number;
  bestDay: string | null;
  trend: 'up' | 'down' | 'stable';
}

interface DayData {
  date: string;
  dayName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
  onTarget: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKLY_INSIGHT_CACHE_KEY = 'llm_weekly_recap_cache';
const WEEKLY_CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedWeeklyInsight {
  text: string;
  generatedAt: number;
  weekStart: string;
  source: 'llm' | 'fallback';
}

// Build prompt for weekly recap via on-device LLM
function buildWeeklyRecapPrompt(
  dailyData: DayData[],
  stats: WeeklyStats,
  calorieTarget: number,
  proteinTarget: number
): string {
  const daysWithData = dailyData.filter(d => d.mealCount > 0);
  const dailySummaries = daysWithData
    .map(d => `${d.dayName}: ${d.calories} cal, ${d.protein}g protein, ${d.mealCount} meals`)
    .join('\n');

  const weekStart = dailyData[0]?.date || '';
  const weekEnd = dailyData[dailyData.length - 1]?.date || '';

  return `You are a supportive nutrition coach using the "Nourished Calm" voice: warm, encouraging, never judgmental. Here's a user's week:

Week of ${weekStart} to ${weekEnd}

Daily Summaries:
${dailySummaries || 'No meals logged this week'}

Averages:
- Calories: ${stats.avgCalories} / ${calorieTarget}
- Protein: ${stats.avgProtein}g / ${proteinTarget}g
- Consistency: ${stats.daysLogged}/7 days logged
- Total meals: ${stats.totalMeals}
${stats.calorieStreak >= 3 ? `- Calorie streak: ${stats.calorieStreak} days on target` : ''}
${stats.proteinStreak >= 3 ? `- Protein streak: ${stats.proteinStreak} days on target` : ''}
- Trend: Calories ${stats.trend === 'up' ? 'trending up' : stats.trend === 'down' ? 'trending down' : 'stable'}

Provide a brief weekly recap in 2-3 sentences: start with a highlight (something positive), mention a pattern or trend, and end with a gentle suggestion for next week. Be warm and encouraging. Never use "failed", "cheated", "warning", or "deficiency".

Output only the recap text, no labels or formatting.`;
}

// Fallback insight generation based on weekly stats (template-based)
function generateFallbackWeeklyInsight(
  stats: WeeklyStats,
  calorieTarget: number,
  proteinTarget: number
): string {
  const { avgCalories, avgProtein, daysLogged, calorieStreak, proteinStreak, bestDay, trend } = stats;

  if (daysLogged === 0) {
    return 'Start logging to see your weekly insights.';
  }

  const caloriePercent = calorieTarget > 0 ? Math.round((avgCalories / calorieTarget) * 100) : 0;
  const proteinPercent = proteinTarget > 0 ? Math.round((avgProtein / proteinTarget) * 100) : 0;

  // Priority insights
  if (calorieStreak >= 5) {
    return `Amazing consistency! You've hit your calorie target ${calorieStreak} days in a row.`;
  }

  if (proteinStreak >= 5) {
    return `Great protein week! You've met your protein goal ${proteinStreak} consecutive days.`;
  }

  if (daysLogged >= 6 && caloriePercent >= 85 && caloriePercent <= 115) {
    return `Excellent week! You averaged ${avgCalories} calories, right on target.`;
  }

  if (proteinPercent < 70) {
    return `Protein averaged ${proteinPercent}% of your goal this week. Consider adding more lean protein sources.`;
  }

  if (caloriePercent > 115) {
    return `You averaged ${caloriePercent}% of your calorie goal. Consider smaller portions this coming week.`;
  }

  if (trend === 'up') {
    return `Calories are trending up toward the end of the week. Plan ahead for a balanced weekend.`;
  }

  if (bestDay) {
    return `${bestDay} was your best day this week - balanced calories and strong protein.`;
  }

  if (daysLogged < 4) {
    return `You logged ${daysLogged} days this week. Consistency helps build better habits.`;
  }

  return `You averaged ${avgCalories} calories and ${avgProtein}g protein across ${daysLogged} days.`;
}

export function WeeklyRecapWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPremium } = useSubscriptionStore();
  const { entries, streak } = useFoodLogStore();
  const { calorieGoal, proteinGoal } = useGoalStore();

  // LLM state from insights store
  const { llmStatus, setLLMStatus } = useInsightsStore();

  // LLM insight state
  const [llmInsight, setLlmInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);

  // Check LLM status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const status = await LLMService.getStatus();
      setLLMStatus(status);
    };
    checkStatus();
  }, [setLLMStatus]);

  // Calculate weekly data
  const { weeklyStats, dailyData } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Group entries by day
    const dayMap: Record<string, DayData> = {};

    // Initialize all days of the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dayMap[dateKey] = {
        date: dateKey,
        dayName: DAY_NAMES[date.getDay()],
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mealCount: 0,
        onTarget: false,
      };
    }

    // Populate with actual data
    entries.forEach((entry) => {
      if (dayMap[entry.date]) {
        dayMap[entry.date].calories += entry.calories || 0;
        dayMap[entry.date].protein += entry.protein || 0;
        dayMap[entry.date].carbs += entry.carbs || 0;
        dayMap[entry.date].fat += entry.fat || 0;
        dayMap[entry.date].mealCount += 1;
      }
    });

    // Convert to array and check targets
    const target = calorieGoal || 2000;
    const proteinTarget = proteinGoal || 150;
    const days = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    days.forEach((day) => {
      const caloriePercent = target > 0 ? day.calories / target : 0;
      day.onTarget = caloriePercent >= 0.85 && caloriePercent <= 1.15;
    });

    // Calculate stats
    const daysWithData = days.filter((d) => d.mealCount > 0);
    const daysLogged = daysWithData.length;

    const totals = daysWithData.reduce(
      (acc, day) => ({
        calories: acc.calories + day.calories,
        protein: acc.protein + day.protein,
        carbs: acc.carbs + day.carbs,
        fat: acc.fat + day.fat,
        meals: acc.meals + day.mealCount,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
    );

    const avgCalories = daysLogged > 0 ? Math.round(totals.calories / daysLogged) : 0;
    const avgProtein = daysLogged > 0 ? Math.round(totals.protein / daysLogged) : 0;
    const avgCarbs = daysLogged > 0 ? Math.round(totals.carbs / daysLogged) : 0;
    const avgFat = daysLogged > 0 ? Math.round(totals.fat / daysLogged) : 0;

    // Calculate streaks
    let calorieStreak = 0;
    let proteinStreak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      const day = days[i];
      if (day.mealCount === 0) break;
      const calPercent = target > 0 ? day.calories / target : 0;
      const protPercent = proteinTarget > 0 ? day.protein / proteinTarget : 0;
      if (calPercent >= 0.85 && calPercent <= 1.15) calorieStreak++;
      if (protPercent >= 0.8) proteinStreak++;
    }

    // Find best day
    const bestDay = daysWithData.length > 0
      ? daysWithData.reduce((best, day) =>
          day.onTarget && day.protein > (best?.protein || 0) ? day : best,
          null as DayData | null
        )?.dayName || null
      : null;

    // Calculate trend
    const firstHalf = daysWithData.slice(0, Math.ceil(daysWithData.length / 2));
    const secondHalf = daysWithData.slice(Math.ceil(daysWithData.length / 2));
    const firstAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, d) => sum + d.calories, 0) / firstHalf.length
      : 0;
    const secondAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, d) => sum + d.calories, 0) / secondHalf.length
      : 0;
    const trend: 'up' | 'down' | 'stable' =
      secondAvg > firstAvg * 1.1 ? 'up' : secondAvg < firstAvg * 0.9 ? 'down' : 'stable';

    const stats: WeeklyStats = {
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      daysLogged,
      totalMeals: totals.meals,
      calorieStreak,
      proteinStreak,
      bestDay,
      trend,
    };

    return {
      weeklyStats: stats,
      dailyData: days,
    };
  }, [entries, calorieGoal, proteinGoal]);

  // Generate or load weekly insight
  useEffect(() => {
    loadWeeklyInsight();
  }, [weeklyStats, llmStatus]);

  const loadWeeklyInsight = async () => {
    // Try loading cached insight first
    try {
      const cached = await AsyncStorage.getItem(WEEKLY_INSIGHT_CACHE_KEY);
      if (cached) {
        const parsed: CachedWeeklyInsight = JSON.parse(cached);
        const weekStart = dailyData[0]?.date || '';
        const now = Date.now();

        // Use cached if same week and not expired
        if (
          parsed.weekStart === weekStart &&
          now - parsed.generatedAt < WEEKLY_CACHE_DURATION_MS
        ) {
          setLlmInsight(parsed.text);
          return;
        }
      }
    } catch {
      // Ignore cache errors
    }

    // Generate new insight
    await generateWeeklyInsight();
  };

  const generateWeeklyInsight = useCallback(async () => {
    if (weeklyStats.daysLogged === 0) {
      setLlmInsight(null);
      return;
    }

    const target = calorieGoal || 2000;
    const proteinTarget = proteinGoal || 150;

    // Check LLM status
    const status = await LLMService.getStatus();
    setLLMStatus(status);

    if (status === 'ready') {
      setIsGeneratingInsight(true);
      try {
        const prompt = buildWeeklyRecapPrompt(dailyData, weeklyStats, target, proteinTarget);
        const result = await LLMService.generate(prompt, 200);

        if (result.success && result.text) {
          const cleanText = result.text.trim();
          if (cleanText.length > 15) {
            setLlmInsight(cleanText);
            // Cache the LLM result
            const weekStart = dailyData[0]?.date || '';
            await AsyncStorage.setItem(
              WEEKLY_INSIGHT_CACHE_KEY,
              JSON.stringify({
                text: cleanText,
                generatedAt: Date.now(),
                weekStart,
                source: 'llm',
              } as CachedWeeklyInsight)
            );
            setIsGeneratingInsight(false);
            return;
          }
        }
        console.log('[WeeklyRecapWidget] LLM returned insufficient text, using fallback');
      } catch (error) {
        console.log('[WeeklyRecapWidget] LLM generation failed, using fallback');
      }
      setIsGeneratingInsight(false);
    }

    // If LLM not downloaded, don't generate fallback (show Enable AI prompt)
    if (status === 'not_downloaded') {
      return;
    }

    // Fall back to template-based insight
    const fallbackText = generateFallbackWeeklyInsight(weeklyStats, target, proteinTarget);
    setLlmInsight(fallbackText);

    // Cache fallback too
    const weekStart = dailyData[0]?.date || '';
    await AsyncStorage.setItem(
      WEEKLY_INSIGHT_CACHE_KEY,
      JSON.stringify({
        text: fallbackText,
        generatedAt: Date.now(),
        weekStart,
        source: 'fallback',
      } as CachedWeeklyInsight)
    );
  }, [weeklyStats, dailyData, calorieGoal, proteinGoal, setLLMStatus]);

  const handleDownloadModel = async () => {
    setIsDownloading(true);
    setDownloadPercent(0);

    try {
      const result = await LLMService.downloadModel((progress) => {
        setDownloadPercent(progress.percentage);
      });

      if (result.success) {
        setLLMStatus('ready');
        // Regenerate insight with LLM
        await generateWeeklyInsight();
      }
    } catch (error) {
      console.error('[WeeklyRecapWidget] Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePress = () => {
    if (!isEditMode && isPremium) {
      router.push('/(tabs)/progress');
    }
  };

  const styles = createStyles(colors);

  // Get color based on how close to target
  const getDayColor = (day: DayData, target: number): string => {
    if (day.mealCount === 0) return colors.borderDefault;
    if (day.onTarget) return '#4CAF50'; // Sage green
    const percent = day.calories / target;
    if (percent < 0.7) return colors.borderDefault; // Under
    if (percent > 1.3) return '#E07A5F'; // Over - Terracotta
    return '#D4A574'; // Warning - approaching over
  };

  const renderMiniCalendar = () => {
    const target = calorieGoal || 2000;
    return (
      <View style={styles.calendarRow}>
        {dailyData.map((day) => (
          <View key={day.date} style={styles.calendarDay}>
            <Text style={styles.dayLabel}>{day.dayName}</Text>
            <View
              style={[
                styles.dayDot,
                { backgroundColor: getDayColor(day, target) },
              ]}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderInsightArea = () => {
    // Show download progress
    if (isDownloading) {
      return (
        <View style={styles.downloadContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.downloadText, { color: colors.textSecondary }]}>
            Downloading AI model... {downloadPercent}%
          </Text>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${downloadPercent}%`, backgroundColor: colors.accent },
              ]}
            />
          </View>
        </View>
      );
    }

    // Show "Enable AI" prompt when model not downloaded
    if (llmStatus === 'not_downloaded' && !llmInsight) {
      return (
        <TouchableOpacity
          style={[styles.enableContainer, { borderColor: colors.borderDefault }]}
          onPress={handleDownloadModel}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={16} color={colors.accent} />
          <Text style={[styles.enableText, { color: colors.accent }]}>
            Enable AI for personalized recap
          </Text>
          <Ionicons name="download-outline" size={16} color={colors.accent} />
        </TouchableOpacity>
      );
    }

    // Show generating state
    if (isGeneratingInsight) {
      return (
        <View style={styles.insightContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.insightText}>Analyzing your week...</Text>
        </View>
      );
    }

    // Show insight
    if (llmInsight) {
      return (
        <View style={styles.insightContainer}>
          <Text style={styles.insightIcon}>💡</Text>
          <Text style={styles.insightText}>{llmInsight}</Text>
        </View>
      );
    }

    return null;
  };

  const renderContent = () => {
    if (weeklyStats.daysLogged === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data logged this week yet</Text>
          <Text style={styles.emptySubtext}>Start tracking to see your weekly recap</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        {/* Mini calendar */}
        {renderMiniCalendar()}

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weeklyStats.avgCalories.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Avg Cal</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weeklyStats.avgProtein}g</Text>
            <Text style={styles.statLabel}>Avg Protein</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weeklyStats.daysLogged}/7</Text>
            <Text style={styles.statLabel}>Days Logged</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weeklyStats.totalMeals}</Text>
            <Text style={styles.statLabel}>Total Meals</Text>
          </View>
        </View>

        {/* Trend indicator */}
        <View style={styles.trendRow}>
          <Ionicons
            name={
              weeklyStats.trend === 'up'
                ? 'trending-up'
                : weeklyStats.trend === 'down'
                ? 'trending-down'
                : 'remove'
            }
            size={16}
            color={
              weeklyStats.trend === 'up'
                ? '#E07A5F'
                : weeklyStats.trend === 'down'
                ? '#4CAF50'
                : colors.textSecondary
            }
          />
          <Text style={styles.trendText}>
            {weeklyStats.trend === 'up'
              ? 'Calories trending up'
              : weeklyStats.trend === 'down'
              ? 'Calories trending down'
              : 'Calories stable'}
          </Text>
        </View>

        {/* AI Insight / Enable prompt / Download progress */}
        {renderInsightArea()}
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
      {/* Header - dimmed when locked */}
      <View
        style={[styles.header, !isPremium && styles.headerLocked]}
        pointerEvents={isPremium ? 'auto' : 'none'}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}20` }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.title}>Weekly Recap</Text>
            <Text style={styles.subtitle}>This week's summary</Text>
          </View>
        </View>
        {weeklyStats.calorieStreak >= 3 && (
          <View style={[styles.streakBadge, { backgroundColor: '#4CAF5020' }]}>
            <Ionicons name="flame" size={14} color="#4CAF50" />
            <Text style={[styles.streakText, { color: '#4CAF50' }]}>
              {weeklyStats.calorieStreak}
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
    // Mini calendar
    calendarRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    calendarDay: {
      alignItems: 'center',
      gap: 6,
    },
    dayLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      fontWeight: '500',
    },
    dayDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    // Stats grid
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 2,
    },
    // Trend row
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    trendText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    // Insight
    insightContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderDefault,
    },
    insightIcon: {
      fontSize: 14,
    },
    insightText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    // Enable AI prompt
    enableContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: 'dashed',
      marginTop: 12,
    },
    enableText: {
      fontSize: 13,
      fontWeight: '500',
    },
    // Download progress
    downloadContainer: {
      alignItems: 'center',
      gap: 6,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderDefault,
    },
    downloadText: {
      fontSize: 12,
    },
    progressBarTrack: {
      width: '100%',
      height: 3,
      backgroundColor: colors.borderDefault,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    // Empty state
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
