/**
 * Health Connect Settings Screen
 * Route: /settings/health-connect
 * Android-only screen for Health Connect integration
 */
// TODO [POST_LAUNCH_HEALTH]: Enable after HealthKit package installed and Health Connect verified
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { HealthConnectIntegrationScreen } from '@/components/healthconnect';
import { spacing } from '@/constants/spacing';
import { TestIDs } from '@/constants/testIDs';

export default function HealthConnectScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={['top']}
      testID={TestIDs.SettingsHealthConnect.Screen}
    >
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.bgInteractive }]}
          testID={TestIDs.SettingsHealthConnect.BackButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Main content */}
      <HealthConnectIntegrationScreen />
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
