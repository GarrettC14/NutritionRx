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
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_LABELS } from '@/constants/mealTypes';
import { foodRepository, CreateFoodInput } from '@/repositories';
import { useFoodLogStore } from '@/stores';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function CreateFoodScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mealType?: string;
    date?: string;
  }>();

  const { addLogEntry } = useFoodLogStore();

  const mealType = (params.mealType as MealType) || MealType.Snack;
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

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      // Create the food item
      const foodInput: CreateFoodInput = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        calories: parseInt(calories) || 0,
        protein: parseInt(protein) || 0,
        carbs: parseInt(carbs) || 0,
        fat: parseInt(fat) || 0,
        servingSize: parseFloat(servingSize) || 1,
        servingUnit: servingUnit.trim(),
        source: 'user',
        isUserCreated: true,
        isVerified: false,
      };

      const food = await foodRepository.create(foodInput);

      // Log the food entry
      await addLogEntry({
        foodItemId: food.id,
        date,
        mealType,
        servings: 1,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      });

      router.dismiss();
    } catch (error) {
      console.error('Failed to create food:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const commonUnits = ['serving', 'g', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'slice'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
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
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Chicken Breast"
              error={errors.name}
            />

            <Input
              label="Brand (optional)"
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g., Tyson"
            />
          </View>

          {/* Serving Info */}
          <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Serving Size
            </Text>

            <View style={styles.servingRow}>
              <View style={styles.servingSizeInput}>
                <Input
                  label="Amount"
                  value={servingSize}
                  onChangeText={(v) => handleNumberInput(v, setServingSize, true)}
                  keyboardType="decimal-pad"
                  error={errors.servingSize}
                />
              </View>
              <View style={styles.servingUnitInput}>
                <Input
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
                        servingUnit === unit ? colors.accent : colors.border,
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
              label="Calories"
              value={calories}
              onChangeText={(v) => handleNumberInput(v, setCalories)}
              keyboardType="number-pad"
              placeholder="0"
              rightElement={
                <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>
                  kcal
                </Text>
              }
              error={errors.calories}
            />

            <View style={styles.macroRow}>
              <View style={styles.macroInput}>
                <Input
                  label="Protein"
                  value={protein}
                  onChangeText={(v) => handleNumberInput(v, setProtein)}
                  keyboardType="number-pad"
                  placeholder="0"
                  rightElement={
                    <Text style={[styles.inputUnit, { color: colors.protein }]}>g</Text>
                  }
                />
              </View>
              <View style={styles.macroInput}>
                <Input
                  label="Carbs"
                  value={carbs}
                  onChangeText={(v) => handleNumberInput(v, setCarbs)}
                  keyboardType="number-pad"
                  placeholder="0"
                  rightElement={
                    <Text style={[styles.inputUnit, { color: colors.carbs }]}>g</Text>
                  }
                />
              </View>
              <View style={styles.macroInput}>
                <Input
                  label="Fat"
                  value={fat}
                  onChangeText={(v) => handleNumberInput(v, setFat)}
                  keyboardType="number-pad"
                  placeholder="0"
                  rightElement={
                    <Text style={[styles.inputUnit, { color: colors.fat }]}>g</Text>
                  }
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            label={`Create & Add to ${MEAL_TYPE_LABELS[mealType]}`}
            onPress={handleSave}
            loading={isSaving}
            fullWidth
          />
        </View>
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
    paddingBottom: spacing[4],
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
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
});
