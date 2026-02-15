/**
 * MicronutrientsScreen
 * Full micronutrient breakdown — free tier shows 10 essentials + premium preview;
 * premium tier shows all 25 in Vitamins / Minerals / Other sections.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import {
  NutrientDefinition,
  NutrientIntake,
  NutrientStatus,
  NutrientTarget,
} from '@/types/micronutrients';
import { useMicronutrientStore } from '@/stores/micronutrientStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { NutrientBar } from '@/components/micronutrients/NutrientBar';
import { StatusOverviewCard } from '@/features/micronutrients/components/StatusOverviewCard';
import { StatusFilterChips } from '@/features/micronutrients/components/StatusFilterChips';
import { NutrientDetailSheet } from '@/features/micronutrients/components/NutrientDetailSheet';
import { NutrientTargetEditor } from '@/features/micronutrients/components/NutrientTargetEditor';
import { ThemedDatePicker } from '@/components/ui/ThemedDatePicker';
import { PremiumMicronutrientPreview } from '@/components/premium/PremiumMicronutrientPreview';

// ─── Helpers ────────────────────────────────────────────

interface NutrientWithDetails {
  definition: NutrientDefinition;
  intake: NutrientIntake | null;
}

interface CategorizedRows {
  vitamins: NutrientWithDetails[];
  minerals: NutrientWithDetails[];
  other: NutrientWithDetails[];
}

const getTodayString = (): string => new Date().toISOString().split('T')[0];

const formatDateDisplay = (dateStr: string): string => {
  const today = getTodayString();
  if (dateStr === today) return 'Today';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const STATUS_PRIORITY: Record<NutrientStatus, number> = {
  deficient: 0,
  low: 1,
  adequate: 2,
  optimal: 3,
  high: 4,
  excessive: 5,
  no_data: 99,
};

const buildNutrientRows = (
  defs: NutrientDefinition[],
  intakeMap: Map<string, NutrientIntake>,
  selectedStatuses: NutrientStatus[]
): NutrientWithDetails[] => {
  const rows: NutrientWithDetails[] = defs.map((definition) => ({
    definition,
    intake: intakeMap.get(definition.id) ?? null,
  }));

  const filtered = rows.filter((row) => {
    if (selectedStatuses.length === 0) return true;
    if (!row.intake || row.intake.status === 'no_data') return false;
    return selectedStatuses.includes(row.intake.status);
  });

  filtered.sort((a, b) => {
    const aStatus = a.intake?.status ?? 'no_data';
    const bStatus = b.intake?.status ?? 'no_data';
    const priorityDelta = STATUS_PRIORITY[aStatus] - STATUS_PRIORITY[bStatus];
    if (priorityDelta !== 0) return priorityDelta;
    return (a.intake?.percentOfTarget ?? 0) - (b.intake?.percentOfTarget ?? 0);
  });

  return filtered;
};

const getStatusCounts = (
  defs: NutrientDefinition[],
  intakeMap: Map<string, NutrientIntake>
): Record<NutrientStatus, number> => {
  const counts: Record<NutrientStatus, number> = {
    deficient: 0,
    low: 0,
    adequate: 0,
    optimal: 0,
    high: 0,
    excessive: 0,
    no_data: 0,
  };
  for (const def of defs) {
    const status = intakeMap.get(def.id)?.status;
    if (status && status !== 'no_data') counts[status] += 1;
  }
  return counts;
};

// ─── Component ──────────────────────────────────────────

export default function MicronutrientsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const isPremium = useSubscriptionStore((s) => s.isPremium);

  // Store selectors
  const dailyIntake = useMicronutrientStore((s) => s.dailyIntake);
  const isLoading = useMicronutrientStore((s) => s.isLoading);
  const storeError = useMicronutrientStore((s) => s.error);
  const loadDailyIntake = useMicronutrientStore((s) => s.loadDailyIntake);
  const loadProfile = useMicronutrientStore((s) => s.loadProfile);
  const getTargetForNutrient = useMicronutrientStore((s) => s.getTargetForNutrient);
  const getVisibleNutrients = useMicronutrientStore((s) => s.getVisibleNutrients);
  const getTrackedNutrientsByCategory = useMicronutrientStore(
    (s) => s.getTrackedNutrientsByCategory
  );
  const getFreeTrackedNutrients = useMicronutrientStore((s) => s.getFreeTrackedNutrients);
  const getPremiumTrackedNutrients = useMicronutrientStore((s) => s.getPremiumTrackedNutrients);

  // Local state
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<NutrientStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNutrient, setSelectedNutrient] = useState<NutrientDefinition | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingNutrient, setEditingNutrient] = useState<NutrientDefinition | null>(null);
  const [targetEditorVisible, setTargetEditorVisible] = useState(false);

  const isToday = selectedDate === getTodayString();

  // ─── Effects ────────────────────────────────────────

  useEffect(() => {
    loadProfile();
    loadDailyIntake(selectedDate);
  }, []);

  useEffect(() => {
    setIsRefreshing(true);
    loadDailyIntake(selectedDate).finally(() => setIsRefreshing(false));
  }, [selectedDate, loadDailyIntake]);

  // ─── Derived data ───────────────────────────────────

  const intakes = dailyIntake?.nutrients ?? [];

  const intakeByNutrientId = useMemo(() => {
    const map = new Map<string, NutrientIntake>();
    for (const intake of intakes) map.set(intake.nutrientId, intake);
    return map;
  }, [intakes]);

  const visibleNutrients = useMemo(
    () => getVisibleNutrients(isPremium),
    [getVisibleNutrients, isPremium]
  );

  const freeTrackedNutrients = useMemo(
    () => getFreeTrackedNutrients(),
    [getFreeTrackedNutrients]
  );
  const premiumTrackedNutrients = useMemo(
    () => getPremiumTrackedNutrients(),
    [getPremiumTrackedNutrients]
  );

  // Free user rows
  const freeRows = useMemo(
    () => buildNutrientRows(freeTrackedNutrients, intakeByNutrientId, selectedStatuses),
    [freeTrackedNutrients, intakeByNutrientId, selectedStatuses]
  );

  // Premium user categorized rows
  const premiumRows: CategorizedRows = useMemo(() => {
    if (!isPremium) return { vitamins: [], minerals: [], other: [] };
    const grouped = getTrackedNutrientsByCategory();
    return {
      vitamins: buildNutrientRows(grouped.vitamins, intakeByNutrientId, selectedStatuses),
      minerals: buildNutrientRows(grouped.minerals, intakeByNutrientId, selectedStatuses),
      other: buildNutrientRows(grouped.other, intakeByNutrientId, selectedStatuses),
    };
  }, [isPremium, getTrackedNutrientsByCategory, intakeByNutrientId, selectedStatuses]);

  // Status counts scoped to visible tier
  const statusCounts = useMemo(
    () => getStatusCounts(visibleNutrients, intakeByNutrientId),
    [visibleNutrients, intakeByNutrientId]
  );

  // Intake map for preview component (Record<string, NutrientIntake>)
  const dailyIntakeMap = useMemo<Record<string, NutrientIntake>>(() => {
    const map: Record<string, NutrientIntake> = {};
    if (dailyIntake?.nutrients) {
      for (const n of dailyIntake.nutrients) map[n.nutrientId] = n;
    }
    return map;
  }, [dailyIntake]);

  const totalFoods = dailyIntake?.totalFoodsLogged ?? 0;
  const hasData = totalFoods > 0;
  const displayedRows = isPremium
    ? premiumRows.vitamins.length + premiumRows.minerals.length + premiumRows.other.length
    : freeRows.length;

  // ─── Callbacks ──────────────────────────────────────

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date.toISOString().split('T')[0]);
  }, []);

  const navigateDate = useCallback(
    (direction: -1 | 1) => {
      const current = new Date(selectedDate + 'T12:00:00');
      current.setDate(current.getDate() + direction);
      setSelectedDate(current.toISOString().split('T')[0]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [selectedDate]
  );

  const handleFilterToggle = useCallback((status: NutrientStatus | 'all') => {
    if (status === 'all') {
      setSelectedStatuses([]);
      return;
    }
    setSelectedStatuses((prev) => {
      const related: NutrientStatus[] =
        status === 'low'
          ? ['low', 'deficient']
          : status === 'high'
          ? ['high', 'excessive']
          : [status];
      const hasAny = related.some((s) => prev.includes(s));
      return hasAny ? prev.filter((s) => !related.includes(s)) : [...prev, ...related];
    });
  }, []);

  const handleStatusPress = useCallback((status: NutrientStatus) => {
    const related: NutrientStatus[] =
      status === 'low'
        ? ['low', 'deficient']
        : status === 'high'
        ? ['high', 'excessive']
        : [status];
    setSelectedStatuses(related);
  }, []);

  const handleNutrientPress = useCallback(
    (def: NutrientDefinition) => {
      if (!isPremium && def.isPremium) {
        router.push('/paywall?context=micronutrients');
        return;
      }
      setSelectedNutrient(def);
      setSheetOpen(true);
    },
    [isPremium, router]
  );

  const handleEditTarget = useCallback(() => {
    if (selectedNutrient) {
      setEditingNutrient(selectedNutrient);
      setTargetEditorVisible(true);
    }
  }, [selectedNutrient]);

  const handleCloseSheet = useCallback(() => setSheetOpen(false), []);

  const handleCloseTargetEditor = useCallback(() => {
    setTargetEditorVisible(false);
    setEditingNutrient(null);
    loadDailyIntake(selectedDate);
  }, [selectedDate, loadDailyIntake]);

  // ─── Derived for sheets ─────────────────────────────

  const selectedNutrientTarget = selectedNutrient
    ? getTargetForNutrient(selectedNutrient.id)
    : null;
  const selectedNutrientIntake = selectedNutrient
    ? intakes.find((i) => i.nutrientId === selectedNutrient.id) ?? null
    : null;
  const editingNutrientTarget = editingNutrient
    ? getTargetForNutrient(editingNutrient.id)
    : null;

  // ─── Render ─────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}
      edges={['top']}
    >
      {/* Header with back button, title, date navigation */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Micronutrients</Text>

        <View style={styles.dateNavigation}>
          <TouchableOpacity
            onPress={() => navigateDate(-1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            style={styles.dateChevron}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[styles.dateButton, { backgroundColor: colors.bgSecondary }]}
            accessibilityRole="button"
            accessibilityLabel={`Date: ${formatDateDisplay(selectedDate)}`}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.accent} />
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {formatDateDisplay(selectedDate)}
            </Text>
          </Pressable>

          <TouchableOpacity
            onPress={() => navigateDate(1)}
            disabled={isToday}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            accessibilityState={{ disabled: isToday }}
            style={[styles.dateChevron, isToday && styles.dateChevronDisabled]}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ThemedDatePicker
        visible={showDatePicker}
        value={new Date(selectedDate + 'T12:00:00')}
        onSelect={handleDateSelect}
        onClose={() => setShowDatePicker(false)}
        maximumDate={new Date()}
      />

      {storeError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error + '18' }]}>
          <Text style={[styles.errorBannerText, { color: colors.error }]}>{storeError}</Text>
        </View>
      )}

      {isLoading && !dailyIntake ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : !hasData ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="nutrition-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Start tracking what nourishes you
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Log your meals to discover how your food choices support your body's needs
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/add-food')}
            accessibilityRole="button"
            accessibilityLabel="Log food to start tracking micronutrients"
            style={[styles.emptyCta, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.emptyCtaText}>Log Food</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <StatusOverviewCard counts={statusCounts} onStatusPress={handleStatusPress} />

          <StatusFilterChips
            selectedStatuses={selectedStatuses}
            onToggle={handleFilterToggle}
          />

          <View style={[styles.separator, { backgroundColor: colors.bgInteractive }]} />

          {isPremium ? (
            <>
              {/* ─── Premium: Vitamins / Minerals / Other ─── */}
              <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
                Vitamins
              </Text>
              {premiumRows.vitamins.map((item) => (
                <NutrientBarRow
                  key={item.definition.id}
                  definition={item.definition}
                  intake={item.intake}
                  target={getTargetForNutrient(item.definition.id)}
                  onPress={() => handleNutrientPress(item.definition)}
                />
              ))}

              <Text
                style={[
                  styles.sectionHeader,
                  { color: colors.textPrimary, marginTop: spacing[4] },
                ]}
              >
                Minerals
              </Text>
              {premiumRows.minerals.map((item) => (
                <NutrientBarRow
                  key={item.definition.id}
                  definition={item.definition}
                  intake={item.intake}
                  target={getTargetForNutrient(item.definition.id)}
                  onPress={() => handleNutrientPress(item.definition)}
                />
              ))}

              <Text
                style={[
                  styles.sectionHeader,
                  { color: colors.textPrimary, marginTop: spacing[4] },
                ]}
              >
                Other
              </Text>
              {premiumRows.other.map((item) => (
                <NutrientBarRow
                  key={item.definition.id}
                  definition={item.definition}
                  intake={item.intake}
                  target={getTargetForNutrient(item.definition.id)}
                  onPress={() => handleNutrientPress(item.definition)}
                />
              ))}
            </>
          ) : (
            <>
              {/* ─── Free: Daily Essentials + Preview Card ─── */}
              <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
                Daily Essentials
              </Text>
              {freeRows.map((item) => (
                <NutrientBarRow
                  key={item.definition.id}
                  definition={item.definition}
                  intake={item.intake}
                  target={getTargetForNutrient(item.definition.id)}
                  onPress={() => handleNutrientPress(item.definition)}
                />
              ))}

              <View style={[styles.previewDivider, { backgroundColor: colors.bgInteractive }]} />

              <PremiumMicronutrientPreview
                premiumNutrients={premiumTrackedNutrients}
                dailyIntake={dailyIntakeMap}
              />
            </>
          )}

          {displayedRows === 0 && selectedStatuses.length > 0 && (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: colors.textTertiary }]}>
                No nutrients match the selected filters
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <NutrientDetailSheet
        nutrient={selectedNutrient}
        intake={selectedNutrientIntake}
        target={selectedNutrientTarget}
        date={selectedDate}
        index={sheetOpen && selectedNutrient ? 0 : -1}
        onClose={handleCloseSheet}
        onEditTarget={handleEditTarget}
      />

      <NutrientTargetEditor
        visible={targetEditorVisible}
        nutrient={editingNutrient}
        currentTarget={editingNutrientTarget}
        onClose={handleCloseTargetEditor}
      />
    </SafeAreaView>
  );
}

