/**
 * MicronutrientsScreen
 * Full micronutrient breakdown with drill-down capability
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
  NutrientStatus,
  NutrientTarget,
} from '@/types/micronutrients';
import { ALL_NUTRIENTS } from '@/data/nutrients';
import { TRACKED_NUTRIENT_IDS } from '@/constants/trackedNutrients';
import { useMicronutrientStore } from '@/stores/micronutrientStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { NutrientBar } from '@/components/micronutrients/NutrientBar';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { LockedContentArea } from '@/components/premium/LockedContentArea';
import { StatusOverviewCard } from '@/features/micronutrients/components/StatusOverviewCard';
import { StatusFilterChips } from '@/features/micronutrients/components/StatusFilterChips';
import { NutrientDetailSheet } from '@/features/micronutrients/components/NutrientDetailSheet';
import { NutrientTargetEditor } from '@/features/micronutrients/components/NutrientTargetEditor';
import { ThemedDatePicker } from '@/components/ui/ThemedDatePicker';
import {
  useFilteredNutrients,
  NutrientWithDetails,
} from '@/features/micronutrients/hooks/useFilteredNutrients';

// ============================================================
// Helpers
// ============================================================

const getTodayString = (): string => new Date().toISOString().split('T')[0];

const formatDateDisplay = (dateStr: string): string => {
  const today = getTodayString();
  if (dateStr === today) return 'Today';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ============================================================
// Screen
// ============================================================

export default function MicronutrientsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const isPremium = useSubscriptionStore(s => s.isPremium);

  // Store state
  const dailyIntake = useMicronutrientStore(s => s.dailyIntake);
  const isLoading = useMicronutrientStore(s => s.isLoading);
  const storeError = useMicronutrientStore(s => s.error);
  const loadDailyIntake = useMicronutrientStore(s => s.loadDailyIntake);
  const loadProfile = useMicronutrientStore(s => s.loadProfile);
  const getTargetForNutrient = useMicronutrientStore(s => s.getTargetForNutrient);

  // Local state
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<NutrientStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detail sheet state — persistent mount pattern
  const [selectedNutrient, setSelectedNutrient] = useState<NutrientDefinition | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Target editor state
  const [editingNutrient, setEditingNutrient] = useState<NutrientDefinition | null>(null);
  const [targetEditorVisible, setTargetEditorVisible] = useState(false);

  // Date helpers
  const isToday = selectedDate === getTodayString();

  // Load data on mount
  useEffect(() => {
    loadProfile();
    loadDailyIntake(selectedDate);
  }, []);

  // Reload on date change
  useEffect(() => {
    setIsRefreshing(true);
    loadDailyIntake(selectedDate).finally(() => setIsRefreshing(false));
  }, [selectedDate, loadDailyIntake]);

  // Handle date picker selection
  const handleDateSelect = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
  }, []);

  // Date navigation via chevrons
  const navigateDate = useCallback((direction: -1 | 1) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + direction);
    const dateStr = current.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [selectedDate]);

  // Only show the 25 tracked nutrients
  const visibleNutrients = ALL_NUTRIENTS.filter(n => TRACKED_NUTRIENT_IDS.has(n.id));

  const intakes = dailyIntake?.nutrients ?? [];

  // Filter and group
  const { sections, lowestSection, statusCounts } = useFilteredNutrients({
    intakes,
    selectedStatuses,
    visibleNutrients,
  });

  // Filter chip toggle
  const handleFilterToggle = useCallback((status: NutrientStatus | 'all') => {
    if (status === 'all') {
      setSelectedStatuses([]);
      return;
    }
    setSelectedStatuses(prev => {
      // Map broader filters: "low" includes deficient, "high" includes excessive
      const relatedStatuses: NutrientStatus[] =
        status === 'low' ? ['low', 'deficient'] :
        status === 'high' ? ['high', 'excessive'] :
        [status];

      const hasAny = relatedStatuses.some(s => prev.includes(s));
      if (hasAny) {
        return prev.filter(s => !relatedStatuses.includes(s));
      }
      return [...prev, ...relatedStatuses];
    });
  }, []);

  // Status overview tap
  const handleStatusPress = useCallback((status: NutrientStatus) => {
    const relatedStatuses: NutrientStatus[] =
      status === 'low' ? ['low', 'deficient'] :
      status === 'high' ? ['high', 'excessive'] :
      [status];
    setSelectedStatuses(relatedStatuses);
  }, []);

  // Nutrient bar press → open detail sheet (with premium guard)
  const handleNutrientPress = useCallback((def: NutrientDefinition) => {
    if (!isPremium && def.isPremium) {
      router.push('/paywall?context=micronutrients');
      return;
    }
    setSelectedNutrient(def);
    setSheetOpen(true);
  }, [isPremium, router]);

  // Detail sheet → edit target
  const handleEditTarget = useCallback(() => {
    if (selectedNutrient) {
      setEditingNutrient(selectedNutrient);
      setTargetEditorVisible(true);
    }
  }, [selectedNutrient]);

  // Close detail sheet
  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  // Close target editor & refresh data
  const handleCloseTargetEditor = useCallback(() => {
    setTargetEditorVisible(false);
    setEditingNutrient(null);
    // Refresh intake data to reflect new targets
    loadDailyIntake(selectedDate);
  }, [selectedDate, loadDailyIntake]);

  // Get target for selected nutrient (for detail sheet)
  const selectedNutrientTarget = selectedNutrient
    ? getTargetForNutrient(selectedNutrient.id)
    : null;
  const selectedNutrientIntake = selectedNutrient
    ? intakes.find(i => i.nutrientId === selectedNutrient.id) ?? null
    : null;

  // Get target for editing nutrient
  const editingNutrientTarget = editingNutrient
    ? getTargetForNutrient(editingNutrient.id)
    : null;

  // Check data coverage
  const totalFoods = dailyIntake?.totalFoodsLogged ?? 0;
  const hasData = totalFoods > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Micronutrients
        </Text>

        {/* Date navigation with chevrons */}
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

      {/* Date Picker */}
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
          {/* Refreshing indicator */}
          {isRefreshing && (
            <View style={[styles.refreshBar, { backgroundColor: colors.accent }]} />
          )}

          {/* Summary Zone */}
          <StatusOverviewCard
            counts={statusCounts}
            onStatusPress={handleStatusPress}
          />

          <StatusFilterChips
            selectedStatuses={selectedStatuses}
            onToggle={handleFilterToggle}
          />

          {/* Visual separator between summary and detail zones */}
          <View style={[styles.separator, { backgroundColor: colors.bgInteractive }]} />

          {/* Detail Zone — nutrient sections */}
          {sections.map(section => {
            const isLowestSection = lowestSection?.subcategory === section.subcategory;
            const defaultExpanded = isLowestSection || selectedStatuses.length > 0;

            // Split free vs premium nutrients
            const freeNutrients = section.nutrients.filter(n => !n.definition.isPremium);
            const premiumNutrients = section.nutrients.filter(n => n.definition.isPremium);

            return (
              <CollapsibleSection
                key={section.subcategory}
                title={`${section.title} (${section.nutrientCount})`}
                itemCount={section.nutrientCount}
                defaultExpanded={defaultExpanded}
              >
                {/* Free nutrients — always accessible */}
                {freeNutrients.map(item => (
                  <NutrientBarRow
                    key={item.definition.id}
                    item={item}
                    target={getTargetForNutrient(item.definition.id)}
                    onPress={() => handleNutrientPress(item.definition)}
                  />
                ))}

                {/* Premium nutrients — gated */}
                {premiumNutrients.length > 0 && !isPremium ? (
                  <LockedContentArea
                    context="micronutrients"
                    message={`${premiumNutrients.length} more nutrients`}
                    minHeight={premiumNutrients.length * 40}
                  >
                    {premiumNutrients.map(item => (
                      <NutrientBarRow
                        key={item.definition.id}
                        item={item}
                        target={getTargetForNutrient(item.definition.id)}
                      />
                    ))}
                  </LockedContentArea>
                ) : (
                  premiumNutrients.map(item => (
                    <NutrientBarRow
                      key={item.definition.id}
                      item={item}
                      target={getTargetForNutrient(item.definition.id)}
                      onPress={() => handleNutrientPress(item.definition)}
                    />
                  ))
                )}
              </CollapsibleSection>
            );
          })}

          {sections.length === 0 && selectedStatuses.length > 0 && (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: colors.textTertiary }]}>
                No nutrients match the selected filters
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Detail Bottom Sheet — persistent mount, controlled by index */}
      <NutrientDetailSheet
        nutrient={selectedNutrient}
        intake={selectedNutrientIntake}
        target={selectedNutrientTarget}
        date={selectedDate}
        index={sheetOpen && selectedNutrient ? 0 : -1}
        onClose={handleCloseSheet}
        onEditTarget={handleEditTarget}
      />

      {/* Target Editor Modal */}
      <NutrientTargetEditor
        visible={targetEditorVisible}
        nutrient={editingNutrient}
        currentTarget={editingNutrientTarget}
        onClose={handleCloseTargetEditor}
      />
    </SafeAreaView>
  );
}

