import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useWeightStore, useSettingsStore } from '@/stores';

type WeightUnit = 'kg' | 'lbs';

const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number): number => Math.round((lbs / 2.20462) * 100) / 100;

export default function WeightScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { addEntry } = useWeightStore();
  const { settings, setWeightUnit } = useSettingsStore();

  const [unit, setUnit] = useState<WeightUnit>(settings.weightUnit || 'lbs');
  const [weight, setWeight] = useState(unit === 'kg' ? '70' : '154');

  const getWeightInKg = (): number => {
    const value = parseFloat(weight) || 0;
    return unit === 'kg' ? value : lbsToKg(value);
  };

  const handleWeightChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      setWeight(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setWeight(cleaned);
    }
  };

  const handleUnitChange = (newUnit: WeightUnit) => {
    const currentKg = getWeightInKg();
    setUnit(newUnit);
    if (newUnit === 'kg') {
      setWeight(currentKg.toFixed(1));
    } else {
      setWeight(kgToLbs(currentKg).toFixed(1));
    }
    setWeightUnit(newUnit);
  };

  const handleContinue = async () => {
    const weightKg = getWeightInKg();
    const today = new Date().toISOString().split('T')[0];

    // Save the weight entry
    await addEntry({
      date: today,
      weightKg,
    });

    router.push('/onboarding/activity');
  };

  const weightKg = getWeightInKg();
  const isValid = weightKg >= 30 && weightKg <= 300;

  // Convert for display
  const displayOther = unit === 'kg' ? `${kgToLbs(weightKg)} lbs` : `${weightKg.toFixed(1)} kg`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '44%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>4 of 9</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          What's your current weight?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This will be your starting point. You can update it anytime.
        </Text>

        {/* Unit Toggle */}
        <View style={[styles.unitToggle, { backgroundColor: colors.bgSecondary }]}>
          <Pressable
            style={[
              styles.unitButton,
              unit === 'kg' && { backgroundColor: colors.accent },
            ]}
            onPress={() => handleUnitChange('kg')}
          >
            <Text
              style={[
                styles.unitButtonText,
                { color: unit === 'kg' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              kg
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.unitButton,
              unit === 'lbs' && { backgroundColor: colors.accent },
            ]}
            onPress={() => handleUnitChange('lbs')}
          >
            <Text
              style={[
                styles.unitButtonText,
                { color: unit === 'lbs' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              lbs
            </Text>
          </Pressable>
        </View>

        {/* Weight Input */}
        <View style={[styles.inputCard, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={weight}
              onChangeText={handleWeightChange}
              keyboardType="decimal-pad"
              placeholder={unit === 'kg' ? '70' : '154'}
              placeholderTextColor={colors.textTertiary}
              maxLength={5}
            />
            <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>{unit}</Text>
          </View>
        </View>

        {/* Conversion Display */}
        <Text style={[styles.conversion, { color: colors.textTertiary }]}>
          {displayOther}
        </Text>

        {!isValid && weightKg > 0 && (
          <Text style={[styles.warning, { color: colors.warning }]}>
            Please enter a valid weight (30-300 kg)
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={!isValid}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    ...typography.caption,
  },
  content: {
    flex: 1,
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[8],
    alignItems: 'center',
  },
  title: {
    ...typography.display.small,
    marginBottom: spacing[2],
    alignSelf: 'flex-start',
  },
  subtitle: {
    ...typography.body.large,
    marginBottom: spacing[8],
    alignSelf: 'flex-start',
  },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing[1],
    marginBottom: spacing[6],
  },
  unitButton: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.sm,
  },
  unitButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  inputCard: {
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing[2],
  },
  input: {
    ...typography.metric.large,
    textAlign: 'center',
    minWidth: 100,
  },
  inputUnit: {
    ...typography.title.large,
  },
  conversion: {
    ...typography.body.medium,
    marginTop: spacing[3],
  },
  warning: {
    ...typography.body.medium,
    marginTop: spacing[4],
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
  },
});
