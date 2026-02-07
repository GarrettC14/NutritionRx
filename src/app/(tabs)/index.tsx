import { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_ORDER } from '@/constants/mealTypes';
import { useFoodLogStore, useSettingsStore, useWaterStore, useMacroCycleStore, useDashboardStore, useOnboardingStore } from '@/stores';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useProgressiveTooltips } from '@/hooks/useProgressiveTooltips';
import { MealSection } from '@/components/food/MealSection';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { TodayScreenSkeleton } from '@/components/ui/Skeleton';
import { WidgetRenderer } from '@/components/dashboard/WidgetRenderer';
import { WidgetPickerModal } from '@/components/dashboard/WidgetPickerModal';
import { FirstFoodCelebration } from '@/components/onboarding/FirstFoodCelebration';
import { LogEntry, QuickAddEntry } from '@/types/domain';
import { DashboardWidget } from '@/types/dashboard';
import { DayTargets } from '@/types/planning';
import { TestIDs } from '@/constants/testIDs';

export default function TodayScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // Stores
  const {
    selectedDate,
    setSelectedDate,
    entries,
    quickAddEntries,
    dailyTotals,
    streak,
    isLoaded: dataLoaded,
    loadEntriesForDate,
    loadStreak,
    deleteLogEntry,
    deleteQuickEntry,
    getEntriesByMeal,
    getQuickEntriesByMeal,
    copyMealToDate,
    copyDayToDate,
  } = useFoodLogStore();

  const { settings, loadSettings, isLoaded: settingsLoaded } = useSettingsStore();
  const { firstFoodLoggedAt } = useOnboardingStore();
  const { loadTodayWater, loadWaterSettings, isLoaded: waterLoaded } = useWaterStore();
  const {
    config: macroCycleConfig,
    loadConfig: loadMacroCycleConfig,
    getDayType,
    isLoaded: macroCycleLoaded,
  } = useMacroCycleStore();

  const {
    widgets,
    isEditMode,
    setEditMode,
    reorderWidgets,
    resetToDefaults,
  } = useDashboardStore();
  const { showConfirm } = useConfirmDialog();

  // State
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [listKey, setListKey] = useState(0);

  // Progressive tooltips — auto-check after dashboard settles
  useProgressiveTooltips({ autoCheck: true, autoCheckDelay: 1000 });

  // Get visible widgets sorted by position
  const visibleWidgets = widgets
    .filter((w) => w.isVisible)
    .sort((a, b) => a.position - b.position);

  // Show skeleton until data, settings, water, and macro cycle are loaded
  const isReady = dataLoaded && settingsLoaded && waterLoaded && macroCycleLoaded;

  // Load data on mount
  useEffect(() => {
    loadSettings();
    loadEntriesForDate(selectedDate);
    loadStreak();
    loadWaterSettings();
    loadTodayWater();
    loadMacroCycleConfig();
  }, []);

  // Show first food celebration when firstFoodLoggedAt transitions to a recent value
  useEffect(() => {
    if (firstFoodLoggedAt) {
      const ageMs = Date.now() - new Date(firstFoodLoggedAt).getTime();
      if (ageMs < 5000) {
        setShowCelebration(true);
      }
    }
  }, [firstFoodLoggedAt]);

  // Date navigation
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    const newDate = current.toISOString().split('T')[0];
    setSelectedDate(newDate);
  }, [selectedDate, setSelectedDate]);

  const goToToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, [setSelectedDate]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format date for modal title
  const formatDateShort = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Get entries by meal
  const entriesByMeal = getEntriesByMeal();
  const quickEntriesByMeal = getQuickEntriesByMeal();

  // Get day type for macro cycling badge
  const selectedDayOfWeek = new Date(selectedDate + 'T12:00:00').getDay();
  const dayType = macroCycleConfig?.enabled ? getDayType(selectedDayOfWeek) : null;

  // Day type display info
  const getDayTypeDisplay = () => {
    if (!dayType) return null;
    switch (dayType) {
      case 'training':
        return { label: 'Training Day', icon: 'barbell-outline' as const };
      case 'rest':
        return { label: 'Rest Day', icon: 'leaf-outline' as const };
      case 'high_carb':
        return { label: 'High Carb', icon: 'trending-up-outline' as const };
      case 'low_carb':
        return { label: 'Low Carb', icon: 'trending-down-outline' as const };
      case 'custom':
        return { label: 'Custom', icon: 'settings-outline' as const };
      default:
        return null;
    }
  };

  const dayTypeDisplay = getDayTypeDisplay();

  // Handlers
  const handleAddFood = (mealType: MealType) => {
    router.push({
      pathname: '/add-food',
      params: { mealType, date: selectedDate },
    });
  };

  const handleEntryPress = (entry: LogEntry) => {
    router.push({
      pathname: '/log-entry/[id]',
      params: { id: entry.id },
    });
  };

  const handleQuickAddPress = (entry: QuickAddEntry) => {
    router.push({
      pathname: '/log-entry/[id]',
      params: { id: entry.id },
    });
  };

  const handleDeleteEntry = async (entry: LogEntry) => {
    await deleteLogEntry(entry.id);
  };

  const handleDeleteQuickAdd = async (entry: QuickAddEntry) => {
    await deleteQuickEntry(entry.id);
  };

  const handleCopyMeal = async (mealType: MealType) => {
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      await copyMealToDate(mealType, tomorrowStr);
      Alert.alert('Copied', `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} copied to tomorrow.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy meal. Please try again.');
    }
  };

  const handleCopyDay = async () => {
    setShowDayMenu(false);
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      await copyDayToDate(selectedDate, tomorrowStr);
      Alert.alert('Copied', 'All meals copied to tomorrow.');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy day. Please try again.');
    }
  };

  // Drag and drop handlers
  const handleDragBegin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleDragEnd = useCallback(({ data }: { data: DashboardWidget[] }) => {
    const orderedIds = data.map(w => w.id);
    reorderWidgets(orderedIds);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [reorderWidgets]);

  const handleLongPress = useCallback(() => {
    if (!isEditMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setEditMode(true);
    }
  }, [isEditMode, setEditMode]);

  const handleRestoreDefaults = useCallback(() => {
    showConfirm({
      title: 'Restore Default Layout',
      message: 'This will reset your dashboard to the default widget layout. Your data will not be affected.',
      icon: 'refresh-outline',
      confirmLabel: 'Restore',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        resetToDefaults();
        // Increment key to remount list without animation
        setListKey(k => k + 1);
      },
    });
  }, [resetToDefaults, showConfirm]);

  // Render widget item
  const renderWidget = useCallback(({ item, drag, isActive }: RenderItemParams<DashboardWidget>) => {
    // When not in edit mode, allow long press to enter edit mode
    // When in edit mode, drag is handled by the drag handle inside WidgetRenderer
    if (!isEditMode) {
      return (
        <ScaleDecorator activeScale={0.95}>
          <TouchableOpacity
            onLongPress={handleLongPress}
            delayLongPress={300}
            activeOpacity={1}
          >
            <WidgetRenderer
              widget={item}
              isEditMode={isEditMode}
              drag={drag}
              isActive={isActive}
            />
          </TouchableOpacity>
        </ScaleDecorator>
      );
    }

    return (
      <ScaleDecorator activeScale={0.95}>
        <WidgetRenderer
          widget={item}
          isEditMode={isEditMode}
          drag={drag}
          isActive={isActive}
        />
      </ScaleDecorator>
    );
  }, [isEditMode, handleLongPress]);

  const hasEntries = entries.length > 0 || quickAddEntries.length > 0;

  // Show skeleton while loading
  if (!isReady) {
    return (
      <SafeAreaView testID={TestIDs.Home.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <TodayScreenSkeleton />
      </SafeAreaView>
    );
  }

  // Header component for the list
  const ListHeader = () => (
    <>
      {/* Date Header */}
      <View style={styles.header}>
        {/* Row 1: Navigation arrows + Date */}
        <View style={styles.dateRow}>
          <Pressable
            testID={TestIDs.Home.DatePrevButton}
            style={styles.navButton}
            onPress={() => navigateDate('prev')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </Pressable>
          <Pressable onLongPress={goToToday} style={styles.dateContainer}>
            <Text testID={TestIDs.Home.DateLabel} style={[styles.dateText, { color: colors.textPrimary }]}>
              {formatDate(selectedDate)}
            </Text>
          </Pressable>
          <Pressable
            testID={TestIDs.Home.DateNextButton}
            style={styles.navButton}
            onPress={() => navigateDate('next')}
            disabled={isToday}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isToday ? colors.textTertiary : colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Row 2: Day type badge and/or Streak badge (centered) */}
        {(dayTypeDisplay || streak > 0) && (
          <View style={styles.badgesRow}>
            {dayTypeDisplay && (
              <View style={[styles.dayTypeBadge, { backgroundColor: colors.bgSecondary }]}>
                <Ionicons name={dayTypeDisplay.icon} size={14} color={colors.accent} />
                <Text style={[styles.dayTypeBadgeText, { color: colors.textSecondary }]}>
                  {dayTypeDisplay.label}
                </Text>
              </View>
            )}
            {streak > 0 && <StreakBadge streakDays={streak} />}
          </View>
        )}

        {/* Day menu button - shown when there are entries */}
        {hasEntries && !isEditMode && (
          <Pressable
            testID={TestIDs.Home.DayMenuButton}
            style={styles.dayMenuButton}
            onPress={() => setShowDayMenu(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <View style={[styles.editBanner, { backgroundColor: `${colors.accent}15` }]}>
          <Ionicons name="information-circle" size={18} color={colors.accent} />
          <Text style={[styles.editBannerText, { color: colors.textSecondary }]}>
            Long press and drag to reorder. Tap × to remove.
          </Text>
        </View>
      )}
    </>
  );

  // Footer component with meal sections
  const ListFooter = () => (
    <View style={styles.mealsContainer}>
      {MEAL_TYPE_ORDER.map((mealType) => (
        <MealSection
          key={mealType}
          mealType={mealType}
          entries={entriesByMeal[mealType]}
          quickAddEntries={quickEntriesByMeal[mealType]}
          onAddPress={handleAddFood}
          onEntryPress={handleEntryPress}
          onQuickAddPress={handleQuickAddPress}
          onDeleteEntry={handleDeleteEntry}
          onDeleteQuickAdd={handleDeleteQuickAdd}
          onCopyMeal={handleCopyMeal}
        />
      ))}
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView testID={TestIDs.Home.Screen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        {/* Dashboard Header */}
        <View style={styles.dashboardHeader}>
          <Text style={[styles.dashboardTitle, { color: colors.textPrimary }]}>Dashboard</Text>
          <View style={styles.dashboardHeaderActions}>
            {isEditMode && (
              <TouchableOpacity
                testID={TestIDs.Home.RestoreButton}
                onPress={handleRestoreDefaults}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.restoreButton, { color: colors.textSecondary }]}>
                  Restore
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              testID={TestIDs.Home.EditButton}
              onPress={() => setEditMode(!isEditMode)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.editButton, { color: colors.accent }]}>
                {isEditMode ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Widget List with Drag-and-Drop */}
        <DraggableFlatList
          key={listKey}
          data={visibleWidgets}
          extraData={[isEditMode, widgets]}
          keyExtractor={(item) => item.id}
          renderItem={renderWidget}
          onDragBegin={handleDragBegin}
          onDragEnd={handleDragEnd}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={isEditMode ? undefined : ListFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          activationDistance={isEditMode ? 15 : 20}
        />

        {/* Floating Add Widget Button (Edit Mode only) */}
        {isEditMode && (
          <TouchableOpacity
            testID={TestIDs.Home.AddWidgetButton}
            style={[styles.addWidgetButton, { backgroundColor: colors.accent }]}
            onPress={() => setShowWidgetPicker(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addWidgetButtonText}>Add Widget</Text>
          </TouchableOpacity>
        )}

        {/* Widget Picker Modal */}
        <WidgetPickerModal
          visible={showWidgetPicker}
          onClose={() => setShowWidgetPicker(false)}
        />

        {/* Day Menu Modal */}
        <Modal
          visible={showDayMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDayMenu(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDayMenu(false)}
          >
            <View style={[styles.menuContainer, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                {formatDateShort(selectedDate)}
              </Text>
              <Pressable
                style={styles.menuItem}
                onPress={handleCopyDay}
              >
                <Ionicons name="copy-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                  Copy All Meals to Tomorrow
                </Text>
              </Pressable>
              <Pressable
                style={styles.menuItem}
                onPress={() => setShowDayMenu(false)}
              >
                <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* First Food Celebration */}
        <FirstFoodCelebration
          visible={showCelebration}
          onDismiss={() => setShowCelebration(false)}
          caloriesLogged={dailyTotals.calories}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
  },
  dashboardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  dashboardTitle: {
    ...typography.display.medium,
  },
  restoreButton: {
    ...typography.body.large,
    fontWeight: '500',
  },
  editButton: {
    ...typography.body.large,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[1],
    paddingBottom: spacing[2],
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateContainer: {
    paddingHorizontal: spacing[2],
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    ...typography.title.medium,
    textAlign: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  dayTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  dayTypeBadgeText: {
    ...typography.caption,
  },
  dayMenuButton: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    marginTop: spacing[1],
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginHorizontal: componentSpacing.screenEdgePadding,
    marginBottom: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  editBannerText: {
    flex: 1,
    ...typography.body.small,
  },
  listContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: 120,
  },
  mealsContainer: {
    gap: spacing[3],
    marginTop: spacing[4],
  },
  addWidgetButton: {
    position: 'absolute',
    bottom: 32,
    left: componentSpacing.screenEdgePadding,
    right: componentSpacing.screenEdgePadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  addWidgetButtonText: {
    ...typography.body.large,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '80%',
    maxWidth: 320,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  menuTitle: {
    ...typography.title.small,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
  },
  menuItemText: {
    ...typography.body.medium,
  },
});
