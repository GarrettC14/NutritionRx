import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, getMealTypeName } from '@/constants/mealTypes';
import { useFoodLogStore } from '@/stores';
import { Button } from '@/components/ui/Button';
import { TestIDs } from '@/constants/testIDs';

export default function QuickAddScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mealType?: string;
    date?: string;
  }>();

  const { addQuickEntry } = useFoodLogStore();

  // State
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<string>(
    params.mealType || MealType.Snack
  );
  const [isSaving, setIsSaving] = useState(false);

  const date = params.date || new Date().toISOString().split('T')[0];

  const caloriesNum = parseInt(calories) || 0;
  const proteinNum = parseInt(protein) || 0;
  const carbsNum = parseInt(carbs) || 0;
  const fatNum = parseInt(fat) || 0;

  const isValid = caloriesNum > 0;

  const handleSave = async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      await addQuickEntry({
        date,
        mealType,
        calories: caloriesNum,
        protein: proteinNum || undefined,
        carbs: carbsNum || undefined,
        fat: fatNum || undefined,
        description: description.trim() || undefined,
      });
      AccessibilityInfo.announceForAccessibility('Quick add saved');
      router.dismiss();
    } catch (error) {
      if (__DEV__) console.error('Failed to save quick add:', error);
      AccessibilityInfo.announceForAccessibility('Failed to save quick add');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNumberInput = (
    value: string,
    setter: (value: string) => void
  ) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setter(cleaned);
  };

  const mealOptions = [
    { label: 'Breakfast', value: MealType.Breakfast },
    { label: 'Lunch', value: MealType.Lunch },
    { label: 'Dinner', value: MealType.Dinner },
    { label: 'Snack', value: MealType.Snack },
  ];

  return (
    <SafeAreaView testID={TestIDs.QuickAdd.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID={TestIDs.QuickAdd.BackButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} accessibilityRole="header">
          Quick Add
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Calories (Required) */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]} accessibilityRole="header">
            Calories *
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              testID={TestIDs.QuickAdd.CaloriesInput}
              style={[
                styles.calorieInput,
                { color: colors.textPrimary, borderColor: colors.borderDefault },
              ]}
              value={calories}
              onChangeText={(v) => handleNumberInput(v, setCalories)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              selectTextOnFocus
            />
            <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>
              kcal
            </Text>
          </View>
        </View>

        {/* Macros (Optional) */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]} accessibilityRole="header">
            Macros (Optional)
          </Text>
          <View style={styles.macroGrid} accessible={true} accessibilityLabel="Macro nutrients, optional">
            <View style={styles.macroItem}>
              <View
                style={[
                  styles.macroDot,
                  { backgroundColor: colors.protein },
                ]}
              />
              <TextInput
                testID={TestIDs.QuickAdd.ProteinInput}
                style={[
                  styles.macroInput,
                  { color: colors.textPrimary, borderColor: colors.borderDefault },
                ]}
                value={protein}
                onChangeText={(v) => handleNumberInput(v, setProtein)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                Protein (g)
              </Text>
            </View>
            <View style={styles.macroItem}>
              <View
                style={[
                  styles.macroDot,
                  { backgroundColor: colors.carbs },
                ]}
              />
              <TextInput
                testID={TestIDs.QuickAdd.CarbsInput}
                style={[
                  styles.macroInput,
                  { color: colors.textPrimary, borderColor: colors.borderDefault },
                ]}
                value={carbs}
                onChangeText={(v) => handleNumberInput(v, setCarbs)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                Carbs (g)
              </Text>
            </View>
            <View style={styles.macroItem}>
              <View
                style={[
                  styles.macroDot,
                  { backgroundColor: colors.fat },
                ]}
              />
              <TextInput
                testID={TestIDs.QuickAdd.FatInput}
                style={[
                  styles.macroInput,
                  { color: colors.textPrimary, borderColor: colors.borderDefault },
                ]}
                value={fat}
                onChangeText={(v) => handleNumberInput(v, setFat)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                Fat (g)
              </Text>
            </View>
          </View>
        </View>

        {/* Meal Type */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]} accessibilityRole="header">
            Meal
          </Text>
          <View style={styles.mealSelector}>
            {mealOptions.map((option) => (
              <Pressable
                key={option.value}
                testID={
                  option.value === MealType.Breakfast ? TestIDs.QuickAdd.MealBreakfast :
                  option.value === MealType.Lunch ? TestIDs.QuickAdd.MealLunch :
                  option.value === MealType.Dinner ? TestIDs.QuickAdd.MealDinner :
                  TestIDs.QuickAdd.MealSnack
                }
                style={[
                  styles.mealOption,
                  {
                    backgroundColor:
                      mealType === option.value ? colors.accent : 'transparent',
                    borderColor:
                      mealType === option.value ? colors.accent : colors.borderDefault,
                  },
                ]}
                onPress={() => setMealType(option.value)}
              >
                <Text
                  style={[
                    styles.mealOptionText,
                    {
                      color:
                        mealType === option.value ? '#FFFFFF' : colors.textPrimary,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Description (Optional) */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]} accessibilityRole="header">
            Description (Optional)
          </Text>
          <TextInput
            testID={TestIDs.QuickAdd.DescriptionInput}
            style={[
              styles.descriptionInput,
              { color: colors.textPrimary, borderColor: colors.borderDefault },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g., Restaurant meal, homemade snack..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={2}
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          testID={TestIDs.QuickAdd.AddButton}
          onPress={handleSave}
          loading={isSaving}
          disabled={!isValid}
          fullWidth
        >{`Add to ${getMealTypeName(mealType)}`}</Button>
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
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  calorieInput: {
    ...typography.metric.large,
    textAlign: 'center',
    minWidth: 120,
    borderBottomWidth: 2,
    paddingBottom: spacing[1],
  },
  inputUnit: {
    ...typography.body.large,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[2],
  },
  macroDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroInput: {
    ...typography.metric.medium,
    textAlign: 'center',
    width: '100%',
    borderBottomWidth: 1,
    paddingBottom: spacing[1],
  },
  macroLabel: {
    ...typography.caption,
    textAlign: 'center',
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
  descriptionInput: {
    ...typography.body.medium,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    minHeight: 60,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
});
