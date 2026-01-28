import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { SEARCH_SETTINGS } from '@/constants/defaults';
import { MealType } from '@/constants/mealTypes';
import { useRestaurantStore } from '@/stores';
import { Restaurant } from '@/types/restaurant';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { RestaurantListSkeleton } from '@/components/ui/Skeleton';
import { PremiumBanner } from '@/components/premium';
import { usePremium, PremiumFeature } from '@/hooks/usePremium';

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

export default function RestaurantListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>();

  const mealType = (params.mealType as MealType) || MealType.Snack;
  const date = params.date || new Date().toISOString().split('T')[0];

  // Local state
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearchingLocal, setIsSearchingLocal] = useState(false);
  const debouncedSearch = useDebounce(searchText, SEARCH_SETTINGS.debounceMs);

  // Store state
  const {
    restaurants,
    recentRestaurants,
    isLoading,
    isDataInitialized,
    error,
    initializeData,
    loadRestaurants,
    loadRecentRestaurants,
    searchRestaurants,
  } = useRestaurantStore();

  // Premium state
  const { isPremium } = usePremium();
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);

  // Initialize data and load restaurants on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        if (!isDataInitialized) {
          await initializeData();
        }

        // Check if initialization succeeded before loading restaurants
        // Use getState() to get the current store state after initializeData
        const storeState = useRestaurantStore.getState();
        if (!mounted || storeState.error) {
          return; // Don't load restaurants if there was an error
        }

        await Promise.all([loadRestaurants(), loadRecentRestaurants()]);
      } catch (err) {
        // Errors are handled by the store
        console.error('Restaurant initialization error:', err);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [isDataInitialized, initializeData, loadRestaurants, loadRecentRestaurants]);

  // Search when debounced value changes
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearch.length >= SEARCH_SETTINGS.minQueryLength) {
        setIsSearchingLocal(true);
        const results = await searchRestaurants(debouncedSearch);
        setSearchResults(results);
        setIsSearchingLocal(false);
      } else {
        setSearchResults([]);
      }
    };
    performSearch();
  }, [debouncedSearch]);

  const handleRestaurantSelect = useCallback(
    (restaurant: Restaurant) => {
      router.push({
        pathname: '/restaurant/[restaurantId]' as any,
        params: {
          restaurantId: restaurant.id,
          mealType,
          date,
        },
      });
    },
    [mealType, date, router]
  );

  const handleBack = () => {
    router.back();
  };

  const isSearching_ = searchText.length >= SEARCH_SETTINGS.minQueryLength;
  const showSearchResults = isSearching_ && searchResults.length > 0;
  const showNoResults = isSearching_ && searchResults.length === 0 && !isSearchingLocal;
  const showSections = !isSearching_;

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => (
    <RestaurantCard
      restaurant={item}
      onPress={() => handleRestaurantSelect(item)}
    />
  );

  const renderRestaurantSimple = (restaurant: Restaurant) => (
    <View key={restaurant.id} style={styles.restaurantItemWrapper}>
      <RestaurantCard
        restaurant={restaurant}
        onPress={() => handleRestaurantSelect(restaurant)}
      />
    </View>
  );

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Restaurants
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => {
              initializeData().then(() => loadRestaurants());
            }}
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading skeleton while initializing
  if (!isDataInitialized || (isLoading && restaurants.length === 0)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <RestaurantListSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Restaurants
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search restaurants..."
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

      {/* Content */}
      <View style={styles.content}>
        {isSearchingLocal && (
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}

        {showSearchResults && (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderRestaurantItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {showNoResults && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No restaurants found for "{searchText}"
            </Text>
          </View>
        )}

        {showSections && (
          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id}
            renderItem={renderRestaurantItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                {/* Premium banner for free users */}
                {!isPremium && showPremiumBanner && (
                  <View style={styles.premiumBannerContainer}>
                    <PremiumBanner
                      title="Unlock Premium"
                      description="Get unlimited restaurant tracking and advanced features"
                      variant="compact"
                      onDismiss={() => setShowPremiumBanner(false)}
                      onUpgradePress={() => {
                        // Navigate to premium screen (to be implemented)
                        console.log('Navigate to premium');
                      }}
                    />
                  </View>
                )}
                {recentRestaurants.length > 0 ? (
                  <View style={styles.recentSection}>
                    <CollapsibleSection
                      title="Recently Used"
                      itemCount={recentRestaurants.length}
                      defaultExpanded={true}
                    >
                      {recentRestaurants.map(renderRestaurantSimple)}
                    </CollapsibleSection>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                      All Restaurants
                    </Text>
                  </View>
                ) : null}
              </>
            }
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
  headerTitle: {
    ...typography.display.small,
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[3],
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
    gap: spacing[3],
  },
  loadingText: {
    ...typography.body.medium,
    textAlign: 'center',
    marginHorizontal: spacing[4],
  },
  retryButton: {
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  searchingIndicator: {
    position: 'absolute',
    top: spacing[2],
    right: componentSpacing.screenEdgePadding,
    zIndex: 1,
  },
  listContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[4],
  },
  separator: {
    height: spacing[2],
  },
  restaurantItemWrapper: {
    marginBottom: spacing[2],
  },
  recentSection: {
    marginBottom: spacing[3],
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
  premiumBannerContainer: {
    marginBottom: spacing[3],
  },
});
