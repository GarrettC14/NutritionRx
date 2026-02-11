import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useWeightStore, useSettingsStore, useMicronutrientStore, useProgressPhotoStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { useResolvedTargets } from '@/hooks/useResolvedTargets';
import { logEntryRepository, weightRepository } from '@/repositories';
import { WeightTrendChartMinimal, CalorieChart, MacroChart } from '@/components/charts';
import { chartColors as allChartColors } from '@/constants/colors';
import { WeightTrendChartPalette } from '@/types/weightTrend';
import { ProgressScreenSkeleton } from '@/components/ui/Skeleton';
import { DailyTotals } from '@/types/domain';
import { MicronutrientSummary } from '@/components/micronutrients';
import { ProgressPhotosSummary } from '@/components/progressPhotos';
import { usePremium } from '@/hooks/usePremium';
import { TestIDs } from '@/constants/testIDs';
import { NutrientIntake } from '@/types/micronutrients';

type TimeRange = '7d' | '14d' | '30d' | '90d' | 'all';

// Mock micronutrient data for development preview
const MOCK_NUTRIENT_INTAKES: NutrientIntake[] = [
  // Vitamins - mix of statuses
  { nutrientId: 'vitamin_c', amount: 95, percentOfTarget: 106, status: 'optimal' },
  { nutrientId: 'thiamin', amount: 1.0, percentOfTarget: 83, status: 'adequate' },
  { nutrientId: 'riboflavin', amount: 1.1, percentOfTarget: 85, status: 'adequate' },
  { nutrientId: 'niacin', amount: 14, percentOfTarget: 88, status: 'adequate' },
  { nutrientId: 'vitamin_b6', amount: 1.5, percentOfTarget: 115, status: 'optimal' },
  { nutrientId: 'vitamin_b12', amount: 2.8, percentOfTarget: 117, status: 'optimal' },
  { nutrientId: 'folate', amount: 280, percentOfTarget: 70, status: 'low' },
  { nutrientId: 'vitamin_a', amount: 650, percentOfTarget: 72, status: 'low' },
  { nutrientId: 'vitamin_d', amount: 5, percentOfTarget: 33, status: 'deficient' },
  { nutrientId: 'vitamin_e', amount: 12, percentOfTarget: 80, status: 'adequate' },
  { nutrientId: 'vitamin_k', amount: 95, percentOfTarget: 79, status: 'adequate' },
  // Minerals
  { nutrientId: 'calcium', amount: 850, percentOfTarget: 85, status: 'adequate' },
  { nutrientId: 'iron', amount: 14, percentOfTarget: 175, status: 'high' },
  { nutrientId: 'magnesium', amount: 280, percentOfTarget: 67, status: 'low' },
  { nutrientId: 'zinc', amount: 9, percentOfTarget: 82, status: 'adequate' },
  { nutrientId: 'phosphorus', amount: 1100, percentOfTarget: 157, status: 'high' },
  { nutrientId: 'potassium', amount: 2800, percentOfTarget: 60, status: 'low' },
  { nutrientId: 'sodium', amount: 2600, percentOfTarget: 173, status: 'high' },
  { nutrientId: 'selenium', amount: 58, percentOfTarget: 105, status: 'optimal' },
  { nutrientId: 'copper', amount: 0.9, percentOfTarget: 100, status: 'optimal' },
  { nutrientId: 'manganese', amount: 2.0, percentOfTarget: 87, status: 'adequate' },
  // Fatty acids
  { nutrientId: 'omega_3_ala', amount: 1.0, percentOfTarget: 63, status: 'low' },
  { nutrientId: 'omega_3_epa', amount: 0.15, percentOfTarget: 60, status: 'low' },
  { nutrientId: 'omega_3_dha', amount: 0.12, percentOfTarget: 48, status: 'deficient' },
  { nutrientId: 'omega_6_la', amount: 14, percentOfTarget: 117, status: 'optimal' },
  // Other
  { nutrientId: 'fiber', amount: 18, percentOfTarget: 64, status: 'low' },
];

const TIME_RANGE_TEST_IDS: Record<TimeRange, string> = {
  '7d': TestIDs.Progress.TimeRange7d,
  '14d': TestIDs.Progress.TimeRange14d,
  '30d': TestIDs.Progress.TimeRange30d,
  '90d': TestIDs.Progress.TimeRange90d,
  all: TestIDs.Progress.TimeRangeAll,
};

