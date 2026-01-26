import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { useProfileStore } from '@/stores';
import { ActivityLevel } from '@/types/domain';
import { tdeeCalculator } from '@/services/tdeeCalculator';

interface ActivityOption {
  level: ActivityLevel;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

const activityOptions: ActivityOption[] = [
  {
    level: 'sedentary',
    icon: 'desktop-outline',
    label: 'Sedentary',
    description: 'Desk job, little to no exercise',
  },
  {
    level: 'lightly_active',
    icon: 'walk-outline',
    label: 'Lightly Active',
    description: 'Light exercise 1-3 days per week',
  },
  {
    level: 'moderately_active',
    icon: 'bicycle-outline',
    label: 'Moderately Active',
    description: 'Moderate exercise 3-5 days per week',
  },
  {
    level: 'very_active',
    icon: 'barbell-outline',
    label: 'Very Active',
    description: 'Hard exercise 6-7 days per week',
  },
  {
    level: 'extremely_active',
    icon: 'fitness-outline',
    label: 'Extremely Active',
    description: 'Very hard exercise or physical job',
  },
];

export default function ActivityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile, updateProfile } = useProfileStore();
  const [selected, setSelected] = useState<ActivityLevel | null>(null);

  const handleContinue = async () => {
    if (!selected) return;
    await updateProfile({ activityLevel: selected });
    router.push('/onboarding/goal');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '55%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>5 of 9</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          How active are you?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Be honest - this affects your calorie calculations.
        </Text>

        <ScrollView
          style={styles.optionsList}
          contentContainerStyle={styles.optionsContent}
          showsVerticalScrollIndicator={false}
        >
          {activityOptions.map((option) => (
            <Pressable
              key={option.level}
              style={[
                styles.option,
                {
                  backgroundColor:
                    selected === option.level ? colors.accent + '20' : colors.bgSecondary,
                  borderColor:
                    selected === option.level ? colors.accent : 'transparent',
                },
              ]}
              onPress={() => setSelected(option.level)}
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: selected === option.level ? colors.accent : colors.bgPrimary },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={selected === option.level ? '#FFFFFF' : colors.textSecondary}
                />
              </View>
              <View style={styles.optionText}>
                <Text
                  style={[
                    styles.optionLabel,
                    { color: selected === option.level ? colors.accent : colors.textPrimary },
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              {selected === option.level && (
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={!selected}
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
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
  },
});
