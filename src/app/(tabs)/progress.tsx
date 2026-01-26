import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { useWeightStore, useSettingsStore } from '@/stores';
import { logEntryRepository } from '@/repositories';
import { WeightChart, CalorieChart, MacroChart } from '@/components/charts';
import { DailyTotals } from '@/types/domain';

type TimeRange = '7d' | '30d' | '90d' | 'all';

const getDateRange = (range: TimeRange): { start: string; end: string } => {
  const end = new Date();
  const endStr = end.toISOString().split('T')[0];

  let start = new Date();
  switch (range) {
    case '7d':
      start.setDate(start.getDate() - 7);
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
  const { settings, loadSettings } = useSettingsStore();

  const [weightTimeRange, setWeightTimeRange] = useState<TimeRange>('30d');
  const [calorieData, setCalorieData] = useState<Array<{ date: string; totals: DailyTotals }>>([]);
  const [avgMacros, setAvgMacros] = useState<DailyTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [daysLogged, setDaysLogged] = useState(0);

  const loadData = useCallback(async () => {
    const { start, end } = getDateRange(weightTimeRange);
    await loadEntriesForRange(start, end);

    // Load calorie data for the same range
    const calorieHistory = await logEntryRepository.getDailyTotalsForRange(start, end);
    setCalorieData(calorieHistory);
    setDaysLogged(calorieHistory.length);

    // Calculate average macros
    if (calorieHistory.length > 0) {
      const totals = calorieHistory.reduce(
        (acc, day) => ({
          calories: acc.calories + day.totals.calories,
          protein: acc.protein + day.totals.protein,
          carbs: acc.carbs + day.totals.carbs,
          fat: acc.fat + day.totals.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      setAvgMacros({
        calories: Math.round(totals.calories / calorieHistory.length),
        protein: Math.round(totals.protein / calorieHistory.length),
        carbs: Math.round(totals.carbs / calorieHistory.length),
        fat: Math.round(totals.fat / calorieHistory.length),
      });
    } else {
      setAvgMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    }
  }, [weightTimeRange, loadEntriesForRange]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setWeightTimeRange(range);
  };

  const hasEnoughData = daysLogged >= 3 || weightEntries.length >= 3;
  const hasCalorieData = calorieData.length > 0;
  const hasWeightData = weightEntries.length > 0;

  const timeRanges: TimeRange[] = ['7d', '30d', '90d', 'all'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Your Journey
        </Text>
        <Pressable
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
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Weight
            </Text>
            <View style={styles.timeRangeButtons}>
              {timeRanges.map((range) => (
                <Pressable
                  key={range}
                  style={[
                    styles.timeRangeButton,
                    weightTimeRange === range && { backgroundColor: colors.bgInteractive },
                  ]}
                  onPress={() => handleTimeRangeChange(range)}
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
            <WeightChart entries={weightEntries} showTrend />
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
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Calories
            </Text>
          </View>

          {hasCalorieData ? (
            <CalorieChart data={calorieData} showGoalLine />
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
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Average Macros
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {weightTimeRange === 'all' ? 'All time' : `Last ${weightTimeRange}`}
              </Text>
            </View>

            <MacroChart totals={avgMacros} showGoalComparison />
          </View>
        )}

        {/* Insights Section */}
        {hasEnoughData && (
          <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Insights
              </Text>
            </View>

            <View style={styles.insightsList}>
              <InsightCard
                icon="calendar-outline"
                title="Days Logged"
                value={daysLogged.toString()}
                subtitle={`in the last ${weightTimeRange === 'all' ? 'period' : weightTimeRange}`}
                colors={colors}
              />
              <InsightCard
                icon="scale-outline"
                title="Weight Entries"
                value={weightEntries.length.toString()}
                subtitle="total entries"
                colors={colors}
              />
              {avgMacros.calories > 0 && (
                <InsightCard
                  icon="flame-outline"
                  title="Avg. Daily Calories"
                  value={avgMacros.calories.toLocaleString()}
                  subtitle={`goal: ${settings.dailyCalorieGoal.toLocaleString()}`}
                  colors={colors}
                />
              )}
            </View>
          </View>
        )}
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
