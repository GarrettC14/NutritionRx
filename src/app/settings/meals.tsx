import { useState, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { DEFAULT_MEAL_CONFIGS } from '@/constants/mealTypes';
import { useSettingsStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';

const MAX_CUSTOM_MEALS = 3;

export default function MealSetupScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const {
    customMealTypes,
    addCustomMealType,
    deactivateCustomMealType,
    reactivateCustomMealType,
  } = useSettingsStore(
    useShallow((s) => ({
      customMealTypes: s.customMealTypes,
      addCustomMealType: s.addCustomMealType,
      deactivateCustomMealType: s.deactivateCustomMealType,
      reactivateCustomMealType: s.reactivateCustomMealType,
    })),
  );

  const [newMealName, setNewMealName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const activeMeals = customMealTypes.filter((c) => c.isActive);
  const inactiveMeals = customMealTypes.filter((c) => !c.isActive);
  const canAddMore = activeMeals.length < MAX_CUSTOM_MEALS;
  const remaining = MAX_CUSTOM_MEALS - activeMeals.length;

  const handleAddMeal = useCallback(async () => {
    const name = newMealName.trim();
    if (!name) return;

    try {
      await addCustomMealType(name);
      setNewMealName('');
      setIsAdding(false);
    } catch {
      Alert.alert('Error', 'Failed to add custom meal. Please try again.');
    }
  }, [newMealName, addCustomMealType]);

  const handleDeactivate = useCallback((id: string, name: string) => {
    Alert.alert(
      `Remove ${name}?`,
      'This will hide the meal block but preserve any logged entries.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deactivateCustomMealType(id).catch(() =>
            Alert.alert('Error', 'Failed to remove meal block.')),
        },
      ],
    );
  }, [deactivateCustomMealType]);

  const handleReactivate = useCallback(async (id: string) => {
    if (!canAddMore) {
      Alert.alert('Limit Reached', `You can have at most ${MAX_CUSTOM_MEALS} custom meal blocks.`);
      return;
    }
    try {
      await reactivateCustomMealType(id);
    } catch {
      Alert.alert('Error', 'Failed to restore meal block.');
    }
  }, [reactivateCustomMealType, canAddMore]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Meal Setup</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Default Meals */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DEFAULT MEALS</Text>
          {DEFAULT_MEAL_CONFIGS.map((meal) => (
            <View
              key={meal.id}
              style={[styles.mealRow, { backgroundColor: colors.bgSecondary }]}
            >
              <Text style={styles.mealIcon}>{meal.icon}</Text>
              <Text style={[styles.mealName, { color: colors.textPrimary }]}>{meal.name}</Text>
            </View>
          ))}
        </View>

        {/* Custom Meals */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            CUSTOM MEALS ({activeMeals.length}/{MAX_CUSTOM_MEALS})
          </Text>
          {activeMeals.map((meal) => (
            <View
              key={meal.id}
              style={[styles.mealRow, { backgroundColor: colors.bgSecondary }]}
            >
              <View style={styles.mealIconContainer}>
                <Ionicons name={(meal.icon || 'restaurant-outline') as any} size={20} color={colors.textSecondary} />
              </View>
              <Text style={[styles.mealName, { color: colors.textPrimary }]}>{meal.name}</Text>
              <Pressable
                style={styles.removeButton}
                onPress={() => handleDeactivate(meal.id, meal.name)}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={22} color={colors.error} />
              </Pressable>
            </View>
          ))}

          {/* Add new meal */}
          {canAddMore && !isAdding && (
            <Pressable
              style={[styles.addButton, { borderColor: colors.borderDefault }]}
              onPress={() => setIsAdding(true)}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
              <Text style={[styles.addButtonText, { color: colors.accent }]}>
                Add Custom Meal ({remaining} remaining)
              </Text>
            </Pressable>
          )}

          {isAdding && (
            <View style={[styles.addForm, { backgroundColor: colors.bgSecondary }]}>
              <TextInput
                style={[styles.addInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
                placeholder="e.g., Pre-Workout"
                placeholderTextColor={colors.textTertiary}
                value={newMealName}
                onChangeText={setNewMealName}
                maxLength={30}
                autoFocus
              />
              <View style={styles.addFormActions}>
                <Pressable
                  style={[styles.formButton, { backgroundColor: colors.bgPrimary }]}
                  onPress={() => { setIsAdding(false); setNewMealName(''); }}
                >
                  <Text style={[styles.formButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.formButton, { backgroundColor: colors.accent, opacity: newMealName.trim() ? 1 : 0.5 }]}
                  onPress={handleAddMeal}
                  disabled={!newMealName.trim()}
                >
                  <Text style={[styles.formButtonText, { color: '#FFFFFF' }]}>Add</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Inactive (previously removed) meals */}
        {inactiveMeals.length > 0 && (
          <View style={styles.sectionGroup}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>REMOVED</Text>
            {inactiveMeals.map((meal) => (
              <View
                key={meal.id}
                style={[styles.mealRow, styles.inactiveMealRow, { backgroundColor: colors.bgSecondary }]}
              >
                <View style={[styles.mealIconContainer, { opacity: 0.5 }]}>
                  <Ionicons name={(meal.icon || 'restaurant-outline') as any} size={20} color={colors.textSecondary} />
                </View>
                <Text style={[styles.mealName, { color: colors.textTertiary }]}>{meal.name}</Text>
                <Pressable
                  style={styles.restoreButton}
                  onPress={() => handleReactivate(meal.id)}
                  hitSlop={8}
                >
                  <Text style={[styles.restoreText, { color: colors.accent }]}>Restore</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.footnote, { color: colors.textTertiary }]}>
          Default meals cannot be removed. Removing a custom meal hides it from your daily log but preserves any existing entries.
        </Text>
      </ScrollView>
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
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
    gap: spacing[5],
  },
  sectionGroup: { gap: spacing[2] },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[3],
  },
  inactiveMealRow: { opacity: 0.7 },
  mealIconContainer: { width: 28, alignItems: 'center' as const, justifyContent: 'center' as const },
  mealName: { ...typography.body.medium, fontWeight: '500', flex: 1 },
  removeButton: { padding: spacing[1] },
  restoreButton: { padding: spacing[1] },
  restoreText: { ...typography.body.small, fontWeight: '600' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addButtonText: { ...typography.body.medium, fontWeight: '500' },
  addForm: { padding: spacing[3], borderRadius: borderRadius.md, gap: spacing[3] },
  addInput: {
    ...typography.body.medium,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  addFormActions: { flexDirection: 'row', gap: spacing[2], justifyContent: 'flex-end' },
  formButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  formButtonText: { ...typography.body.small, fontWeight: '600' },
  footnote: {
    ...typography.caption,
    paddingHorizontal: spacing[2],
  },
});
