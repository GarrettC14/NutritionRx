import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_LABELS } from '@/constants/mealTypes';
import { useFoodLogStore, useFoodSearchStore } from '@/stores';
import { foodRepository } from '@/repositories';
import { FoodItem } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

export default function LogFoodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    foodId: string;
    mealType?: string;
    date?: string;
  }>();

  const { addLogEntry } = useFoodLogStore();

  // State
  const [food, setFood] = useState<FoodItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [servings, setServings] = useState('1');
  const [mealType, setMealType] = useState<MealType>(
    (params.mealType as MealType) || MealType.Snack
  );
  const date = params.date || new Date().toISOString().split('T')[0];

  // Load food item
  useEffect(() => {
    const loadFood = async () => {
      if (!params.foodId) return;
      setIsLoading(true);
      const item = await foodRepository.findById(params.foodId);
      setFood(item);
      setIsLoading(false);
    };
    loadFood();
  }, [params.foodId]);

  // Calculate nutritional values based on servings
  const servingsNum = parseFloat(servings) || 0;
  const calculatedNutrition = food
    ? {
        calories: Math.round(food.calories * servingsNum),
        protein: Math.round(food.protein * servingsNum),
        carbs: Math.round(food.carbs * servingsNum),
        fat: Math.round(food.fat * servingsNum),
      }
    : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const handleServingsChange = (value: string) => {
    // Allow decimal numbers
    const cleaned = value.replace(/[^0-9.]/g, '');
    // Only allow one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      setServings(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setServings(cleaned);
    }
  };

  const adjustServings = (delta: number) => {
    const current = parseFloat(servings) || 0;
    const newValue = Math.max(0.25, current + delta);
    setServings(newValue.toString());
  };

  const handleSave = async () => {
    if (!food || servingsNum <= 0) return;

    setIsSaving(true);
    try {
      await addLogEntry({
        foodItemId: food.id,
        date,
        mealType,
        servings: servingsNum,
        calories: calculatedNutrition.calories,
        protein: calculatedNutrition.protein,
        carbs: calculatedNutrition.carbs,
        fat: calculatedNutrition.fat,
      });
      router.dismiss();
    } catch (error) {
      console.error('Failed to save log entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const mealOptions = [
    { label: 'Breakfast', value: MealType.Breakfast },
    { label: 'Lunch', value: MealType.Lunch },
    { label: 'Dinner', value: MealType.Dinner },
    { label: 'Snack', value: MealType.Snack },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!food) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Food not found
          </Text>
          <Button label="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text
            style={[styles.headerTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {food.name}
          </Text>
          {food.brand && (
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {food.brand}
            </Text>
          )}
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Serving Info */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Serving Size
          </Text>
          <Text style={[styles.servingText, { color: colors.textPrimary }]}>
            {food.servingSize} {food.servingUnit}
            {food.servingSizeGrams && ` (${food.servingSizeGrams}g)`}
          </Text>
        </View>

        {/* Servings Selector */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Number of Servings
          </Text>
          <View style={styles.servingsRow}>
            <Pressable
              style={[styles.servingButton, { borderColor: colors.border }]}
              onPress={() => adjustServings(-0.25)}
            >
              <Ionicons name="remove" size={24} color={colors.accent} />
            </Pressable>
            <TextInput
              style={[styles.servingsInput, { color: colors.textPrimary }]}
              value={servings}
              onChangeText={handleServingsChange}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <Pressable
              style={[styles.servingButton, { borderColor: colors.border }]}
              onPress={() => adjustServings(0.25)}
            >
              <Ionicons name="add" size={24} color={colors.accent} />
            </Pressable>
          </View>
        </View>

        {/* Meal Type */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Meal
          </Text>
          <View style={styles.mealSelector}>
            {mealOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.mealOption,
                  {
                    backgroundColor:
                      mealType === option.value ? colors.accent : 'transparent',
                    borderColor:
                      mealType === option.value ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setMealType(option.value)}
              >
                <Text
                  style={[
                    styles.mealOptionText,
                    {
                      color:
                        mealType === option.value ? '#FFFFFF' : colors.textPrimary,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Nutrition Summary */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Nutrition Summary
          </Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={[styles.nutritionValue, { color: colors.textPrimary }]}>
                {calculatedNutrition.calories}
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                Calories
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={[styles.nutritionValue, { color: colors.protein }]}>
                {calculatedNutrition.protein}g
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                Protein
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={[styles.nutritionValue, { color: colors.carbs }]}>
                {calculatedNutrition.carbs}g
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                Carbs
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={[styles.nutritionValue, { color: colors.fat }]}>
                {calculatedNutrition.fat}g
              </Text>
              <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                Fat
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          label={`Add to ${MEAL_TYPE_LABELS[mealType]}`}
          onPress={handleSave}
          loading={isSaving}
          disabled={servingsNum <= 0}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: componentSpacing.screenEdgePadding,
  },
  errorText: {
    ...typography.body.large,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.title.medium,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...typography.caption,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  section: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  servingText: {
    ...typography.body.large,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  servingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsInput: {
    ...typography.metric.large,
    textAlign: 'center',
    minWidth: 80,
  },
  mealSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  mealOption: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  mealOptionText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  nutritionValue: {
    ...typography.metric.medium,
  },
  nutritionLabel: {
    ...typography.caption,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
});