// ─── Extracted row component ──────────────────────────

const NutrientBarRow = React.memo(function NutrientBarRow({
  definition,
  intake,
  target,
  onPress,
}: {
  definition: NutrientDefinition;
  intake: NutrientIntake | null;
  target: NutrientTarget | null;
  onPress?: () => void;
}) {
  return (
    <NutrientBar
      nutrient={definition}
      amount={intake?.amount ?? 0}
      target={target?.targetAmount ?? 0}
      percentOfTarget={intake?.percentOfTarget ?? 0}
      status={intake?.status ?? 'no_data'}
      onPress={onPress}
    />
  );
});

// ─── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  errorBanner: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
  },
  errorBannerText: { ...typography.body.small, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerTitle: { ...typography.title.large },
  dateNavigation: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  dateChevron: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  dateChevronDisabled: { opacity: 0.3 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  dateText: { ...typography.body.small, fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
    gap: spacing[3],
  },
  emptyTitle: { ...typography.title.medium, textAlign: 'center' },
  emptySubtitle: { ...typography.body.medium, textAlign: 'center' },
  emptyCta: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.full,
    marginTop: spacing[4],
  },
  emptyCtaText: { ...typography.body.medium, color: '#FFFFFF', fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4], paddingBottom: spacing[16], gap: spacing[3] },
  separator: { height: 1, marginVertical: spacing[2], marginHorizontal: spacing[2] },
  sectionHeader: {
    ...typography.body.medium,
    fontWeight: '700',
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  previewDivider: { height: 1, marginVertical: spacing[4] },
  noResults: { paddingVertical: spacing[8], alignItems: 'center' },
  noResultsText: { ...typography.body.medium, textAlign: 'center' },
});
