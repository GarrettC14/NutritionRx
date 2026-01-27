import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useProfileStore } from '@/stores';

type HeightUnit = 'cm' | 'ft';

export default function HeightScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { updateProfile } = useProfileStore();

  const [unit, setUnit] = useState<HeightUnit>('cm');
  const [heightCm, setHeightCm] = useState('170');
  const [feet, setFeet] = useState('5');
  const [inches, setInches] = useState('7');

  const getHeightInCm = (): number => {
    if (unit === 'cm') {
      return parseFloat(heightCm) || 0;
    }
    const ft = parseFloat(feet) || 0;
    const inc = parseFloat(inches) || 0;
    return Math.round((ft * 12 + inc) * 2.54);
  };

  const handleHeightChange = (value: string) => {
    setHeightCm(value.replace(/[^0-9]/g, ''));
  };

  const handleContinue = async () => {
    const cm = getHeightInCm();
    await updateProfile({ heightCm: cm });
    router.push('/onboarding/weight');
  };

  const heightInCm = getHeightInCm();
  const isValid = heightInCm >= 100 && heightInCm <= 250;

  // Convert cm to display
  const displayFt = Math.floor(heightInCm / 30.48);
  const displayIn = Math.round((heightInCm - displayFt * 30.48) / 2.54);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '33%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>3 of 11</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          How tall are you?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your height helps calculate your daily calorie needs.
        </Text>

        {/* Unit Toggle */}
        <View style={[styles.unitToggle, { backgroundColor: colors.bgSecondary }]}>
          <Pressable
            style={[
              styles.unitButton,
              unit === 'cm' && { backgroundColor: colors.accent },
            ]}
            onPress={() => setUnit('cm')}
          >
            <Text
              style={[
                styles.unitButtonText,
                { color: unit === 'cm' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              cm
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.unitButton,
              unit === 'ft' && { backgroundColor: colors.accent },
            ]}
            onPress={() => setUnit('ft')}
          >
            <Text
              style={[
                styles.unitButtonText,
                { color: unit === 'ft' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              ft/in
            </Text>
          </Pressable>
        </View>

        {/* Height Input */}
        <View style={[styles.inputCard, { backgroundColor: colors.bgSecondary }]}>
          {unit === 'cm' ? (
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={heightCm}
                onChangeText={handleHeightChange}
                keyboardType="number-pad"
                placeholder="170"
                placeholderTextColor={colors.textTertiary}
                maxLength={3}
              />
              <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>cm</Text>
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.smallInput, { color: colors.textPrimary }]}
                value={feet}
                onChangeText={(v) => setFeet(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={colors.textTertiary}
                maxLength={1}
              />
              <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>ft</Text>
              <TextInput
                style={[styles.input, styles.smallInput, { color: colors.textPrimary }]}
                value={inches}
                onChangeText={(v) => setInches(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="7"
                placeholderTextColor={colors.textTertiary}
                maxLength={2}
              />
              <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>in</Text>
            </View>
          )}
        </View>

        {/* Conversion Display */}
        <Text style={[styles.conversion, { color: colors.textTertiary }]}>
          {unit === 'cm'
            ? `${displayFt}'${displayIn}"`
            : `${heightInCm} cm`}
        </Text>

        {!isValid && heightInCm > 0 && (
          <Text style={[styles.warning, { color: colors.warning }]}>
            Please enter a valid height (100-250 cm)
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
    minWidth: 80,
  },
  smallInput: {
    minWidth: 50,
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