// ============================================================
// NutrientBarRow — memoized wrapper
// ============================================================

const NutrientBarRow = React.memo(function NutrientBarRow({
  item,
  target,
  onPress,
}: {
  item: NutrientWithDetails;
  target: NutrientTarget | null;
  onPress?: () => void;
}) {
  return (
    <NutrientBar
      nutrient={item.definition}
      amount={item.intake?.amount ?? 0}
      target={target?.targetAmount ?? 0}
      percentOfTarget={item.intake?.percentOfTarget ?? 0}
      status={item.intake?.status ?? 'no_data'}
      onPress={onPress}
    />
  );
});

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  errorBanner: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
  },
  errorBannerText: {
    ...typography.body.small,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerTitle: {
    ...typography.title.large,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  dateChevron: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateChevronDisabled: {
    opacity: 0.3,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  dateText: {
    ...typography.body.small,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
    gap: spacing[3],
  },
  emptyTitle: {
    ...typography.title.medium,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  emptyCta: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.full,
    marginTop: spacing[4],
  },
  emptyCtaText: {
    ...typography.body.medium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[16],
    gap: spacing[3],
  },
  refreshBar: {
    height: 2,
    width: '100%',
    opacity: 0.7,
  },
  separator: {
    height: 1,
    marginVertical: spacing[2],
    marginHorizontal: spacing[2],
  },
  noResults: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  noResultsText: {
    ...typography.body.medium,
    textAlign: 'center',
  },
});
