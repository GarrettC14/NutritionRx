import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePreference } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  danger = false,
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
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      )}
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
                  isSelected && [styles.segmentOptionSelected, { backgroundColor: colors.bgSecondary }],
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
              subtitle="Weight, energy"
              onPress={() => router.push('/settings/units')}
            />
            <ThemeSelector />
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DATA
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="download-outline"
              title="Export Data"
              subtitle="Download your data"
              onPress={() => router.push('/settings/data')}
            />
            <SettingsItem
              icon="cloud-upload-outline"
              title="Import Data"
              subtitle="Restore from backup"
              onPress={() => {}}
            />
            <SettingsItem
              icon="trash-outline"
              title="Delete All Data"
              onPress={() => {}}
              danger
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ABOUT
          </Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="information-circle-outline"
              title="About NutritionRx"
              subtitle="Version 1.0.0"
              onPress={() => router.push('/settings/about')}
            />
            <SettingsItem
              icon="help-circle-outline"
              title="Help & Feedback"
              onPress={() => {}}
            />
          </View>
        </View>

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
    shadowOpacity: 0.1,
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
