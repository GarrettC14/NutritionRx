/**
 * Health Integration Screen
 * Settings screen for managing Apple Health connection and sync preferences
 */
import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useHealthKitStore } from '@/stores/healthKitStore';
import { spacing, borderRadius } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface SettingRowProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingRow({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: SettingRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingInfo}>
        <Text
          style={[
            styles.settingTitle,
            { color: disabled ? colors.textDisabled : colors.textPrimary },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.settingDescription,
            { color: disabled ? colors.textDisabled : colors.textSecondary },
          ]}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.bgInteractive, true: colors.success }}
        thumbColor="#FFFFFF"
        disabled={disabled}
      />
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />;
}

export function HealthIntegrationScreen() {
  const { colors } = useTheme();
  const {
    isConnected,
    isAvailable,
    isLoading,
    syncNutrition,
    syncWater,
    readWeight,
    writeWeight,
    useActivityCalories,
    checkAvailability,
    checkConnectionStatus,
    requestAuthorization,
    setSyncNutrition,
    setSyncWater,
    setReadWeight,
    setWriteWeight,
    setUseActivityCalories,
  } = useHealthKitStore();

  // Check availability and connection status on mount
  useEffect(() => {
    const initialize = async () => {
      await checkAvailability();
      await checkConnectionStatus();
    };
    initialize();
  }, [checkAvailability, checkConnectionStatus]);

  const handleConnect = useCallback(async () => {
    await requestAuthorization();
    await checkConnectionStatus();
  }, [requestAuthorization, checkConnectionStatus]);

  const openHealthSettings = useCallback(() => {
    // Open Health app settings on iOS
    if (Platform.OS === 'ios') {
      Linking.openURL('x-apple-health://');
    }
  }, []);

  // Not available on this platform
  if (isAvailable === false) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        contentContainerStyle={styles.contentContainer}
      >
        <Card variant="elevated" padding="lg">
          <View style={styles.unavailableContainer}>
            <View style={[styles.unavailableIcon, { backgroundColor: colors.bgInteractive }]}>
              <Ionicons name="heart-dislike-outline" size={40} color={colors.textTertiary} />
            </View>
            <Text style={[styles.unavailableTitle, { color: colors.textPrimary }]}>
              Not Available
            </Text>
            <Text style={[styles.unavailableText, { color: colors.textSecondary }]}>
              Apple Health isn't available on this device. Your nutrition data is still
              safely stored in NutritionRx.
            </Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Loading state
  if (isAvailable === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking availability...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Apple Health</Text>
      <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
        Keep your health data in sync across all your apps.
      </Text>

      {/* Connection Status Card */}
      <Card variant="elevated" padding="lg" style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? colors.success : colors.textTertiary },
            ]}
          />
          <Text style={[styles.statusText, { color: colors.textPrimary }]}>
            {isConnected ? 'Connected' : 'Not connected'}
          </Text>
        </View>

        {!isConnected && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleConnect}
            loading={isLoading}
            style={styles.connectButton}
          >
            Connect to Apple Health
          </Button>
        )}

        {isConnected && (
          <Button
            variant="ghost"
            size="sm"
            onPress={openHealthSettings}
            style={styles.settingsLink}
          >
            Open Health Settings
          </Button>
        )}
      </Card>

      {/* Sync Settings */}
      {isConnected && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            What to sync
          </Text>
          <Card variant="elevated" padding="none">
            <View style={styles.settingsContainer}>
              <SettingRow
                title="Nutrition"
                description="Calories and macros from your food log"
                value={syncNutrition}
                onValueChange={setSyncNutrition}
              />
              <Divider />
              <SettingRow
                title="Water intake"
                description="Your daily water tracking"
                value={syncWater}
                onValueChange={setSyncWater}
              />
              <Divider />
              <SettingRow
                title="Read weight"
                description="Import from smart scales and other apps"
                value={readWeight}
                onValueChange={setReadWeight}
              />
              <Divider />
              <SettingRow
                title="Save weight"
                description="Send weight logged here to Apple Health"
                value={writeWeight}
                onValueChange={setWriteWeight}
              />
            </View>
          </Card>

          {/* Advanced Settings */}
          <Text
            style={[styles.sectionLabel, styles.advancedSection, { color: colors.textSecondary }]}
          >
            Advanced
          </Text>
          <Card variant="elevated" padding="none">
            <View style={styles.settingsContainer}>
              <SettingRow
                title="Adjust for activity"
                description="Add exercise calories to your daily goal"
                value={useActivityCalories}
                onValueChange={setUseActivityCalories}
              />
            </View>
          </Card>

          {/* Activity calories warning */}
          {useActivityCalories && (
            <View style={styles.warningContainer}>
              <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                This adds calories burned from workouts to your daily allowance. Most
                nutrition experts recommend not eating back all exercise calories, as
                estimates can vary. We add 50% of your exercise calories by default.
              </Text>
            </View>
          )}
        </>
      )}

      {/* Privacy notice */}
      <Text style={[styles.privacyText, { color: colors.textTertiary }]}>
        Your data is stored securely on your device. We never see or store your health
        information on our servers.
      </Text>

      {/* Help section */}
      <Card variant="default" padding="md" style={styles.helpCard}>
        <View style={styles.helpHeader}>
          <Ionicons name="help-circle-outline" size={20} color={colors.accent} />
          <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>Need help?</Text>
        </View>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          If you denied permission earlier, you can re-enable access in{' '}
          <Text style={{ fontWeight: '600' }}>
            Settings {'>'} Health {'>'} Data Access {'>'} NutritionRx
          </Text>
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  loadingText: {
    ...typography.body.medium,
  },
  pageTitle: {
    ...typography.heading.h1,
    marginBottom: spacing[2],
  },
  pageSubtitle: {
    ...typography.body.medium,
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  statusCard: {
    marginBottom: spacing[6],
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing[3],
  },
  statusText: {
    ...typography.body.large,
    fontWeight: '600',
  },
  connectButton: {
    marginTop: spacing[4],
  },
  settingsLink: {
    marginTop: spacing[3],
    alignSelf: 'flex-start',
  },
  sectionLabel: {
    ...typography.label.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
    marginLeft: spacing[1],
  },
  advancedSection: {
    marginTop: spacing[6],
  },
  settingsContainer: {
    paddingVertical: spacing[2],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing[4],
  },
  settingTitle: {
    ...typography.body.medium,
    fontWeight: '500',
    marginBottom: spacing[1],
  },
  settingDescription: {
    ...typography.body.small,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing[4],
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing[3],
    paddingHorizontal: spacing[1],
    gap: spacing[2],
  },
  warningText: {
    ...typography.body.small,
    flex: 1,
    lineHeight: 18,
  },
  privacyText: {
    ...typography.body.small,
    textAlign: 'center',
    marginTop: spacing[8],
    lineHeight: 18,
    paddingHorizontal: spacing[4],
  },
  helpCard: {
    marginTop: spacing[6],
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  helpTitle: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  helpText: {
    ...typography.body.small,
    lineHeight: 18,
  },
  unavailableContainer: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  unavailableIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  unavailableTitle: {
    ...typography.heading.h2,
    marginBottom: spacing[2],
  },
  unavailableText: {
    ...typography.body.medium,
    textAlign: 'center',
    lineHeight: 22,
  },
});
