import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType } from '@/constants/mealTypes';
import { foodRepository } from '@/repositories';
import { FoodItem, DataSource } from '@/types/domain';
import { Button } from '@/components/ui/Button';

const SOURCE_LABELS: Record<DataSource, string> = {
  open_food_facts: 'Open Food Facts',
  usda: 'USDA Database',
  user: 'User Created',
  seed: 'NutritionRx Database',
};

const SOURCE_ICONS: Record<DataSource, keyof typeof Ionicons.glyphMap> = {
  open_food_facts: 'globe-outline',
  usda: 'leaf-outline',
  user: 'person-outline',
  seed: 'nutrition-outline',
};

export default function FoodDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id, mealType, date } = useLocalSearchParams<{
    id: string;
    mealType?: string;
    date?: string;
  }>();

  const [food, setFood] = useState<FoodItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load food item
  useEffect(() => {
    const loadFood = async () => {
      if (!id) return;
      setIsLoading(true);
      const item = await foodRepository.findById(id);
      setFood(item);
      setIsLoading(false);
    };
    loadFood();
  }, [id]);

  const handleAddToLog = () => {
    if (!food) return;
    router.push({
      pathname: '/add-food/log',
      params: {
        foodId: food.id,
        mealType: mealType || MealType.Snack,
        date: date || new Date().toISOString().split('T')[0],
      },
    });
  };

  const handleDelete = () => {
    if (!food || !food.isUserCreated) return;

    Alert.alert(
      'Delete Food',
      `Are you sure you want to delete "${food.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await foodRepository.delete(food.id);
              router.back();
            } catch (error) {
              console.error('Failed to delete food:', error);
              Alert.alert('Error', 'Failed to delete food. Please try again.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Food Details',
            headerStyle: { backgroundColor: colors.bgPrimary },
            headerTintColor: colors.textPrimary,
            headerLeft: () => (
              <Pressable onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color={colors.accent} />
              </Pressable>
            ),
          }}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Not found state
  if (!food) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Food Details',
            headerStyle: { backgroundColor: colors.bgPrimary },
            headerTintColor: colors.textPrimary,
            headerLeft: () => (
              <Pressable onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color={colors.accent} />
              </Pressable>
            ),
          }}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        >
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>Food not found</Text>
            <Button onPress={() => router.back()}>Go Back</Button>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View style={[styles.headerCard, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.foodName, { color: colors.textPrimary }]}>{food.name}</Text>
            {food.brand && (
              <Text style={[styles.foodBrand, { color: colors.textSecondary }]}>{food.brand}</Text>
            )}
            <View style={styles.sourceRow}>
              <Ionicons
                name={SOURCE_ICONS[food.source]}
                size={14}
                color={colors.textTertiary}
              />
              <Text style={[styles.sourceText, { color: colors.textTertiary }]}>
                {SOURCE_LABELS[food.source]}
              </Text>
              {food.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={[styles.verifiedText, { color: colors.success }]}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          {/* Serving Size Card */}
          <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SERVING SIZE</Text>
            <Text style={[styles.servingText, { color: colors.textPrimary }]}>
              {food.servingSize} {food.servingUnit}
            </Text>
            {food.servingSizeGrams && food.servingUnit !== 'g' && (
              <Text style={[styles.servingGrams, { color: colors.textTertiary }]}>
                ({food.servingSizeGrams}g per serving)
              </Text>
            )}
          </View>

          {/* Main Nutrition Card */}
          <View style={[styles.nutritionCard, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              NUTRITION PER SERVING
            </Text>

            {/* Calories */}
            <View style={styles.caloriesRow}>
              <Text style={[styles.caloriesValue, { color: colors.textPrimary }]}>
                {food.calories}
              </Text>
              <Text style={[styles.caloriesLabel, { color: colors.textSecondary }]}>calories</Text>
            </View>

            {/* Macros */}
            <View style={styles.macrosGrid}>
              <View style={[styles.macroCard, { backgroundColor: colors.protein + '15' }]}>
                <Text style={[styles.macroValue, { color: colors.protein }]}>{food.protein}g</Text>
                <Text style={[styles.macroLabel, { color: colors.protein }]}>Protein</Text>
              </View>
              <View style={[styles.macroCard, { backgroundColor: colors.carbs + '15' }]}>
                <Text style={[styles.macroValue, { color: colors.carbs }]}>{food.carbs}g</Text>
                <Text style={[styles.macroLabel, { color: colors.carbs }]}>Carbs</Text>
              </View>
              <View style={[styles.macroCard, { backgroundColor: colors.fat + '15' }]}>
                <Text style={[styles.macroValue, { color: colors.fat }]}>{food.fat}g</Text>
                <Text style={[styles.macroLabel, { color: colors.fat }]}>Fat</Text>
              </View>
            </View>

            {/* Additional Nutrients */}
            {(food.fiber !== undefined ||
              food.sugar !== undefined ||
              food.sodium !== undefined) && (
              <View style={[styles.additionalSection, { borderTopColor: colors.borderDefault }]}>
                {food.fiber !== undefined && (
                  <View style={styles.nutrientRow}>
                    <Text style={[styles.nutrientLabel, { color: colors.textSecondary }]}>
                      Fiber
                    </Text>
                    <Text style={[styles.nutrientValue, { color: colors.textPrimary }]}>
                      {food.fiber}g
                    </Text>
                  </View>
                )}
                {food.sugar !== undefined && (
                  <View style={styles.nutrientRow}>
                    <Text style={[styles.nutrientLabel, { color: colors.textSecondary }]}>
                      Sugar
                    </Text>
                    <Text style={[styles.nutrientValue, { color: colors.textPrimary }]}>
                      {food.sugar}g
                    </Text>
                  </View>
                )}
                {food.sodium !== undefined && (
                  <View style={styles.nutrientRow}>
                    <Text style={[styles.nutrientLabel, { color: colors.textSecondary }]}>
                      Sodium
                    </Text>
                    <Text style={[styles.nutrientValue, { color: colors.textPrimary }]}>
                      {food.sodium}mg
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Barcode Info (if available) */}
          {food.barcode && (
            <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
              <View style={styles.barcodeRow}>
                <Ionicons name="barcode-outline" size={20} color={colors.textTertiary} />
                <Text style={[styles.barcodeText, { color: colors.textSecondary }]}>
                  {food.barcode}
                </Text>
              </View>
            </View>
          )}

          {/* Usage Stats (if used before) */}
          {food.usageCount > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
              <View style={styles.usageRow}>
                <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
                <Text style={[styles.usageText, { color: colors.textSecondary }]}>
                  Logged {food.usageCount} time{food.usageCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Delete Button for User Created Foods */}
          {food.isUserCreated && (
            <Pressable
              style={[styles.deleteButton, { borderColor: colors.error }]}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                    Delete Food
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </ScrollView>

        {/* Add to Log Button */}
        <View style={styles.footer}>
          <Button onPress={handleAddToLog} fullWidth>
            Add to Log
          </Button>
        </View>
      </SafeAreaView>
    </>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  headerCard: {
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing[2],
  },
  foodName: {
    ...typography.title.large,
    textAlign: 'center',
  },
  foodBrand: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  sourceText: {
    ...typography.caption,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: spacing[2],
  },
  verifiedText: {
    ...typography.caption,
    fontWeight: '600',
  },
  card: {
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
    ...typography.title.medium,
  },
  servingGrams: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  nutritionCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  caloriesLabel: {
    ...typography.body.large,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  macroCard: {
    flex: 1,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  macroLabel: {
    ...typography.caption,
    fontWeight: '500',
    marginTop: spacing[1],
  },
  additionalSection: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    gap: spacing[2],
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutrientLabel: {
    ...typography.body.medium,
  },
  nutrientValue: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  barcodeText: {
    ...typography.body.small,
    fontFamily: 'monospace',
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  usageText: {
    ...typography.body.small,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing[2],
  },
  deleteButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
});
