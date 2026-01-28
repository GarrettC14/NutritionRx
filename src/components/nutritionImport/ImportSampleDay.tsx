import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { ParsedNutritionDay } from '@/types/nutritionImport';
import { MEAL_TYPE_LABELS } from '@/constants/mealTypes';

interface ImportSampleDayProps {
  day: ParsedNutritionDay;
}

export function ImportSampleDay({ day }: ImportSampleDayProps) {
  const { colors } = useTheme();

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <Text style={[styles.dateText, { color: colors.textSecondary }]}>
        {formatDate(day.date)}
      </Text>

      <View style={styles.mealsContainer}>
        {day.meals.map((meal, index) => (
          <View key={index} style={styles.mealRow}>
            <Text style={[styles.mealName, { color: colors.textPrimary }]}>
              {MEAL_TYPE_LABELS[meal.name]}
            </Text>
            <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>
              {meal.calories} cal
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.totalsRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total</Text>
        <View style={styles.totalsValues}>
          <Text style={[styles.totalCalories, { color: colors.accent }]}>
            {day.totals.calories} cal
          </Text>
          <Text style={[styles.totalMacros, { color: colors.textSecondary }]}>
            P: {day.totals.protein}g · C: {day.totals.carbs}g · F: {day.totals.fat}g
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  dateText: {
    ...typography.overline,
    marginBottom: spacing[3],
  },
  mealsContainer: {
    gap: spacing[2],
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    ...typography.body.medium,
  },
  mealCalories: {
    ...typography.body.medium,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: spacing[3],
    paddingTop: spacing[3],
  },
  totalLabel: {
    ...typography.body.large,
    fontWeight: '600',
  },
  totalsValues: {
    alignItems: 'flex-end',
  },
  totalCalories: {
    ...typography.body.large,
    fontWeight: '600',
  },
  totalMacros: {
    ...typography.caption,
    marginTop: spacing[1],
  },
});
