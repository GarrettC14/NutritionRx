import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, resetDatabase } from '@/db/database';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import {
  seedDatabase,
  clearAllData,
  DEFAULT_SEED_OPTIONS,
} from '@/utils/devTools';
import type { SeedOptions, SeedProgress, SeedResult } from '@/utils/devTools';
import { TestIDs } from '@/constants/testIDs';
import { LLMService } from '@/features/insights/services/LLMService';
import type { LLMStatus } from '@/features/insights/types/insights.types';

// ============================================================
// Types
// ============================================================

interface DatabaseStats {
  foodItems: number;
  logEntries: number;
  quickAddEntries: number;
  weightEntries: number;
  goals: number;
  weeklyReflections: number;
  dailyMetabolism: number;
  waterLog: number;
  favoriteFoods: number;
  fastingSessions: number;
  plannedMeals: number;
  macroCycleOverrides: number;
  restaurantFoodLogs: number;
  progressPhotos: number;
  foodItemNutrients: number;
  dailyNutrientIntake: number;
  nutrientContributors: number;
  healthSyncLog: number;
}

const STAT_QUERIES: Array<{ key: keyof DatabaseStats; label: string; sql: string }> = [
  { key: 'foodItems', label: 'Food items', sql: 'SELECT COUNT(*) as count FROM food_items' },
  { key: 'logEntries', label: 'Log entries', sql: 'SELECT COUNT(*) as count FROM log_entries' },
  { key: 'quickAddEntries', label: 'Quick add entries', sql: 'SELECT COUNT(*) as count FROM quick_add_entries' },
  { key: 'weightEntries', label: 'Weight entries', sql: 'SELECT COUNT(*) as count FROM weight_entries' },
  { key: 'goals', label: 'Goals', sql: 'SELECT COUNT(*) as count FROM goals' },
  { key: 'weeklyReflections', label: 'Weekly reflections', sql: 'SELECT COUNT(*) as count FROM weekly_reflections' },
  { key: 'dailyMetabolism', label: 'Daily metabolism', sql: 'SELECT COUNT(*) as count FROM daily_metabolism' },
  { key: 'waterLog', label: 'Water log', sql: 'SELECT COUNT(*) as count FROM water_log' },
  { key: 'favoriteFoods', label: 'Favorite foods', sql: 'SELECT COUNT(*) as count FROM favorite_foods' },
  { key: 'fastingSessions', label: 'Fasting sessions', sql: 'SELECT COUNT(*) as count FROM fasting_sessions' },
  { key: 'plannedMeals', label: 'Planned meals', sql: 'SELECT COUNT(*) as count FROM planned_meals' },
  { key: 'macroCycleOverrides', label: 'Macro overrides', sql: 'SELECT COUNT(*) as count FROM macro_cycle_overrides' },
  { key: 'restaurantFoodLogs', label: 'Restaurant logs', sql: 'SELECT COUNT(*) as count FROM restaurant_food_logs' },
  { key: 'progressPhotos', label: 'Progress photos', sql: 'SELECT COUNT(*) as count FROM progress_photos' },
  { key: 'foodItemNutrients', label: 'Food item nutrients', sql: 'SELECT COUNT(*) as count FROM food_item_nutrients' },
  { key: 'dailyNutrientIntake', label: 'Nutrient intake', sql: 'SELECT COUNT(*) as count FROM daily_nutrient_intake' },
  { key: 'nutrientContributors', label: 'Nutrient contributors', sql: 'SELECT COUNT(*) as count FROM nutrient_contributors' },
  { key: 'healthSyncLog', label: 'Health sync log', sql: 'SELECT COUNT(*) as count FROM health_sync_log' },
];

// ============================================================
// Main Component
// ============================================================

