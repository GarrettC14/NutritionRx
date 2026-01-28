import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_LABELS } from '@/constants/mealTypes';
import {
  ServingUnit,
  SERVING_UNITS,
  getAvailableUnits,
  calculateNutritionForUnit,
  getDefaultAmountForUnit,
  getUnitLabel,
} from '@/constants/servingUnits';
import { useFoodLogStore, useFavoritesStore } from '@/stores';
import { foodRepository } from '@/repositories';
import { FoodItem } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { FoodDetailSkeleton } from '@/components/ui/Skeleton';

export default function LogFoodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    foodId: string;
    mealType?: string;
    date?: string;
  }>();

  const { addLogEntry } = useFoodLogStore();
  const { isFavorite, toggleFavorite, updateFavoriteDefaults, loadFavorites } = useFavoritesStore();

  // State
  const [food, setFood] = useState<FoodItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [amount, setAmount] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState<ServingUnit>('serving');
  const [mealType, setMealType] = useState<MealType>(
    (params.mealType as MealType) || MealType.Snack
  );
  const date = params.date || new Date().toISOString().split('T')[0];

  // Load food item and ensure favorites are loaded
  useEffect(() => {
    const loadFood = async () => {
      if (!params.foodId) return;
      setIsLoading(true);
      const item = await foodRepository.findById(params.foodId);
      setFood(item);
      setIsLoading(false);
    };
    loadFood();
    loadFavorites();
  }, [params.foodId]);

  // Get available units for this food
  const availableUnits = useMemo(() => {
    if (!food) return ['serving'] as ServingUnit[];
    return getAvailableUnits({
      servingSizeGrams: food.servingSizeGrams,
      servingSizeMl: null, // We don't have this field yet
    });
  }, [food]);

  // Calculate nutrition based on amount and unit
  const calculatedNutrition = useMemo(() => {
    if (!food) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const amountNum = parseFloat(amount) || 0;
    return calculateNutritionForUnit(
      {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        servingSize: food.servingSize,
        servingSizeGrams: food.servingSizeGrams,
        servingSizeMl: null,
      },
      amountNum,
      selectedUnit
    );
  }, [food, amount, selectedUnit]);

  // Handle unit change
  const handleUnitChange = (unit: ServingUnit) => {
    if (!food) return;
    setSelectedUnit(unit);
    // Set default amount for the new unit
    setAmount(getDefaultAmountForUnit(unit, { servingSizeGrams: food.servingSizeGrams }));
  };

  // Handle amount change
  const handleAmountChange = (value: string) => {
    // Allow decimal numbers
    const cleaned = value.replace(/[^0-9.]/g, '');
    // Only allow one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      setAmount(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setAmount(cleaned);
    }
  };

  // Handle favorite toggle - saves current serving size/unit as default
  const handleToggleFavorite = async () => {
    if (!food) return;
    try {
      const isNowFavorited = await toggleFavorite(food.id);
      // If we just added to favorites, save current serving size/unit as default
      if (isNowFavorited) {
        const amountNum = parseFloat(amount) || 1;
        await updateFavoriteDefaults(food.id, amountNum, selectedUnit);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!food) return;
    const amountNum = parseFloat(amount) || 0;
    if (amountNum <= 0) return;

    setIsSaving(true);
    try {
      // Calculate servings equivalent for storage
      const servingsEquivalent = selectedUnit === 'serving'
        ? amountNum
        : calculatedNutrition.calories / food.calories;

      await addLogEntry({
        foodItemId: food.id,
        date,
        mealType,
        servings: servingsEquivalent,
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

  const amountNum = parseFloat(amount) || 0;
  const isValid = amountNum > 0 && amountNum <= 9999;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <FoodDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (!food) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Food not found
          </Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Add to {MEAL_TYPE_LABELS[mealType]}
        </Text>
        <FavoriteButton
          isFavorite={isFavorite(food.id)}
          onPress={handleToggleFavorite}
          size={26}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Food Info Card */}
        <View style={[styles.foodCard, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.foodName, { color: colors.textPrimary }]}>
            {food.name}
          </Text>
          {food.brand && (
            <Text style={[styles.foodBrand, { color: colors.textSecondary }]}>
              {food.brand}
            </Text>
          )}
          <Text style={[styles.servingInfo, { color: colors.textTertiary }]}>
            {food.servingSize} {food.servingUnit}
            {food.servingSizeGrams ? ` (${food.servingSizeGrams}g per serving)` : ''}
          </Text>
        </View>

        {/* How Much Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            HOW MUCH?
          </Text>

          {/* Amount Input */}
          <View style={[styles.amountCard, { backgroundColor: colors.bgSecondary }]}>
            <TextInput
              style={[styles.amountInput, { color: colors.textPrimary }]}
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={colors.textTertiary}
              selectTextOnFocus
            />
          </View>

          {/* Unit Selector Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.unitPillsContainer}
          >
            {availableUnits.map((unit) => {
              const isSelected = selectedUnit === unit;
              return (
                <Pressable
                  key={unit}
                  style={[
                    styles.unitPill,
                    {
                      backgroundColor: isSelected ? colors.accent : 'transparent',
                      borderColor: isSelected ? colors.accent : colors.borderDefault,
                    },
                  ]}
                  onPress={() => handleUnitChange(unit)}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {getUnitLabel(unit)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Meal Type Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            MEAL
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
                      mealType === option.value ? colors.accent : colors.borderDefault,
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

        {/* Nutrition Preview Card */}
        <View style={[styles.nutritionCard, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.caloriesValue, { color: colors.textPrimary }]}>
            {calculatedNutrition.calories}
          </Text>
          <Text style={[styles.caloriesLabel, { color: colors.textSecondary }]}>
            calories
          </Text>

          <View style={styles.macroRow}>
            <View style={[styles.macroPill, { backgroundColor: colors.protein + '20' }]}>
              <Text style={[styles.macroPillText, { color: colors.protein }]}>
                P: {calculatedNutrition.protein}g
              </Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: colors.carbs + '20' }]}>
              <Text style={[styles.macroPillText, { color: colors.carbs }]}>
                C: {calculatedNutrition.carbs}g
              </Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: colors.fat + '20' }]}>
              <Text style={[styles.macroPillText, { color: colors.fat }]}>
                F: {calculatedNutrition.fat}g
              </Text>
            </View>
          </View>
        </View>

        {/* Large portion warning */}
        {amountNum > 5 && selectedUnit === 'serving' && (
          <View style={[styles.warningBanner, { backgroundColor: colors.warningBg }]}>
            <Ionicons name="alert-circle" size={20} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              That's a large portion. Double check?
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          onPress={handleSave}
          loading={isSaving}
          disabled={!isValid}
          fullWidth
        >
          Add Food
        </Button>
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
    justifyContent: 'space-between',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  headerTitle: {
    ...typography.title.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[4],
    gap: spacing[4],
  },
  foodCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing[1],
  },
  foodName: {
    ...typography.title.large,
    textAlign: 'center',
  },
  foodBrand: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  servingInfo: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  section: {
    gap: spacing[3],
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountCard: {
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 120,
  },
  unitPillsContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  unitPill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  unitPillText: {
    ...typography.body.medium,
    fontWeight: '500',
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
  nutritionCard: {
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing[3],
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  caloriesLabel: {
    ...typography.body.medium,
    marginTop: -spacing[2],
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  macroPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  macroPillText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  warningText: {
    ...typography.body.small,
    flex: 1,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
});
