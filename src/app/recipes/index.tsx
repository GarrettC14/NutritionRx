import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useRecipeStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { Recipe } from '@/types/recipes';

export default function RecipeListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Recipe[] | null>(null);

  const { recipes, isLoaded, loadRecipes, searchRecipes } = useRecipeStore(
    useShallow((s) => ({
      recipes: s.recipes,
      isLoaded: s.isLoaded,
      loadRecipes: s.loadRecipes,
      searchRecipes: s.searchRecipes,
    })),
  );

  useEffect(() => {
    loadRecipes();
  }, []);

  // Refresh when screen regains focus
  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes]),
  );

  useEffect(() => {
    if (searchText.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchRecipes(searchText);
      setSearchResults(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, searchRecipes]);

  const displayedRecipes = searchResults ?? recipes;

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <Pressable
      style={[styles.recipeCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}
      onPress={() => router.push({ pathname: '/recipes/[id]', params: { id: item.id } })}
    >
      <View style={styles.recipeCardContent}>
        <View style={styles.recipeCardHeader}>
          <Text style={[styles.recipeName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isFavorite && (
            <Ionicons name="heart" size={16} color={colors.accent} />
          )}
        </View>
        {item.description ? (
          <Text style={[styles.recipeDescription, { color: colors.textTertiary }]} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.recipeMacros}>
          <Text style={[styles.recipeMacroText, { color: colors.textSecondary }]}>
            {Math.round(item.totalCalories)} cal
          </Text>
          <Text style={[styles.recipeMacroDot, { color: colors.textTertiary }]}> · </Text>
          <Text style={[styles.recipeMacroText, { color: colors.textSecondary }]}>
            {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </Pressable>
  );

  if (!isLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Recipes</Text>
        <Pressable
          style={[styles.createButton, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/recipes/create')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {recipes.length > 3 && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search recipes..."
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {displayedRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {searchText ? 'No recipes found' : 'No recipes yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {searchText
              ? 'Try a different search'
              : 'Save meals as recipes for quick logging'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedRecipes}
          keyExtractor={(item) => item.id}
          renderItem={renderRecipe}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { ...typography.title.medium },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[2],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  searchInput: { flex: 1, ...typography.body.medium },
  listContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  recipeCardContent: { flex: 1, gap: spacing[1] },
  recipeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  recipeName: { ...typography.body.large, fontWeight: '600', flex: 1 },
  recipeDescription: { ...typography.caption },
  recipeMacros: { flexDirection: 'row', alignItems: 'center' },
  recipeMacroText: { ...typography.body.small },
  recipeMacroDot: { ...typography.body.small },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing[3] },
  emptyTitle: { ...typography.title.medium },
  emptySubtitle: { ...typography.body.medium, textAlign: 'center', paddingHorizontal: spacing[6] },
});
