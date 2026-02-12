/**
 * Apple Health Settings Screen
 * Route: /settings/apple-health
 */
// TODO [POST_LAUNCH_HEALTH]: Enable after HealthKit package installed and Health Connect verified
import React from 'react';
import { Platform, StyleSheet, View, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { HealthIntegrationScreen } from '@/components/healthkit';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { TestIDs } from '@/constants/testIDs';

export default function AppleHealthScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']} testID={TestIDs.SettingsAppleHealth.Screen}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.bgInteractive }]}
          testID={TestIDs.SettingsAppleHealth.BackButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Main content */}
      <HealthIntegrationScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
