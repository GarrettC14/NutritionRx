import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { exportService, ExportOptions } from '@/services/exportService';

interface ExportStats {
  foodLogCount: number;
  weightLogCount: number;
  firstLogDate: string | null;
  lastLogDate: string | null;
}

export default function DataSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeProfile: true,
    includeGoals: true,
    includeFoodLogs: true,
    includeWeightLogs: true,
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

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await exportService.exportAndShare(exportOptions);
      if (result.success) {
        Alert.alert('Export Complete', 'Your data has been exported successfully.');
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
      description: 'All food entries and quick adds',
      icon: 'restaurant-outline',
    },
    {
      key: 'includeWeightLogs',
      label: 'Weight Logs',
      description: 'All weight entries',
      icon: 'scale-outline',
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
      description: 'App preferences and daily goals',
      icon: 'settings-outline',
    },
  ];

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
                    name={
                      exportOptions[option.key]
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={24}
                    color={exportOptions[option.key] ? colors.accent : colors.textTertiary}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Export Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.bgInteractive }]}>
            <Ionicons name="information-circle" size={20} color={colors.accent} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Your data will be exported as a CSV file that can be opened in Excel, Google
              Sheets, or any spreadsheet application. This is a great way to backup your data
              or analyze it further.
            </Text>
          </View>

          {/* Privacy Note */}
          <View style={[styles.privacyNote, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              Your data never leaves your device unless you explicitly share it. We respect
              your privacy.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            label={isLoading ? 'Exporting...' : 'Export Data'}
            onPress={handleExport}
            loading={isLoading}
            disabled={
              isLoading ||
              (!exportOptions.includeFoodLogs &&
                !exportOptions.includeWeightLogs &&
                !exportOptions.includeGoals &&
                !exportOptions.includeProfile &&
                !exportOptions.includeSettings)
            }
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
    gap: spacing[6],
    paddingBottom: spacing[8],
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
