import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { EatingStyle } from '@/types/domain';

interface EatingStyleOption {
  value: EatingStyle;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  ratio: string;
}

const eatingStyleOptions: EatingStyleOption[] = [
  {
    value: 'flexible',
    icon: 'options-outline',
    label: 'Flexible',
    description: 'Balanced split between carbs and fats',
    ratio: '50% carbs / 50% fat',
  },
  {
    value: 'carb_focused',
    icon: 'flash-outline',
    label: 'Carb Focused',
    description: 'Higher carbs for energy-demanding activities',
    ratio: '65% carbs / 35% fat',
  },
  {
    value: 'fat_focused',
    icon: 'water-outline',
    label: 'Fat Focused',
    description: 'Higher fats, capped at 150g carbs',
    ratio: '35% carbs / 65% fat',
  },
  {
    value: 'very_low_carb',
    icon: 'flame-outline',
    label: 'Very Low Carb',
    description: 'Keto-style, maximum 50g carbs per day',
    ratio: '10% carbs / 90% fat',
  },
];

export default function EatingStyleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    goalType: string;
    targetWeight?: string;
    rate: string;
  }>();

  const [selected, setSelected] = useState<EatingStyle>('flexible');

  const handleContinue = () => {
    router.push({
      pathname: '/onboarding/protein-priority',
      params: {
        ...params,
        eatingStyle: selected,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '81%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>9 of 11</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Choose your eating style
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This determines how your remaining calories (after protein) are split between carbs and fat.
        </Text>

        <ScrollView
          style={styles.optionsList}
          contentContainerStyle={styles.optionsContent}
          showsVerticalScrollIndicator={false}
        >
          {eatingStyleOptions.map((option) => (
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
                <Text style={[styles.optionRatio, { color: colors.textTertiary }]}>
                  {option.ratio}
                </Text>
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
            The percentages show how remaining calories (after protein) are split. You can change this later in Settings.
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
  optionRatio: {
    ...typography.caption,
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
