import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { SEARCH_SETTINGS } from '@/constants/defaults';
import { useFoodSearchStore, useFavoritesStore, useMealPlanStore } from '@/stores';
import { FoodItem } from '@/types/domain';
import { MealSlot } from '@/types/planning';
import { FoodSearchResult } from '@/components/food/FoodSearchResult';
import { FoodSearchSkeleton } from '@/components/ui/Skeleton';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { TestIDs } from '@/constants/testIDs';

const SAGE_GREEN = '#9CAF88';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export default function AddPlannedMealScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string; mealSlot: string }>();

  const date = params.date || new Date().toISOString().split('T')[0];
  const mealSlot = (params.mealSlot as MealSlot) || 'breakfast';

  // Local state
  const [searchText, setSearchText] = useState('');
  const [servings, setServings] = useState('1');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const debouncedSearch = useDebounce(searchText, SEARCH_SETTINGS.debounceMs);

  // Food search store
  const {
    results,
    recentFoods,
    frequentFoods,
    isSearching,
    isLoaded,
    search,
    clearSearch,
    loadRecentFoods,
    loadFrequentFoods,
  } = useFoodSearchStore();

  // Favorites store
  const {
    favorites,
    isLoaded: favoritesLoaded,
    loadFavorites,
  } = useFavoritesStore();

  // Meal plan store
  const { addPlannedMeal } = useMealPlanStore();

  // Load data on mount
  useEffect(() => {
    loadRecentFoods();
    loadFrequentFoods();
    loadFavorites();
  }, []);

  // Search when debounced value changes
  useEffect(() => {
    if (debouncedSearch.length >= SEARCH_SETTINGS.minQueryLength) {
      search(debouncedSearch);
    } else {
      clearSearch();
    }
  }, [debouncedSearch]);

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleFoodSelect = useCallback((food: FoodItem) => {
    setSelectedFood(food);
    setSearchText('');
    clearSearch();
    Keyboard.dismiss();
  }, []);

  const handleAddToMealPlan = async () => {
    if (!selectedFood) return;

    const servingsNum = parseFloat(servings) || 1;

    setIsAdding(true);
    try {
      await addPlannedMeal({
        date,
        mealSlot,
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        servings: servingsNum,
        calories: Math.round(selectedFood.calories * servingsNum),
        protein: Math.round(selectedFood.protein * servingsNum),
        carbs: Math.round(selectedFood.carbs * servingsNum),
        fat: Math.round(selectedFood.fat * servingsNum),
      });
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to add meal to plan. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedFood(null);
    setServings('1');
  };

  const servingsNum = parseFloat(servings) || 1;
  const calculatedMacros = selectedFood ? {
    calories: Math.round(selectedFood.calories * servingsNum),
    protein: Math.round(selectedFood.protein * servingsNum),
    carbs: Math.round(selectedFood.carbs * servingsNum),
    fat: Math.round(selectedFood.fat * servingsNum),
  } : null;

  const isSearching_ = searchText.length >= SEARCH_SETTINGS.minQueryLength;
  const showResults = isSearching_ && results.length > 0;
  const showNoResults = isSearching_ && results.length === 0 && !isSearching;
  const showSections = !isSearching_ && !selectedFood;

  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <FoodSearchResult
      food={item}
      onPress={() => handleFoodSelect(item)}
    />
  );

  const renderFoodItemSimple = (food: FoodItem) => (
    <View key={food.id} style={styles.foodItemWrapper}>
      <FoodSearchResult
        food={food}
        onPress={() => handleFoodSelect(food)}
      />
    </View>
  );

  // Show skeleton while initial data is loading
  if (!isLoaded || !favoritesLoaded) {
    return (
      <SafeAreaView testID={TestIDs.AddPlannedMeal.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Add Planned Meal',
            headerStyle: { backgroundColor: colors.bgPrimary },
            headerTintColor: colors.textPrimary,
          }}
        />
        <FoodSearchSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Add Planned Meal',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
        }}
      />
      <SafeAreaView testID={TestIDs.AddPlannedMeal.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['bottom']}>
        {/* Header Info */}
        <View style={[styles.headerInfo, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.headerInfoRow}>
            <Ionicons name="calendar-outline" size={18} color={SAGE_GREEN} />
            <Text style={[styles.headerInfoText, { color: colors.textPrimary }]}>
              {formatDate(date)}
            </Text>
          </View>
          <View style={styles.headerInfoRow}>
            <Ionicons name="restaurant-outline" size={18} color={SAGE_GREEN} />
            <Text style={[styles.headerInfoText, { color: colors.textPrimary }]}>
              {SLOT_LABELS[mealSlot]}
            </Text>
          </View>
        </View>

        {/* Selected Food Section */}
        {selectedFood ? (
          <View style={styles.selectedSection}>
            <View style={[styles.selectedCard, { backgroundColor: colors.bgSecondary }]}>
              <View style={styles.selectedHeader}>
                <Text style={[styles.selectedLabel, { color: colors.textSecondary }]}>
                  Selected Food
                </Text>
                <Pressable testID={TestIDs.AddPlannedMeal.ClearSelectionButton} onPress={handleClearSelection}>
                  <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                </Pressable>
              </View>
              <Text style={[styles.selectedName, { color: colors.textPrimary }]}>
                {selectedFood.name}
              </Text>
              {selectedFood.brand && (
                <Text style={[styles.selectedBrand, { color: colors.textSecondary }]}>
                  {selectedFood.brand}
                </Text>
              )}

              {/* Servings */}
              <View style={styles.servingsRow}>
                <Text style={[styles.servingsLabel, { color: colors.textSecondary }]}>
                  Servings
                </Text>
                <View style={styles.servingsControls}>
                  <Pressable
                    testID={TestIDs.AddPlannedMeal.ServingsMinusButton}
                    style={[styles.servingsButton, { backgroundColor: colors.bgElevated }]}
                    onPress={() => {
                      const newVal = Math.max(0.5, servingsNum - 0.5);
                      setServings(newVal.toString());
                    }}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </Pressable>
                  <TextInput
                    testID={TestIDs.AddPlannedMeal.ServingsInput}
                    style={[styles.servingsInput, { color: colors.textPrimary, backgroundColor: colors.bgElevated }]}
                    value={servings}
                    onChangeText={setServings}
                    keyboardType="decimal-pad"
                    textAlign="center"
                  />
                  <Pressable
                    testID={TestIDs.AddPlannedMeal.ServingsPlusButton}
                    style={[styles.servingsButton, { backgroundColor: colors.bgElevated }]}
                    onPress={() => {
                      const newVal = servingsNum + 0.5;
                      setServings(newVal.toString());
                    }}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </View>

              {/* Macros Preview */}
              {calculatedMacros && (
                <View style={[styles.macrosPreview, { borderTopColor: colors.borderDefault }]}>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
                      {calculatedMacros.calories}
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>cal</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
                      {calculatedMacros.protein}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>protein</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
                      {calculatedMacros.carbs}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>carbs</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
                      {calculatedMacros.fat}g
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>fat</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Add Button */}
            <Pressable
              testID={TestIDs.AddPlannedMeal.AddButton}
              style={[styles.addButton, { backgroundColor: SAGE_GREEN }]}
              onPress={handleAddToMealPlan}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Add to Meal Plan</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={[styles.searchBar, { backgroundColor: colors.bgSecondary }]}>
                <Ionicons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  testID={TestIDs.AddPlannedMeal.SearchInput}
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Search foods..."
                  placeholderTextColor={colors.textTertiary}
                  value={searchText}
                  onChangeText={setSearchText}
                  returnKeyType="search"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  autoFocus
                />
                {searchText.length > 0 && (
                  <Pressable testID={TestIDs.AddPlannedMeal.ClearSearchButton} onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {isSearching && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={SAGE_GREEN} />
                </View>
              )}

              {showResults && (
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.id}
                  renderItem={renderFoodItem}
                  contentContainerStyle={styles.listContent}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
              )}

              {showNoResults && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No foods found for "{searchText}"
                  </Text>
                </View>
              )}

              {showSections && (
                <ScrollView
                  testID={TestIDs.AddPlannedMeal.SectionsScrollView}
                  style={styles.sectionsContainer}
                  contentContainerStyle={styles.sectionsContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Favorites Section */}
                  <CollapsibleSection
                    title="Favorites"
                    itemCount={favorites.length}
                    defaultExpanded={true}
                    emptyMessage="No favorites yet."
                  >
                    {favorites.map(renderFoodItemSimple)}
                  </CollapsibleSection>

                  {/* Recently Logged Section */}
                  <CollapsibleSection
                    title="Recently Logged"
                    itemCount={recentFoods.length}
                    defaultExpanded={false}
                    emptyMessage="No recently logged foods."
                  >
                    {recentFoods.map(renderFoodItemSimple)}
                  </CollapsibleSection>

                  {/* Frequent Foods Section */}
                  <CollapsibleSection
                    title="Frequently Logged"
                    itemCount={frequentFoods.length}
                    defaultExpanded={false}
                    emptyMessage="No frequently logged foods."
                  >
                    {frequentFoods.map(renderFoodItemSimple)}
                  </CollapsibleSection>
                </ScrollView>
              )}
            </View>
          </>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[3],
    marginHorizontal: componentSpacing.screenEdgePadding,
    marginTop: spacing[3],
    borderRadius: borderRadius.md,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerInfoText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[3],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...typography.body.large,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  sectionsContainer: {
    flex: 1,
  },
  sectionsContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[2],
    paddingBottom: spacing[4],
  },
  separator: {
    height: spacing[2],
  },
  foodItemWrapper: {
    marginBottom: spacing[2],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    gap: spacing[3],
  },
  emptyText: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  selectedSection: {
    flex: 1,
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
  selectedCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  selectedLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  selectedName: {
    ...typography.title.medium,
  },
  selectedBrand: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[4],
  },
  servingsLabel: {
    ...typography.body.medium,
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  servingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsInput: {
    width: 60,
    height: 36,
    borderRadius: borderRadius.md,
    ...typography.body.large,
    fontWeight: '600',
  },
  macrosPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    ...typography.body.large,
    fontWeight: '700',
  },
  macroLabel: {
    ...typography.caption,
    marginTop: spacing[1],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: 54,
    borderRadius: borderRadius.lg,
    marginTop: spacing[6],
  },
  addButtonText: {
    ...typography.body.large,
    fontWeight: '600',
    color: '#fff',
  },
});
