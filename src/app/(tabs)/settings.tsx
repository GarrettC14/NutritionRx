import { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePreference } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
  showLock?: boolean;
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  danger = false,
  showLock = false,
}: SettingsItemProps) {
  const { colors } = useTheme();

  return (
    <Pressable
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
        <Ionicons name="lock-closed" size={20} color={colors.textTertiary} />
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      ) : null}
    </Pressable>
  );
}

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

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isPremium, expirationDate, hasBundle, isDevPremium, toggleDevPremium } = useSubscriptionStore();

  // Developer menu access - tap version 7 times
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleVersionTap = () => {
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PREMIUM
          </Text>
          <View style={styles.sectionContent}>
            {isPremium ? (
              <>
                <Pressable
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
                icon="star-outline"
                title="Upgrade to Premium"
                subtitle="Unlock all features"
                onPress={() => router.push('/paywall?context=general')}
              />
            )}
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            GOALS
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="flag-outline"
              title="Your Goal"
              subtitle="Set up personalized targets"
              onPress={() => router.push('/settings/goals')}
            />
            <SettingsItem
              icon="person-outline"
              title="Profile"
              subtitle="Height, weight unit"
              onPress={() => router.push('/settings/profile')}
            />
            <SettingsItem
              icon="nutrition-outline"
              title="Nutrition Preferences"
              subtitle="Eating style, protein priority"
              onPress={() => router.push('/settings/nutrition')}
            />
            <SettingsItem
              icon="water-outline"
              title="Water Tracking"
              subtitle="Daily glass goal, glass size"
              onPress={() => router.push('/settings/water')}
            />
            <SettingsItem
              icon="timer-outline"
              title="Fasting Timer"
              subtitle="Intermittent fasting schedule"
              onPress={() => router.push('/settings/fasting')}
            />
            <SettingsItem
              icon="calendar-outline"
              title="Meal Planning"
              subtitle="Plan meals in advance"
              onPress={() => router.push('/settings/meal-planning')}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PREFERENCES
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="scale-outline"
              title="Units"
              subtitle="Weight unit preference"
              onPress={() => router.push('/settings/units')}
            />
            <ThemeSelector />
            <SettingsItem
              icon="apps-outline"
              title="Widgets"
              subtitle="Home screen widgets setup"
              onPress={() => router.push('/settings/widgets')}
            />
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DATA
          </Text>
          <View style={styles.sectionContent}>
            {Platform.OS === 'ios' && (
              <SettingsItem
                icon="heart-outline"
                title="Apple Health"
                subtitle="Sync nutrition, weight, and water"
                onPress={() => router.push('/settings/apple-health')}
              />
            )}
            {Platform.OS === 'android' && (
              <SettingsItem
                icon="fitness-outline"
                title="Health Connect"
                subtitle="Sync nutrition, weight, and water"
                onPress={() => router.push('/settings/health-connect')}
              />
            )}
            <SettingsItem
              icon="cloud-download-outline"
              title="Import From Other Apps"
              subtitle="MyFitnessPal, Cronometer, Lose It!, MacroFactor"
              onPress={() => router.push('/import-data')}
            />
            <SettingsItem
              icon="trash-outline"
              title="Delete All Data"
              onPress={() => {}}
              danger
            />
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            LEGAL
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="heart-outline"
              title="Health & Safety Notice"
              subtitle="Review the health disclaimer"
              onPress={() => router.push('/settings/health-notice')}
            />
            <SettingsItem
              icon="document-text-outline"
              title="Terms of Service"
              onPress={() => router.push('/settings/terms-of-service')}
            />
            <SettingsItem
              icon="shield-outline"
              title="Privacy Policy"
              onPress={() => router.push('/settings/privacy-policy')}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ABOUT
          </Text>
          <View style={styles.sectionContent}>
            <Pressable
              style={[styles.settingsItem, { backgroundColor: colors.bgSecondary }]}
              onPress={() => router.push('/settings/about')}
              onLongPress={handleVersionTap}
              delayLongPress={0}
            >
              <View
                style={[styles.settingsIcon, { backgroundColor: colors.bgInteractive }]}
              >
                <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.settingsContent}>
                <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>
                  About NutritionRx
                </Text>
                <Pressable onPress={handleVersionTap}>
                  <Text style={[styles.settingsSubtitle, { color: colors.textSecondary }]}>
                    Version 1.0.0
                  </Text>
                </Pressable>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </Pressable>
            <SettingsItem
              icon="help-circle-outline"
              title="Help & Feedback"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Developer Section - for testing */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              DEVELOPER
            </Text>
            <View style={styles.sectionContent}>
              <Pressable
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
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Made with care by the NutritionRx team
          </Text>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Your data never leaves your device
          </Text>
        </View>
      </ScrollView>
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
  footer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[1],
  },
  footerText: {
    ...typography.caption,
  },
});
