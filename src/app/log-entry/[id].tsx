import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { TestIDs } from '@/constants/testIDs';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_LABELS } from '@/constants/mealTypes';
import {
  ServingUnit,
  getAvailableUnits,
  calculateNutritionForUnit,
  getDefaultAmountForUnit,
  getUnitLabel,
} from '@/constants/servingUnits';
import { useFoodLogStore, useFavoritesStore } from '@/stores';
import { logEntryRepository, quickAddRepository, foodRepository } from '@/repositories';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { LogEntry, QuickAddEntry, FoodItem } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { FoodDetailSkeleton } from '@/components/ui/Skeleton';

type EntryType = 'log' | 'quick';

interface LoadedEntry {
  type: EntryType;
  entry: LogEntry | QuickAddEntry;
  food?: FoodItem;
}

export default function LogEntryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showConfirm } = useConfirmDialog();

  const { updateLogEntry, deleteLogEntry, updateQuickEntry, deleteQuickEntry, refreshCurrentDate } =
    useFoodLogStore();
  const { isFavorite, toggleFavorite, loadFavorites } = useFavoritesStore();

  // State
  const [loadedEntry, setLoadedEntry] = useState<LoadedEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Editable fields for log entries
  const [amount, setAmount] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState<ServingUnit>('serving');
  const [mealType, setMealType] = useState<MealType>(MealType.Snack);

  // Editable fields for quick add entries
  const [quickCalories, setQuickCalories] = useState('0');
  const [quickProtein, setQuickProtein] = useState('');
  const [quickCarbs, setQuickCarbs] = useState('');
  const [quickFat, setQuickFat] = useState('');
  const [quickDescription, setQuickDescription] = useState('');

  // Load entry and favorites
  useEffect(() => {
    const loadEntry = async () => {
      if (!id) return;
      setIsLoading(true);

      // Try to find as log entry first
      const logEntry = await logEntryRepository.findById(id);
      if (logEntry) {
        const food = await foodRepository.findById(logEntry.foodItemId);
        setLoadedEntry({ type: 'log', entry: logEntry, food: food ?? undefined });
        setAmount(logEntry.servings.toString());
        setMealType(logEntry.mealType);
        setIsLoading(false);
        return;
      }

      // Try as quick add entry
      const quickEntry = await quickAddRepository.findById(id);
      if (quickEntry) {
        setLoadedEntry({ type: 'quick', entry: quickEntry });
        setQuickCalories(quickEntry.calories.toString());
        setQuickProtein(quickEntry.protein?.toString() ?? '');
        setQuickCarbs(quickEntry.carbs?.toString() ?? '');
        setQuickFat(quickEntry.fat?.toString() ?? '');
        setQuickDescription(quickEntry.description ?? '');
        setMealType(quickEntry.mealType);
        setIsLoading(false);
        return;
      }

      // Not found
      setIsLoading(false);
    };

    loadEntry();
    loadFavorites();
  }, [id]);

  // Get available units for log entries
  const availableUnits = useMemo(() => {
    if (!loadedEntry?.food) return ['serving'] as ServingUnit[];
    return getAvailableUnits({
      servingSizeGrams: loadedEntry.food.servingSizeGrams,
      servingSizeMl: null,
    });
  }, [loadedEntry?.food]);

  // Calculate nutrition for log entries
  const calculatedNutrition = useMemo(() => {
    if (!loadedEntry?.food || loadedEntry.type !== 'log') {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    const food = loadedEntry.food;
    const amountNum = parseFloat(amount) || 0;
    return calculateNutritionForUnit(
      {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        servingSize: food.servingSize,
        servingSizeGrams: food.servingSizeGrams,
        servingSizeMl: null,
      },
      amountNum,
      selectedUnit
    );
  }, [loadedEntry, amount, selectedUnit]);

  // Handle unit change
  const handleUnitChange = (unit: ServingUnit) => {
    if (!loadedEntry?.food) return;
    setSelectedUnit(unit);
    setAmount(getDefaultAmountForUnit(unit, { servingSizeGrams: loadedEntry.food.servingSizeGrams }));
    setHasChanges(true);
  };

  // Handle amount change
  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      setAmount(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setAmount(cleaned);
    }
    setHasChanges(true);
  };

  // Handle meal type change
  const handleMealTypeChange = (meal: MealType) => {
    setMealType(meal);
    setHasChanges(true);
  };

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    if (!loadedEntry?.food) return;
    try {
      await toggleFavorite(loadedEntry.food.id);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!loadedEntry) return;
    setIsSaving(true);

    try {
      if (loadedEntry.type === 'log' && loadedEntry.food) {
        const amountNum = parseFloat(amount) || 0;
        const servingsEquivalent =
          selectedUnit === 'serving'
            ? amountNum
            : calculatedNutrition.calories / loadedEntry.food.calories;

        await updateLogEntry(loadedEntry.entry.id, {
          servings: servingsEquivalent,
          calories: calculatedNutrition.calories,
          protein: calculatedNutrition.protein,
          carbs: calculatedNutrition.carbs,
          fat: calculatedNutrition.fat,
          mealType,
        });
      } else if (loadedEntry.type === 'quick') {
        await updateQuickEntry(loadedEntry.entry.id, {
          calories: parseInt(quickCalories, 10) || 0,
          protein: quickProtein ? parseInt(quickProtein, 10) : undefined,
          carbs: quickCarbs ? parseInt(quickCarbs, 10) : undefined,
          fat: quickFat ? parseInt(quickFat, 10) : undefined,
          description: quickDescription || undefined,
          mealType,
        });
      }

      await refreshCurrentDate();
      router.back();
    } catch (error) {
      console.error('Failed to update entry:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = () => {
    showConfirm({
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this entry? This cannot be undone.',
      icon: 'trash-outline',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmStyle: 'destructive',
      onConfirm: async () => {
        if (!loadedEntry) return;
        setIsDeleting(true);

        try {
          if (loadedEntry.type === 'log') {
            await deleteLogEntry(loadedEntry.entry.id);
          } else {
            await deleteQuickEntry(loadedEntry.entry.id);
          }

          await refreshCurrentDate();
          router.back();
        } catch (error) {
          console.error('Failed to delete entry:', error);
          Alert.alert('Error', 'Failed to delete entry. Please try again.');
          setIsDeleting(false);
        }
      },
    });
  };

  const mealOptions = [
    { label: 'Breakfast', value: MealType.Breakfast, testID: TestIDs.LogEntry.MealBreakfast },
    { label: 'Lunch', value: MealType.Lunch, testID: TestIDs.LogEntry.MealLunch },
    { label: 'Dinner', value: MealType.Dinner, testID: TestIDs.LogEntry.MealDinner },
    { label: 'Snack', value: MealType.Snack, testID: TestIDs.LogEntry.MealSnack },
  ];

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Entry</Text>
          <View style={{ width: 50 }} />
        </View>
        <FoodDetailSkeleton />
      </SafeAreaView>
    );
  }

  // Not found state
  if (!loadedEntry) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Entry</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Entry not found</Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  const amountNum = parseFloat(amount) || 0;
  const isLogValid = loadedEntry.type === 'log' ? amountNum > 0 && amountNum <= 9999 : true;
  const isQuickValid =
    loadedEntry.type === 'quick' ? parseInt(quickCalories, 10) > 0 : true;
  const isValid = isLogValid && isQuickValid;

  const foodIsFavorite = loadedEntry.food ? isFavorite(loadedEntry.food.id) : false;

  return (
    <SafeAreaView testID={TestIDs.LogEntry.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID={TestIDs.LogEntry.CloseButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Entry</Text>
        <Pressable testID={TestIDs.LogEntry.SaveButton} onPress={handleSave} disabled={!isValid || isSaving}>
          <Text
            style={[
              styles.saveText,
              { color: isValid && !isSaving ? colors.accent : colors.textTertiary },
            ]}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Food/Quick Add Info Card */}
        {loadedEntry.type === 'log' && loadedEntry.food ? (
          <View style={[styles.foodCard, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.foodName, { color: colors.textPrimary }]}>
              {loadedEntry.food.name}
            </Text>
            {loadedEntry.food.brand && (
              <Text style={[styles.foodBrand, { color: colors.textSecondary }]}>
                {loadedEntry.food.brand}
              </Text>
            )}
            <Text style={[styles.servingInfo, { color: colors.textTertiary }]}>
              {loadedEntry.food.servingSize} {loadedEntry.food.servingUnit}
              {loadedEntry.food.servingSizeGrams
                ? ` (${loadedEntry.food.servingSizeGrams}g per serving)`
                : ''}
            </Text>
          </View>
        ) : (
          <View style={[styles.foodCard, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="flash" size={32} color={colors.accent} />
            <Text style={[styles.foodName, { color: colors.textPrimary }]}>Quick Add</Text>
            {(loadedEntry.entry as QuickAddEntry).description && (
              <Text style={[styles.foodBrand, { color: colors.textSecondary }]}>
                {(loadedEntry.entry as QuickAddEntry).description}
              </Text>
            )}
          </View>
        )}

        {/* Favorite Toggle Row - Only for log entries */}
        {loadedEntry.type === 'log' && loadedEntry.food && (
          <Pressable
            style={[styles.favoriteRow, { backgroundColor: colors.bgSecondary }]}
            onPress={handleToggleFavorite}
          >
            <FavoriteButton
              isFavorite={foodIsFavorite}
              onPress={handleToggleFavorite}
              size={24}
            />
            <Text style={[styles.favoriteText, { color: colors.textPrimary }]}>
              {foodIsFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </Text>
          </Pressable>
        )}

        {/* Edit section based on type */}
        {loadedEntry.type === 'log' ? (
          <>
            {/* Amount Section for Log Entries */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HOW MUCH?</Text>

              <View style={[styles.amountCard, { backgroundColor: colors.bgSecondary }]}>
                <TextInput
                  testID={TestIDs.LogEntry.AmountInput}
                  style={[styles.amountInput, { color: colors.textPrimary }]}
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor={colors.textTertiary}
                  selectTextOnFocus
                />
              </View>

              {/* Unit Selector Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.unitPillsContainer}
              >
                {availableUnits.map((unit) => {
                  const isSelected = selectedUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      style={[
                        styles.unitPill,
                        {
                          backgroundColor: isSelected ? colors.accent : 'transparent',
                          borderColor: isSelected ? colors.accent : colors.borderDefault,
                        },
                      ]}
                      onPress={() => handleUnitChange(unit)}
                    >
                      <Text
                        style={[
                          styles.unitPillText,
                          { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        {getUnitLabel(unit)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Nutrition Preview for Log Entries */}
            <View style={[styles.nutritionCard, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.caloriesValue, { color: colors.textPrimary }]}>
                {calculatedNutrition.calories}
              </Text>
              <Text style={[styles.caloriesLabel, { color: colors.textSecondary }]}>calories</Text>

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
          </>
        ) : (
          <>
            {/* Quick Add Edit Fields */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CALORIES</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.bgSecondary }]}>
                <TextInput
                  testID={TestIDs.LogEntry.AmountInput}
                  style={[styles.quickInput, { color: colors.textPrimary }]}
                  value={quickCalories}
                  onChangeText={(v) => {
                    setQuickCalories(v.replace(/[^0-9]/g, ''));
                    setHasChanges(true);
                  }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>cal</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                MACROS (OPTIONAL)
              </Text>
              <View style={styles.macroInputsRow}>
                <View style={[styles.macroInputCard, { backgroundColor: colors.bgSecondary }]}>
                  <Text style={[styles.macroInputLabel, { color: colors.protein }]}>Protein</Text>
                  <View style={styles.macroInputWrapper}>
                    <TextInput
                      style={[styles.macroInput, { color: colors.textPrimary }]}
                      value={quickProtein}
                      onChangeText={(v) => {
                        setQuickProtein(v.replace(/[^0-9]/g, ''));
                        setHasChanges(true);
                      }}
                      keyboardType="number-pad"
                      placeholder="—"
                      placeholderTextColor={colors.textTertiary}
                    />
                    <Text style={[styles.macroInputUnit, { color: colors.textTertiary }]}>g</Text>
                  </View>
                </View>
                <View style={[styles.macroInputCard, { backgroundColor: colors.bgSecondary }]}>
                  <Text style={[styles.macroInputLabel, { color: colors.carbs }]}>Carbs</Text>
                  <View style={styles.macroInputWrapper}>
                    <TextInput
                      style={[styles.macroInput, { color: colors.textPrimary }]}
                      value={quickCarbs}
                      onChangeText={(v) => {
                        setQuickCarbs(v.replace(/[^0-9]/g, ''));
                        setHasChanges(true);
                      }}
                      keyboardType="number-pad"
                      placeholder="—"
                      placeholderTextColor={colors.textTertiary}
                    />
                    <Text style={[styles.macroInputUnit, { color: colors.textTertiary }]}>g</Text>
                  </View>
                </View>
                <View style={[styles.macroInputCard, { backgroundColor: colors.bgSecondary }]}>
                  <Text style={[styles.macroInputLabel, { color: colors.fat }]}>Fat</Text>
                  <View style={styles.macroInputWrapper}>
                    <TextInput
                      style={[styles.macroInput, { color: colors.textPrimary }]}
                      value={quickFat}
                      onChangeText={(v) => {
                        setQuickFat(v.replace(/[^0-9]/g, ''));
                        setHasChanges(true);
                      }}
                      keyboardType="number-pad"
                      placeholder="—"
                      placeholderTextColor={colors.textTertiary}
                    />
                    <Text style={[styles.macroInputUnit, { color: colors.textTertiary }]}>g</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                DESCRIPTION (OPTIONAL)
              </Text>
              <View style={[styles.descriptionCard, { backgroundColor: colors.bgSecondary }]}>
                <TextInput
                  style={[styles.descriptionInput, { color: colors.textPrimary }]}
                  value={quickDescription}
                  onChangeText={(v) => {
                    setQuickDescription(v);
                    setHasChanges(true);
                  }}
                  placeholder="e.g., Protein shake"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={100}
                />
              </View>
            </View>
          </>
        )}

        {/* Meal Type Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MEAL</Text>
          <View style={styles.mealSelector}>
            {mealOptions.map((option) => (
              <Pressable
                key={option.value}
                testID={option.testID}
                style={[
                  styles.mealOption,
                  {
                    backgroundColor: mealType === option.value ? colors.accent : 'transparent',
                    borderColor: mealType === option.value ? colors.accent : colors.borderDefault,
                  },
                ]}
                onPress={() => handleMealTypeChange(option.value)}
              >
                <Text
                  style={[
                    styles.mealOptionText,
                    { color: mealType === option.value ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Delete Button */}
        <Pressable
          testID={TestIDs.LogEntry.DeleteButton}
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.deleteButtonText, { color: colors.error }]}>Delete Entry</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  headerTitle: {
    ...typography.title.medium,
  },
  saveText: {
    ...typography.body.large,
    fontWeight: '600',
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
    paddingBottom: spacing[8],
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
  foodBrand: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  servingInfo: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  favoriteText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  section: {
    gap: spacing[3],
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountCard: {
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 120,
  },
  unitPillsContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  unitPill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  unitPillText: {
    ...typography.body.medium,
    fontWeight: '500',
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  quickInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputUnit: {
    ...typography.body.large,
  },
  macroInputsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  macroInputCard: {
    flex: 1,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing[2],
  },
  macroInputLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  macroInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  macroInput: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 40,
  },
  macroInputUnit: {
    ...typography.body.small,
  },
  descriptionCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  descriptionInput: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing[4],
  },
  deleteButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
});
