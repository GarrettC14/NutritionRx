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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { SEARCH_SETTINGS } from '@/constants/defaults';
import { MealType } from '@/constants/mealTypes';
import { useFoodSearchStore } from '@/stores';
import { FoodItem } from '@/types/domain';
import { FoodSearchResult } from '@/components/food/FoodSearchResult';

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

export default function AddFoodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>();

  const mealType = (params.mealType as MealType) || MealType.Snack;
  const date = params.date || new Date().toISOString().split('T')[0];

  // Local state
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, SEARCH_SETTINGS.debounceMs);

  // Store
  const {
    results,
    recentFoods,
    frequentFoods,
    isSearching,
    error,
    search,
    clearSearch,
    loadRecentFoods,
    loadFrequentFoods,
  } = useFoodSearchStore();

  // Load recent and frequent foods on mount
  useEffect(() => {
    loadRecentFoods();
    loadFrequentFoods();
  }, []);

  // Search when debounced value changes
  useEffect(() => {
    if (debouncedSearch.length >= SEARCH_SETTINGS.minQueryLength) {
      search(debouncedSearch);
    } else {
      clearSearch();
    }
  }, [debouncedSearch]);

  const handleFoodSelect = useCallback((food: FoodItem) => {
    router.push({
      pathname: '/add-food/log',
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

  const isSearching_ = searchText.length >= SEARCH_SETTINGS.minQueryLength;
  const showResults = isSearching_ && results.length > 0;
  const showNoResults = isSearching_ && results.length === 0 && !isSearching;
  const showRecent = !isSearching_ && recentFoods.length > 0;
  const showEmpty = !isSearching_ && recentFoods.length === 0;

  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <FoodSearchResult
      food={item}
      onPress={() => handleFoodSelect(item)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
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
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search foods..."
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
        <Pressable
          style={[styles.scanButton, { backgroundColor: colors.accent }]}
          onPress={handleScanBarcode}
        >
          <Ionicons name="barcode-outline" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
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
            <Pressable
              style={[styles.createButton, { borderColor: colors.accent }]}
              onPress={handleCreateFood}
            >
              <Text style={[styles.createButtonText, { color: colors.accent }]}>
                Create "{searchText}"
              </Text>
            </Pressable>
          </View>
        )}

        {showRecent && (
          <FlatList
            data={recentFoods}
            keyExtractor={(item) => item.id}
            renderItem={renderFoodItem}
            ListHeaderComponent={
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 0 }]}>
                Recently Logged
              </Text>
            }
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {showEmpty && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Search for a food or scan a barcode
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { borderTopColor: colors.borderDefault }]}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.bgSecondary }]}
          onPress={handleQuickAdd}
        >
          <Ionicons name="flash-outline" size={20} color={colors.accent} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>
            Quick Add
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.bgSecondary }]}
          onPress={handleCreateFood}
        >
          <Ionicons name="create-outline" size={20} color={colors.accent} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>
            Create Food
          </Text>
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
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...typography.body.large,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
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
  separator: {
    height: spacing[2],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing[4],
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
  createButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing[2],
  },
  createButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
    gap: spacing[3],
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
  },
  actionText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
});
