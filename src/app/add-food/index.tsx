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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { SEARCH_SETTINGS } from '@/constants/defaults';
import { MealType, getMealTypeName } from '@/constants/mealTypes';
import { useFoodLogStore, useFoodSearchStore, useFavoritesStore, useRestaurantStore, useRecipeStore } from '@/stores';
import { FoodItem, FoodItemWithServing } from '@/types/domain';
import { RestaurantFood } from '@/types/restaurant';
import { FoodSearchResult } from '@/components/food/FoodSearchResult';
import { FoodSearchSkeleton } from '@/components/ui/Skeleton';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FoodSection } from '@/components/food/FoodSection';
import { UndoToast } from '@/components/ui/UndoToast';
import { foodRepository, favoriteRepository } from '@/repositories';
import { USDAFoodService } from '@/services/usda/USDAFoodService';
import { micronutrientRepository } from '@/repositories/micronutrientRepository';
import { TestIDs, foodSearchResult } from '@/constants/testIDs';
import * as Sentry from '@sentry/react-native';
import { CrashFallbackScreen } from '@/components/CrashFallbackScreen';

import { Recipe } from '@/types/recipes';

// Tab types
type AddFoodTab = 'all' | 'restaurants' | 'recipes' | 'my_foods';

const TAB_OPTIONS = [
  { value: 'all' as AddFoodTab, label: 'All', testID: TestIDs.AddFood.TabAll },
  { value: 'restaurants' as AddFoodTab, label: 'Restaurants', testID: TestIDs.AddFood.TabRestaurants },
  { value: 'recipes' as AddFoodTab, label: 'Recipes' },
  { value: 'my_foods' as AddFoodTab, label: 'My Foods', testID: TestIDs.AddFood.TabMyFoods },
];

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

function calculateNutritionForServing(food: FoodItem, servingSize: number) {
  if (!food.servingSize || food.servingSize <= 0) {
    return {
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    };
  }

  const multiplier = servingSize / food.servingSize;
  return {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fat: Math.round(food.fat * multiplier * 10) / 10,
  };
}

function AddFoodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string; date?: string; searchQuery?: string }>();

  const mealType = params.mealType || MealType.Snack;
  const date = params.date || new Date().toISOString().split('T')[0];

  // Tab state
  const [activeTab, setActiveTab] = useState<AddFoodTab>('all');

  // Search state
  const [searchText, setSearchText] = useState(params.searchQuery || '');
  const debouncedSearch = useDebounce(searchText, SEARCH_SETTINGS.debounceMs);

  const [favoriteServingDefaults, setFavoriteServingDefaults] = useState<Record<
    string,
    { size: number; unit: string }
  >>({});

  // Custom foods state
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [quickLogUndo, setQuickLogUndo] = useState<{
    entryId: string;
    message: string;
  } | null>(null);

  // My Foods search results (local filtering)
  const [myFoodsSearchResults, setMyFoodsSearchResults] = useState<FoodItem[]>([]);

  // Food search store
  const {
    results,
    mealContextFoods,
    scannedHistory,
    recentFoods,
    isSearching,
    isLoadingRecent,
    isLoadingMealContext,
    isLoadingScanned,
    isLoaded,
    search,
    clearSearch,
    loadRecentFoods,
    loadFrequentFoods,
    loadMealContextFoods,
    loadScannedHistory,
  } = useFoodSearchStore();

  const { addLogEntry, deleteLogEntry } = useFoodLogStore();

  // Favorites store
  const {
    favorites,
    isLoaded: favoritesLoaded,
    loadFavorites,
  } = useFavoritesStore();

  // Restaurant store
  const {
    searchResults: restaurantSearchResults,
    isSearching: isSearchingRestaurants,
    searchFoods: searchRestaurantFoods,
  } = useRestaurantStore();

  // Recipe store
  const {
    recipes,
    isLoaded: recipesLoaded,
    loadRecipes,
  } = useRecipeStore();

  // Load data on mount
  useEffect(() => {
    Promise.all([
      loadFavorites(),
      loadFrequentFoods(),
      mealType ? loadMealContextFoods(mealType, 10) : Promise.resolve(),
      loadRecentFoods(),
      loadScannedHistory(5),
      loadCustomFoods(),
      loadRecipes(),
    ]);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadFavoriteDefaults = async () => {
      const defaults = await Promise.all(
        favorites.map(async (food) => {
          const defaultsForFood = await favoriteRepository.getDefaults(food.id);
          if (!defaultsForFood?.servingSize || !defaultsForFood.servingUnit) return null;
          return {
            foodId: food.id,
            servingSize: defaultsForFood.servingSize,
            servingUnit: defaultsForFood.servingUnit,
          };
        })
      );

      if (!isActive) return;

      const nextMap: Record<string, { size: number; unit: string }> = {};
      defaults.forEach((entry) => {
        if (!entry) return;
        nextMap[entry.foodId] = {
          size: entry.servingSize,
          unit: entry.servingUnit,
        };
      });
      setFavoriteServingDefaults(nextMap);
    };

    loadFavoriteDefaults().catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, [favorites]);

  // Refresh recent foods when screen regains focus (e.g. after logging a food)
  useFocusEffect(
    useCallback(() => {
      Promise.all([
        loadRecentFoods(),
        loadFrequentFoods(),
        mealType ? loadMealContextFoods(mealType, 10) : Promise.resolve(),
        loadScannedHistory(5),
      ]);
    }, [loadRecentFoods, loadFrequentFoods, loadScannedHistory, loadMealContextFoods, mealType])
  );

  const loadCustomFoods = async () => {
    try {
      const foods = await foodRepository.getUserCreated();
      setCustomFoods(foods);
    } catch (error) {
      if (__DEV__) console.error('Failed to load custom foods:', error);
    }
  };

  // Handle tab changes - clear search
  const handleTabChange = useCallback((tab: AddFoodTab) => {
    setActiveTab(tab);
    setSearchText('');
    clearSearch();
    setMyFoodsSearchResults([]);
  }, [clearSearch]);

  // Search based on active tab
  useEffect(() => {
    if (debouncedSearch.length < SEARCH_SETTINGS.minQueryLength) {
      clearSearch();
      setMyFoodsSearchResults([]);
      return;
    }

    switch (activeTab) {
      case 'all':
        // Search both local DB and restaurant foods
        search(debouncedSearch);
        searchRestaurantFoods(debouncedSearch);
        break;
      case 'restaurants':
        // Search restaurant foods only
        searchRestaurantFoods(debouncedSearch);
        break;
      case 'my_foods':
        // Local filter of favorites + custom foods
        const query = debouncedSearch.toLowerCase();
        const filteredFavorites = favorites.filter(f =>
          f.name.toLowerCase().includes(query) ||
          f.brand?.toLowerCase().includes(query)
        );
        const filteredCustom = customFoods.filter(f =>
          f.name.toLowerCase().includes(query) ||
          f.brand?.toLowerCase().includes(query)
        );
        // Dedupe by ID (favorites might include custom foods)
        const seenIds = new Set<string>();
        const combined: FoodItem[] = [];
        [...filteredFavorites, ...filteredCustom].forEach(food => {
          if (!seenIds.has(food.id)) {
            seenIds.add(food.id);
            combined.push(food);
          }
        });
        setMyFoodsSearchResults(combined);
        break;
    }
  }, [debouncedSearch, activeTab, favorites, customFoods]);

  // Combine results for "All" tab when searching
  const handleFoodSelect = useCallback(async (food: FoodItem) => {
    let foodId = food.id;

    // If this is an unsaved USDA food (prefixed ID), persist it first
    if (food.id.startsWith('usda-') && food.usdaFdcId) {
      try {
        // Check if already saved locally
        const existing = await foodRepository.findByFdcId(food.usdaFdcId);
        if (existing) {
          foodId = existing.id;
        } else {
          // Save to local database
          const saved = await foodRepository.create({
            name: food.name,
            brand: food.brand,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            fiber: food.fiber,
            sugar: food.sugar,
            sodium: food.sodium,
            servingSize: food.servingSize,
            servingUnit: food.servingUnit,
            servingSizeGrams: food.servingSizeGrams,
            source: 'usda',
            sourceId: String(food.usdaFdcId),
            isVerified: true,
            isUserCreated: false,
            usdaFdcId: food.usdaFdcId,
            usdaNutrientCount: food.usdaNutrientCount,
          });
          foodId = saved.id;

          // Fetch and store micronutrient data in background
          USDAFoodService.getFoodDetails(food.usdaFdcId).then((details) => {
            if (details) {
              const nutrients = USDAFoodService.mapNutrients(details.foodNutrients);
              micronutrientRepository.storeFoodNutrients(saved.id, nutrients);
            }
          }).catch(() => {
            // Non-critical: micronutrients can be fetched later
          });
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to save USDA food:', error);
        return; // Don't navigate if save failed
      }
    }

    router.push({
      pathname: '/add-food/log',
      params: {
        foodId,
        mealType,
        date,
      },
    });
  }, [mealType, date, router]);

  const handleFoodPress = useCallback((food: FoodItem) => {
    router.push({
      pathname: '/add-food/log',
      params: {
        foodId: food.id,
        mealType,
        date,
      },
    });
  }, [mealType, date, router]);

  const getServingHintForFood = useCallback((food: FoodItem | FoodItemWithServing) => {
    const foodWithServing = food as FoodItemWithServing;
    const favoriteServing = favoriteServingDefaults[food.id];

    if (favoriteServing) {
      return favoriteServing;
    }

    if (foodWithServing.servingHint) {
      return foodWithServing.servingHint;
    }

    if (!food.servingSize) {
      return undefined;
    }

    return {
      size: food.servingSize,
      unit: food.servingUnit,
    };
  }, [favoriteServingDefaults]);

  const handleQuickLog = useCallback(async (
    food: FoodItem | FoodItemWithServing,
    serving: { size: number; unit: string }
  ) => {
    const currentMealType = mealType || MealType.Snack;
    const currentDate = date;

    const normalizedServing = serving?.size && serving.size > 0 ? serving.size : food.servingSize;
    const nutrition = calculateNutritionForServing(food as FoodItem, normalizedServing);

    try {
      const entry = await addLogEntry({
        foodItemId: food.id,
        date: currentDate,
        mealType: currentMealType,
        servings: normalizedServing,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
      });

      setQuickLogUndo({
        entryId: entry.id,
        message: `${food.name} logged`,
      });
    } catch (error) {
      if (__DEV__) console.error('Quick log failed:', error);
    }
  }, [mealType, date, addLogEntry]);

  const handleQuickLogUndo = useCallback(async () => {
    if (!quickLogUndo) return;

    try {
      await deleteLogEntry(quickLogUndo.entryId);
    } catch (error) {
      if (__DEV__) console.error('Undo quick log failed:', error);
    } finally {
      setQuickLogUndo(null);
    }
  }, [quickLogUndo, deleteLogEntry]);

  const handleQuickLogToastDismiss = useCallback(() => {
    setQuickLogUndo(null);
  }, []);

  const handleRestaurantFoodSelect = useCallback((food: RestaurantFood) => {
    router.push({
      pathname: '/restaurant/food/[foodId]' as any,
      params: {
        foodId: food.id,
        mealType,
        date,
      },
    });
  }, [mealType, date, router]);

  const handleQuickAdd = () => {
    router.push({
      pathname: '/add-food/quick',
      params: { mealType, date },
    });
  };

  const handleAIPhoto = () => {
    router.push({
      pathname: '/add-food/ai-photo',
      params: { mealType, date },
    });
  };

  const handleCreateFood = () => {
    router.push({
      pathname: '/add-food/create',
      params: { mealType, date },
    });
  };

  const handleScanBarcode = () => {
    router.push({
      pathname: '/add-food/scan',
      params: { mealType, date },
    });
  };

  const handleBrowseRestaurants = () => {
    router.push({
      pathname: '/restaurant' as any,
      params: { mealType, date },
    });
  };

  const handleBrowseRecipes = () => {
    router.push('/recipes' as any);
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: '/recipes/[id]',
      params: { id: recipe.id, mealType, date },
    } as any);
  };

  // Compute display states
  const isActiveSearch = searchText.length >= SEARCH_SETTINGS.minQueryLength;
  const isAnySearching = isSearching || isSearchingRestaurants;


  // Render functions
  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <FoodSearchResult
      food={item}
      testID={foodSearchResult(item.id)}
      onPress={() => handleFoodSelect(item)}
    />
  );

  const renderFoodItemSimple = (food: FoodItem) => (
    <View key={food.id} style={styles.foodItemWrapper}>
      <FoodSearchResult
        food={food}
        testID={foodSearchResult(food.id)}
        onPress={() => handleFoodSelect(food)}
      />
    </View>
  );

  const renderRestaurantFoodItem = ({ item }: { item: RestaurantFood }) => (
    <Pressable
      style={[styles.restaurantFoodItem, { backgroundColor: colors.bgSecondary }]}
      onPress={() => handleRestaurantFoodSelect(item)}
    >
      <View style={styles.restaurantFoodInfo}>
        <Text style={[styles.restaurantFoodName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.restaurantFoodBrand, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.restaurantName}
        </Text>
      </View>
      <Text style={[styles.restaurantFoodCalories, { color: colors.textSecondary }]}>
        {item.nutrition.calories} cal
      </Text>
    </Pressable>
  );

  // Render "All" tab content
  const renderAllTabContent = () => {
    if (isActiveSearch) {
      // Show combined search results
      const hasLocalResults = results.length > 0;
      const hasRestaurantResults = restaurantSearchResults.length > 0;
      const hasNoResults = !hasLocalResults && !hasRestaurantResults && !isAnySearching;

      if (hasNoResults) {
        return renderNoResultsEmpty();
      }

      return (
        <ScrollView
          style={styles.sectionsContainer}
          contentContainerStyle={styles.sectionsContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {hasLocalResults && (
            <View style={styles.searchSection}>
              <Text style={[styles.searchSectionTitle, { color: colors.textSecondary }]}>
                Foods
              </Text>
              {results.map(renderFoodItemSimple)}
            </View>
          )}
          {hasRestaurantResults && (
            <View style={styles.searchSection}>
              <Text style={[styles.searchSectionTitle, { color: colors.textSecondary }]}>
                Restaurant Foods
              </Text>
              {restaurantSearchResults.map((food) => (
                <View key={food.id} style={styles.foodItemWrapper}>
                  {renderRestaurantFoodItem({ item: food })}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      );
    }

    const isDefaultLoading =
      isLoadingRecent || isLoadingMealContext || isLoadingScanned;
    const hasAnyContent =
      favorites.length > 0 ||
      mealContextFoods.length > 0 ||
      recentFoods.length > 0 ||
      scannedHistory.length > 0;

    if (!hasAnyContent && !isDefaultLoading) {
      return renderInitialEmpty();
    }

    return (
      <ScrollView
        style={styles.sectionsContainer}
        contentContainerStyle={styles.sectionsContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {favorites.length > 0 ? (
          <FoodSection
            testID={TestIDs.AddFood.FavoritesSection}
            title="Favorites"
            icon="star"
            foods={favorites}
            maxVisible={5}
            onFoodPress={handleFoodPress}
            onQuickLog={handleQuickLog}
            getServingHint={getServingHintForFood}
          />
        ) : null}

        {mealType ? (
          <FoodSection
            title={`For ${getMealTypeName(mealType)}`}
            icon="sync-outline"
            foods={mealContextFoods}
            isLoading={isLoadingMealContext}
            maxVisible={5}
            onFoodPress={handleFoodPress}
            onQuickLog={handleQuickLog}
            getServingHint={getServingHintForFood}
          />
        ) : null}

        <FoodSection
          title="Recently Logged"
          icon="time-outline"
          foods={recentFoods}
          isLoading={isLoadingRecent}
          maxVisible={5}
          onFoodPress={handleFoodPress}
          onQuickLog={handleQuickLog}
          getServingHint={getServingHintForFood}
        />

        {scannedHistory.length > 0 ? (
          <FoodSection
            title="Previously Scanned"
            icon="phone-portrait-outline"
            foods={scannedHistory}
            isLoading={isLoadingScanned}
            maxVisible={3}
            onFoodPress={handleFoodPress}
            onQuickLog={handleQuickLog}
            getServingHint={getServingHintForFood}
          />
        ) : null}
      </ScrollView>
    );
  };

  // Render "Restaurants" tab content
  const renderRestaurantsTabContent = () => {
    if (isActiveSearch) {
      const hasResults = restaurantSearchResults.length > 0;
      const hasNoResults = !hasResults && !isSearchingRestaurants;

      if (hasNoResults) {
        return renderNoResultsEmpty();
      }

      return (
        <FlatList
          data={restaurantSearchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderRestaurantFoodItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      );
    }

    // Default view: Browse all restaurants link
    return (
      <View style={styles.restaurantDefaultState}>
        <Ionicons name="restaurant-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Search restaurant foods
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Or browse our complete restaurant database
        </Text>
        <Pressable
          testID={TestIDs.AddFood.BrowseRestaurantsButton}
          style={[styles.browseButton, { backgroundColor: colors.accent }]}
          onPress={handleBrowseRestaurants}
        >
          <Text style={styles.browseButtonText}>Browse all restaurants</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  };

  // Render "My Foods" tab content
  const renderMyFoodsTabContent = () => {
    if (isActiveSearch) {
      const hasResults = myFoodsSearchResults.length > 0;

      if (!hasResults) {
        return renderNoResultsEmpty();
      }

      return (
        <FlatList
          data={myFoodsSearchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderFoodItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      );
    }

    // Default view: Favorites + Custom Foods sections
    const hasAnyContent = favorites.length > 0 || customFoods.length > 0;

    if (!hasAnyContent) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="nutrition-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No saved foods yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Create custom foods or favorite existing ones
          </Text>
          <Pressable
            style={[styles.createFoodButton, { backgroundColor: colors.accent }]}
            onPress={handleCreateFood}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createFoodButtonText}>Create Food</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.sectionsContainer}
        contentContainerStyle={styles.sectionsContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <CollapsibleSection
          title="Favorites"
          itemCount={favorites.length}
          defaultExpanded={true}
          emptyMessage="Tap the star on any food to save it here"
        >
          {favorites.map(renderFoodItemSimple)}
        </CollapsibleSection>

        <CollapsibleSection
          title="Custom Foods"
          itemCount={customFoods.length}
          defaultExpanded={true}
          emptyMessage="Create your first custom food"
        >
          {customFoods.map(renderFoodItemSimple)}
        </CollapsibleSection>
      </ScrollView>
    );
  };

  // Render "Recipes" tab content
  const renderRecipesTabContent = () => {
    if (recipes.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No recipes yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Save meals as recipes for quick logging
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.sectionsContainer}
        contentContainerStyle={styles.sectionsContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {recipes.slice(0, 10).map((recipe) => (
          <Pressable
            key={recipe.id}
            style={[styles.restaurantFoodItem, { backgroundColor: colors.bgSecondary }]}
            onPress={() => handleRecipePress(recipe)}
          >
            <View style={styles.restaurantFoodInfo}>
              <Text style={[styles.restaurantFoodName, { color: colors.textPrimary }]} numberOfLines={1}>
                {recipe.name}
              </Text>
              <Text style={[styles.restaurantFoodBrand, { color: colors.textSecondary }]} numberOfLines={1}>
                {recipe.itemCount} {recipe.itemCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
            <Text style={[styles.restaurantFoodCalories, { color: colors.textSecondary }]}>
              {Math.round(recipe.totalCalories)} cal
            </Text>
          </Pressable>
        ))}
        {recipes.length > 10 && (
          <Pressable
            style={[styles.browseButton, { backgroundColor: colors.accent }]}
            onPress={handleBrowseRecipes}
          >
            <Text style={styles.browseButtonText}>View all recipes</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </ScrollView>
    );
  };

  // Render no results empty state
  const renderNoResultsEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        No results found
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Try a different search or:
      </Text>
      <View style={styles.emptyActions}>
        <Pressable
          style={[styles.emptyActionButton, { backgroundColor: colors.accent }]}
          onPress={handleAIPhoto}
        >
          <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
          <Text style={styles.emptyActionText}>AI Photo</Text>
        </Pressable>
        <Pressable
          style={[styles.emptyActionButton, { backgroundColor: colors.bgSecondary }]}
          onPress={handleCreateFood}
        >
          <Ionicons name="create-outline" size={20} color={colors.accent} />
          <Text style={[styles.emptyActionTextSecondary, { color: colors.textPrimary }]}>
            Create Food
          </Text>
        </Pressable>
      </View>
    </View>
  );

  // Render initial empty state (no favorites, no recent)
  const renderInitialEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Start logging your meals
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Your favorites and frequently used foods will appear here for quick access.
      </Text>
    </View>
  );

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'all':
        return renderAllTabContent();
      case 'restaurants':
        return renderRestaurantsTabContent();
      case 'recipes':
        return renderRecipesTabContent();
      case 'my_foods':
        return renderMyFoodsTabContent();
    }
  };

  // Show skeleton while initial data is loading
  if (!isLoaded || !favoritesLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <FoodSearchSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID={TestIDs.AddFood.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Add Food
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            testID={TestIDs.AddFood.SearchInput}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search foods..."
            placeholderTextColor={colors.textTertiary}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchText.length > 0 && (
            <Pressable testID={TestIDs.AddFood.ClearSearchButton} onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
        <Pressable
          testID={TestIDs.AddFood.ScanFAB}
          style={[styles.scanButton, { backgroundColor: colors.accent }]}
          onPress={handleScanBarcode}
        >
          <Ionicons name="barcode-outline" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Tab Filters */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          options={TAB_OPTIONS}
          value={activeTab}
          onChange={handleTabChange}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isAnySearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}

        {!isAnySearching && renderTabContent()}
      </View>

      {quickLogUndo ? (
        <UndoToast
          message={quickLogUndo.message}
          onUndo={handleQuickLogUndo}
          visible
          onDismiss={handleQuickLogToastDismiss}
        />
      ) : null}

      {/* Bottom Action Buttons */}
      <View style={[styles.bottomButtonsContainer, { backgroundColor: colors.bgPrimary }]}>
        <Pressable
          testID={TestIDs.AddFood.AIPhotoButton}
          style={[styles.bottomButton, { backgroundColor: colors.accent }]}
          onPress={handleAIPhoto}
        >
          <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
          <Text style={styles.bottomButtonText}>AI Photo</Text>
        </Pressable>
        <Pressable
          testID={TestIDs.AddFood.CreateFoodButton}
          style={[styles.bottomButton, { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.borderDefault }]}
          onPress={handleCreateFood}
        >
          <Ionicons name="create-outline" size={22} color={colors.accent} />
          <Text style={[styles.bottomButtonTextSecondary, { color: colors.textPrimary }]}>Create Food</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
  headerTitle: {
    ...typography.display.small,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    gap: spacing[2],
  },
  searchBar: {
    flex: 1,
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
  scanButton: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
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
  searchSection: {
    marginBottom: spacing[4],
  },
  searchSectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[2],
  },
  // Restaurant food item styles
  restaurantFoodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  restaurantFoodInfo: {
    flex: 1,
  },
  restaurantFoodName: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  restaurantFoodBrand: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  restaurantFoodCalories: {
    ...typography.body.small,
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    gap: spacing[3],
  },
  emptyTitle: {
    ...typography.title.medium,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  emptyActionText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyActionTextSecondary: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  // Restaurant tab empty state
  restaurantDefaultState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    gap: spacing[3],
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    marginTop: spacing[2],
  },
  browseButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // My Foods tab empty create button
  createFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    marginTop: spacing[2],
  },
  createFoodButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Bottom action buttons
  bottomButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  bottomButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomButtonTextSecondary: {
    ...typography.body.medium,
    fontWeight: '600',
  },
});

export default function AddFoodScreenWithErrorBoundary() {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <CrashFallbackScreen resetError={resetError} />}>
      <AddFoodScreen />
    </Sentry.ErrorBoundary>
  );
}
