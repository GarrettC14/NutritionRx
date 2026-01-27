import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useOnboardingStore } from '@/stores';
import { GoalPath } from '@/repositories/onboardingRepository';

interface GoalOption {
  value: GoalPath;
  label: string;
  subtitle: string;
}

const goalOptions: GoalOption[] = [
  {
    value: 'lose',
    label: 'Lose weight',
    subtitle: 'Track calories to reach goals',
  },
  {
    value: 'maintain',
    label: 'Maintain weight',
    subtitle: 'Keep your nutrition balanced',
  },
  {
    value: 'gain',
    label: 'Build muscle',
    subtitle: 'Optimize protein and calories',
  },
  {
    value: 'track',
    label: 'Just track what I eat',
    subtitle: 'No specific goal in mind',
  },
];

export default function GoalPathScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { setGoalPath } = useOnboardingStore();

  // Default to 'track' (no pressure)
  const [selected, setSelected] = useState<GoalPath>('track');

  const handleSelect = (value: GoalPath) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelected(value);
  };

  const handleContinue = () => {
    setGoalPath(selected);
    router.push('/onboarding/preferences');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          What brings you to{'\n'}NutritionRx?
        </Text>

        {/* Options */}
        <View style={styles.options}>
          {goalOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor: selected === option.value ? colors.accent : colors.borderDefault,
                  borderWidth: selected === option.value ? 2 : 1,
                },
              ]}
              onPress={() => handleSelect(option.value)}
            >
              <View style={styles.radioContainer}>
                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: selected === option.value ? colors.accent : colors.borderStrong,
                    },
                  ]}
                >
                  {selected === option.value && (
                    <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />
                  )}
                </View>
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                  {option.label}
                </Text>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                  {option.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
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
  header: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
  title: {
    ...typography.display.medium,
    marginBottom: spacing[6],
  },
  options: {
    gap: spacing[3],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  radioContainer: {
    marginRight: spacing[3],
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  optionSubtitle: {
    ...typography.body.medium,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
    paddingTop: spacing[4],
  },
});
