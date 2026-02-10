/**
 * Meal Ideas Widget
 * Suggests meals based on remaining macros for the day
 * Premium feature - shows locked state for free users
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useDailyNutrition } from '@/hooks/useDailyNutrition';
import { useSubscriptionStore } from '@/stores';
import { useResolvedTargets } from '@/hooks/useResolvedTargets';
import { WidgetProps } from '@/types/dashboard';
import { LockedContentArea } from '@/components/premium';

interface MealSuggestion {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: 'high_protein' | 'low_cal' | 'balanced' | 'carb_rich';
}

const MEAL_SUGGESTIONS: Record<string, MealSuggestion[]> = {
  high_protein: [
    { id: 'hp1', title: 'Grilled Chicken', description: '30g protein, 180 cal', icon: 'restaurant-outline', type: 'high_protein' },
    { id: 'hp2', title: 'Greek Yogurt Bowl', description: '20g protein, 150 cal', icon: 'cafe-outline', type: 'high_protein' },
    { id: 'hp3', title: 'Egg White Omelette', description: '25g protein, 140 cal', icon: 'sunny-outline', type: 'high_protein' },
  ],
  low_cal: [
    { id: 'lc1', title: 'Garden Salad', description: '5g protein, 80 cal', icon: 'leaf-outline', type: 'low_cal' },
    { id: 'lc2', title: 'Vegetable Soup', description: '8g protein, 100 cal', icon: 'water-outline', type: 'low_cal' },
    { id: 'lc3', title: 'Fruit Cup', description: '1g protein, 60 cal', icon: 'nutrition-outline', type: 'low_cal' },
  ],
  balanced: [
    { id: 'bl1', title: 'Salmon & Rice', description: '28g protein, 400 cal', icon: 'fish-outline', type: 'balanced' },
    { id: 'bl2', title: 'Turkey Sandwich', description: '22g protein, 350 cal', icon: 'fast-food-outline', type: 'balanced' },
    { id: 'bl3', title: 'Stir Fry Bowl', description: '20g protein, 380 cal', icon: 'flame-outline', type: 'balanced' },
  ],
  carb_rich: [
    { id: 'cr1', title: 'Pasta Primavera', description: '12g protein, 450 cal', icon: 'restaurant-outline', type: 'carb_rich' },
    { id: 'cr2', title: 'Oatmeal Bowl', description: '10g protein, 300 cal', icon: 'sunny-outline', type: 'carb_rich' },
    { id: 'cr3', title: 'Rice & Beans', description: '15g protein, 380 cal', icon: 'leaf-outline', type: 'carb_rich' },
  ],
};

export function MealIdeasWidget({ config, isEditMode }: WidgetProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { totals } = useDailyNutrition();
  const { calories: calorieTarget, protein: proteinTarget } = useResolvedTargets();
  const { isPremium } = useSubscriptionStore();

  // Determine what type of meal to suggest based on remaining macros
  const { suggestion, reason } = useMemo(() => {
    const caloriesRemaining = calorieTarget - totals.calories;
    const proteinRemaining = proteinTarget - totals.protein;
    const proteinPercentRemaining = proteinRemaining / proteinTarget;

    // If low on calories but need protein
    if (caloriesRemaining < 400 && proteinRemaining > 20) {
      return {
        suggestion: MEAL_SUGGESTIONS.high_protein[Math.floor(Math.random() * 3)],
        reason: 'High protein, low calorie option',
      };
    }

    // If lots of calories remaining and need protein
    if (caloriesRemaining > 600 && proteinPercentRemaining > 0.4) {
      return {
        suggestion: MEAL_SUGGESTIONS.balanced[Math.floor(Math.random() * 3)],
        reason: 'Balanced meal to hit your targets',
      };
    }

    // If over on calories
    if (caloriesRemaining < 200) {
      return {
        suggestion: MEAL_SUGGESTIONS.low_cal[Math.floor(Math.random() * 3)],
        reason: 'Light option for remaining budget',
      };
    }

    // If need carbs for energy
    if (totals.carbs < 100 && caloriesRemaining > 400) {
      return {
        suggestion: MEAL_SUGGESTIONS.carb_rich[Math.floor(Math.random() * 3)],
        reason: 'Energy boost for your day',
      };
    }

    // Default balanced suggestion
    return {
      suggestion: MEAL_SUGGESTIONS.balanced[0],
      reason: 'Balanced nutrition',
    };
  }, [totals, calorieTarget, proteinTarget]);

  const handlePress = () => {
    if (!isEditMode) {
      router.push({
        pathname: '/add-food',
        params: { searchQuery: suggestion.title },
      });
    }
  };

  const styles = createStyles(colors);

  // Content to show (either directly or locked)
  const contentArea = (
    <>
      <View style={styles.suggestionCard}>
        <View style={styles.suggestionIcon}>
          <Ionicons name={suggestion.icon} size={24} color={colors.textPrimary} />
        </View>
        <View style={styles.suggestionInfo}>
          <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
          <Text style={styles.suggestionDesc}>{suggestion.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>

      <Text style={styles.tapHint}>Tap to log this meal</Text>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Header - dimmed when locked */}
      <View
        style={[styles.header, !isPremium && styles.headerLocked]}
        pointerEvents={isPremium ? 'auto' : 'none'}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="bulb-outline" size={20} color={colors.premiumGold} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Meal Ideas</Text>
          <Text style={styles.reason}>{isPremium ? reason : 'Smart suggestions based on macros'}</Text>
        </View>
      </View>

      {/* Content - locked for non-premium */}
      {isPremium ? (
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={isEditMode ? 1 : 0.8}
          disabled={isEditMode}
          accessibilityRole="button"
          accessibilityLabel={`Meal idea: ${suggestion.title}, ${suggestion.description}. Tap to log this meal`}
        >
          {contentArea}
        </TouchableOpacity>
      ) : (
        <LockedContentArea
          context="meal_ideas"
          message="Upgrade to unlock"
          minHeight={100}
        >
          {contentArea}
        </LockedContentArea>
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
      alignItems: 'center',
      marginBottom: 14,
    },
    headerLocked: {
      opacity: 0.5,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.premiumGoldMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    reason: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    suggestionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgInteractive,
      borderRadius: 12,
      padding: 14,
    },
    suggestionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    suggestionInfo: {
      flex: 1,
    },
    suggestionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    suggestionDesc: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    tapHint: {
      fontSize: 11,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: 10,
    },
  });