const getDateRange = (range: TimeRange, earliestDate?: string | null): { start: string; end: string } => {
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
      if (earliestDate) {
        start = new Date(earliestDate + 'T12:00:00');
      } else {
        start.setFullYear(start.getFullYear() - 1);
      }
      break;
  }

  return { start: start.toISOString().split('T')[0], end: endStr };
};

// Fill in missing dates in a range with zero totals so the chart shows the full time window
const fillMissingDates = (
  data: Array<{ date: string; totals: DailyTotals }>,
  start: string,
  end: string
): Array<{ date: string; totals: DailyTotals }> => {
  const dataMap = new Map(data.map((d) => [d.date, d]));
  const result: Array<{ date: string; totals: DailyTotals }> = [];
  const emptyTotals: DailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const current = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    result.push(dataMap.get(dateStr) ?? { date: dateStr, totals: { ...emptyTotals } });
    current.setDate(current.getDate() + 1);
  }

  return result;
};

export default function ProgressScreen() {
  const { colors, colorScheme } = useTheme();
  const router = useRouter();
  const { entries: weightEntries, loadEntries: loadWeightEntries, loadEarliestDate } = useWeightStore(useShallow((s) => ({
    entries: s.entries,
    loadEntries: s.loadEntries,
    loadEarliestDate: s.loadEarliestDate
  })));
  const { settings, loadSettings, isLoaded: settingsLoaded } = useSettingsStore(useShallow((s) => ({
    settings: s.settings,
    loadSettings: s.loadSettings,
    isLoaded: s.isLoaded,
  })));
  const { calories: resolvedCalorieGoal } = useResolvedTargets();
  const { isPremium } = usePremium();

  const chartThemeColors = allChartColors[colorScheme];
  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';

  const weightChartPalette = useMemo<Partial<WeightTrendChartPalette>>(() => ({
    background: colors.bgSecondary,
    text: colors.textPrimary,
    mutedText: colors.textTertiary,
    grid: colors.borderDefault,
    rawWeight: chartThemeColors.rawWeight,
    trendLine: chartThemeColors.trendLine,
    pointFill: colors.bgElevated,
    pointStroke: chartThemeColors.trendLine,
    tooltipBg: colors.bgElevated,
    tooltipBorder: colors.borderDefault,
    positiveChange: colors.success,
    neutralChange: colors.textSecondary,
    presetActiveBg: colors.bgInteractive,
    presetActiveText: colors.textPrimary,
    presetInactiveText: colors.textTertiary,
    presetDisabledText: colors.textDisabled,
  }), [colors, chartThemeColors]);

  // Micronutrient store
  const {
    loadProfile: loadNutrientProfile,
    loadDailyIntake,
    dailyIntake,
    isLoaded: nutrientsLoaded,
  } = useMicronutrientStore(useShallow((s) => ({
    loadProfile: s.loadProfile,
    loadDailyIntake: s.loadDailyIntake,
    dailyIntake: s.dailyIntake,
    isLoaded: s.isLoaded,
  })));

  // Progress photos store
  const {
    loadPhotos,
    photos,
    stats: photoStats,
    getFirstPhoto,
    getLatestPhoto,
    isLoaded: photosLoaded,
    setComparisonPhoto1,
    setComparisonPhoto2,
  } = useProgressPhotoStore(useShallow((s) => ({
    loadPhotos: s.loadPhotos,
    photos: s.photos,
    stats: s.stats,
    getFirstPhoto: s.getFirstPhoto,
    getLatestPhoto: s.getLatestPhoto,
    isLoaded: s.isLoaded,
    setComparisonPhoto1: s.setComparisonPhoto1,
    setComparisonPhoto2: s.setComparisonPhoto2,
  })));

  // Track mount/unmount only in dev
  useEffect(() => {
    if (__DEV__) {
      const mountTime = Date.now();
      console.log(`[Progress] component MOUNTED at ${new Date().toISOString()}`);
      return () => console.log(`[Progress] component UNMOUNTED (was alive ${Date.now() - mountTime}ms)`);
    }
  }, []);

  // Independent time range states for each section
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
  const [lastLoadedAt, setLastLoadedAt] = useState(0);

  // Load calorie data based on calorie time range
  const loadCalorieData = useCallback(async (sharedData?: Array<{ date: string; totals: DailyTotals }>) => {
    const { start, end } = getDateRange(calorieTimeRange);
    const calorieHistory = sharedData ?? await logEntryRepository.getDailyTotalsForRange(start, end);
    setCalorieData(fillMissingDates(calorieHistory, start, end));
    setDaysLogged(calorieHistory.length);
  }, [calorieTimeRange]);

  // Load average macros based on macro time range
  const loadMacroData = useCallback(async (sharedData?: Array<{ date: string; totals: DailyTotals }>) => {
    const { start, end } = getDateRange(macroTimeRange);
    const macroHistory = sharedData ?? await logEntryRepository.getDailyTotalsForRange(start, end);

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
  const loadInsightsData = useCallback(async (sharedData?: Array<{ date: string; totals: DailyTotals }>) => {
    const { start, end } = getDateRange(insightsTimeRange);
    const insightsHistory = sharedData ?? await logEntryRepository.getDailyTotalsForRange(start, end);

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

  // Combined load — deduplicates queries when time ranges match
  const loadAllData = useCallback(async () => {
    // Group ranges to deduplicate DB queries
    const calorieRange = getDateRange(calorieTimeRange);
    const macroRange = getDateRange(macroTimeRange);
    const insightsRange = getDateRange(insightsTimeRange);

    // Fetch unique ranges
    const rangeKey = (r: { start: string; end: string }) => `${r.start}_${r.end}`;
    const uniqueRanges = new Map<string, { start: string; end: string }>();
    uniqueRanges.set(rangeKey(calorieRange), calorieRange);
    uniqueRanges.set(rangeKey(macroRange), macroRange);
    uniqueRanges.set(rangeKey(insightsRange), insightsRange);

    // Fetch all unique ranges in parallel
    const fetchResults = new Map<string, Array<{ date: string; totals: DailyTotals }>>();
    await Promise.all(
      Array.from(uniqueRanges.entries()).map(async ([key, range]) => {
        const data = await logEntryRepository.getDailyTotalsForRange(range.start, range.end);
        fetchResults.set(key, data);
      })
    );

    // Distribute shared data to each section
    await Promise.all([
      loadWeightEntries(500),
      loadCalorieData(fetchResults.get(rangeKey(calorieRange))!),
      loadMacroData(fetchResults.get(rangeKey(macroRange))!),
      loadInsightsData(fetchResults.get(rangeKey(insightsRange))!),
    ]);
  }, [loadWeightEntries, loadCalorieData, loadMacroData, loadInsightsData, calorieTimeRange, macroTimeRange, insightsTimeRange]);

  useEffect(() => {
    Promise.all([
      loadSettings(),
      loadNutrientProfile(),
      loadPhotos(),
      loadEarliestDate(),
    ]);
  }, [loadSettings, loadNutrientProfile, loadPhotos, loadEarliestDate]);

  // Initial load — skip if data is still fresh (e.g. quick tab switch)
  useEffect(() => {
    const STALE_MS = 30_000;
    if (dataLoaded && Date.now() - lastLoadedAt < STALE_MS) return;

    const initialLoad = async () => {
      await loadAllData();
      const today = new Date().toISOString().split('T')[0];
      await loadDailyIntake(today);
      setDataLoaded(true);
      setLastLoadedAt(Date.now());
    };
    initialLoad();
  }, []);

  // Reload micronutrient data when screen regains focus (e.g. after seeding in dev tools)
  useFocusEffect(
    useCallback(() => {
      if (!dataLoaded) return;
      const today = new Date().toISOString().split('T')[0];
      loadDailyIntake(today);
    }, [dataLoaded, loadDailyIntake])
  );

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
  const hasCalorieData = daysLogged > 0;

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
          </View>

          <View testID={TestIDs.Progress.WeightChart}>
            <WeightTrendChartMinimal
              entries={weightEntries}
              unit={weightUnit}
              chartHeight={200}
              palette={weightChartPalette}
            />
          </View>
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
        <MicronutrientSummary
          nutrients={
            dailyIntake?.totalFoodsLogged && dailyIntake.nutrients.some(n => n.amount > 0)
              ? dailyIntake.nutrients
              : MOCK_NUTRIENT_INTAKES
          }
          isPremium={isPremium}
        />

        {/* Progress Photos Section - Premium Feature */}
        <ProgressPhotosSummary
          stats={photoStats}
          recentPhotos={photos.slice(0, 5)}
          firstPhoto={getFirstPhoto()}
          latestPhoto={getLatestPhoto()}
          isPremium={isPremium}
          onPress={() => router.push('/progress-photos')}
          onAddPress={() => router.push('/progress-photos/capture')}
          onComparePress={() => {
            const first = getFirstPhoto();
            const latest = getLatestPhoto();
            if (first && latest) {
              setComparisonPhoto1(first.id);
              setComparisonPhoto2(latest.id);
            }
            router.push('/progress-photos/compare');
          }}
        />

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