export default function DeveloperScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { showConfirm } = useConfirmDialog();

  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // LLM info
  const [llmInfo, setLlmInfo] = useState<{
    status: LLMStatus;
    isDownloaded: boolean;
    modelSize: number;
    isAvailable: boolean;
  } | null>(null);

  // Seed options
  const [seedOptions, setSeedOptions] = useState<SeedOptions>({ ...DEFAULT_SEED_OPTIONS });

  // Progress state
  const [progress, setProgress] = useState<SeedProgress | null>(null);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);

  // ============================================================
  // Data Loading
  // ============================================================

  const loadStats = useCallback(async () => {
    try {
      const db = getDatabase();
      const result: Record<string, number> = {};

      for (const query of STAT_QUERIES) {
        try {
          const row = await db.getFirstAsync<{ count: number }>(query.sql);
          result[query.key] = row?.count ?? 0;
        } catch {
          result[query.key] = 0;
        }
      }

      setStats(result as unknown as DatabaseStats);
    } catch (error) {
      if (__DEV__) console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    async function loadLLMInfo() {
      const [status, isDownloaded, modelSize] = await Promise.all([
        LLMService.getStatus(),
        LLMService.isModelDownloaded(),
        LLMService.getModelSize(),
      ]);
      setLlmInfo({
        status,
        isDownloaded,
        modelSize,
        isAvailable: LLMService.isAvailable(),
      });
    }
    loadLLMInfo();
  }, []);

  // ============================================================
  // Actions
  // ============================================================

  const handleSeedData = () => {
    showConfirm({
      title: 'Seed Database',
      message: seedOptions.clearExisting
        ? `This will clear existing data and seed ${seedOptions.monthsOfHistory} months of mock data.`
        : `This will add ${seedOptions.monthsOfHistory} months of mock data to existing data.`,
      icon: 'leaf-outline',
      confirmLabel: 'Seed Data',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        setIsSeeding(true);
        setSeedResult(null);
        setProgress(null);

        try {
          const result = await seedDatabase(seedOptions, (p) => {
            setProgress({ ...p });
          });

          setSeedResult(result);
          await loadStats();
        } catch (error) {
          if (__DEV__) console.error('Failed to seed data:', error);
          setSeedResult({
            success: false,
            duration: 0,
            counts: {},
            errors: [`${error}`],
            warnings: [],
          });
        } finally {
          setIsSeeding(false);
          setProgress(null);
        }
      },
    });
  };

  const handleClearUserData = () => {
    showConfirm({
      title: 'Clear All User Data',
      message:
        'This will delete all user data from all tables. Seed foods and restaurant data will be preserved. This cannot be undone.',
      icon: 'trash-outline',
      confirmLabel: 'Clear Data',
      cancelLabel: 'Cancel',
      confirmStyle: 'destructive',
      onConfirm: async () => {
        setIsClearing(true);
        setSeedResult(null);
        try {
          const db = getDatabase();
          await clearAllData(db, true);
          await loadStats();
        } catch (error) {
          if (__DEV__) console.error('Failed to clear data:', error);
        } finally {
          setIsClearing(false);
        }
      },
    });
  };

  const handleResetApp = () => {
    showConfirm({
      title: 'Reset to Fresh Install',
      message:
        'This will delete the ENTIRE database and recreate it from scratch. The app will return to the legal acknowledgment screen. This cannot be undone.',
      icon: 'warning-outline',
      confirmLabel: 'Reset Everything',
      cancelLabel: 'Cancel',
      confirmStyle: 'destructive',
      onConfirm: async () => {
        setIsClearing(true);
        setSeedResult(null);
        try {
          await AsyncStorage.clear();
          await resetDatabase();
          router.replace('/');
        } catch (error) {
          if (__DEV__) console.error('Failed to reset app:', error);
          setIsClearing(false);
        }
      },
    });
  };

  // ============================================================
  // Option Helpers
  // ============================================================

  const updateOption = <K extends keyof SeedOptions>(key: K, value: SeedOptions[K]) => {
    setSeedOptions((prev) => ({ ...prev, [key]: value }));
  };

  const adjustMonths = (delta: number) => {
    setSeedOptions((prev) => ({
      ...prev,
      monthsOfHistory: Math.max(1, Math.min(24, prev.monthsOfHistory + delta)),
    }));
  };

  // ============================================================
  // Render Helpers
  // ============================================================

  const totalRecords = stats
    ? Object.values(stats).reduce((sum, val) => sum + val, 0)
    : 0;

  const progressPercent =
    progress && progress.totalCount > 0
      ? Math.round((progress.currentCount / progress.totalCount) * 100)
      : 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Developer Tools',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} testID={TestIDs.SettingsDeveloper.BackButton}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: colors.bgPrimary }]}
        testID={TestIDs.SettingsDeveloper.Screen}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          testID={TestIDs.SettingsDeveloper.ScrollView}
        >
          {/* Warning Banner */}
          <View style={[styles.warningBanner, { backgroundColor: colors.warningBg }]}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              Developer tools. Use with caution.
            </Text>
          </View>

          {/* Database Stats */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                DATABASE STATS
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {totalRecords.toLocaleString()} total
              </Text>
            </View>
            <View style={[styles.statsCard, { backgroundColor: colors.bgSecondary }]}>
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.accent}
                  style={styles.statsLoader}
                />
              ) : stats ? (
                STAT_QUERIES.map((query, index) => (
                  <StatRow
                    key={query.key}
                    label={query.label}
                    value={stats[query.key]}
                    colors={colors}
                    isLast={index === STAT_QUERIES.length - 1}
                  />
                ))
              ) : (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Failed to load stats
                </Text>
              )}
            </View>
          </View>

          {/* LLM Status */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              LLM STATUS
            </Text>
            <View style={[styles.statsCard, { backgroundColor: colors.bgSecondary }]}>
              {llmInfo ? (
                <>
                  <StatRow label="Status" value={llmInfo.status} colors={colors} />
                  <StatRow label="Downloaded" value={llmInfo.isDownloaded ? 'Yes' : 'No'} colors={colors} />
                  <StatRow label="File size" value={formatBytes(llmInfo.modelSize)} colors={colors} />
                  <StatRow label="Provider" value={LLMService.getProviderName()} colors={colors} />
                  <StatRow label="Model" value={LLMService.getModelConfig()?.name ?? 'N/A'} colors={colors} />
                  <StatRow label="llama.rn available" value={llmInfo.isAvailable ? 'Yes' : 'No'} colors={colors} isLast />
                </>
              ) : (
                <ActivityIndicator size="small" color={colors.accent} style={styles.statsLoader} />
              )}
            </View>
          </View>

          {/* Seed Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              SEED OPTIONS
            </Text>
            <View style={[styles.optionsCard, { backgroundColor: colors.bgSecondary }]}>
              <OptionToggle
                label="Clear existing data first"
                value={seedOptions.clearExisting}
                onToggle={(v) => updateOption('clearExisting', v)}
                colors={colors}
                testID={TestIDs.SettingsDeveloper.ClearExistingToggle}
              />
              <View style={[styles.optionDivider, { borderBottomColor: colors.borderDefault }]} />
              <OptionToggle
                label="Include edge case data"
                value={seedOptions.includeEdgeCases}
                onToggle={(v) => updateOption('includeEdgeCases', v)}
                colors={colors}
                testID={TestIDs.SettingsDeveloper.EdgeCasesToggle}
              />
              <View style={[styles.optionDivider, { borderBottomColor: colors.borderDefault }]} />
              <View style={styles.optionRow}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                  Months of history
                </Text>
                <View style={styles.stepperContainer}>
                  <Pressable
                    onPress={() => adjustMonths(-1)}
                    style={[styles.stepperButton, { backgroundColor: colors.bgInteractive }]}
                    testID={TestIDs.SettingsDeveloper.MonthsMinus}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </Pressable>
                  <Text style={[styles.stepperValue, { color: colors.accent }]}>
                    {seedOptions.monthsOfHistory}
                  </Text>
                  <Pressable
                    onPress={() => adjustMonths(1)}
                    style={[styles.stepperButton, { backgroundColor: colors.bgInteractive }]}
                    testID={TestIDs.SettingsDeveloper.MonthsPlus}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </View>
              <View style={[styles.optionDivider, { borderBottomColor: colors.borderDefault }]} />
              <OptionToggle
                label="Verbose console logging"
                value={seedOptions.verboseLogging}
                onToggle={(v) => updateOption('verboseLogging', v)}
                colors={colors}
                testID={TestIDs.SettingsDeveloper.VerboseToggle}
              />
            </View>
          </View>

          {/* Progress Bar (visible during seeding) */}
          {isSeeding && progress && (
            <View style={[styles.progressCard, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.progressPhase, { color: colors.accent }]}>
                {progress.phase}
              </Text>
              <Text style={[styles.progressEntity, { color: colors.textPrimary }]}>
                {progress.currentEntity}
              </Text>
              <View style={[styles.progressBarBg, { backgroundColor: colors.bgInteractive }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: colors.accent, width: `${progressPercent}%` },
                  ]}
                />
              </View>
              <Text style={[styles.progressCount, { color: colors.textSecondary }]}>
                {progress.currentCount.toLocaleString()} / {progress.totalCount.toLocaleString()}
                {' '}({progressPercent}%)
              </Text>
            </View>
          )}

          {/* Seed Results */}
          {seedResult && !isSeeding && (
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: colors.bgSecondary,
                  borderLeftColor: seedResult.success ? colors.accent : colors.error,
                },
              ]}
            >
              <View style={styles.resultHeader}>
                <Ionicons
                  name={seedResult.success ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={seedResult.success ? colors.accent : colors.error}
                />
                <Text
                  style={[
                    styles.resultTitle,
                    { color: seedResult.success ? colors.accent : colors.error },
                  ]}
                >
                  {seedResult.success ? 'Seeding Complete' : 'Seeding Failed'}
                </Text>
                <Text style={[styles.resultDuration, { color: colors.textSecondary }]}>
                  {(seedResult.duration / 1000).toFixed(1)}s
                </Text>
              </View>

              {Object.keys(seedResult.counts).length > 0 && (
                <View style={styles.resultCounts}>
                  {Object.entries(seedResult.counts).map(([entity, count]) => (
                    <View key={entity} style={styles.resultCountRow}>
                      <Text style={[styles.resultCountLabel, { color: colors.textSecondary }]}>
                        {entity}
                      </Text>
                      <Text style={[styles.resultCountValue, { color: colors.textPrimary }]}>
                        {count.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {seedResult.errors.length > 0 && (
                <View style={styles.resultErrors}>
                  {seedResult.errors.map((err, i) => (
                    <Text key={i} style={[styles.resultErrorText, { color: colors.error }]}>
                      {err}
                    </Text>
                  ))}
                </View>
              )}

              <Pressable
                onPress={() => setSeedResult(null)}
                style={styles.resultDismiss}
                testID={TestIDs.SettingsDeveloper.DismissResultButton}
              >
                <Text style={[styles.resultDismissText, { color: colors.textSecondary }]}>
                  Dismiss
                </Text>
              </Pressable>
            </View>
          )}

          {/* Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ACTIONS
            </Text>
            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.accent }]}
                onPress={handleSeedData}
                disabled={isSeeding || isClearing}
                testID={TestIDs.SettingsDeveloper.SeedButton}
              >
                {isSeeding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="leaf" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Seed Database</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.warning }]}
                onPress={handleClearUserData}
                disabled={isSeeding || isClearing}
                testID={TestIDs.SettingsDeveloper.ClearDataButton}
              >
                {isClearing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Clear All Data</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={handleResetApp}
                disabled={isSeeding || isClearing}
                testID={TestIDs.SettingsDeveloper.ResetButton}
              >
                {isClearing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Reset to Fresh Install</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.bgSecondary }]}
                onPress={() => {
                  setIsLoading(true);
                  loadStats();
                }}
                testID={TestIDs.SettingsDeveloper.RefreshButton}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                  Refresh Stats
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Seed data generates realistic entries across all tables: weight, food logs,
              water, fasting, meal plans, macro cycling, progress photos, micronutrients,
              and more. Volume scales with months of history.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ============================================================
// Sub-Components
// ============================================================

function StatRow({
  label,
  value,
  colors,
  isLast = false,
}: {
  label: string;
  value: number | string;
  colors: any;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.statRow,
        !isLast && { borderBottomColor: colors.borderDefault, borderBottomWidth: 1 },
      ]}
    >
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return 'Not downloaded';
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

function OptionToggle({
  label,
  value,
  onToggle,
  colors,
  testID,
}: {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  colors: any;
  testID?: string;
}) {
  return (
    <View style={styles.optionRow}>
      <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.bgInteractive, true: colors.accent }}
        thumbColor="#FFFFFF"
        testID={testID}
      />
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },

  // Warning
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  warningText: {
    ...typography.body.small,
    flex: 1,
  },

  // Sections
  section: {
    gap: spacing[2],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
  },
  sectionTitle: {
    ...typography.overline,
    paddingHorizontal: spacing[2],
  },
  sectionSubtitle: {
    ...typography.caption,
  },

  // Stats
  statsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  statsLoader: {
    padding: spacing[4],
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  statLabel: {
    ...typography.body.medium,
  },
  statValue: {
    ...typography.body.medium,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  errorText: {
    ...typography.body.medium,
    padding: spacing[4],
    textAlign: 'center',
  },

  // Options
  optionsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  optionLabel: {
    ...typography.body.medium,
    flex: 1,
  },
  optionDivider: {
    borderBottomWidth: 1,
    marginHorizontal: spacing[4],
  },

  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    ...typography.body.large,
    fontWeight: '700',
    fontFamily: 'monospace',
    minWidth: 24,
    textAlign: 'center',
  },

  // Progress
  progressCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  progressPhase: {
    ...typography.overline,
  },
  progressEntity: {
    ...typography.title.small,
  },
  progressBarBg: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressCount: {
    ...typography.caption,
    textAlign: 'right',
  },

  // Results
  resultCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderLeftWidth: 4,
    gap: spacing[3],
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  resultTitle: {
    ...typography.title.small,
    flex: 1,
  },
  resultDuration: {
    ...typography.caption,
  },
  resultCounts: {
    gap: spacing[1],
  },
  resultCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCountLabel: {
    ...typography.body.small,
  },
  resultCountValue: {
    ...typography.body.small,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  resultErrors: {
    gap: spacing[1],
  },
  resultErrorText: {
    ...typography.body.small,
  },
  resultDismiss: {
    alignSelf: 'center',
    paddingVertical: spacing[1],
  },
  resultDismissText: {
    ...typography.body.small,
    fontWeight: '600',
  },

  // Actions
  actionsContainer: {
    gap: spacing[2],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  actionButtonText: {
    ...typography.body.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Info
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  infoText: {
    ...typography.body.small,
    flex: 1,
  },
});
