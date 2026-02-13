import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePreference } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useProfileStore } from '@/stores/profileStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { PremiumSettingsRow } from '@/components/premium/PremiumSettingsRow';
import { ModelDownloadSheet } from '@/components/llm/ModelDownloadSheet';
import { useLLMStatus } from '@/hooks/useLLMStatus';
import { LLMService } from '@/features/insights/services/LLMService';
import { seedDatabase } from '@/utils/devTools/seedDatabase';
import { DEFAULT_SEED_OPTIONS } from '@/utils/devTools/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetDatabase } from '@/db/database';
import Constants from 'expo-constants';
import { TestIDs } from '@/constants/testIDs';
import * as Sentry from '@sentry/react-native';
import { CrashFallbackScreen } from '@/components/CrashFallbackScreen';
import { reviewPromptService } from '@/services/reviewPromptService';

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
  showLock?: boolean;
  testID?: string;
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  danger = false,
  showLock = false,
  testID,
}: SettingsItemProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      testID={testID}
      style={[styles.settingsItem, { backgroundColor: colors.bgSecondary }]}
      onPress={onPress}
    >
      <View
        style={[
          styles.settingsIcon,
          { backgroundColor: danger ? colors.errorBg : colors.bgInteractive },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.error : colors.accent}
        />
      </View>
      <View style={styles.settingsContent}>
        <Text
          style={[
            styles.settingsTitle,
            { color: danger ? colors.error : colors.textPrimary },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {showLock ? (
        <Ionicons name="lock-closed" size={20} color={colors.premiumGold} />
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      ) : null}
    </Pressable>
  );
}

const THEME_TEST_IDS: Record<string, string> = {
  system: TestIDs.Settings.ThemeSystem,
  light: TestIDs.Settings.ThemeLight,
  dark: TestIDs.Settings.ThemeDark,
};

function ThemeSelector() {
  const { colors, preference, setPreference } = useTheme();

  const options: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  ];

  return (
    <View style={[styles.themeSelector, { backgroundColor: colors.bgSecondary }]}>
      <View style={[styles.settingsIcon, { backgroundColor: colors.bgInteractive }]}>
        <Ionicons name="color-palette-outline" size={20} color={colors.accent} />
      </View>
      <View style={styles.themeSelectorContent}>
        <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
          Appearance
        </Text>
        <View style={[styles.segmentedControl, { backgroundColor: colors.bgInteractive }]}>
          {options.map((option) => {
            const isSelected = preference === option.value;
            return (
              <Pressable
                key={option.value}
                testID={THEME_TEST_IDS[option.value]}
                style={[
                  styles.segmentOption,
                  isSelected && [
                    styles.segmentOptionSelected,
                    { backgroundColor: colors.bgElevated },
                  ],
                ]}
                onPress={() => setPreference(option.value)}
              >
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={isSelected ? colors.accent : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentLabel,
                    { color: isSelected ? colors.accent : colors.textSecondary },
                    isSelected && styles.segmentLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isPremium, expirationDate, hasBundle, isDevPremium, toggleDevPremium } = useSubscriptionStore();
  const { resetToDefaults: resetDashboard } = useDashboardStore();
  const { resetOnboarding, resetTooltips } = useOnboardingStore();
  const { resetProfile } = useProfileStore();
  const { resetToDefaults: resetSettings } = useSettingsStore();
  const { showConfirm } = useConfirmDialog();

  const [isSeeding, setIsSeeding] = useState(false);
  const [showDownloadSheet, setShowDownloadSheet] = useState(false);
  const { status: llmStatus, isReady: llmReady, needsDownload: llmNeedsDownload, isUnsupported: llmUnsupported, providerName } = useLLMStatus();

  const [modelSizeText, setModelSizeText] = useState<string | null>(null);
  React.useEffect(() => {
    if (llmReady) {
      LLMService.getModelSize().then((bytes) => {
        if (bytes > 0) {
          setModelSizeText(`${Math.round(bytes / (1024 * 1024))} MB`);
        }
      });
    }
  }, [llmReady]);

  const handleDeleteModel = () => {
    showConfirm({
      title: 'Delete AI Model',
      message: 'This will remove the downloaded model. You can re-download it anytime.',
      icon: 'trash-outline',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmStyle: 'destructive',
      onConfirm: async () => {
        await LLMService.deleteModel();
        const { useDailyInsightStore } = await import('@/features/insights/stores/dailyInsightStore');
        useDailyInsightStore.setState({ llmStatus: 'not_downloaded' });
        setModelSizeText(null);
      },
    });
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const result = await seedDatabase(DEFAULT_SEED_OPTIONS);
      if (result.success) {
        Alert.alert('Seed Complete', `Inserted records in ${(result.duration / 1000).toFixed(1)}s.`);
      } else {
        Alert.alert('Seed Failed', result.errors.join('\n'));
      }
    } catch (e: any) {
      Alert.alert('Seed Error', e.message ?? 'Unknown error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Developer menu access - tap version 7 times
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleVersionTap = () => {
    if (!__DEV__) return;

    const now = Date.now();
    // Reset if more than 2 seconds between taps
    if (now - lastTapTimeRef.current > 2000) {
      tapCountRef.current = 0;
    }
    lastTapTimeRef.current = now;
    tapCountRef.current += 1;

    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      router.push('/settings/developer');
    }
  };

  const handleDeleteAllData = () => {
    showConfirm({
      title: 'Delete All Data',
      message: 'This will permanently delete all your food logs, weight entries, water tracking, and profile data. This action cannot be undone.',
      icon: 'trash-outline',
      confirmLabel: 'Delete Everything',
      cancelLabel: 'Cancel',
      confirmStyle: 'destructive',
      onConfirm: async () => {
        try {
          await AsyncStorage.clear();
          await resetDatabase();
          router.replace('/');
        } catch (error) {
          Alert.alert('Error', 'Failed to delete data. Please try again.');
        }
      },
    });
  };

  const handleFreshSession = () => {
    showConfirm({
      title: 'Start Fresh Session',
      message: 'This will reset all app state and take you through onboarding as a new user. Use this to test the first-time user experience.',
      icon: 'flask-outline',
      confirmLabel: 'Reset & Start',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        // Reset all stores
        await Promise.all([
          resetOnboarding(),
          resetProfile(),
          resetSettings(),
          resetTooltips(),
        ]);
        resetDashboard();

        // Navigate directly to legal screen (root index won't remount properly)
        // After legal is completed, it goes to / which redirects to onboarding
        router.replace('/legal-acknowledgment');
      },
    });
  };

  return (
    <SafeAreaView testID={TestIDs.Settings.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} accessibilityRole="header">
          Settings
        </Text>
      </View>

      <ScrollView
        testID={TestIDs.Settings.ScrollView}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
            PREMIUM
          </Text>
          <View style={styles.sectionContent}>
            {isPremium ? (
              <>
                <Pressable
                  testID={TestIDs.Settings.PremiumRow}
                  style={[styles.settingsItem, { backgroundColor: colors.bgSecondary }]}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      Linking.openURL('https://apps.apple.com/account/subscriptions');
                    } else {
                      Linking.openURL('https://play.google.com/store/account/subscriptions');
                    }
                  }}
                >
                  <View
                    style={[styles.settingsIcon, { backgroundColor: colors.successBg }]}
                  >
                    <Ionicons name="star" size={20} color={colors.success} />
                  </View>
                  <View style={styles.settingsContent}>
                    <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
                      Premium Active
                    </Text>
                    <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
                      {hasBundle ? 'Bundle subscription' : 'Single app subscription'}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                </Pressable>
                {expirationDate && (
                  <View
                    style={[styles.settingsItem, { backgroundColor: colors.bgSecondary }]}
                  >
                    <View
                      style={[styles.settingsIcon, { backgroundColor: colors.bgInteractive }]}
                    >
                      <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.settingsContent}>
                      <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
                        Renews
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary }}>
                      {new Date(expirationDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <SettingsItem
                testID={TestIDs.Settings.PremiumRow}
                icon="star-outline"
                title="Upgrade to Premium"
                subtitle="Unlock all features"
                onPress={() => router.push('/paywall?context=general')}
              />
            )}
            <SettingsItem
              icon="gift-outline"
              title="Referral Program"
              subtitle="Earn rewards by sharing with friends"
              onPress={() => router.push('/paywall?context=referral')}
            />
          </View>
        </View>

        {/* Your Plan Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
            YOUR PLAN
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              testID={TestIDs.Settings.GoalsRow}
              icon="flag-outline"
              title="Your Goal"
              subtitle="Set up personalized targets"
              onPress={() => router.push('/settings/goals')}
            />
            <SettingsItem
              testID={TestIDs.Settings.NutritionRow}
              icon="nutrition-outline"
              title="Nutrition Preferences"
              subtitle="Eating style, protein priority"
              onPress={() => router.push('/settings/nutrition')}
            />
            <SettingsItem
              testID={TestIDs.Settings.MealPlanningRow}
              icon="calendar-outline"
              title="Meal Planning"
              subtitle="Plan meals in advance"
              onPress={() => router.push('/settings/meal-planning')}
            />
            <PremiumSettingsRow
              testID={TestIDs.Settings.MacroCyclingRow}
              icon="repeat-outline"
              label="Macro Cycling"
              subtitle="Different targets for training vs rest days"
              href="/macro-cycling-setup"
              context="planning"
            />
          </View>
        </View>

        {/* Tracking Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
            TRACKING
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              testID={TestIDs.Settings.WaterRow}
              icon="water-outline"
              title="Water Tracking"
              subtitle="Daily glass goal, glass size"
              onPress={() => router.push('/settings/water')}
            />
            <SettingsItem
              testID={TestIDs.Settings.FastingRow}
              icon="timer-outline"
              title="Fasting Timer"
              subtitle="Intermittent fasting schedule"
              onPress={() => router.push('/settings/fasting')}
            />
          </View>
        </View>

        {/* AI Model Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
            AI MODEL
          </Text>
          <View style={styles.sectionContent}>
            {/* Status row — always visible */}
            <View style={[styles.settingsItem, { backgroundColor: colors.bgSecondary }]}>
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: llmReady ? colors.successBg : colors.bgInteractive },
                ]}
              >
                <Ionicons
                  name="hardware-chip-outline"
                  size={20}
                  color={llmReady ? colors.success : colors.accent}
                />
              </View>
              <View style={styles.settingsContent}>
                <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
                  AI Model
                </Text>
                <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
                  {llmReady
                    ? `Ready — ${providerName}`
                    : llmNeedsDownload
                      ? 'Download required'
                      : llmUnsupported
                        ? 'Not available on this device'
                        : 'Checking...'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: llmReady
                      ? colors.success
                      : llmNeedsDownload
                        ? colors.warning
                        : colors.textTertiary,
                  },
                ]}
              />
            </View>

            {/* Storage row — only when ready and provider is not Apple Foundation */}
            {llmReady && modelSizeText && providerName !== 'Apple Foundation' && (
              <View style={[styles.settingsItem, { backgroundColor: colors.bgSecondary }]}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.bgInteractive }]}>
                  <Ionicons name="folder-outline" size={20} color={colors.accent} />
                </View>
                <View style={styles.settingsContent}>
                  <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
                    Model Storage
                  </Text>
                  <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
                    {modelSizeText}
                  </Text>
                </View>
              </View>
            )}

            {/* Download row — only when not downloaded */}
            {llmNeedsDownload && (
              <SettingsItem
                icon="cloud-download-outline"
                title="Download Model"
                subtitle="Required for AI-powered insights"
                onPress={() => setShowDownloadSheet(true)}
              />
            )}

            {/* Delete row — only when ready and Llama provider */}
            {llmReady && providerName !== 'Apple Foundation' && (
              <SettingsItem
                icon="trash-outline"
                title="Delete Model"
                onPress={handleDeleteModel}
                danger
                showChevron={false}
              />
            )}
          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
            PROFILE
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              testID={TestIDs.Settings.ProfileRow}
              icon="person-outline"
              title="Profile"
              subtitle="Height, weight unit"
              onPress={() => router.push('/settings/profile')}
            />
            <SettingsItem
              testID={TestIDs.Settings.UnitsRow}
              icon="scale-outline"
              title="Units"
              subtitle="Weight unit preference"
              onPress={() => router.push('/settings/units')}
            />
            <ThemeSelector />
          </View>
        </View>

        {/* Connections Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
            CONNECTIONS
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              testID={TestIDs.Settings.WidgetsRow}
              icon="apps-outline"
              title="Widgets"
              subtitle="Home screen widgets setup"
              onPress={() => router.push('/settings/widgets')}
            />
<SettingsItem
              testID={TestIDs.Settings.ImportRow}
              icon="cloud-download-outline"
              title="Import From Other Apps"
              subtitle="MyFitnessPal, Cronometer, Lose It!, MacroFactor"
              onPress={() => router.push('/import-data')}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
            SUPPORT
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              testID={TestIDs.Settings.HealthNoticeRow}
              icon="heart-outline"
              title="Health & Safety Notice"
              subtitle="Review the health disclaimer"
              onPress={() => router.push('/settings/health-notice')}
            />
            <SettingsItem
              icon="trash-outline"
              title="Delete My Data"
              subtitle="Permanently erase all app data"
              onPress={handleDeleteAllData}
              danger
              showChevron={false}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
            ABOUT
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              testID={TestIDs.Settings.TermsRow}
              icon="document-text-outline"
              title="Terms of Service"
              onPress={() => router.push('/settings/terms-of-service')}
            />
            <SettingsItem
              testID={TestIDs.Settings.PrivacyRow}
              icon="shield-outline"
              title="Privacy Policy"
              onPress={() => router.push('/settings/privacy-policy')}
            />
            <SettingsItem
              icon="star-outline"
              title="Rate NutritionRx"
              subtitle="Leave a review on the store"
              onPress={() => reviewPromptService.handleRateApp()}
              testID="settings-rate-app"
            />
          </View>
        </View>

        {/* Developer Section - for testing */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">
              DEVELOPER
            </Text>
            <View style={styles.sectionContent}>
              <Pressable
                testID={TestIDs.Settings.DevPremiumToggle}
                style={[styles.settingsItem, { backgroundColor: colors.bgSecondary }]}
                onPress={toggleDevPremium}
              >
                <View
                  style={[
                    styles.settingsIcon,
                    { backgroundColor: isDevPremium ? colors.successBg : colors.bgInteractive },
                  ]}
                >
                  <Ionicons
                    name={isDevPremium ? 'lock-open' : 'lock-closed'}
                    size={20}
                    color={isDevPremium ? colors.success : colors.accent}
                  />
                </View>
                <View style={styles.settingsContent}>
                  <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
                    {isDevPremium ? 'Premium Unlocked (Dev)' : 'Unlock Premium (Dev)'}
                  </Text>
                  <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
                    {isDevPremium ? 'Tap to disable premium for testing' : 'Tap to enable all premium features'}
                  </Text>
                </View>
                {isDevPremium && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                )}
              </Pressable>
              <Pressable
                testID={TestIDs.Settings.DevFreshSession}
                style={[styles.settingsItem, { backgroundColor: colors.bgSecondary }]}
                onPress={handleFreshSession}
              >
                <View
                  style={[styles.settingsIcon, { backgroundColor: colors.warningBg }]}
                >
                  <Ionicons name="refresh-outline" size={20} color={colors.warning} />
                </View>
                <View style={styles.settingsContent}>
                  <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
                    Fresh Session
                  </Text>
                  <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
                    Reset all state and restart onboarding
                  </Text>
                </View>
              </Pressable>
              <Pressable
                testID={TestIDs.Settings.DevSeedDatabase}
                style={[styles.settingsItem, { backgroundColor: colors.bgSecondary, opacity: isSeeding ? 0.6 : 1 }]}
                onPress={handleSeedDatabase}
                disabled={isSeeding}
              >
                <View
                  style={[styles.settingsIcon, { backgroundColor: colors.bgInteractive }]}
                >
                  {isSeeding ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Ionicons name="server-outline" size={20} color={colors.accent} />
                  )}
                </View>
                <View style={styles.settingsContent}>
                  <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
                    Seed Database
                  </Text>
                  <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
                    Fill app with 6 months of realistic data
                  </Text>
                </View>
              </Pressable>
              <SettingsItem
                testID={TestIDs.Settings.DeleteAllDataRow}
                icon="trash-outline"
                title="Delete All Data"
                onPress={handleDeleteAllData}
                danger
              />
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Made with care by the NutritionRx team
          </Text>
          <Pressable onPress={handleVersionTap}>
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              Version {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <ModelDownloadSheet
        visible={showDownloadSheet}
        onDismiss={() => setShowDownloadSheet(false)}
        onComplete={() => setShowDownloadSheet(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
  headerTitle: {
    ...typography.display.small,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...typography.overline,
    marginBottom: spacing[2],
    paddingHorizontal: spacing[2],
  },
  sectionContent: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    gap: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    ...typography.body.large,
  },
  settingsSubtitle: {
    ...typography.body.small,
    marginTop: spacing[1],
  },
  // Theme selector styles
  themeSelector: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[4],
    gap: spacing[3],
  },
  themeSelectorContent: {
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 4,
    marginTop: spacing[2],
  },
  segmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  segmentOptionSelected: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  segmentLabelSelected: {
    fontWeight: '600',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[1],
  },
  footerText: {
    ...typography.caption,
  },
});

export default function SettingsScreenWithErrorBoundary() {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <CrashFallbackScreen resetError={resetError} />}>
      <SettingsScreen />
    </Sentry.ErrorBoundary>
  );
}
