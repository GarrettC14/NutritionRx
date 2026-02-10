import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useWeightStore, useSettingsStore, useMicronutrientStore, useProgressPhotoStore } from '@/stores';
import { useResolvedTargets } from '@/hooks/useResolvedTargets';
import { logEntryRepository, weightRepository } from '@/repositories';
import { WeightChart, CalorieChart, MacroChart } from '@/components/charts';
import { ProgressScreenSkeleton } from '@/components/ui/Skeleton';
import { DailyTotals } from '@/types/domain';
import { MicronutrientSummary } from '@/components/micronutrients';
import { ProgressPhotosSummary } from '@/components/progressPhotos';
import { usePremium } from '@/hooks/usePremium';
import { DailyInsightsSection } from '@/features/insights';
import { TestIDs } from '@/constants/testIDs';

type TimeRange = '7d' | '14d' | '30d' | '90d' | 'all';

const TIME_RANGE_TEST_IDS: Record<TimeRange, string> = {
  '7d': TestIDs.Progress.TimeRange7d,
  '14d': TestIDs.Progress.TimeRange14d,
  '30d': TestIDs.Progress.TimeRange30d,
  '90d': TestIDs.Progress.TimeRange90d,
  all: TestIDs.Progress.TimeRangeAll,
};

const getDateRange = (range: TimeRange): { start: string; end: string } => {
  const end = new Date();
  const endStr = end.toISOString().split('T')[0];

  let start = new Date();
  switch (range) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '14d':
      start.setDate(start.getDate() - 14);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case 'all':
      start = new Date('2020-01-01');
      break;
  }

  return { start: start.toISOString().split('T')[0], end: endStr };
};

