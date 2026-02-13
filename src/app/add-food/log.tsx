import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
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
import { foodRepository, micronutrientRepository } from '@/repositories';
import { FoodItem } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { FoodDetailSkeleton } from '@/components/ui/Skeleton';
import { USDAFoodService } from '@/services/usda/USDAFoodService';
import { NUTRIENT_BY_ID } from '@/data/nutrients';
import { MicronutrientData } from '@/services/usda/types';
import { TestIDs } from '@/constants/testIDs';

function parseDefaultAmount(raw?: string): string {
  if (!raw) return '1';
  const parsed = parseFloat(raw);
  if (isNaN(parsed) || parsed <= 0) return '1';
  return raw;
}

const VALID_SERVING_UNITS: Set<string> = new Set([
  'serving', 'g', 'oz', 'cup', 'tbsp', 'tsp', 'ml', 'fl_oz',
]);

function parseDefaultUnit(raw?: string): ServingUnit {
  if (raw && VALID_SERVING_UNITS.has(raw)) return raw as ServingUnit;
  return 'serving';
}

export default function LogFoodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    foodId: string;
    mealType?: string;
    date?: string;
    defaultAmount?: string;
    defaultUnit?: string;
  }>();

  const { addLogEntry } = useFoodLogStore();
  const { isFavorite, toggleFavorite, updateFavoriteDefaults, loadFavorites } = useFavoritesStore();

  // State
  const [food, setFood] = useState<FoodItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [amount, setAmount] = useState(parseDefaultAmount(params.defaultAmount));
  const [selectedUnit, setSelectedUnit] = useState<ServingUnit>(
    parseDefaultUnit(params.defaultUnit)
  );
  const [mealType, setMealType] = useState<MealType>(
    (params.mealType as MealType) || MealType.Snack
  );
  const date = params.date || new Date().toISOString().split('T')[0];

  // Micronutrient state
  const [micronutrients, setMicronutrients] = useState<MicronutrientData | null>(null);
  const [isLoadingNutrients, setIsLoadingNutrients] = useState(false);

  // Load food item and ensure favorites are loaded
  useEffect(() => {
    const loadFood = async () => {
      if (!params.foodId) return;
      setIsLoading(true);
      const item = await foodRepository.findById(params.foodId);
      setFood(item);
      setIsLoading(false);

      // Load micronutrient data if available (from any source)
      if (item) {
        setIsLoadingNutrients(true);
        try {
          // Check local cache first (covers USDA, OFF, AI photo sources)
          const cached = await micronutrientRepository.getFoodNutrients(item.id);
          if (Object.keys(cached).length > 0) {
            setMicronutrients(cached);
          } else if (item.usdaFdcId) {
            // Fallback: fetch from USDA API for USDA-sourced items
            const details = await USDAFoodService.getFoodDetails(item.usdaFdcId);
            if (details) {
              const mapped = USDAFoodService.mapNutrients(details.foodNutrients);
              setMicronutrients(mapped);
              await micronutrientRepository.storeFoodNutrients(item.id, mapped);
              const count = Object.keys(mapped).length;
              await foodRepository.updateUsdaFields(item.id, item.usdaFdcId, count);
            }
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to load micronutrients:', error);
        } finally {
          setIsLoadingNutrients(false);
        }
      }
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
      if (__DEV__) console.error('Failed to toggle favorite:', error);
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
      AccessibilityInfo.announceForAccessibility('Food logged successfully');
      router.dismiss();
    } catch (error) {
      if (__DEV__) console.error('Failed to save log entry:', error);
      AccessibilityInfo.announceForAccessibility('Failed to log food');
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
    <SafeAreaView testID={TestIDs.LogFood.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID={TestIDs.LogFood.BackButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} accessibilityRole="header">
          Add to {MEAL_TYPE_LABELS[mealType]}
        </Text>
        <FavoriteButton
          testID={TestIDs.LogFood.FavoriteButton}
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
        <View style={styles.section} accessible={true} accessibilityLabel="Serving size and unit">
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]} accessibilityRole="header">
            HOW MUCH?
          </Text>

          {/* Amount Input */}
          <View style={[styles.amountCard, { backgroundColor: colors.bgSecondary }]}>
            <TextInput
              testID={TestIDs.LogFood.AmountInput}
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
        <View style={styles.section} accessible={true} accessibilityLabel="Select meal">
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]} accessibilityRole="header">
            MEAL
          </Text>
          <View style={styles.mealSelector}>
            {mealOptions.map((option) => (
              <Pressable
                key={option.value}
                testID={
                  option.value === MealType.Breakfast ? TestIDs.LogFood.MealBreakfast :
                  option.value === MealType.Lunch ? TestIDs.LogFood.MealLunch :
                  option.value === MealType.Dinner ? TestIDs.LogFood.MealDinner :
                  TestIDs.LogFood.MealSnack
                }
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

        {/* Micronutrient Preview */}
        {micronutrients && Object.keys(micronutrients).length > 0 && (
          <View style={[styles.micronutrientCard, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.micronutrientHeader}>
              <Text style={[styles.micronutrientTitle, { color: colors.textPrimary }]} accessibilityRole="header">
                Micronutrients
              </Text>
              <View style={[styles.nutrientCountBadge, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.nutrientCountText, { color: colors.accent }]}>
                  {Object.keys(micronutrients).length}
                </Text>
              </View>
            </View>
            <Text style={[styles.micronutrientSource, { color: colors.textTertiary }]}>
              Nutrient data available
            </Text>
            {/* Show top 3 nutrients by amount relative to serving */}
            {Object.entries(micronutrients)
              .filter(([, amount]) => amount > 0)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([nutrientId, amount]) => {
                const nutrientDef = NUTRIENT_BY_ID[nutrientId];
                if (!nutrientDef) return null;
                const servingFactor = food.servingSizeGrams
                  ? (parseFloat(amount as unknown as string) || 0) * ((food.servingSizeGrams || 100) / 100)
                  : amount;
                return (
                  <View key={nutrientId} style={styles.micronutrientRow}>
                    <Text style={[styles.micronutrientName, { color: colors.textSecondary }]}>
                      {nutrientDef.name}
                    </Text>
                    <Text style={[styles.micronutrientValue, { color: colors.textPrimary }]}>
                      {typeof servingFactor === 'number' && servingFactor < 1
                        ? servingFactor.toFixed(2)
                        : Math.round(servingFactor as number)}{nutrientDef.unit}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Loading micronutrients indicator */}
        {isLoadingNutrients && (
          <View style={[styles.micronutrientCard, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.micronutrientLoadingText, { color: colors.textTertiary }]}>
              Loading nutrient details...
            </Text>
          </View>
        )}

        {/* No micronutrient data message */}
        {!isLoadingNutrients && !micronutrients && (
          <View style={[styles.noMicronutrientCard, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.noMicronutrientText, { color: colors.textTertiary }]}>
              Micronutrient data not available
            </Text>
          </View>
        )}

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
          testID={TestIDs.LogFood.AddButton}
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
  // Micronutrient styles
  micronutrientCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  micronutrientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  micronutrientTitle: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  nutrientCountBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  nutrientCountText: {
    ...typography.caption,
    fontWeight: '700',
  },
  micronutrientSource: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: spacing[1],
  },
  micronutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  micronutrientName: {
    ...typography.body.small,
  },
  micronutrientValue: {
    ...typography.body.small,
    fontWeight: '600',
  },
  micronutrientLoadingText: {
    ...typography.body.small,
    textAlign: 'center',
    paddingVertical: spacing[2],
  },
  noMicronutrientCard: {
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  noMicronutrientText: {
    ...typography.caption,
  },
});
