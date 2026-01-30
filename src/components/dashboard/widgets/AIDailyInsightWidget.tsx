/**
 * AI Daily Insight Widget
 * Shows one brief personalized insight from cloud LLM
 * Premium feature - shows locked state for free users
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSubscriptionStore, useFoodLogStore, useGoalStore, useWaterStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';
import { LockedContentArea } from '@/components/premium';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InsightData {
  text: string;
  icon: string;
  generatedAt: number;
  date: string;
}

const INSIGHT_CACHE_KEY = 'ai_daily_insight_cache';
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

// Fallback insight templates based on data patterns
const INSIGHT_TEMPLATES = {
  protein_low: {
    text: "You're at {percent}% of your protein goal. Adding Greek yogurt or eggs could help you hit your target.",
    icon: '💪',
  },
  protein_high: {
    text: "Great protein intake today! You've hit {percent}% of your goal.",
    icon: '🎯',
  },
  calories_under: {
    text: "You have {remaining} calories left today. A balanced snack could help you reach your goal.",
    icon: '🍎',
  },
  calories_over: {
    text: "You're {over} calories over your target. Consider a lighter dinner option.",
    icon: '📊',
  },
  water_low: {
    text: "Stay hydrated! You're at {percent}% of your water goal for today.",
    icon: '💧',
  },
  streak_celebrate: {
    text: "Amazing! You've logged for {days} days straight. Consistency is key!",
    icon: '🔥',
  },
  no_meals: {
    text: "No meals logged yet today. Start tracking to get personalized insights!",
    icon: '📝',
  },
  balanced_day: {
    text: "You're having a well-balanced day! Keep up the great work.",
    icon: '✨',
  },
};

function generateFallbackInsight(
  todayCalories: number,
  todayProtein: number,
  calorieTarget: number,
  proteinTarget: number,
  waterPercent: number,
  mealCount: number,
  streak: number
): InsightData {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  // No meals logged
  if (mealCount === 0) {
    return {
      ...INSIGHT_TEMPLATES.no_meals,
      generatedAt: now,
      date: today,
    };
  }

  // Streak celebration (priority for streaks > 3)
  if (streak >= 3) {
    return {
      text: INSIGHT_TEMPLATES.streak_celebrate.text.replace('{days}', streak.toString()),
      icon: INSIGHT_TEMPLATES.streak_celebrate.icon,
      generatedAt: now,
      date: today,
    };
  }

  const proteinPercent = proteinTarget > 0 ? Math.round((todayProtein / proteinTarget) * 100) : 0;
  const caloriePercent = calorieTarget > 0 ? Math.round((todayCalories / calorieTarget) * 100) : 0;
  const remaining = calorieTarget - todayCalories;

  // Low protein (under 50%)
  if (proteinPercent < 50) {
    return {
      text: INSIGHT_TEMPLATES.protein_low.text.replace('{percent}', proteinPercent.toString()),
      icon: INSIGHT_TEMPLATES.protein_low.icon,
      generatedAt: now,
      date: today,
    };
  }

  // High protein (over 80%)
  if (proteinPercent >= 80) {
    return {
      text: INSIGHT_TEMPLATES.protein_high.text.replace('{percent}', proteinPercent.toString()),
      icon: INSIGHT_TEMPLATES.protein_high.icon,
      generatedAt: now,
      date: today,
    };
  }

  // Low water (under 50%)
  if (waterPercent < 50) {
    return {
      text: INSIGHT_TEMPLATES.water_low.text.replace('{percent}', waterPercent.toString()),
      icon: INSIGHT_TEMPLATES.water_low.icon,
      generatedAt: now,
      date: today,
    };
  }

  // Calories over
  if (remaining < -100) {
    return {
      text: INSIGHT_TEMPLATES.calories_over.text.replace('{over}', Math.abs(remaining).toString()),
      icon: INSIGHT_TEMPLATES.calories_over.icon,
      generatedAt: now,
      date: today,
    };
  }

  // Calories under with room
  if (remaining > 300) {
    return {
      text: INSIGHT_TEMPLATES.calories_under.text.replace('{remaining}', remaining.toString()),
      icon: INSIGHT_TEMPLATES.calories_under.icon,
      generatedAt: now,
      date: today,
    };
  }

  // Default: balanced day
  return {
    ...INSIGHT_TEMPLATES.balanced_day,
    generatedAt: now,
    date: today,
  };
}

export function AIDailyInsightWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPremium } = useSubscriptionStore();
  const { dailyTotals, entries, streak } = useFoodLogStore();
  const { calorieGoal, proteinGoal } = useGoalStore();
  const { getTodayProgress } = useWaterStore();

  const [insight, setInsight] = useState<InsightData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load cached insight
  useEffect(() => {
    loadCachedInsight();
  }, []);

  const loadCachedInsight = async () => {
    try {
      const cached = await AsyncStorage.getItem(INSIGHT_CACHE_KEY);
      if (cached) {
        const parsed: InsightData = JSON.parse(cached);
        const today = new Date().toISOString().split('T')[0];
        const now = Date.now();

        // Use cached if still valid
        if (parsed.date === today && now - parsed.generatedAt < CACHE_DURATION_MS) {
          setInsight(parsed);
          return;
        }
      }
      // Generate new insight if no valid cache
      await generateInsight();
    } catch (error) {
      console.error('Failed to load cached insight:', error);
      await generateInsight();
    }
  };

  const generateInsight = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Get today's data
      const waterProgress = getTodayProgress();
      const waterPercent = waterProgress.percent;

      const todayCalories = dailyTotals?.calories || 0;
      const todayProtein = dailyTotals?.protein || 0;
      const calorieTarget = calorieGoal || 2000;
      const proteinTarget = proteinGoal || 150;

      // Count today's meals
      const today = new Date().toISOString().split('T')[0];
      const mealCount = entries.filter(e => e.date === today).length;

      // Generate fallback insight (in production, this would call cloud LLM)
      const newInsight = generateFallbackInsight(
        todayCalories,
        todayProtein,
        calorieTarget,
        proteinTarget,
        waterPercent,
        mealCount,
        streak
      );

      setInsight(newInsight);

      // Cache the insight
      await AsyncStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(newInsight));
    } catch (error) {
      console.error('Failed to generate insight:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dailyTotals, entries, streak, getTodayProgress, calorieGoal, proteinGoal, isLoading]);

  const handleRefresh = async () => {
    if (isEditMode || isRefreshing) return;
    setIsRefreshing(true);
    await generateInsight();
  };

  const handlePress = () => {
    if (!isEditMode && isPremium) {
      router.push('/(tabs)/progress');
    }
  };

  const styles = createStyles(colors);

  const renderContent = () => {
    if (isLoading && !insight) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Generating insight...</Text>
        </View>
      );
    }

    if (!insight) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No insight available</Text>
        </View>
      );
    }

    return (
      <View style={styles.insightContainer}>
        <Text style={styles.insightIcon}>{insight.icon}</Text>
        <Text style={styles.insightText}>{insight.text}</Text>
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
            <Ionicons name="sparkles" size={20} color={colors.accent} />
          </View>
          <Text style={styles.title}>Daily Insight</Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isEditMode || isRefreshing}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
          )}
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
    // Insight content
    insightContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    insightIcon: {
      fontSize: 24,
      marginTop: 2,
    },
    insightText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    // Loading state
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 10,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    // Empty state
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
