import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { TestIDs } from '@/constants/testIDs';
import Constants from 'expo-constants';

export default function AboutScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'About',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} testID={TestIDs.SettingsAbout.BackButton}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        testID={TestIDs.SettingsAbout.Screen}
      >
        <View style={styles.content}>
          <View style={[styles.logoContainer, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="nutrition-outline" size={64} color={colors.accent} />
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>
            NutritionRx
          </Text>
          <Text style={[styles.version, { color: colors.textSecondary }]}>
            Version {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Track what you eat. No judgment.
          </Text>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Privacy-first: Your data is always secure
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="wifi-outline" size={20} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Offline-first: Works without internet
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="heart" size={20} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                No ads: Clean, distraction-free experience
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: componentSpacing.screenEdgePadding,
    paddingTop: spacing[8],
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  appName: {
    ...typography.display.medium,
  },
  version: {
    ...typography.body.medium,
    marginTop: spacing[1],
  },
  tagline: {
    ...typography.body.large,
    marginTop: spacing[2],
    fontStyle: 'italic',
  },
  features: {
    marginTop: spacing[8],
    gap: spacing[4],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  featureText: {
    ...typography.body.medium,
  },
});
