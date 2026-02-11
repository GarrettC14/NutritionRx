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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { ALL_NUTRIENTS, FREE_NUTRIENTS, NUTRIENT_BY_ID } from '@/data/nutrients';
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
  const loadDailyIntake = useMicronutrientStore(s => s.loadDailyIntake);
  const loadProfile = useMicronutrientStore(s => s.loadProfile);
  const getTargetForNutrient = useMicronutrientStore(s => s.getTargetForNutrient);

  // Local state
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<NutrientStatus[]>([]);

  // Detail sheet state
  const [selectedNutrient, setSelectedNutrient] = useState<NutrientDefinition | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Target editor state
  const [editingNutrient, setEditingNutrient] = useState<NutrientDefinition | null>(null);
  const [targetEditorVisible, setTargetEditorVisible] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadProfile();
    loadDailyIntake(selectedDate);
  }, []);

  // Handle date change
  const handleDateSelect = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    loadDailyIntake(dateStr);
  }, [loadDailyIntake]);

  // Visible nutrients based on premium status
  const visibleNutrients = useMemo(() => {
    return isPremium ? ALL_NUTRIENTS : ALL_NUTRIENTS;
  }, [isPremium]);

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

  // Nutrient bar press → open detail sheet
  const handleNutrientPress = useCallback((def: NutrientDefinition) => {
    if (!isPremium && def.isPremium) return; // Let LockedContentArea handle
    setSelectedNutrient(def);
    setSheetVisible(true);
  }, [isPremium]);

  // Detail sheet → edit target
  const handleEditTarget = useCallback(() => {
    if (selectedNutrient) {
      setEditingNutrient(selectedNutrient);
      setTargetEditorVisible(true);
    }
  }, [selectedNutrient]);

  // Close detail sheet
  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
    setSelectedNutrient(null);
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
      </View>

      {/* Date Picker */}
      <ThemedDatePicker
        visible={showDatePicker}
        value={new Date(selectedDate + 'T12:00:00')}
        onSelect={handleDateSelect}
        onClose={() => setShowDatePicker(false)}
        maximumDate={new Date()}
      />

      {isLoading && !dailyIntake ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : !hasData ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="nutrition-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No nutrition data for this day
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Log some food to see your micronutrients
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Overview */}
          <StatusOverviewCard
            counts={statusCounts}
            onStatusPress={handleStatusPress}
          />

          {/* Filter Chips */}
          <StatusFilterChips
            selectedStatuses={selectedStatuses}
            onToggle={handleFilterToggle}
          />

          {/* Nutrient sections */}
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

      {/* Detail Bottom Sheet */}
      {sheetVisible && selectedNutrient && (
        <NutrientDetailSheet
          nutrient={selectedNutrient}
          intake={selectedNutrientIntake}
          target={selectedNutrientTarget}
          date={selectedDate}
          onClose={handleCloseSheet}
          onEditTarget={handleEditTarget}
        />
      )}

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
      status={item.intake?.status ?? 'adequate'}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[16],
    gap: spacing[3],
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
