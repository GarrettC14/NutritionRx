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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { SEARCH_SETTINGS } from '@/constants/defaults';
import { getRestaurantBranding } from '@/constants/restaurantBranding';
import { MealType } from '@/constants/mealTypes';
import { useRestaurantStore } from '@/stores';
import { RestaurantFood, MenuCategory } from '@/types/restaurant';
import { RestaurantFoodCard } from '@/components/restaurant/RestaurantFoodCard';
import { CategoryChip } from '@/components/restaurant/CategoryChip';
import { RestaurantMenuSkeleton } from '@/components/ui/Skeleton';
import { TestIDs } from '@/constants/testIDs';

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

export default function RestaurantMenuScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    restaurantId: string;
    mealType?: string;
    date?: string;
  }>();

  const restaurantId = params.restaurantId;
  const mealType = (params.mealType as MealType) || MealType.Snack;
  const date = params.date || new Date().toISOString().split('T')[0];

  // Local state
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, SEARCH_SETTINGS.debounceMs);

  // Store state
  const {
    currentRestaurant,
    currentCategory,
    menuFoods,
    isLoading,
    isLoadingMenu,
    isSearching,
    error,
    selectRestaurant,
    selectCategory,
    loadRestaurantMenu,
    searchFoodsInRestaurant,
    clearCurrentRestaurant,
  } = useRestaurantStore();

  // Load restaurant on mount
  useEffect(() => {
    if (restaurantId) {
      selectRestaurant(restaurantId);
    }
    return () => {
      clearCurrentRestaurant();
    };
  }, [restaurantId]);

  // Search when debounced value changes
  useEffect(() => {
    if (restaurantId) {
      if (debouncedSearch.length >= SEARCH_SETTINGS.minQueryLength) {
        searchFoodsInRestaurant(restaurantId, debouncedSearch);
      } else if (debouncedSearch.length === 0) {
        loadRestaurantMenu(restaurantId, currentCategory?.id);
      }
    }
  }, [debouncedSearch, restaurantId]);

  const handleBack = () => {
    router.back();
  };

  const handleFoodSelect = useCallback(
    (food: RestaurantFood) => {
      router.push({
        pathname: '/restaurant/food/[foodId]' as any,
        params: {
          foodId: food.id,
          mealType,
          date,
        },
      });
    },
    [mealType, date, router]
  );

  const handleCategorySelect = (category: MenuCategory | null) => {
    selectCategory(category);
    setSearchText(''); // Clear search when changing category
  };

  const renderFoodItem = ({ item }: { item: RestaurantFood }) => (
    <RestaurantFoodCard
      food={item}
      onPress={() => handleFoodSelect(item)}
    />
  );

  // Show loading skeleton while fetching restaurant
  if (isLoading || !currentRestaurant) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <RestaurantMenuSkeleton />
      </SafeAreaView>
    );
  }

  const categories = currentRestaurant.categories || [];
  const hasCategories = categories.length > 0;
  const branding = getRestaurantBranding(currentRestaurant.id, currentRestaurant.name);

  return (
    <SafeAreaView testID={TestIDs.Restaurant.MenuScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID={TestIDs.Restaurant.MenuBackButton} onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={[styles.headerBadge, { backgroundColor: branding.backgroundColor }]}>
          <Text style={[styles.headerBadgeText, { color: branding.textColor }]}>
            {branding.initials}
          </Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {currentRestaurant.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {currentRestaurant.metadata.itemCount} items
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            testID={TestIDs.Restaurant.MenuSearchInput}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={`Search ${currentRestaurant.name}...`}
            placeholderTextColor={colors.textTertiary}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Filter */}
      {hasCategories && searchText.length === 0 && (
        <View style={styles.categoryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <CategoryChip
              testID={TestIDs.Restaurant.CategoryAll}
              label="All"
              isSelected={currentCategory === null}
              onPress={() => handleCategorySelect(null)}
            />
            {categories.map((category) => (
              <CategoryChip
                key={category.id}
                label={category.name}
                iconName={category.iconName}
                isSelected={currentCategory?.id === category.id}
                onPress={() => handleCategorySelect(category)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {(isLoadingMenu || isSearching) && menuFoods.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}

        {!isLoadingMenu && !isSearching && menuFoods.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchText.length > 0
                ? `No items found for "${searchText}"`
                : 'No menu items available'}
            </Text>
          </View>
        )}

        {menuFoods.length > 0 && (
          <FlatList
            data={menuFoods}
            keyExtractor={(item) => item.id}
            renderItem={renderFoodItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  backButton: {
    marginRight: spacing[3],
    padding: spacing[1],
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...typography.display.small,
  },
  headerSubtitle: {
    ...typography.caption,
  },
  searchContainer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[2],
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
  categoryContainer: {
    paddingBottom: spacing[2],
  },
  categoryScroll: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    gap: spacing[2],
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
    paddingBottom: spacing[4],
  },
  separator: {
    height: spacing[2],
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
});
