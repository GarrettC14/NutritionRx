import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useWaterStore } from '@/stores';
import { DEFAULT_WATER_GOAL, DEFAULT_GLASS_SIZE_ML } from '@/repositories';
import { TestIDs, settingsWaterGlassGoalOption, settingsWaterGlassSizeOption } from '@/constants/testIDs';

const GLASS_GOAL_OPTIONS = [6, 8, 10, 12];
const GLASS_SIZE_OPTIONS = [
  { value: 200, label: '200 ml', description: 'Small glass' },
  { value: 250, label: '250 ml', description: 'Standard glass' },
  { value: 300, label: '300 ml', description: 'Large glass' },
  { value: 350, label: '350 ml', description: 'Extra large' },
];

export default function WaterSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { goalGlasses, glassSizeMl, setGoalGlasses, setGlassSizeMl, loadWaterSettings } = useWaterStore();

  const [customGoal, setCustomGoal] = useState('');
  const [showCustomGoal, setShowCustomGoal] = useState(false);

  useEffect(() => {
    loadWaterSettings();
  }, []);

  useEffect(() => {
    // Show custom input if current goal is not in preset options
    if (!GLASS_GOAL_OPTIONS.includes(goalGlasses)) {
      setShowCustomGoal(true);
      setCustomGoal(goalGlasses.toString());
    }
  }, [goalGlasses]);

  const handleGoalSelect = (goal: number) => {
    setShowCustomGoal(false);
    setGoalGlasses(goal);
  };

  const handleCustomGoalChange = (text: string) => {
    setCustomGoal(text);
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0 && num <= 20) {
      setGoalGlasses(num);
    }
  };

  const toggleCustomGoal = () => {
    setShowCustomGoal(!showCustomGoal);
    if (!showCustomGoal) {
      setCustomGoal(goalGlasses.toString());
    }
  };

  // Calculate daily water intake
  const dailyWaterMl = goalGlasses * glassSizeMl;
  const dailyWaterL = (dailyWaterMl / 1000).toFixed(1);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Water Tracking',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} testID={TestIDs.SettingsWater.BackButton}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        testID={TestIDs.SettingsWater.Screen}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          testID={TestIDs.SettingsWater.ScrollView}
        >
          {/* Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="water-outline" size={40} color={colors.accent} />
            <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
              Daily Goal: {dailyWaterL}L
            </Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              {goalGlasses} glasses × {glassSizeMl}ml
            </Text>
          </View>

          {/* Glass Goal Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
              DAILY GLASS GOAL
            </Text>
            <View style={styles.goalGrid} accessible={true} accessibilityLabel="Select daily water glass goal">
              {GLASS_GOAL_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.goalOption,
                    {
                      backgroundColor:
                        goalGlasses === option && !showCustomGoal
                          ? colors.accent + '20'
                          : colors.bgSecondary,
                      borderColor:
                        goalGlasses === option && !showCustomGoal ? colors.accent : 'transparent',
                    },
                  ]}
                  onPress={() => handleGoalSelect(option)}
                  testID={settingsWaterGlassGoalOption(option)}
                >
                  <Text
                    style={[
                      styles.goalNumber,
                      {
                        color:
                          goalGlasses === option && !showCustomGoal
                            ? colors.accent
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    {option}
                  </Text>
                  <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
                    glasses
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Custom Goal */}
            <Pressable
              style={[
                styles.customGoalButton,
                {
                  backgroundColor: showCustomGoal ? colors.accent + '20' : colors.bgSecondary,
                  borderColor: showCustomGoal ? colors.accent : 'transparent',
                },
              ]}
              onPress={toggleCustomGoal}
              testID={TestIDs.SettingsWater.CustomGoalButton}
            >
              {showCustomGoal ? (
                <View style={styles.customInputContainer}>
                  <TextInput
                    style={[styles.customInput, { color: colors.accent }]}
                    value={customGoal}
                    onChangeText={handleCustomGoalChange}
                    keyboardType="number-pad"
                    maxLength={2}
                    autoFocus
                    testID={TestIDs.SettingsWater.CustomGoalInput}
                  />
                  <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
                    glasses
                  </Text>
                </View>
              ) : (
                <View style={styles.customInputContainer}>
                  <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.customLabel, { color: colors.textSecondary }]}>
                    Custom goal
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Glass Size Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
              GLASS SIZE
            </Text>
            <View style={styles.options} accessible={true} accessibilityLabel="Select glass size">
              {GLASS_SIZE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.option,
                    {
                      backgroundColor:
                        glassSizeMl === option.value
                          ? colors.accent + '20'
                          : colors.bgSecondary,
                      borderColor:
                        glassSizeMl === option.value ? colors.accent : 'transparent',
                    },
                  ]}
                  onPress={() => setGlassSizeMl(option.value)}
                  testID={settingsWaterGlassSizeOption(option.value)}
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color:
                            glassSizeMl === option.value
                              ? colors.accent
                              : colors.textPrimary,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  {glassSizeMl === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Health experts generally recommend drinking 2-3 liters (8-12 glasses) of water per day.
              Your needs may vary based on activity level, climate, and individual factors.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: componentSpacing.screenEdgePadding,
    gap: spacing[6],
  },
  summaryCard: {
    alignItems: 'center',
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  summaryTitle: {
    ...typography.title.medium,
  },
  summarySubtitle: {
    ...typography.body.medium,
  },
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  goalOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  goalNumber: {
    ...typography.title.large,
    fontWeight: '700',
  },
  goalLabel: {
    ...typography.caption,
  },
  customGoalButton: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  customInput: {
    ...typography.title.large,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 40,
  },
  customLabel: {
    ...typography.body.medium,
  },
  options: {
    gap: spacing[3],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing[3],
  },
  optionContent: {
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  infoText: {
    ...typography.body.small,
    flex: 1,
  },
});
