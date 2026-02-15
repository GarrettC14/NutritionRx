import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
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
import { MealType } from '@/constants/mealTypes';
import { LogEntry } from '@/types/domain';
import { RecipeItemDraft } from '@/types/recipes';

export default function CreateRecipeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>();

  const { createRecipe } = useRecipeStore(
    useShallow((s) => ({ createRecipe: s.createRecipe })),
  );

  const { entries, getEntriesByMeal } = useFoodLogStore(
    useShallow((s) => ({ entries: s.entries, getEntriesByMeal: s.getEntriesByMeal })),
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Pre-populate with entries from the specified meal type
  const mealType = params.mealType as MealType | undefined;
  const mealEntries: LogEntry[] = mealType
    ? (getEntriesByMeal()[mealType] || [])
    : entries;

  // Auto-select all entries on mount
  useEffect(() => {
    setSelectedEntryIds(new Set(mealEntries.map((e) => e.id)));
  }, []);

  const toggleEntry = (id: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedEntries = mealEntries.filter((e) => selectedEntryIds.has(e.id));

  const totalCalories = selectedEntries.reduce((sum, e) => sum + e.calories, 0);
  const totalProtein = selectedEntries.reduce((sum, e) => sum + e.protein, 0);
  const totalCarbs = selectedEntries.reduce((sum, e) => sum + e.carbs, 0);
  const totalFat = selectedEntries.reduce((sum, e) => sum + e.fat, 0);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your recipe.');
      return;
    }
    if (selectedEntries.length === 0) {
      Alert.alert('No Items', 'Please select at least one item for your recipe.');
      return;
    }

    setIsSaving(true);
    try {
      const items: RecipeItemDraft[] = selectedEntries.map((e) => ({
        foodItemId: e.foodItemId,
        foodName: e.foodName,
        foodBrand: e.foodBrand,
        servings: e.servings,
        calories: e.calories,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
      }));

      await createRecipe(name.trim(), description.trim() || undefined, items);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Create Recipe</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}
            placeholder="e.g. Morning Smoothie"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={100}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { color: colors.textPrimary, backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}
            placeholder="Add a description..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={300}
          />
        </View>

        {/* Ingredients */}
        <View style={styles.ingredientsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Ingredients ({selectedEntries.length}/{mealEntries.length})
          </Text>
          {mealEntries.map((entry) => {
            const isSelected = selectedEntryIds.has(entry.id);
            return (
              <Pressable
                key={entry.id}
                style={[styles.ingredientRow, { backgroundColor: colors.bgSecondary, borderColor: isSelected ? colors.accent : colors.borderDefault }]}
                onPress={() => toggleEntry(entry.id)}
              >
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isSelected ? colors.accent : colors.textTertiary}
                />
                <View style={styles.ingredientInfo}>
                  <Text style={[styles.ingredientName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {entry.foodName}
                  </Text>
                  <Text style={[styles.ingredientMeta, { color: colors.textTertiary }]}>
                    {Math.round(entry.calories)} cal · {entry.servings} serving{entry.servings !== 1 ? 's' : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Totals */}
        {selectedEntries.length > 0 && (
          <View style={[styles.totalsCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
            <View style={styles.totalsGrid}>
              <View style={styles.totalItem}>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{Math.round(totalCalories)}</Text>
                <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>cal</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{Math.round(totalProtein * 10) / 10}g</Text>
                <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>protein</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{Math.round(totalCarbs * 10) / 10}g</Text>
                <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>carbs</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>{Math.round(totalFat * 10) / 10}g</Text>
                <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>fat</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: colors.bgPrimary }]}>
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.accent, opacity: isSaving || !name.trim() || selectedEntries.length === 0 ? 0.5 : 1 }]}
          onPress={handleSave}
          disabled={isSaving || !name.trim() || selectedEntries.length === 0}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Recipe'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { ...typography.title.medium },
  headerSpacer: { width: 44 },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: componentSpacing.screenEdgePadding, paddingBottom: spacing[4], gap: spacing[4] },
  inputGroup: { gap: spacing[2] },
  label: { ...typography.body.small, fontWeight: '500' },
  textInput: {
    ...typography.body.medium,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  ingredientsSection: { gap: spacing[2] },
  sectionTitle: { ...typography.body.large, fontWeight: '600' },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing[3],
  },
  ingredientInfo: { flex: 1, gap: spacing[1] },
  ingredientName: { ...typography.body.medium, fontWeight: '500' },
  ingredientMeta: { ...typography.caption },
  totalsCard: { padding: spacing[4], borderRadius: borderRadius.lg, borderWidth: 1 },
  totalsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  totalItem: { alignItems: 'center', gap: spacing[1] },
  totalValue: { ...typography.body.large, fontWeight: '700' },
  totalLabel: { ...typography.caption },
  footer: { paddingHorizontal: componentSpacing.screenEdgePadding, paddingVertical: spacing[3], paddingBottom: spacing[4] },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  saveButtonText: { ...typography.body.large, fontWeight: '600', color: '#FFFFFF' },
});
