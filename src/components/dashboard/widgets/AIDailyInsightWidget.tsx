/**
 * AI Daily Insight Widget
 * Shows one brief personalized insight powered by on-device LLM
 * Premium feature - shows locked state for free users
 * Falls back to template-based insights when LLM unavailable or fails
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSubscriptionStore, useFoodLogStore, useGoalStore, useWaterStore } from '@/stores';
import { WidgetProps } from '@/types/dashboard';
import { LockedContentArea } from '@/components/premium';
import { LLMService } from '@/features/insights/services/LLMService';
import { useInsightsStore } from '@/features/insights/stores/insightsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InsightData {
  text: string;
  icon: string;
  generatedAt: number;
  date: string;
  source?: 'llm' | 'fallback';
}

const INSIGHT_CACHE_KEY = 'ai_daily_insight_cache';
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

// Build prompt for single daily insight via on-device LLM
function buildDailyWidgetPrompt(
  todayCalories: number,
  todayProtein: number,
  calorieTarget: number,
  proteinTarget: number,
  waterPercent: number,
  mealCount: number,
  streak: number
): string {
  const calPercent = calorieTarget > 0 ? Math.round((todayCalories / calorieTarget) * 100) : 0;

  return `You are a supportive nutrition assistant using the "Nourished Calm" voice: warm, encouraging, never judgmental. Based on today's eating:

Calories: ${todayCalories} / ${calorieTarget} (${calPercent}%)
Protein: ${todayProtein}g / ${proteinTarget}g
Water: ${waterPercent}% of daily goal
Meals logged: ${mealCount}
${streak > 0 ? `Logging streak: ${streak} days` : ''}

Provide ONE brief, encouraging insight (1-2 sentences). Focus on one actionable observation. Never use words like "failed", "cheated", "warning", or "deficiency".

Output only the insight text, no labels or formatting.`;
}

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
      source: 'fallback',
    };
  }

  // Streak celebration (priority for streaks > 3)
  if (streak >= 3) {
    return {
      text: INSIGHT_TEMPLATES.streak_celebrate.text.replace('{days}', streak.toString()),
      icon: INSIGHT_TEMPLATES.streak_celebrate.icon,
      generatedAt: now,
      date: today,
      source: 'fallback',
    };
  }

  const proteinPercent = proteinTarget > 0 ? Math.round((todayProtein / proteinTarget) * 100) : 0;
  const remaining = calorieTarget - todayCalories;

  // Low protein (under 50%)
  if (proteinPercent < 50) {
    return {
      text: INSIGHT_TEMPLATES.protein_low.text.replace('{percent}', proteinPercent.toString()),
      icon: INSIGHT_TEMPLATES.protein_low.icon,
      generatedAt: now,
      date: today,
      source: 'fallback',
    };
  }

  // High protein (over 80%)
  if (proteinPercent >= 80) {
    return {
      text: INSIGHT_TEMPLATES.protein_high.text.replace('{percent}', proteinPercent.toString()),
      icon: INSIGHT_TEMPLATES.protein_high.icon,
      generatedAt: now,
      date: today,
      source: 'fallback',
    };
  }

  // Low water (under 50%)
  if (waterPercent < 50) {
    return {
      text: INSIGHT_TEMPLATES.water_low.text.replace('{percent}', waterPercent.toString()),
      icon: INSIGHT_TEMPLATES.water_low.icon,
      generatedAt: now,
      date: today,
      source: 'fallback',
    };
  }

  // Calories over
  if (remaining < -100) {
    return {
      text: INSIGHT_TEMPLATES.calories_over.text.replace('{over}', Math.abs(remaining).toString()),
      icon: INSIGHT_TEMPLATES.calories_over.icon,
      generatedAt: now,
      date: today,
      source: 'fallback',
    };
  }

  // Calories under with room
  if (remaining > 300) {
    return {
      text: INSIGHT_TEMPLATES.calories_under.text.replace('{remaining}', remaining.toString()),
      icon: INSIGHT_TEMPLATES.calories_under.icon,
      generatedAt: now,
      date: today,
      source: 'fallback',
    };
  }

  // Default: balanced day
  return {
    ...INSIGHT_TEMPLATES.balanced_day,
    generatedAt: now,
    date: today,
    source: 'fallback',
  };
}

export function AIDailyInsightWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPremium } = useSubscriptionStore();
  const { dailyTotals, entries, streak } = useFoodLogStore();
  const { calorieGoal, proteinGoal } = useGoalStore();
  const { getTodayProgress } = useWaterStore();

  // LLM state from insights store
  const { llmStatus, setLLMStatus } = useInsightsStore();

  const [insight, setInsight] = useState<InsightData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

      // Check LLM status and try LLM generation first
      const status = await LLMService.getStatus();
      setLLMStatus(status);

      if (status === 'ready') {
        try {
          const prompt = buildDailyWidgetPrompt(
            todayCalories,
            todayProtein,
            calorieTarget,
            proteinTarget,
            waterPercent,
            mealCount,
            streak
          );
          const result = await LLMService.generate(prompt, 150);

          if (result.success && result.text) {
            const cleanText = result.text.trim();
            if (cleanText.length > 10) {
              const newInsight: InsightData = {
                text: cleanText,
                icon: '✨',
                generatedAt: Date.now(),
                date: today,
                source: 'llm',
              };
              setInsight(newInsight);
              await AsyncStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(newInsight));
              return;
            }
          }
          // LLM returned empty/short text, fall through to fallback
          console.log('[AIDailyInsightWidget] LLM returned insufficient text, using fallback');
        } catch (error) {
          console.log('[AIDailyInsightWidget] LLM generation failed, using fallback');
        }
      }

      // If LLM not downloaded, don't generate fallback (show Enable AI prompt instead)
      if (status === 'not_downloaded') {
        return;
      }

      // Fall back to template-based insight (for unsupported devices or LLM failures)
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
      await AsyncStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(newInsight));
    } catch (error) {
      console.error('Failed to generate insight:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dailyTotals, entries, streak, getTodayProgress, calorieGoal, proteinGoal, isLoading, setLLMStatus]);

  const handleDownloadModel = async () => {
    setIsDownloading(true);
    setDownloadPercent(0);

    try {
      const result = await LLMService.downloadModel((progress) => {
        setDownloadPercent(progress.percentage);
      });

      if (result.success) {
        setLLMStatus('ready');
        // Regenerate insight with LLM now that it's downloaded
        setIsLoading(false); // Reset so generateInsight can run
        await generateInsight();
      }
    } catch (error) {
      console.error('[AIDailyInsightWidget] Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

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
    // Show download progress
    if (isDownloading) {
      return (
        <View style={styles.downloadContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.downloadText}>
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

    // Show "Enable AI" prompt when model not downloaded and no cached insight
    if (llmStatus === 'not_downloaded' && !insight) {
      return (
        <TouchableOpacity
          style={[styles.enableContainer, { borderColor: colors.borderDefault }]}
          onPress={handleDownloadModel}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={20} color={colors.accent} />
          <View style={styles.enableTextContainer}>
            <Text style={[styles.enableTitle, { color: colors.textPrimary }]}>
              Enable AI Insights
            </Text>
            <Text style={[styles.enableSubtitle, { color: colors.textSecondary }]}>
              Download 1GB model for personalized insights
            </Text>
          </View>
          <Ionicons name="download-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      );
    }

    // Loading state
    if (isLoading && !insight) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Generating insight...</Text>
        </View>
      );
    }

    // No insight available
    if (!insight) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No insight available</Text>
        </View>
      );
    }

    // Show insight
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
    // Enable AI prompt
    enableContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      padding: 12,
    },
    enableTextContainer: {
      flex: 1,
    },
    enableTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
    },
    enableSubtitle: {
      fontSize: 12,
    },
    // Download progress
    downloadContainer: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
    },
    downloadText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    progressBarTrack: {
      width: '100%',
      height: 4,
      backgroundColor: colors.borderDefault,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
    },
  });
