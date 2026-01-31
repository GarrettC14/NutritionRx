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
import { useRestaurantStore } from '@/stores';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { restaurantRepository } from '@/repositories';
import { RestaurantFood } from '@/types/restaurant';
import { Button } from '@/components/ui/Button';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { FoodDetailSkeleton } from '@/components/ui/Skeleton';
import { TestIDs } from '@/constants/testIDs';

export default function RestaurantFoodDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    foodId: string;
    mealType?: string;
    date?: string;
  }>();

  const { logFood } = useRestaurantStore();
  const { isPremium } = useSubscriptionStore();

  // State
  const [food, setFood] = useState<RestaurantFood | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [mealType, setMealType] = useState<MealType>(
    (params.mealType as MealType) || MealType.Snack
  );
  const date = params.date || new Date().toISOString().split('T')[0];

  // Load food item
  useEffect(() => {
    const loadFood = async () => {
      if (!params.foodId) return;
      setIsLoading(true);
      const item = await restaurantRepository.getFoodById(params.foodId);
      setFood(item);
      setIsLoading(false);
    };
    loadFood();
  }, [params.foodId]);

  // Calculate nutrition based on quantity
  const calculatedNutrition = useMemo(() => {
    if (!food) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const qty = parseFloat(quantity) || 0;
    return {
      calories: Math.round(food.nutrition.calories * qty),
      protein: Math.round(food.nutrition.protein * qty),
      carbs: Math.round(food.nutrition.carbohydrates * qty),
      fat: Math.round(food.nutrition.fat * qty),
    };
  }, [food, quantity]);

  // Handle quantity change
  const handleQuantityChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      setQuantity(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setQuantity(cleaned);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!isPremium) {
      router.push('/paywall?context=nutrition');
      return;
    }

    if (!food) return;
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) return;

    setIsSaving(true);
    try {
      await logFood(food, mealType, qty, notes.trim() || undefined);
      router.dismiss();
    } catch (error) {
      console.error('Failed to log restaurant food:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const mealOptions = [
    { label: 'Breakfast', value: MealType.Breakfast, testID: TestIDs.Restaurant.FoodMealBreakfast },
    { label: 'Lunch', value: MealType.Lunch, testID: TestIDs.Restaurant.FoodMealLunch },
    { label: 'Dinner', value: MealType.Dinner, testID: TestIDs.Restaurant.FoodMealDinner },
    { label: 'Snack', value: MealType.Snack, testID: TestIDs.Restaurant.FoodMealSnack },
  ];

  const qty = parseFloat(quantity) || 0;
  const isValid = qty > 0 && qty <= 99;

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
            Food item not found
          </Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID={TestIDs.Restaurant.FoodScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID={TestIDs.Restaurant.FoodBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Add to {MEAL_TYPE_LABELS[mealType]}
        </Text>
        <View style={{ width: 28 }} />
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
          <Text style={[styles.restaurantName, { color: colors.textSecondary }]}>
            {food.restaurantName}
          </Text>
          <Text style={[styles.servingInfo, { color: colors.textTertiary }]}>
            {food.serving.size}
            {food.serving.sizeGrams ? ` (${food.serving.sizeGrams}g)` : ''}
          </Text>
          {food.metadata.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.verifiedText, { color: colors.success }]}>
                Verified nutrition data
              </Text>
            </View>
          )}
        </View>

        {/* Quantity Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            HOW MANY?
          </Text>

          <View style={[styles.quantityCard, { backgroundColor: colors.bgSecondary }]}>
            <TextInput
              testID={TestIDs.Restaurant.FoodAmountInput}
              style={[styles.quantityInput, { color: colors.textPrimary }]}
              value={quantity}
              onChangeText={handleQuantityChange}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={colors.textTertiary}
              selectTextOnFocus
            />
            <Text style={[styles.quantityUnit, { color: colors.textSecondary }]}>
              {qty === 1 ? 'serving' : 'servings'}
            </Text>
          </View>
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
                testID={option.testID}
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

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            CUSTOMIZATIONS (OPTIONAL)
          </Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: colors.bgSecondary,
                color: colors.textPrimary,
                borderColor: colors.borderDefault,
              },
            ]}
            placeholder="e.g., no sauce, extra cheese..."
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
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

        {/* Large quantity warning */}
        {qty > 3 && (
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
        <View style={styles.buttonRow}>
          <Button
            testID={TestIDs.Restaurant.FoodAddButton}
            onPress={handleSave}
            loading={isSaving}
            disabled={!isValid}
            fullWidth
          >
            {isPremium ? 'Add Food' : 'Add Food'}
          </Button>
          {!isPremium && (
            <View style={styles.premiumBadgeOverlay}>
              <PremiumBadge size="small" />
            </View>
          )}
        </View>
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
  restaurantName: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  servingInfo: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  verifiedText: {
    ...typography.caption,
    fontSize: 11,
  },
  section: {
    gap: spacing[3],
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quantityCard: {
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    gap: spacing[2],
  },
  quantityInput: {
    fontSize: 48,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 80,
  },
  quantityUnit: {
    ...typography.body.medium,
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
  notesInput: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 60,
    ...typography.body.medium,
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
  buttonRow: {
    position: 'relative',
  },
  premiumBadgeOverlay: {
    position: 'absolute',
    top: -6,
    right: -4,
  },
});
