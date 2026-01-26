import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useSettingsStore } from '@/stores';
import { WeightUnit } from '@/constants/defaults';

export default function UnitsSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { settings, setWeightUnit } = useSettingsStore();

  const weightUnitOptions: { value: WeightUnit; label: string; description: string }[] = [
    { value: 'lbs', label: 'Pounds (lbs)', description: 'Imperial system' },
    { value: 'kg', label: 'Kilograms (kg)', description: 'Metric system' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Units',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Weight Unit */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              WEIGHT UNIT
            </Text>
            <View style={styles.options}>
              {weightUnitOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.option,
                    {
                      backgroundColor:
                        settings.weightUnit === option.value
                          ? colors.accent + '20'
                          : colors.bgSecondary,
                      borderColor:
                        settings.weightUnit === option.value ? colors.accent : 'transparent',
                    },
                  ]}
                  onPress={() => setWeightUnit(option.value)}
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color:
                            settings.weightUnit === option.value
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
                  {settings.weightUnit === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Energy Unit Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Energy is measured in kilocalories (kcal). This is the standard unit used for
              nutrition labels and dietary guidelines.
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
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
