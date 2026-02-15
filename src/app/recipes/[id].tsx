import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useRecipeStore, useFoodLogStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { MealType, MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '@/constants/mealTypes';
import { Recipe } from '@/types/recipes';
import { recipeRepository } from '@/repositories/recipeRepository';

export default function RecipeDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; mealType?: string; date?: string }>();

  const { deleteRecipe, logRecipe, toggleFavorite } = useRecipeStore(
    useShallow((s) => ({ deleteRecipe: s.deleteRecipe, logRecipe: s.logRecipe, toggleFavorite: s.toggleFavorite })),
  );

  const { refreshCurrentDate, selectedDate } = useFoodLogStore(
    useShallow((s) => ({ refreshCurrentDate: s.refreshCurrentDate, selectedDate: s.selectedDate })),
  );

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    (params.mealType as MealType) || MealType.Lunch,
  );

  const date = params.date || selectedDate;

  useEffect(() => {
    loadRecipe();
  }, [params.id]);

  const loadRecipe = async () => {
    setIsLoading(true);
    try {
      const data = await recipeRepository.getById(params.id);
      setRecipe(data);
    } catch {
      if (__DEV__) console.error('Failed to load recipe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLog = async () => {
    if (!recipe) return;
    setIsLogging(true);
    try {
      await logRecipe(recipe.id, recipe.name, date, selectedMealType,
        recipe.items.map((item) => ({
          foodItemId: item.foodItemId,
          servings: item.servings,
          servingUnit: item.servingUnit,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        })),
      );
      await refreshCurrentDate();
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to log recipe. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleDelete = () => {
    if (!recipe) return;
    Alert.alert('Delete Recipe?', `This will permanently delete "${recipe.name}".`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecipe(recipe.id);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete recipe.');
          }
        },
      },
    ]);
  };

  const handleToggleFavorite = async () => {
    if (!recipe) return;
    try {
      await toggleFavorite(recipe.id, !recipe.isFavorite);
      setRecipe({ ...recipe, isFavorite: !recipe.isFavorite });
    } catch {
      // Silently fail
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Recipe not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={handleToggleFavorite} hitSlop={8}>
            <Ionicons name={recipe.isFavorite ? 'heart' : 'heart-outline'} size={22} color={recipe.isFavorite ? colors.accent : colors.textSecondary} />
          </Pressable>
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        <Text style={[styles.recipeName, { color: colors.textPrimary }]}>{recipe.name}</Text>
        {recipe.description ? (
          <Text style={[styles.recipeDescription, { color: colors.textSecondary }]}>{recipe.description}</Text>
        ) : null}

        <View style={[styles.totalsCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
          <View style={styles.totalsGrid}>
            <View style={styles.totalItem}>
              <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{Math.round(recipe.totalCalories)}</Text>
              <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>cal</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{Math.round(recipe.totalProtein * 10) / 10}g</Text>
              <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>protein</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{Math.round(recipe.totalCarbs * 10) / 10}g</Text>
              <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>carbs</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{Math.round(recipe.totalFat * 10) / 10}g</Text>
              <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>fat</Text>
            </View>
          </View>
        </View>

        <View style={styles.ingredientsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ingredients ({recipe.itemCount})</Text>
          {recipe.items.map((item) => (
            <View key={item.id} style={[styles.ingredientRow, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
              <View style={styles.ingredientInfo}>
                <Text style={[styles.ingredientName, { color: colors.textPrimary }]} numberOfLines={1}>{item.foodName}</Text>
                {item.foodBrand ? (<Text style={[styles.ingredientBrand, { color: colors.textTertiary }]} numberOfLines={1}>{item.foodBrand}</Text>) : null}
              </View>
              <View style={styles.ingredientRight}>
                <Text style={[styles.ingredientServings, { color: colors.textSecondary }]}>{item.servings} {item.servingUnit || 'serving'}</Text>
                <Text style={[styles.ingredientCalories, { color: colors.textTertiary }]}>{Math.round(item.calories)} cal</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.mealTypeSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Log to</Text>
          <View style={styles.mealTypeGrid}>
            {MEAL_TYPE_ORDER.map((mt) => (
              <Pressable
                key={mt}
                style={[styles.mealTypeButton, { backgroundColor: selectedMealType === mt ? colors.accent : colors.bgSecondary, borderColor: selectedMealType === mt ? colors.accent : colors.borderDefault }]}
                onPress={() => setSelectedMealType(mt)}
              >
                <Text style={[styles.mealTypeButtonText, { color: selectedMealType === mt ? '#FFFFFF' : colors.textSecondary }]}>{MEAL_TYPE_LABELS[mt]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.bgPrimary }]}>
        <Pressable
          style={[styles.logButton, { backgroundColor: colors.accent, opacity: isLogging ? 0.5 : 1 }]}
          onPress={handleLog}
          disabled={isLogging}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logButtonText}>{isLogging ? 'Logging...' : `Log to ${MEAL_TYPE_LABELS[selectedMealType]}`}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: componentSpacing.screenEdgePadding, paddingVertical: spacing[3] },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: componentSpacing.screenEdgePadding, paddingBottom: spacing[4], gap: spacing[4] },
  recipeName: { ...typography.display.small },
  recipeDescription: { ...typography.body.medium },
  totalsCard: { padding: spacing[4], borderRadius: borderRadius.lg, borderWidth: 1 },
  totalsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  totalItem: { alignItems: 'center', gap: spacing[1] },
  totalValue: { ...typography.body.large, fontWeight: '700' },
  totalLabel: { ...typography.caption },
  ingredientsSection: { gap: spacing[2] },
  sectionTitle: { ...typography.body.large, fontWeight: '600' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderRadius: borderRadius.md, borderWidth: 1 },
  ingredientInfo: { flex: 1, gap: spacing[1] },
  ingredientName: { ...typography.body.medium, fontWeight: '500' },
  ingredientBrand: { ...typography.caption },
  ingredientRight: { alignItems: 'flex-end', gap: spacing[1] },
  ingredientServings: { ...typography.body.small },
  ingredientCalories: { ...typography.caption },
  mealTypeSection: { gap: spacing[3] },
  mealTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  mealTypeButton: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: borderRadius.full, borderWidth: 1 },
  mealTypeButtonText: { ...typography.body.small, fontWeight: '500' },
  footer: { paddingHorizontal: componentSpacing.screenEdgePadding, paddingVertical: spacing[3], paddingBottom: spacing[4] },
  logButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[4], borderRadius: borderRadius.lg, gap: spacing[2] },
  logButtonText: { ...typography.body.large, fontWeight: '600', color: '#FFFFFF' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { ...typography.title.medium },
});
