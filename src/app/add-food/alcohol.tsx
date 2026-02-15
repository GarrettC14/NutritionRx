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
import { MealType, MEAL_TYPE_LABELS } from '@/constants/mealTypes';
import { useFoodLogStore } from '@/stores';
import { Button } from '@/components/ui/Button';
import {
  DrinkType,
  DRINK_PRESETS,
  DRINK_LABELS,
  DRINK_ICONS,
  calculateDrinkNutrition,
  allocateToMacros,
} from '@/utils/alcoholCalculations';

type AlcoholTab = 'calculator' | 'direct';

const DRINK_TYPES: DrinkType[] = ['beer', 'wine', 'spirit', 'cocktail'];

export default function AlcoholEntryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string; date?: string }>();

  const { addQuickEntry } = useFoodLogStore();

  const mealType = (params.mealType as MealType) || MealType.Snack;
  const date = params.date || new Date().toISOString().split('T')[0];

  // Tab state
  const [activeTab, setActiveTab] = useState<AlcoholTab>('calculator');

  // Calculator state
  const [drinkType, setDrinkType] = useState<DrinkType>('beer');
  const [drinkName, setDrinkName] = useState('');
  const [abv, setAbv] = useState(String(DRINK_PRESETS.beer.abv));
  const [volume, setVolume] = useState(String(DRINK_PRESETS.beer.volumeOz));
  const [carbAllocation, setCarbAllocation] = useState(DRINK_PRESETS.beer.carbAllocation);

  // Direct entry state
  const [directName, setDirectName] = useState('');
  const [directCalories, setDirectCalories] = useState('');
  const [directProtein, setDirectProtein] = useState('');
  const [directCarbs, setDirectCarbs] = useState('');
  const [directFat, setDirectFat] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Calculator derived values
  const abvNum = parseFloat(abv) || 0;
  const volumeNum = parseFloat(volume) || 0;
  const nutrition = calculateDrinkNutrition(abvNum, volumeNum, drinkType);
  const macros = allocateToMacros(nutrition.totalCalories, carbAllocation);

  // Direct entry derived values
  const directCalNum = parseInt(directCalories) || 0;

  const isCalculatorValid = abvNum > 0 && volumeNum > 0;
  const isDirectValid = directCalNum > 0;
  const isValid = activeTab === 'calculator' ? isCalculatorValid : isDirectValid;

  const handleSelectDrinkType = (type: DrinkType) => {
    setDrinkType(type);
    const preset = DRINK_PRESETS[type];
    setAbv(String(preset.abv));
    setVolume(String(preset.volumeOz));
    setCarbAllocation(preset.carbAllocation);
  };

  const handleNumberInput = (value: string, setter: (v: string) => void) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setter(cleaned);
  };

  const handleIntInput = (value: string, setter: (v: string) => void) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setter(cleaned);
  };

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);

    try {
      if (activeTab === 'calculator') {
        const totalCal = Math.round(nutrition.totalCalories);
        const label = drinkName.trim() || DRINK_LABELS[drinkType];
        const icon = DRINK_ICONS[drinkType];

        await addQuickEntry({
          date,
          mealType,
          calories: totalCal,
          protein: 0,
          carbs: macros.carbs || undefined,
          fat: macros.fat || undefined,
          description: `${icon} ${label} (${abvNum}% ABV, ${volumeNum} oz)`,
        });
      } else {
        const label = directName.trim() || 'Alcoholic drink';
        await addQuickEntry({
          date,
          mealType,
          calories: directCalNum,
          protein: parseInt(directProtein) || undefined,
          carbs: parseInt(directCarbs) || undefined,
          fat: parseInt(directFat) || undefined,
          description: `🍺 ${label}`,
        });
      }

      AccessibilityInfo.announceForAccessibility('Alcohol entry saved');
      router.dismiss();
    } catch (error) {
      if (__DEV__) console.error('Failed to save alcohol entry:', error);
      AccessibilityInfo.announceForAccessibility('Failed to save alcohol entry');
    } finally {
      setIsSaving(false);
    }
  };

  // Allocation presets
  const allocationPresets = [
    { label: 'All fat', value: 0 },
    { label: '25%', value: 25 },
    { label: '50%', value: 50 },
    { label: '75%', value: 75 },
    { label: 'All carbs', value: 100 },
  ];

  const renderCalculatorTab = () => (
    <>
      {/* Drink Type Selector */}
      <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Drink Type</Text>
        <View style={styles.drinkTypeGrid}>
          {DRINK_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[
                styles.drinkTypeButton,
                {
                  backgroundColor: drinkType === type ? colors.accent : 'transparent',
                  borderColor: drinkType === type ? colors.accent : colors.borderDefault,
                },
              ]}
              onPress={() => handleSelectDrinkType(type)}
            >
              <Text style={styles.drinkTypeIcon}>{DRINK_ICONS[type]}</Text>
              <Text
                style={[
                  styles.drinkTypeLabel,
                  { color: drinkType === type ? '#FFFFFF' : colors.textPrimary },
                ]}
              >
                {DRINK_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Drink Name */}
      <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Name (Optional)</Text>
        <TextInput
          style={[styles.nameInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
          value={drinkName}
          onChangeText={setDrinkName}
          placeholder={`e.g., ${DRINK_LABELS[drinkType]}`}
          placeholderTextColor={colors.textTertiary}
          maxLength={100}
        />
      </View>

      {/* ABV & Volume */}
      <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Details</Text>
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>ABV %</Text>
            <TextInput
              style={[styles.detailInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
              value={abv}
              onChangeText={(v) => handleNumberInput(v, setAbv)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              selectTextOnFocus
            />
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Volume (oz)</Text>
            <TextInput
              style={[styles.detailInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
              value={volume}
              onChangeText={(v) => handleNumberInput(v, setVolume)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              selectTextOnFocus
            />
          </View>
        </View>
      </View>

      {/* Calorie Breakdown */}
      {isCalculatorValid && (
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Calorie Breakdown</Text>
          <View style={styles.breakdownList}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>From alcohol</Text>
              <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
                {Math.round(nutrition.alcoholCalories)} cal
              </Text>
            </View>
            {nutrition.carbCalories > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                  From carbs (est. {Math.round(nutrition.carbEstimate)}g)
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
                  +{Math.round(nutrition.carbCalories)} cal
                </Text>
              </View>
            )}
            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
              <Text style={[styles.breakdownTotalLabel, { color: colors.textPrimary }]}>Total</Text>
              <Text style={[styles.breakdownTotalValue, { color: colors.textPrimary }]}>
                {Math.round(nutrition.totalCalories)} cal
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Macro Allocation */}
      {isCalculatorValid && (
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Macro Allocation
          </Text>
          <Text style={[styles.allocationHint, { color: colors.textTertiary }]}>
            How should alcohol calories count toward your macros?
          </Text>
          <View style={styles.allocationPresets}>
            {allocationPresets.map((preset) => (
              <Pressable
                key={preset.value}
                style={[
                  styles.allocationButton,
                  {
                    backgroundColor: carbAllocation === preset.value ? colors.accent : 'transparent',
                    borderColor: carbAllocation === preset.value ? colors.accent : colors.borderDefault,
                  },
                ]}
                onPress={() => setCarbAllocation(preset.value)}
              >
                <Text
                  style={[
                    styles.allocationButtonText,
                    { color: carbAllocation === preset.value ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.macroResult}>
            <Text style={[styles.macroResultText, { color: colors.textSecondary }]}>
              {macros.carbs}g carbs · {macros.fat}g fat
            </Text>
          </View>
        </View>
      )}
    </>
  );

  const renderDirectTab = () => (
    <>
      {/* Name */}
      <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Name (Optional)</Text>
        <TextInput
          style={[styles.nameInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
          value={directName}
          onChangeText={setDirectName}
          placeholder="e.g., Craft IPA"
          placeholderTextColor={colors.textTertiary}
          maxLength={100}
        />
      </View>

      {/* Calories */}
      <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Calories *</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.calorieInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
            value={directCalories}
            onChangeText={(v) => handleIntInput(v, setDirectCalories)}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            selectTextOnFocus
          />
          <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>kcal</Text>
        </View>
      </View>

      {/* Macros */}
      <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Macros (Optional)</Text>
        <View style={styles.macroGrid}>
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: colors.protein }]} />
            <TextInput
              style={[styles.macroInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
              value={directProtein}
              onChangeText={(v) => handleIntInput(v, setDirectProtein)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein (g)</Text>
          </View>
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: colors.carbs }]} />
            <TextInput
              style={[styles.macroInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
              value={directCarbs}
              onChangeText={(v) => handleIntInput(v, setDirectCarbs)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs (g)</Text>
          </View>
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: colors.fat }]} />
            <TextInput
              style={[styles.macroInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
              value={directFat}
              onChangeText={(v) => handleIntInput(v, setDirectFat)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fat (g)</Text>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add Alcohol</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <Pressable
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'calculator' ? colors.accent : 'transparent' },
          ]}
          onPress={() => setActiveTab('calculator')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'calculator' ? colors.accent : colors.textSecondary },
            ]}
          >
            Calculator
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'direct' ? colors.accent : 'transparent' },
          ]}
          onPress={() => setActiveTab('direct')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'direct' ? colors.accent : colors.textSecondary },
            ]}
          >
            Direct Entry
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'calculator' ? renderCalculatorTab() : renderDirectTab()}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          onPress={handleSave}
          loading={isSaving}
          disabled={!isValid}
          fullWidth
        >{`Add to ${MEAL_TYPE_LABELS[mealType]}`}</Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[3],
  },
  headerTitle: { ...typography.title.medium },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    marginBottom: spacing[2],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 2,
  },
  tabText: { ...typography.body.medium, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  section: { padding: spacing[4], borderRadius: borderRadius.lg },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  // Drink type selector
  drinkTypeGrid: { flexDirection: 'row', gap: spacing[2] },
  drinkTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing[1],
  },
  drinkTypeIcon: { fontSize: 24 },
  drinkTypeLabel: { ...typography.caption, fontWeight: '500' },
  // Name input
  nameInput: {
    ...typography.body.medium,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  // Details row
  detailsRow: { flexDirection: 'row', gap: spacing[3] },
  detailItem: { flex: 1, gap: spacing[2] },
  detailLabel: { ...typography.body.small },
  detailInput: {
    ...typography.metric.medium,
    textAlign: 'center',
    borderBottomWidth: 2,
    paddingBottom: spacing[1],
  },
  // Calorie breakdown
  breakdownList: { gap: spacing[2] },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { ...typography.body.small },
  breakdownValue: { ...typography.body.small, fontWeight: '500' },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingTop: spacing[2],
    marginTop: spacing[1],
  },
  breakdownTotalLabel: { ...typography.body.medium, fontWeight: '700' },
  breakdownTotalValue: { ...typography.body.medium, fontWeight: '700' },
  // Allocation
  allocationHint: { ...typography.caption, marginBottom: spacing[3] },
  allocationPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  allocationButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  allocationButtonText: { ...typography.caption, fontWeight: '500' },
  macroResult: { alignItems: 'center', marginTop: spacing[3] },
  macroResultText: { ...typography.body.medium },
  // Direct entry (mirrors quick add)
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  calorieInput: {
    ...typography.metric.large,
    textAlign: 'center',
    minWidth: 120,
    borderBottomWidth: 2,
    paddingBottom: spacing[1],
  },
  inputUnit: { ...typography.body.large },
  macroGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  macroItem: { flex: 1, alignItems: 'center', gap: spacing[2] },
  macroDot: { width: 12, height: 12, borderRadius: 6 },
  macroInput: {
    ...typography.metric.medium,
    textAlign: 'center',
    width: '100%',
    borderBottomWidth: 1,
    paddingBottom: spacing[1],
  },
  macroLabel: { ...typography.caption, textAlign: 'center' },
  // Footer
  footer: { paddingHorizontal: componentSpacing.screenEdgePadding, paddingVertical: spacing[4] },
});
