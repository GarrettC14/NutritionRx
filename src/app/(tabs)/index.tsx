import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import BottomSheet from '@gorhom/bottom-sheet';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { MealType, MEAL_TYPE_ORDER, MEAL_TYPE_LABELS } from '@/constants/mealTypes';
import { useFoodLogStore, useSettingsStore, useWaterStore, useMacroCycleStore, useDashboardStore, useReflectionStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useProgressiveTooltips } from '@/hooks/useProgressiveTooltips';
import { useTooltip } from '@/hooks/useTooltip';
import { TOOLTIP_IDS } from '@/constants/tooltipIds';
import { MealSection } from '@/components/food/MealSection';
import { MealBlockBottomSheet } from '@/components/food/MealBlockBottomSheet';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { Toast, useToast } from '@/components/ui/Toast';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { TodayScreenSkeleton } from '@/components/ui/Skeleton';
import { WidgetRenderer } from '@/components/dashboard/WidgetRenderer';
import { WidgetPickerModal } from '@/components/dashboard/WidgetPickerModal';

import { ReflectionBanner } from '@/components/reflection/ReflectionBanner';
import { ReflectionModal } from '@/components/reflection/ReflectionModal';
import { LogEntry, QuickAddEntry } from '@/types/domain';
import { DashboardWidget } from '@/types/dashboard';
import { DayTargets } from '@/types/planning';
import { TestIDs } from '@/constants/testIDs';
import * as Sentry from '@sentry/react-native';
import { CrashFallbackScreen } from '@/components/CrashFallbackScreen';

function TodayScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // Stores — useShallow prevents re-renders from unrelated state changes
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
  } = useFoodLogStore(useShallow((s) => ({
    selectedDate: s.selectedDate,
    setSelectedDate: s.setSelectedDate,
    entries: s.entries,
    quickAddEntries: s.quickAddEntries,
    dailyTotals: s.dailyTotals,
    streak: s.streak,
    isLoaded: s.isLoaded,
    loadEntriesForDate: s.loadEntriesForDate,
    loadStreak: s.loadStreak,
    deleteLogEntry: s.deleteLogEntry,
    deleteQuickEntry: s.deleteQuickEntry,
    getEntriesByMeal: s.getEntriesByMeal,
    getQuickEntriesByMeal: s.getQuickEntriesByMeal,
    copyMealToDate: s.copyMealToDate,
    copyDayToDate: s.copyDayToDate,
  })));

  const { settings, loadSettings, isLoaded: settingsLoaded } = useSettingsStore(useShallow((s) => ({
    settings: s.settings,
    loadSettings: s.loadSettings,
    isLoaded: s.isLoaded,
  })));

  const { loadTodayWater, loadWaterSettings, isLoaded: waterLoaded } = useWaterStore(useShallow((s) => ({
    loadTodayWater: s.loadTodayWater,
    loadWaterSettings: s.loadWaterSettings,
    isLoaded: s.isLoaded,
  })));
  const {
    config: macroCycleConfig,
    loadConfig: loadMacroCycleConfig,
    getDayType,
    isLoaded: macroCycleLoaded,
  } = useMacroCycleStore(useShallow((s) => ({
    config: s.config,
    loadConfig: s.loadConfig,
    getDayType: s.getDayType,
    isLoaded: s.isLoaded,
  })));

  const {
    widgets,
    isEditMode,
    setEditMode,
    reorderWidgets,
    resetToDefaults,
  } = useDashboardStore(useShallow((s) => ({
    widgets: s.widgets,
    isEditMode: s.isEditMode,
    setEditMode: s.setEditMode,
    reorderWidgets: s.reorderWidgets,
    resetToDefaults: s.resetToDefaults,
  })));
  const { showConfirm } = useConfirmDialog();

  // Reflection store
  const {
    shouldShowBanner,
    daysSinceLastReflection,
    bannerDismissCount,
    isReflecting,
    isInitialized: reflectionInitialized,
    initialize: initializeReflection,
    dismissBanner,
    startReflection,
    cancelReflection,
  } = useReflectionStore(useShallow((s) => ({
    shouldShowBanner: s.shouldShowBanner,
    daysSinceLastReflection: s.daysSinceLastReflection,
    bannerDismissCount: s.bannerDismissCount,
    isReflecting: s.isReflecting,
    isInitialized: s.isInitialized,
    initialize: s.initialize,
    dismissBanner: s.dismissBanner,
    startReflection: s.startReflection,
    cancelReflection: s.cancelReflection,
  })));

  // State
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [listKey, setListKey] = useState(0);

  // Bottom sheet state for meal block menu
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [activeMenuMealType, setActiveMenuMealType] = useState<MealType>(MealType.Breakfast);

  // Date picker state for copy flows
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'meal' | 'day'>('meal');
  const [copySourceMealType, setCopySourceMealType] = useState<MealType>(MealType.Breakfast);

  // Toast
  const { toastState, showCopied, hideToast } = useToast();

  // Progressive tooltips — auto-check after dashboard settles
  useProgressiveTooltips({ autoCheck: true, autoCheckDelay: 1000 });
  const { markSeen } = useTooltip();

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
    initializeReflection();
  }, []);


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

  // Memoize entries by meal — only recompute when entries actually change
  const entriesByMeal = useMemo(() => getEntriesByMeal(), [entries]);
  const quickEntriesByMeal = useMemo(() => getQuickEntriesByMeal(), [quickAddEntries]);

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
      case 'even':
        return null;
      default:
        return null;
    }
  };

  const dayTypeDisplay = getDayTypeDisplay();

  // Entry count for active menu meal type
  const activeMenuEntryCount = useMemo(() => {
    const mealEntries = entriesByMeal[activeMenuMealType] || [];
    const mealQuickEntries = quickEntriesByMeal[activeMenuMealType] || [];
    return mealEntries.length + mealQuickEntries.length;
  }, [activeMenuMealType, entriesByMeal, quickEntriesByMeal]);

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

  // ⋮ Menu press — open bottom sheet
  const handleMenuPress = useCallback((mealType: MealType) => {
    setActiveMenuMealType(mealType);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  // Bottom sheet menu actions
  const handleQuickAdd = useCallback(() => {
    router.push({
      pathname: '/add-food/quick',
      params: { mealType: activeMenuMealType, date: selectedDate },
    });
  }, [activeMenuMealType, selectedDate, router]);

  const handleAddAlcohol = useCallback(() => {
    router.push({
      pathname: '/add-food/alcohol',
      params: { mealType: activeMenuMealType, date: selectedDate },
    });
  }, [activeMenuMealType, selectedDate, router]);

  const handleSaveAsRecipe = useCallback(() => {
    router.push({
      pathname: '/recipes/create',
      params: { mealType: activeMenuMealType, date: selectedDate },
    });
  }, [activeMenuMealType, selectedDate, router]);

  const handleCopyMealFromMenu = useCallback(() => {
    setCopySourceMealType(activeMenuMealType);
    setDatePickerMode('meal');
    // Delay opening date picker to let bottom sheet close
    setTimeout(() => {
      setShowDatePicker(true);
    }, 300);
  }, [activeMenuMealType]);

  const handleClearMeal = useCallback(async () => {
    const mealEntries = entriesByMeal[activeMenuMealType] || [];
    const mealQuickEntries = quickEntriesByMeal[activeMenuMealType] || [];

    try {
      for (const entry of mealEntries) {
        await deleteLogEntry(entry.id);
      }
      for (const entry of mealQuickEntries) {
        await deleteQuickEntry(entry.id);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to clear meal. Please try again.');
    }
  }, [activeMenuMealType, entriesByMeal, quickEntriesByMeal, deleteLogEntry, deleteQuickEntry]);

  // Copy Meal to selected date (from date picker)
  const handleCopyMealToDate = useCallback(async (targetDate: Date) => {
    setShowDatePicker(false);
    const targetStr = targetDate.toISOString().split('T')[0];

    try {
      await copyMealToDate(copySourceMealType, targetStr);
      const mealEntries = entriesByMeal[copySourceMealType] || [];
      const mealQuickEntries = quickEntriesByMeal[copySourceMealType] || [];
      const count = mealEntries.length + mealQuickEntries.length;

      const formattedDate = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const mealLabel = MEAL_TYPE_LABELS[copySourceMealType];
      showCopied('Meal Copied', `${count} ${count === 1 ? 'item' : 'items'} added to ${mealLabel} on ${formattedDate}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy meal. Please try again.');
    }
  }, [copySourceMealType, copyMealToDate, entriesByMeal, quickEntriesByMeal, showCopied]);

  // Day-level copy
  const handleCopyDay = useCallback(() => {
    setShowDayMenu(false);
    setDatePickerMode('day');
    // Delay to let menu close
    setTimeout(() => {
      setShowDatePicker(true);
    }, 300);
  }, []);

  const handleCopyDayToDate = useCallback(async (targetDate: Date) => {
    setShowDatePicker(false);
    const targetStr = targetDate.toISOString().split('T')[0];

    try {
      await copyDayToDate(selectedDate, targetStr);
      const totalCount = entries.length + quickAddEntries.length;
      const formattedDate = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      showCopied('Day Copied', `${totalCount} ${totalCount === 1 ? 'item' : 'items'} copied to ${formattedDate}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy day. Please try again.');
    }
  }, [selectedDate, copyDayToDate, entries, quickAddEntries, showCopied]);

  // Unified date picker confirm handler
  const handleDatePickerConfirm = useCallback((date: Date) => {
    if (datePickerMode === 'meal') {
      handleCopyMealToDate(date);
    } else {
      handleCopyDayToDate(date);
    }
  }, [datePickerMode, handleCopyMealToDate, handleCopyDayToDate]);

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

      {/* Reflection Banner */}
      {shouldShowBanner && isToday && !isEditMode && (
        <ReflectionBanner
          daysSinceLastReflection={daysSinceLastReflection}
          hasCompletedFirstReflection={daysSinceLastReflection != null}
          onStartReflection={() => {
            startReflection();
            setShowReflectionModal(true);
          }}
          onDismiss={dismissBanner}
          dismissCount={bannerDismissCount}
        />
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
          onMenuPress={handleMenuPress}
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
            {isEditMode ? (
              <TouchableOpacity
                testID={TestIDs.Home.EditButton}
                onPress={() => setEditMode(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.editButton, { color: colors.accent }]}>
                  Done
                </Text>
              </TouchableOpacity>
            ) : (
              <Pressable
                testID={TestIDs.Home.EditButton}
                onPress={() => {
                  markSeen(TOOLTIP_IDS.DASHBOARD_CUSTOMIZE);
                  setEditMode(true);
                }}
                style={({ pressed }) => [
                  styles.editButtonContainer,
                  pressed && styles.editButtonPressed,
                ]}
                accessibilityLabel="Edit dashboard layout"
                accessibilityRole="button"
                accessibilityHint="Activates edit mode to reorder, add, or remove dashboard widgets"
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={colors.accent}
                  importantForAccessibility="no"
                  accessibilityElementsHidden={true}
                />
                <Text style={[styles.editButtonText, { color: colors.accent }]}>
                  Edit
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Widget List with Drag-and-Drop */}
        <DraggableFlatList
          key={listKey}
          data={visibleWidgets}
          extraData={isEditMode}
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
          animationType="none"
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
                  Copy Day...
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

        {/* Meal Block Bottom Sheet */}
        <MealBlockBottomSheet
          mealType={activeMenuMealType}
          date={selectedDate}
          entryCount={activeMenuEntryCount}
          bottomSheetRef={bottomSheetRef}
          onQuickAdd={handleQuickAdd}
          onAddAlcohol={handleAddAlcohol}
          onSaveAsRecipe={handleSaveAsRecipe}
          onCopyMeal={handleCopyMealFromMenu}
          onClearMeal={handleClearMeal}
        />

        {/* Date Picker Modal for Copy flows */}
        <DatePickerModal
          visible={showDatePicker}
          title={datePickerMode === 'meal' ? `Copy ${MEAL_TYPE_LABELS[copySourceMealType]} to...` : 'Copy Day to...'}
          disabledDate={selectedDate}
          onConfirm={handleDatePickerConfirm}
          onCancel={() => setShowDatePicker(false)}
        />

        {/* Reflection Modal */}
        <ReflectionModal
          visible={showReflectionModal}
          onClose={() => setShowReflectionModal(false)}
        />

        {/* Toast */}
        <Toast
          visible={toastState.visible}
          type={toastState.type}
          title={toastState.title}
          subtitle={toastState.subtitle}
          onDismiss={hideToast}
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
  editButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  editButtonPressed: {
    opacity: 0.7,
  },
  editButtonText: {
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

export default function TodayScreenWithErrorBoundary() {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <CrashFallbackScreen resetError={resetError} />}>
      <TodayScreen />
    </Sentry.ErrorBoundary>
  );
}
