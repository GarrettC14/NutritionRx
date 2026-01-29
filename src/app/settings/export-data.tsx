import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { exportService, ExportOptions } from '@/services/exportService';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { ExportFormat } from '@/types/nutritionImport';

interface ExportStats {
  foodLogCount: number;
  weightLogCount: number;
  waterLogCount: number;
  firstLogDate: string | null;
  lastLogDate: string | null;
}

export default function ExportDataScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isPremium } = useSubscriptionStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeProfile: true,
    includeGoals: true,
    includeFoodLogs: true,
    includeWeightLogs: true,
    includeWaterLogs: true,
    includeSettings: true,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const exportStats = await exportService.getExportStats();
      setStats(exportStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleFormatChange = useCallback((newFormat: ExportFormat) => {
    setFormat(newFormat);
    setExportOptions((prev) => ({ ...prev, format: newFormat }));
  }, []);

  const handleExport = async () => {
    // Check premium status
    if (!isPremium) {
      router.push('/paywall?context=analytics');
      return;
    }

    setIsLoading(true);
    try {
      const result = await exportService.exportAndShare(exportOptions);
      if (result.success) {
        Alert.alert(
          'Export Complete',
          `Your data has been exported successfully.\n${result.recordsExported || 0} records exported.`
        );
      } else {
        Alert.alert('Export Failed', result.error || 'An error occurred while exporting.');
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOption = (key: keyof ExportOptions) => {
    setExportOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'No data';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const exportOptionsList: {
    key: keyof ExportOptions;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      key: 'includeFoodLogs',
      label: 'Food Logs',
      description: `${stats?.foodLogCount || 0} entries`,
      icon: 'restaurant-outline',
    },
    {
      key: 'includeWeightLogs',
      label: 'Weight Logs',
      description: `${stats?.weightLogCount || 0} entries`,
      icon: 'scale-outline',
    },
    {
      key: 'includeWaterLogs',
      label: 'Water Logs',
      description: `${stats?.waterLogCount || 0} entries`,
      icon: 'water-outline',
    },
    {
      key: 'includeGoals',
      label: 'Goals',
      description: 'Your current goal and targets',
      icon: 'flag-outline',
    },
    {
      key: 'includeProfile',
      label: 'Profile',
      description: 'Basic profile information',
      icon: 'person-outline',
    },
    {
      key: 'includeSettings',
      label: 'Settings',
      description: 'App preferences',
      icon: 'settings-outline',
    },
  ];

  const hasDataToExport =
    exportOptions.includeFoodLogs ||
    exportOptions.includeWeightLogs ||
    exportOptions.includeWaterLogs ||
    exportOptions.includeGoals ||
    exportOptions.includeProfile ||
    exportOptions.includeSettings;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Export Data',
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
          {/* Premium Badge (if not premium) */}
          {!isPremium && (
            <Pressable
              style={[styles.premiumBanner, { backgroundColor: colors.accent + '15' }]}
              onPress={() => router.push('/paywall?context=analytics')}
            >
              <View style={styles.premiumBannerContent}>
                <Ionicons name="star" size={20} color={colors.accent} />
                <View style={styles.premiumBannerText}>
                  <Text style={[styles.premiumTitle, { color: colors.textPrimary }]}>
                    Premium Feature
                  </Text>
                  <Text style={[styles.premiumSubtitle, { color: colors.textSecondary }]}>
                    Unlock data export with Premium
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.accent} />
            </Pressable>
          )}

          {/* Data Overview */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              YOUR DATA
            </Text>
            <View style={[styles.statsCard, { backgroundColor: colors.bgSecondary }]}>
              {isLoadingStats ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <>
                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="restaurant-outline" size={24} color={colors.accent} />
                      <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                        {stats?.foodLogCount || 0}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        Food Logs
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="scale-outline" size={24} color={colors.accent} />
                      <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                        {stats?.weightLogCount || 0}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        Weight Logs
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="water-outline" size={24} color={colors.accent} />
                      <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                        {stats?.waterLogCount || 0}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        Water Logs
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.dateRange, { borderTopColor: colors.bgInteractive }]}>
                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                      Data range:
                    </Text>
                    <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
                      {stats?.firstLogDate
                        ? `${formatDate(stats.firstLogDate)} - ${formatDate(stats.lastLogDate)}`
                        : 'No data yet'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Format Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              EXPORT FORMAT
            </Text>
            <View style={styles.formatOptions}>
              <Pressable
                style={[
                  styles.formatOption,
                  { backgroundColor: colors.bgSecondary },
                  format === 'csv' && { borderColor: colors.accent, borderWidth: 2 },
                ]}
                onPress={() => handleFormatChange('csv')}
              >
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color={format === 'csv' ? colors.accent : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.formatLabel,
                    { color: format === 'csv' ? colors.accent : colors.textPrimary },
                  ]}
                >
                  CSV
                </Text>
                <Text style={[styles.formatDescription, { color: colors.textTertiary }]}>
                  Open in Excel, Sheets
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.formatOption,
                  { backgroundColor: colors.bgSecondary },
                  format === 'json' && { borderColor: colors.accent, borderWidth: 2 },
                ]}
                onPress={() => handleFormatChange('json')}
              >
                <Ionicons
                  name="code-outline"
                  size={24}
                  color={format === 'json' ? colors.accent : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.formatLabel,
                    { color: format === 'json' ? colors.accent : colors.textPrimary },
                  ]}
                >
                  JSON
                </Text>
                <Text style={[styles.formatDescription, { color: colors.textTertiary }]}>
                  Full backup format
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Export Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              INCLUDE IN EXPORT
            </Text>
            <View style={styles.options}>
              {exportOptionsList.map((option) => (
                <Pressable
                  key={option.key}
                  style={[styles.option, { backgroundColor: colors.bgSecondary }]}
                  onPress={() => toggleOption(option.key)}
                >
                  <Ionicons name={option.icon} size={24} color={colors.textSecondary} />
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.textTertiary }]}>
                      {option.description}
                    </Text>
                  </View>
                  <Ionicons
                    name={exportOptions[option.key] ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={exportOptions[option.key] ? colors.accent : colors.textTertiary}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* JSON Backup Info */}
          {format === 'json' && (
            <View style={[styles.infoCard, { backgroundColor: colors.bgInteractive }]}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                JSON format creates a complete backup that can be restored to NutritionRx later.
                This is the recommended format for backups.
              </Text>
            </View>
          )}

          {/* CSV Info */}
          {format === 'csv' && (
            <View style={[styles.infoCard, { backgroundColor: colors.bgInteractive }]}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                CSV format can be opened in Excel, Google Sheets, or any spreadsheet application.
                Great for analyzing your data or sharing with healthcare providers.
              </Text>
            </View>
          )}

          {/* Privacy Note */}
          <View style={[styles.privacyNote, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              Your data never leaves your device unless you explicitly share it.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            label={
              !isPremium
                ? 'Unlock Premium to Export'
                : isLoading
                  ? 'Exporting...'
                  : `Export as ${format.toUpperCase()}`
            }
            onPress={handleExport}
            loading={isLoading}
            disabled={isLoading || !hasDataToExport}
            fullWidth
          />
        </View>
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
    gap: spacing[5],
    paddingBottom: spacing[8],
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  premiumBannerText: {
    gap: spacing[1],
  },
  premiumTitle: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  premiumSubtitle: {
    ...typography.caption,
  },
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    minHeight: 100,
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing[2],
  },
  statValue: {
    ...typography.title.large,
  },
  statLabel: {
    ...typography.caption,
  },
  dateRange: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    alignItems: 'center',
    gap: spacing[1],
  },
  dateLabel: {
    ...typography.caption,
  },
  dateValue: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  formatOptions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  formatOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  formatLabel: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  formatDescription: {
    ...typography.caption,
    textAlign: 'center',
  },
  options: {
    gap: spacing[2],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  optionDescription: {
    ...typography.caption,
    marginTop: spacing[1],
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
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  privacyText: {
    ...typography.body.small,
    flex: 1,
  },
  footer: {
    padding: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
  },
});
