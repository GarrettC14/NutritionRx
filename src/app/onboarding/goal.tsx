import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { GoalType } from '@/types/domain';

interface GoalOption {
  type: GoalType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

const goalOptions: GoalOption[] = [
  {
    type: 'lose',
    icon: 'trending-down',
    label: 'Lose Weight',
    description: 'Create a calorie deficit to lose body fat',
  },
  {
    type: 'maintain',
    icon: 'fitness-outline',
    label: 'Maintain Weight',
    description: 'Keep your current weight stable',
  },
  {
    type: 'gain',
    icon: 'trending-up',
    label: 'Gain Weight',
    description: 'Build muscle with a calorie surplus',
  },
];

export default function GoalScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState<GoalType | null>(null);

  const handleContinue = () => {
    if (!selected) return;

    if (selected === 'maintain') {
      // Skip target screen for maintenance
      router.push({
        pathname: '/onboarding/rate',
        params: { goalType: selected },
      });
    } else {
      router.push({
        pathname: '/onboarding/target',
        params: { goalType: selected },
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '66%' }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>6 of 9</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          What's your goal?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We'll customize your nutrition targets based on this.
        </Text>

        <View style={styles.options}>
          {goalOptions.map((option) => (
            <Pressable
              key={option.type}
              style={[
                styles.option,
                {
                  backgroundColor:
                    selected === option.type ? colors.accent + '20' : colors.bgSecondary,
                  borderColor:
                    selected === option.type ? colors.accent : 'transparent',
                },
              ]}
              onPress={() => setSelected(option.type)}
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: selected === option.type ? colors.accent : colors.bgPrimary },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={32}
                  color={selected === option.type ? '#FFFFFF' : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.optionLabel,
                  { color: selected === option.type ? colors.accent : colors.textPrimary },
                ]}
              >
                {option.label}
              </Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {option.description}
              </Text>
              {selected === option.type && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
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
    paddingTop: spacing[8],
  },
  title: {
    ...typography.display.small,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.large,
    marginBottom: spacing[8],
  },
  options: {
    gap: spacing[4],
  },
  option: {
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  optionLabel: {
    ...typography.title.medium,
    marginBottom: spacing[1],
  },
  optionDescription: {
    ...typography.body.small,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
  },
});
