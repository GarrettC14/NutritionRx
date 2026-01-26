import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { ProteinPriority } from '@/types/domain';
import { useWeightStore, useSettingsStore } from '@/stores';

interface ProteinPriorityOption {
  value: ProteinPriority;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  gPerLb: number;
}

const proteinPriorityOptions: ProteinPriorityOption[] = [
  {
    value: 'standard',
    icon: 'person-outline',
    label: 'Standard',
    description: 'For sedentary or light activity lifestyle',
    gPerLb: 0.6,
  },
  {
    value: 'active',
    icon: 'walk-outline',
    label: 'Active',
    description: 'For regular moderate exercise',
    gPerLb: 0.75,
  },
  {
    value: 'athletic',
    icon: 'barbell-outline',
    label: 'Athletic',
    description: 'For intense training or endurance sports',
    gPerLb: 0.9,
  },
  {
    value: 'maximum',
    icon: 'trophy-outline',
    label: 'Maximum',
    description: 'For muscle building or strength athletes',
    gPerLb: 1.0,
  },
];

export default function ProteinPriorityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    goalType: string;
    targetWeight?: string;
    rate: string;
    eatingStyle: string;
  }>();

  const { latestEntry } = useWeightStore();
  const { settings } = useSettingsStore();
  const currentWeightKg = latestEntry?.weightKg || 70;
  const isLbs = settings.weightUnit === 'lbs';

  // Convert kg to lbs for protein calculation display
  const currentWeightLbs = currentWeightKg * 2.20462;

  const [selected, setSelected] = useState<ProteinPriority>('active');

  // Calculate protein example based on current weight
  const getProteinExample = (gPerLb: number): string => {
    const proteinGrams = Math.round(currentWeightLbs * gPerLb);
    return `${proteinGrams}g for your weight`;
  };

  const handleContinue = () => {
    router.push({
      pathname: '/onboarding/summary',
      params: {
        ...params,
        proteinPriority: selected,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '90%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>10 of 11</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Set your protein priority
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This determines how much protein you'll eat based on your body weight. Protein is calculated first, then remaining calories are split between carbs and fat.
        </Text>

        <ScrollView
          style={styles.optionsList}
          contentContainerStyle={styles.optionsContent}
          showsVerticalScrollIndicator={false}
        >
          {proteinPriorityOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor:
                    selected === option.value ? colors.accent + '20' : colors.bgSecondary,
                  borderColor:
                    selected === option.value ? colors.accent : 'transparent',
                },
              ]}
              onPress={() => setSelected(option.value)}
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: selected === option.value ? colors.accent : colors.bgPrimary },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={selected === option.value ? '#FFFFFF' : colors.textSecondary}
                />
              </View>
              <View style={styles.optionText}>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: selected === option.value ? colors.accent : colors.textPrimary },
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
                <View style={styles.optionMeta}>
                  <Text style={[styles.optionRatio, { color: colors.textTertiary }]}>
                    {option.gPerLb}g per lb body weight
                  </Text>
                  <Text style={[styles.optionExample, { color: colors.accent }]}>
                    {getProteinExample(option.gPerLb)}
                  </Text>
                </View>
              </View>
              {selected === option.value && (
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
              )}
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.infoBox, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Higher protein helps preserve muscle during weight loss and supports muscle building during weight gain. You can adjust this later in Settings.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleContinue}
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
    paddingTop: spacing[6],
  },
  title: {
    ...typography.display.small,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.large,
    marginBottom: spacing[6],
  },
  optionsList: {
    flex: 1,
  },
  optionsContent: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing[3],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  optionDescription: {
    ...typography.body.small,
    marginBottom: spacing[1],
  },
  optionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionRatio: {
    ...typography.caption,
  },
  optionExample: {
    ...typography.caption,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginTop: spacing[2],
  },
  infoText: {
    ...typography.body.small,
    flex: 1,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
  },
});