export default function ProgressScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { entries: weightEntries, loadEntriesForRange } = useWeightStore();
  const { settings, loadSettings, isLoaded: settingsLoaded } = useSettingsStore();
  const { calories: resolvedCalorieGoal } = useResolvedTargets();
  const { isPremium } = usePremium();

  // Micronutrient store
  const {
    loadProfile: loadNutrientProfile,
    loadDailyIntake,
    dailyIntake,
    isLoaded: nutrientsLoaded,
  } = useMicronutrientStore();

  // Progress photos store
  const {
    loadPhotos,
    photos,
    stats: photoStats,
    getFirstPhoto,
    getLatestPhoto,
    isLoaded: photosLoaded,
  } = useProgressPhotoStore();

  // Independent time range states for each section
  const [weightTimeRange, setWeightTimeRange] = useState<TimeRange>('30d');
  const [calorieTimeRange, setCalorieTimeRange] = useState<TimeRange>('30d');
  const [macroTimeRange, setMacroTimeRange] = useState<TimeRange>('30d');
  const [insightsTimeRange, setInsightsTimeRange] = useState<TimeRange>('30d');

  // Data states
  const [calorieData, setCalorieData] = useState<Array<{ date: string; totals: DailyTotals }>>([]);
  const [avgMacros, setAvgMacros] = useState<DailyTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [insightsData, setInsightsData] = useState<{ daysLogged: number; weightEntries: number; avgCalories: number }>({
    daysLogged: 0,
    weightEntries: 0,
    avgCalories: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [daysLogged, setDaysLogged] = useState(0);

  // Load weight data based on weight time range
  const loadWeightData = useCallback(async () => {
    const { start, end } = getDateRange(weightTimeRange);
    await loadEntriesForRange(start, end);
  }, [weightTimeRange, loadEntriesForRange]);

  // Load calorie data based on calorie time range
  const loadCalorieData = useCallback(async () => {
    const { start, end } = getDateRange(calorieTimeRange);
    const calorieHistory = await logEntryRepository.getDailyTotalsForRange(start, end);
    setCalorieData(calorieHistory);
    setDaysLogged(calorieHistory.length);
  }, [calorieTimeRange]);

  // Load average macros based on macro time range
  const loadMacroData = useCallback(async () => {
    const { start, end } = getDateRange(macroTimeRange);
    const macroHistory = await logEntryRepository.getDailyTotalsForRange(start, end);

    if (macroHistory.length > 0) {
      const totals = macroHistory.reduce(
        (acc, day) => ({
          calories: acc.calories + day.totals.calories,
          protein: acc.protein + day.totals.protein,
          carbs: acc.carbs + day.totals.carbs,
          fat: acc.fat + day.totals.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      setAvgMacros({
        calories: Math.round(totals.calories / macroHistory.length),
        protein: Math.round(totals.protein / macroHistory.length),
        carbs: Math.round(totals.carbs / macroHistory.length),
        fat: Math.round(totals.fat / macroHistory.length),
      });
    } else {
      setAvgMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    }
  }, [macroTimeRange]);

  // Load insights data based on insights time range
  const loadInsightsData = useCallback(async () => {
    const { start, end } = getDateRange(insightsTimeRange);
    const insightsHistory = await logEntryRepository.getDailyTotalsForRange(start, end);

    // Get weight entries count for the insights range (without affecting the weight store)
    const insightsWeightEntries = await weightRepository.findByDateRange(start, end);

    const avgCals = insightsHistory.length > 0
      ? Math.round(insightsHistory.reduce((sum, day) => sum + day.totals.calories, 0) / insightsHistory.length)
      : 0;

    setInsightsData({
      daysLogged: insightsHistory.length,
      weightEntries: insightsWeightEntries.length,
      avgCalories: avgCals,
    });
  }, [insightsTimeRange]);

  // Combined load for initial load and refresh
  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadWeightData(),
      loadCalorieData(),
      loadMacroData(),
      loadInsightsData(),
    ]);
  }, [loadWeightData, loadCalorieData, loadMacroData, loadInsightsData]);

  useEffect(() => {
    loadSettings();
    loadNutrientProfile();
    loadPhotos();
  }, [loadSettings, loadNutrientProfile, loadPhotos]);

  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      await loadAllData();
      const today = new Date().toISOString().split('T')[0];
      await loadDailyIntake(today);
      setDataLoaded(true);
    };
    initialLoad();
  }, []);

  // Reload weight data when weight time range changes
  useEffect(() => {
    if (dataLoaded) {
      loadWeightData();
    }
  }, [weightTimeRange]);

  // Reload calorie data when calorie time range changes
  useEffect(() => {
    if (dataLoaded) {
      loadCalorieData();
    }
  }, [calorieTimeRange]);

  // Reload macro data when macro time range changes
  useEffect(() => {
    if (dataLoaded) {
      loadMacroData();
    }
  }, [macroTimeRange]);

  // Reload insights data when insights time range changes
  useEffect(() => {
    if (dataLoaded) {
      loadInsightsData();
    }
  }, [insightsTimeRange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    const today = new Date().toISOString().split('T')[0];
    await loadDailyIntake(today);
    setIsRefreshing(false);
  };

  const hasEnoughData = daysLogged >= 3 || weightEntries.length >= 3;
  const hasCalorieData = calorieData.length > 0;
  const hasWeightData = weightEntries.length > 0;

  const timeRanges: TimeRange[] = ['7d', '30d', '90d', 'all'];
  const calorieMacroTimeRanges: TimeRange[] = ['7d', '14d', '30d'];

  // Show skeleton on initial load to prevent flash
  const isReady = dataLoaded && settingsLoaded && nutrientsLoaded && photosLoaded;
  if (!isReady) {
    return (
      <SafeAreaView testID={TestIDs.Progress.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <ProgressScreenSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID={TestIDs.Progress.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} accessibilityRole="header">
          Your Journey
        </Text>
        <Pressable
          testID={TestIDs.Progress.LogWeightButton}
          style={[styles.logWeightButton, { backgroundColor: colors.bgInteractive }]}
          onPress={() => router.push('/log-weight')}
        >
          <Ionicons name="add" size={20} color={colors.accent} />
          <Text style={[styles.logWeightText, { color: colors.accent }]}>Weight</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Empty State - show when no data */}
        {!hasEnoughData && (
          <View style={[styles.emptyCard, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="analytics-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Charts will appear here
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Log food and weight for a few days to start seeing your trends.
            </Text>

            <View style={styles.unlockList}>
              <Text style={[styles.unlockTitle, { color: colors.textSecondary }]}>
                Your progress unlocks after:
              </Text>
              <View style={styles.unlockItem}>
                <Ionicons
                  name={daysLogged >= 3 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={daysLogged >= 3 ? colors.success : colors.textTertiary}
                />
                <Text style={[styles.unlockText, { color: colors.textSecondary }]}>
                  3 days of food logging ({daysLogged}/3)
                </Text>
              </View>
              <View style={styles.unlockItem}>
                <Ionicons
                  name={weightEntries.length >= 3 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={weightEntries.length >= 3 ? colors.success : colors.textTertiary}
                />
                <Text style={[styles.unlockText, { color: colors.textSecondary }]}>
                  3 weight entries ({weightEntries.length}/3)
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Weight Section */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">
              Weight
            </Text>
            <View style={styles.timeRangeButtons}>
              {timeRanges.map((range) => (
                <Pressable
                  key={range}
                  testID={TIME_RANGE_TEST_IDS[range]}
                  style={[
                    styles.timeRangeButton,
                    weightTimeRange === range && { backgroundColor: colors.bgInteractive },
                  ]}
                  onPress={() => setWeightTimeRange(range)}
                >
                  <Text
                    style={[
                      styles.timeRangeText,
                      {
                        color:
                          weightTimeRange === range
                            ? colors.textPrimary
                            : colors.textTertiary,
                      },
                    ]}
                  >
                    {range === 'all' ? 'All' : range}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {hasWeightData ? (
            <View testID={TestIDs.Progress.WeightChart}>
              <WeightChart entries={weightEntries} showTrend />
            </View>
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="trending-up" size={48} color={colors.textTertiary} />
              <Text style={[styles.chartPlaceholderText, { color: colors.textTertiary }]}>
                No weight data yet
              </Text>
              <Pressable
                style={[styles.addButton, { borderColor: colors.accent }]}
                onPress={() => router.push('/log-weight')}
              >
                <Text style={[styles.addButtonText, { color: colors.accent }]}>
                  Log your first weight
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Calories Section */}
        <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">
              Calories
            </Text>
            <View style={styles.timeRangeButtons}>
              {calorieMacroTimeRanges.map((range) => (
                <Pressable
                  key={range}
                  testID={TIME_RANGE_TEST_IDS[range]}
                  style={[
                    styles.timeRangeButton,
                    calorieTimeRange === range && { backgroundColor: colors.bgInteractive },
                  ]}
                  onPress={() => setCalorieTimeRange(range)}
                >
                  <Text
                    style={[
                      styles.timeRangeText,
                      {
                        color:
                          calorieTimeRange === range
                            ? colors.textPrimary
                            : colors.textTertiary,
                      },
                    ]}
                  >
                    {range}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {hasCalorieData ? (
            <View testID={TestIDs.Progress.CalorieChart}>
              <CalorieChart data={calorieData} showGoalLine />
            </View>
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.chartPlaceholderText, { color: colors.textTertiary }]}>
                No calorie data yet
              </Text>
              <Pressable
                style={[styles.addButton, { borderColor: colors.accent }]}
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={[styles.addButtonText, { color: colors.accent }]}>
                  Start logging food
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Macro Breakdown Section */}
        {hasCalorieData && avgMacros.calories > 0 && (
          <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">
                Average Macros
              </Text>
              <View style={styles.timeRangeButtons}>
                {calorieMacroTimeRanges.map((range) => (
                  <Pressable
                    key={range}
                    testID={TIME_RANGE_TEST_IDS[range]}
                    style={[
                      styles.timeRangeButton,
                      macroTimeRange === range && { backgroundColor: colors.bgInteractive },
                    ]}
                    onPress={() => setMacroTimeRange(range)}
                  >
                    <Text
                      style={[
                        styles.timeRangeText,
                        {
                          color:
                            macroTimeRange === range
                              ? colors.textPrimary
                              : colors.textTertiary,
                        },
                      ]}
                    >
                      {range}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View testID={TestIDs.Progress.MacroChart}>
              <MacroChart totals={avgMacros} showGoalComparison />
            </View>
          </View>
        )}

        {/* Insights Section */}
        {hasEnoughData && (
          <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} accessibilityRole="header">
                Insights
              </Text>
              <View style={styles.timeRangeButtons}>
                {timeRanges.map((range) => (
                  <Pressable
                    key={range}
                    testID={TIME_RANGE_TEST_IDS[range]}
                    style={[
                      styles.timeRangeButton,
                      insightsTimeRange === range && { backgroundColor: colors.bgInteractive },
                    ]}
                    onPress={() => setInsightsTimeRange(range)}
                  >
                    <Text
                      style={[
                        styles.timeRangeText,
                        {
                          color:
                            insightsTimeRange === range
                              ? colors.textPrimary
                              : colors.textTertiary,
                        },
                      ]}
                    >
                      {range === 'all' ? 'All' : range}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.insightsList}>
              <InsightCard
                icon="calendar-outline"
                title="Days Logged"
                value={insightsData.daysLogged.toString()}
                subtitle={`in the last ${insightsTimeRange === 'all' ? 'period' : insightsTimeRange}`}
                colors={colors}
              />
              <InsightCard
                icon="scale-outline"
                title="Weight Entries"
                value={insightsData.weightEntries.toString()}
                subtitle={`in the last ${insightsTimeRange === 'all' ? 'period' : insightsTimeRange}`}
                colors={colors}
              />
              {insightsData.avgCalories > 0 && (
                <InsightCard
                  icon="flame-outline"
                  title="Avg. Daily Calories"
                  value={insightsData.avgCalories.toLocaleString()}
                  subtitle={`goal: ${resolvedCalorieGoal.toLocaleString()}`}
                  colors={colors}
                />
              )}
            </View>
          </View>
        )}

        {/* Micronutrients Section - Premium Feature */}
        {dailyIntake && dailyIntake.nutrients.length > 0 && (
          <MicronutrientSummary
            nutrients={dailyIntake.nutrients}
            isPremium={isPremium}
          />
        )}

        {/* Progress Photos Section - Premium Feature */}
        <ProgressPhotosSummary
          stats={photoStats}
          recentPhotos={photos.slice(0, 5)}
          firstPhoto={getFirstPhoto()}
          latestPhoto={getLatestPhoto()}
          isPremium={isPremium}
          onPress={() => console.log('Navigate to progress photos')}
          onAddPress={() => console.log('Navigate to photo capture')}
          onComparePress={() => console.log('Navigate to photo compare')}
        />

        {/* AI Analysis Section - Premium Feature */}
        <DailyInsightsSection />
      </ScrollView>
    </SafeAreaView>
  );
}

interface InsightCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  subtitle: string;
  colors: any;
}

function InsightCard({ icon, title, value, subtitle, colors }: InsightCardProps) {
  return (
    <View style={[styles.insightCard, { backgroundColor: colors.bgPrimary }]}>
      <Ionicons name={icon} size={24} color={colors.accent} />
      <View style={styles.insightContent}>
        <Text style={[styles.insightTitle, { color: colors.textSecondary }]}>{title}</Text>
        <Text style={[styles.insightValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.insightSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingVertical: spacing[4],
  },
  headerTitle: {
    ...typography.display.small,
  },
  logWeightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  logWeightText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: 100,
    gap: spacing[4],
  },
  emptyCard: {
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing[3],
  },
  emptyTitle: {
    ...typography.title.medium,
    marginTop: spacing[2],
  },
  emptySubtitle: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  unlockList: {
    marginTop: spacing[4],
    alignSelf: 'stretch',
    gap: spacing[2],
  },
  unlockTitle: {
    ...typography.body.small,
    marginBottom: spacing[2],
  },
  unlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  unlockText: {
    ...typography.body.medium,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  sectionTitle: {
    ...typography.title.medium,
  },
  sectionSubtitle: {
    ...typography.caption,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  timeRangeButton: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  timeRangeText: {
    ...typography.caption,
    fontWeight: '500',
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  chartPlaceholderText: {
    ...typography.body.medium,
  },
  addButton: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  addButtonText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
  insightsList: {
    gap: spacing[3],
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...typography.caption,
  },
  insightValue: {
    ...typography.title.medium,
    marginVertical: spacing[1],
  },
  insightSubtitle: {
    ...typography.caption,
  },
});
