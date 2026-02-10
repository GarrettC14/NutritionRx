import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '@/constants/mealTypes';
import { foodRepository, CreateFoodInput } from '@/repositories';
import { useFoodLogStore } from '@/stores';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FoodItem } from '@/types/domain';
import { TestIDs } from '@/constants/testIDs';

export default function CreateFoodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { showConfirm } = useConfirmDialog();
  const params = useLocalSearchParams<{
    mealType?: string;
    date?: string;
  }>();

  const { addLogEntry } = useFoodLogStore();

  const date = params.date || new Date().toISOString().split('T')[0];

  // Form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [servingSize, setServingSize] = useState('1');
  const [servingUnit, setServingUnit] = useState('serving');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNumberInput = (
    value: string,
    setter: (value: string) => void,
    allowDecimal = false
  ) => {
    if (allowDecimal) {
      const cleaned = value.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        setter(parts[0] + '.' + parts.slice(1).join(''));
      } else {
        setter(cleaned);
      }
    } else {
      setter(value.replace(/[^0-9]/g, ''));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!calories || parseInt(calories) < 0) {
      newErrors.calories = 'Calories is required';
    }
    if (!servingSize || parseFloat(servingSize) <= 0) {
      newErrors.servingSize = 'Serving size is required';
    }
    if (!servingUnit.trim()) {
      newErrors.servingUnit = 'Serving unit is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleMealToggle = (meal: MealType) => {
    setSelectedMealType((current) => (current === meal ? null : meal));
  };

  const saveFoodAndLog = async (existingFood?: FoodItem) => {
    const trimmedName = name.trim();
    const trimmedBrand = brand.trim() || undefined;
    const foodCalories = parseInt(calories) || 0;
    const foodProtein = parseInt(protein) || 0;
    const foodCarbs = parseInt(carbs) || 0;
    const foodFat = parseInt(fat) || 0;

    let foodId: string;

    if (existingFood) {
      // Overwrite the existing food with new values
      await foodRepository.update(existingFood.id, {
        name: trimmedName,
        brand: trimmedBrand,
        calories: foodCalories,
        protein: foodProtein,
        carbs: foodCarbs,
        fat: foodFat,
        servingSize: parseFloat(servingSize) || 1,
        servingUnit: servingUnit.trim(),
      });
      foodId = existingFood.id;
    } else {
      // Create a new food item
      const foodInput: CreateFoodInput = {
        name: trimmedName,
        brand: trimmedBrand,
        calories: foodCalories,
        protein: foodProtein,
        carbs: foodCarbs,
        fat: foodFat,
        servingSize: parseFloat(servingSize) || 1,
        servingUnit: servingUnit.trim(),
        source: 'user',
        isUserCreated: true,
        isVerified: false,
      };

      const food = await foodRepository.create(foodInput);
      foodId = food.id;
    }

    // Only log the food entry if a meal is selected
    if (selectedMealType) {
      await addLogEntry({
        foodItemId: foodId,
        date,
        mealType: selectedMealType,
        servings: 1,
        calories: foodCalories,
        protein: foodProtein,
        carbs: foodCarbs,
        fat: foodFat,
      });
    }

    router.dismiss();
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const trimmedName = name.trim();
      const trimmedBrand = brand.trim() || undefined;

      // Check if a food with the same name (and brand) already exists
      const existingFood = await foodRepository.findByExactName(trimmedName, trimmedBrand);

      if (existingFood) {
        // Show conflict dialog
        setIsSaving(false);
        showConfirm({
          title: 'Food Already Exists',
          message: `A food named "${trimmedName}"${trimmedBrand ? ` by ${trimmedBrand}` : ''} already exists. Would you like to overwrite it with the new values?`,
          icon: 'alert-circle-outline',
          confirmLabel: 'Overwrite',
          cancelLabel: 'Cancel',
          confirmStyle: 'destructive',
          onConfirm: async () => {
            setIsSaving(true);
            try {
              await saveFoodAndLog(existingFood);
            } catch (error) {
              console.error('Failed to save food:', error);
            } finally {
              setIsSaving(false);
            }
          },
        });
      } else {
        // No conflict, save directly
        await saveFoodAndLog();
      }
    } catch (error) {
      console.error('Failed to create food:', error);
      setIsSaving(false);
    }
  };

  const commonUnits = ['serving', 'g', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'slice'];

  return (
    <SafeAreaView testID={TestIDs.CreateFood.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable testID={TestIDs.CreateFood.BackButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Create Food
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Info */}
          <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Basic Info
            </Text>

            <Input
              testID={TestIDs.CreateFood.NameInput}
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Chicken Breast"
              error={errors.name}
            />

            <Input
              testID={TestIDs.CreateFood.BrandInput}
              label="Brand (optional)"
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g., Tyson"
            />
          </View>

          {/* Meal Selection */}
          <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
                Add to Meal
              </Text>
              <View style={[styles.optionalBadge, { backgroundColor: colors.bgInteractive }]}>
                <Text style={[styles.optionalBadgeText, { color: colors.textTertiary }]}>
                  Optional
                </Text>
              </View>
            </View>
            <View style={styles.mealOptions}>
              {MEAL_TYPE_ORDER.map((meal) => (
                <Pressable
                  key={meal}
                  style={[
                    styles.mealOption,
                    {
                      backgroundColor:
                        selectedMealType === meal ? colors.accent : 'transparent',
                      borderColor:
                        selectedMealType === meal ? colors.accent : colors.borderDefault,
                    },
                  ]}
                  onPress={() => handleMealToggle(meal)}
                >
                  <Text
                    style={[
                      styles.mealOptionText,
                      {
                        color:
                          selectedMealType === meal ? '#FFFFFF' : colors.textSecondary,
                      },
                    ]}
                  >
                    {MEAL_TYPE_LABELS[meal]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Serving Info */}
          <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Serving Size
            </Text>

            <View style={styles.servingRow}>
              <View style={styles.servingSizeInput}>
                <Input
                  testID={TestIDs.CreateFood.ServingAmountInput}
                  label="Amount"
                  value={servingSize}
                  onChangeText={(v) => handleNumberInput(v, setServingSize, true)}
                  keyboardType="decimal-pad"
                  error={errors.servingSize}
                />
              </View>
              <View style={styles.servingUnitInput}>
                <Input
                  testID={TestIDs.CreateFood.ServingUnitInput}
                  label="Unit"
                  value={servingUnit}
                  onChangeText={setServingUnit}
                  error={errors.servingUnit}
                />
              </View>
            </View>

            <View style={styles.unitSuggestions}>
              {commonUnits.map((unit) => (
                <Pressable
                  key={unit}
                  style={[
                    styles.unitChip,
                    {
                      backgroundColor:
                        servingUnit === unit ? colors.accent : 'transparent',
                      borderColor:
                        servingUnit === unit ? colors.accent : colors.borderDefault,
                    },
                  ]}
                  onPress={() => setServingUnit(unit)}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      { color: servingUnit === unit ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {unit}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Nutrition */}
          <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Nutrition (per serving)
            </Text>

            <Input
              testID={TestIDs.CreateFood.CaloriesInput}
              label="Calories"
              value={calories}
              onChangeText={(v) => handleNumberInput(v, setCalories)}
              keyboardType="number-pad"
              placeholder="0"
              rightIcon={
                <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>
                  kcal
                </Text>
              }
              error={errors.calories}
            />

            <View style={styles.macroRow}>
              <View style={styles.macroInput}>
                <Input
                  testID={TestIDs.CreateFood.ProteinInput}
                  label="Protein"
                  value={protein}
                  onChangeText={(v) => handleNumberInput(v, setProtein)}
                  keyboardType="number-pad"
                  placeholder="0"
                  rightIcon={
                    <Text style={[styles.inputUnit, { color: colors.protein }]}>g</Text>
                  }
                />
              </View>
              <View style={styles.macroInput}>
                <Input
                  testID={TestIDs.CreateFood.CarbsInput}
                  label="Carbs"
                  value={carbs}
                  onChangeText={(v) => handleNumberInput(v, setCarbs)}
                  keyboardType="number-pad"
                  placeholder="0"
                  rightIcon={
                    <Text style={[styles.inputUnit, { color: colors.carbs }]}>g</Text>
                  }
                />
              </View>
              <View style={styles.macroInput}>
                <Input
                  testID={TestIDs.CreateFood.FatInput}
                  label="Fat"
                  value={fat}
                  onChangeText={(v) => handleNumberInput(v, setFat)}
                  keyboardType="number-pad"
                  placeholder="0"
                  rightIcon={
                    <Text style={[styles.inputUnit, { color: colors.fat }]}>g</Text>
                  }
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.footer}>
            <Button
              testID={TestIDs.CreateFood.CreateButton}
              onPress={handleSave}
              loading={isSaving}
              fullWidth
            >
              {selectedMealType
                ? `Create & Add to ${MEAL_TYPE_LABELS[selectedMealType]}`
                : 'Create Food'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  section: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  optionalBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  optionalBadgeText: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servingRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  servingSizeInput: {
    flex: 1,
  },
  servingUnitInput: {
    flex: 2,
  },
  unitSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  unitChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  unitChipText: {
    ...typography.caption,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  macroInput: {
    flex: 1,
  },
  inputUnit: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  mealOptions: {
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
  footer: {
    marginTop: spacing[2],
  },
});
