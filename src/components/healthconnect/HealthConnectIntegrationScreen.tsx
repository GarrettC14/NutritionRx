/**
 * Health Connect Integration Screen
 * Settings screen for managing Health Connect connection and sync preferences on Android
 * Follows the "Nourished Calm" design philosophy with supportive, non-judgmental language
 */
import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useHealthConnectStore } from '@/stores';
import { spacing, borderRadius } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface SettingRowProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

function SettingRow({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
  testID,
}: SettingRowProps) {
  const { colors } = useTheme();

  // Optimistic local state to prevent rubber-band lag on async handlers
  const [localValue, setLocalValue] = useState(value);
  const isFirstRender = useRef(true);
  useEffect(() => {
    // Skip the first render — localValue is already initialized from value
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: boolean) => {
    setLocalValue(newValue);
    onValueChange(newValue);
  };

  return (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]} testID={testID}>
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
        value={localValue}
        onValueChange={handleChange}
        trackColor={{ false: colors.bgInteractive, true: colors.success }}
        thumbColor="#FFFFFF"
        disabled={disabled}
      />
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return (
    <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />
  );
}

function ActivityExplainerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close explanation">
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.bgPrimary }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]} testID="settings-health-connect-explainer-modal-title">
            Exercise calories explained
          </Text>
          <Text style={[styles.modalText, { color: colors.textSecondary }]}>
            When you exercise, your body burns extra calories. This option adds
            those to your daily goal.
          </Text>

          <View
            style={[styles.exampleBox, { backgroundColor: colors.bgSecondary }]}
          >
            <Text style={[styles.exampleTitle, { color: colors.textPrimary }]}>
              Example:
            </Text>
            <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
              Your goal: 2,000 calories
            </Text>
            <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
              30 min walk: +150 calories
            </Text>
            <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
              New goal: 2,150 calories
            </Text>
          </View>

          <View
            style={[
              styles.noteBox,
              { backgroundColor: colors.success + '15' },
            ]}
          >
            <Text style={[styles.noteTitle, { color: colors.success }]}>
              A gentle note
            </Text>
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              Some people prefer not to "eat back" exercise calories. Listen to
              your body and do what feels right for you.
            </Text>
          </View>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={onClose}
            testID="settings-health-connect-explainer-modal-got-it"
          >
            Got it
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function HealthConnectIntegrationScreen() {
  const { colors } = useTheme();
  const [showActivityExplainer, setShowActivityExplainer] = useState(false);

  const {
    status,
    isLoading,
    syncError,
    lastSyncTime,
    syncNutritionEnabled,
    syncWaterEnabled,
    readWeightEnabled,
    adjustForActivityEnabled,
    checkAvailability,
    initializeAndRequestPermissions,
    setSyncNutritionEnabled,
    setSyncWaterEnabled,
    setReadWeightEnabled,
    setAdjustForActivityEnabled,
    openSettings,
    openPlayStore,
    resetSyncError,
  } = useHealthConnectStore();

  // Check availability on mount
  useEffect(() => {
    if (Platform.OS === 'android') {
      checkAvailability();
    }
  }, [checkAvailability]);

  const handleConnect = useCallback(async () => {
    await initializeAndRequestPermissions();
  }, [initializeAndRequestPermissions]);

  const formatLastSync = (dateString: string | null): string => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60)
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString();
  };

  // Not available on iOS
  if (Platform.OS !== 'android') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        contentContainerStyle={styles.contentContainer}
      >
        <Card variant="elevated" padding="lg">
          <View style={styles.unavailableContainer}>
            <View
              style={[
                styles.unavailableIcon,
                { backgroundColor: colors.bgInteractive },
              ]}
            >
              <Ionicons
                name="heart-dislike-outline"
                size={40}
                color={colors.textTertiary}
              />
            </View>
            <Text
              style={[styles.unavailableTitle, { color: colors.textPrimary }]}
            >
              Not Available
            </Text>
            <Text
              style={[styles.unavailableText, { color: colors.textSecondary }]}
            >
              Health Connect is only available on Android devices. Your
              nutrition data is still safely stored in NutritionRx.
            </Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Loading state
  if (isLoading && !status.isInitialized) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.bgPrimary }]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking Health Connect...
        </Text>
      </View>
    );
  }

  // Needs installation
  if (status.needsInstall) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
          Health Connect
        </Text>

        <Card variant="elevated" padding="lg" style={styles.onboardingCard}>
          <View style={styles.onboardingContainer}>
            <View
              style={[
                styles.onboardingIcon,
                { backgroundColor: colors.bgInteractive },
              ]}
            >
              <Ionicons name="heart-outline" size={40} color={colors.accent} />
            </View>
            <Text
              style={[styles.onboardingTitle, { color: colors.textPrimary }]}
            >
              One quick step
            </Text>
            <Text
              style={[styles.onboardingText, { color: colors.textSecondary }]}
            >
              Health Connect needs to be installed to share your nutrition data
              with other apps. It only takes a moment.
            </Text>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={openPlayStore}
              style={styles.connectButton}
            >
              Get Health Connect
            </Button>
            <Text
              style={[styles.privacyNote, { color: colors.textTertiary }]}
            >
              Your health data syncs securely with Health Connect.
            </Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Not available (unsupported device/version)
  if (!status.isAvailable && !status.needsInstall) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        contentContainerStyle={styles.contentContainer}
      >
        <Card variant="elevated" padding="lg">
          <View style={styles.unavailableContainer}>
            <View
              style={[
                styles.unavailableIcon,
                { backgroundColor: colors.bgInteractive },
              ]}
            >
              <Ionicons
                name="heart-dislike-outline"
                size={40}
                color={colors.textTertiary}
              />
            </View>
            <Text
              style={[styles.unavailableTitle, { color: colors.textPrimary }]}
            >
              Not Available
            </Text>
            <Text
              style={[styles.unavailableText, { color: colors.textSecondary }]}
            >
              Health Connect isn't available on this device. Your nutrition data
              is still safely stored in NutritionRx.
            </Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Not connected yet - show onboarding
  if (!status.isInitialized) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
          Health Connect
        </Text>

        <Card variant="elevated" padding="lg" style={styles.onboardingCard} testID="settings-health-connect-onboarding-card">
          <View style={styles.onboardingContainer}>
            <View
              style={[
                styles.onboardingIcon,
                { backgroundColor: colors.bgInteractive },
              ]}
            >
              <Ionicons name="heart-outline" size={40} color={colors.accent} />
            </View>
            <Text
              style={[styles.onboardingTitle, { color: colors.textPrimary }]}
            >
              Keep your health data connected
            </Text>
            <Text
              style={[styles.onboardingText, { color: colors.textSecondary }]}
            >
              Health Connect lets your nutrition data flow between your favorite
              health apps—all while staying private on your device.
            </Text>

            <View style={styles.bulletPoints}>
              <View style={styles.bulletRow}>
                <Ionicons
                  name="sync-outline"
                  size={18}
                  color={colors.success}
                />
                <Text
                  style={[styles.bulletText, { color: colors.textSecondary }]}
                >
                  Sync your nutrition automatically
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons
                  name="scale-outline"
                  size={18}
                  color={colors.success}
                />
                <Text
                  style={[styles.bulletText, { color: colors.textSecondary }]}
                >
                  See weight from your smart scale
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons
                  name="fitness-outline"
                  size={18}
                  color={colors.success}
                />
                <Text
                  style={[styles.bulletText, { color: colors.textSecondary }]}
                >
                  Adjust goals based on activity
                </Text>
              </View>
            </View>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleConnect}
              loading={isLoading}
              style={styles.connectButton}
              testID="settings-health-connect-connect-now-button"
            >
              Connect Now
            </Button>

            <Text
              style={[styles.privacyNote, { color: colors.textTertiary }]}
            >
              You can disconnect anytime from settings.
            </Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Connected - show settings
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
        Health Connect
      </Text>
      <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
        Keep your health data in sync across all your apps.
      </Text>

      {/* Error banner */}
      {syncError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]} testID="settings-health-connect-error-banner">
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {syncError}
          </Text>
          <Pressable onPress={resetSyncError} testID="settings-health-connect-error-dismiss-button" accessibilityRole="button" accessibilityLabel="Dismiss error">
            <Ionicons name="close" size={18} color={colors.error} />
          </Pressable>
        </View>
      )}

      {/* Connection Status Card */}
      <Card variant="elevated" padding="lg" style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: colors.success },
            ]}
          />
          <Text style={[styles.statusText, { color: colors.textPrimary }]}>
            Connected
          </Text>
        </View>

        <Button
          variant="ghost"
          size="sm"
          onPress={openSettings}
          style={styles.settingsLink}
          testID="settings-health-connect-manage-button"
        >
          Manage in Health Connect
        </Button>
      </Card>

      {/* Sync Settings */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        What to sync
      </Text>
      <Card variant="elevated" padding="none">
        <View style={styles.settingsContainer}>
          <SettingRow
            title="Sync nutrition"
            description="Share your meals and macros with Health Connect"
            value={syncNutritionEnabled}
            onValueChange={setSyncNutritionEnabled}
            testID="settings-health-connect-sync-nutrition-row"
          />
          <Divider />
          <SettingRow
            title="Sync water intake"
            description="Share your daily hydration"
            value={syncWaterEnabled}
            onValueChange={setSyncWaterEnabled}
            testID="settings-health-connect-sync-water-row"
          />
          <Divider />
          <SettingRow
            title="Read weight"
            description="Use weight from your smart scale or other apps"
            value={readWeightEnabled}
            onValueChange={setReadWeightEnabled}
            testID="settings-health-connect-read-weight-row"
          />
        </View>
      </Card>

      {/* Advanced Settings */}
      <Text
        style={[
          styles.sectionLabel,
          styles.advancedSection,
          { color: colors.textSecondary },
        ]}
      >
        Advanced
      </Text>
      <Card variant="elevated" padding="none">
        <View style={styles.settingsContainer}>
          <SettingRow
            title="Adjust for activity"
            description="Add exercise calories to your daily goal"
            value={adjustForActivityEnabled}
            onValueChange={setAdjustForActivityEnabled}
            testID="settings-health-connect-adjust-activity-row"
          />
          <Pressable
            style={styles.howItWorksButton}
            onPress={() => setShowActivityExplainer(true)}
            testID="settings-health-connect-how-this-works-button"
            accessibilityRole="button"
            accessibilityLabel="How activity adjustment works"
          >
            <Text style={[styles.howItWorksText, { color: colors.accent }]}>
              How this works
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Activity calories info */}
      {adjustForActivityEnabled && (
        <View style={styles.warningContainer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.warning}
          />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            This adds 50% of calories burned from workouts to your daily
            allowance. Most nutrition experts recommend not eating back all
            exercise calories.
          </Text>
        </View>
      )}

      {/* Last sync time */}
      {lastSyncTime && (
        <Text style={[styles.lastSyncText, { color: colors.textTertiary }]}>
          Last updated: {formatLastSync(lastSyncTime)}
        </Text>
      )}

      {/* Privacy notice */}
      <Text style={[styles.privacyText, { color: colors.textTertiary }]} testID="settings-health-connect-privacy-notice">
        Your health data syncs directly with Health Connect. We never access
        your health information directly.
      </Text>

      {/* Help section */}
      <Card variant="default" padding="md" style={styles.helpCard} testID="settings-health-connect-help-section">
        <View style={styles.helpHeader}>
          <Ionicons name="help-circle-outline" size={20} color={colors.accent} />
          <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>
            Need help?
          </Text>
        </View>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          If you denied permission earlier, you can re-enable access in{' '}
          <Text style={{ fontWeight: '600' }}>
            Settings {'>'} Apps {'>'} Health Connect {'>'} App permissions
          </Text>
        </Text>
      </Card>

      {/* Activity Explainer Modal */}
      <ActivityExplainerModal
        visible={showActivityExplainer}
        onClose={() => setShowActivityExplainer(false)}
      />
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
    ...typography.display.small,
    marginBottom: spacing[2],
  },
  pageSubtitle: {
    ...typography.body.medium,
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  errorText: {
    ...typography.body.small,
    flex: 1,
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
    ...typography.overline,
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
  howItWorksButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  howItWorksText: {
    ...typography.body.small,
    fontWeight: '500',
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
  lastSyncText: {
    ...typography.body.small,
    textAlign: 'center',
    marginTop: spacing[4],
  },
  privacyText: {
    ...typography.body.small,
    textAlign: 'center',
    marginTop: spacing[6],
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
    ...typography.title.large,
    marginBottom: spacing[2],
  },
  unavailableText: {
    ...typography.body.medium,
    textAlign: 'center',
    lineHeight: 22,
  },
  onboardingCard: {
    marginTop: spacing[2],
  },
  onboardingContainer: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  onboardingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  onboardingTitle: {
    ...typography.title.large,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  onboardingText: {
    ...typography.body.medium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[4],
    paddingHorizontal: spacing[2],
  },
  bulletPoints: {
    width: '100%',
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[2],
  },
  bulletText: {
    ...typography.body.medium,
    flex: 1,
  },
  privacyNote: {
    ...typography.body.small,
    textAlign: 'center',
    marginTop: spacing[3],
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    ...typography.title.large,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  modalText: {
    ...typography.body.medium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  exampleBox: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  exampleTitle: {
    ...typography.body.small,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  exampleText: {
    ...typography.body.small,
    marginBottom: spacing[1],
  },
  noteBox: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[5],
  },
  noteTitle: {
    ...typography.body.small,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  noteText: {
    ...typography.body.small,
    lineHeight: 18,
  },
});
