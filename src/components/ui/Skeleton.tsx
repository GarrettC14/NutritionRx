import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { borderRadius as br } from '@/constants/spacing';

interface SkeletonBoxProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width, height, borderRadius = br.md, style }: SkeletonBoxProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shimmer = useSharedValue(reducedMotion ? 0.5 : 0);

  useEffect(() => {
    if (!reducedMotion) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
    }
  }, [reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.5 : interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  const baseColor = isDark ? colors.bgSecondary : colors.borderDefault;

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

interface SkeletonCircleProps {
  size: number;
  style?: ViewStyle;
}

export function SkeletonCircle({ size, style }: SkeletonCircleProps) {
  return <SkeletonBox width={size} height={size} borderRadius={size / 2} style={style} />;
}

// Skeleton for the calorie ring
export function CalorieRingSkeleton({ size = 220 }: { size?: number }) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shimmer = useSharedValue(reducedMotion ? 0.5 : 0);

  useEffect(() => {
    if (!reducedMotion) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
    }
  }, [reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.5 : interpolate(shimmer.value, [0, 1], [0.3, 0.6]),
  }));

  const baseColor = isDark ? colors.bgSecondary : colors.borderDefault;

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 14,
            borderColor: baseColor,
          },
          animatedStyle,
        ]}
      />
      <View style={styles.ringCenter}>
        <SkeletonBox width={80} height={32} style={{ marginBottom: 4 }} />
        <SkeletonBox width={50} height={16} />
      </View>
    </View>
  );
}

// Skeleton for meal sections
export function MealSectionSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.mealSection, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
      <View style={styles.mealHeader}>
        <View style={styles.mealHeaderLeft}>
          <SkeletonBox width={18} height={18} borderRadius={4} />
          <SkeletonBox width={80} height={20} />
        </View>
        <View style={styles.mealHeaderRight}>
          <SkeletonBox width={50} height={18} />
          <SkeletonCircle size={28} />
        </View>
      </View>
    </View>
  );
}

// Skeleton for macro summary
export function MacroSummarySkeleton() {
  return (
    <View style={styles.macroContainer}>
      <View style={styles.macroRow}>
        <MacroItemSkeleton />
        <MacroItemSkeleton />
        <MacroItemSkeleton />
      </View>
    </View>
  );
}

function MacroItemSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.macroItem, { backgroundColor: colors.bgSecondary }]}>
      <SkeletonBox width={40} height={14} style={{ marginBottom: 4 }} />
      <SkeletonBox width={60} height={6} borderRadius={3} style={{ marginBottom: 4 }} />
      <SkeletonBox width={50} height={12} />
    </View>
  );
}

// Progress screen skeleton
export function ProgressScreenSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header skeleton */}
      <View style={styles.progressHeader}>
        <SkeletonBox width={140} height={32} />
        <SkeletonBox width={90} height={36} borderRadius={br.md} />
      </View>

      {/* Weight section skeleton */}
      <View style={[styles.progressSection, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.progressSectionHeader}>
          <SkeletonBox width={80} height={24} />
          <View style={styles.timeRangeRow}>
            <SkeletonBox width={32} height={24} borderRadius={br.sm} />
            <SkeletonBox width={36} height={24} borderRadius={br.sm} />
            <SkeletonBox width={36} height={24} borderRadius={br.sm} />
            <SkeletonBox width={32} height={24} borderRadius={br.sm} />
          </View>
        </View>
        <SkeletonBox width={'100%'} height={200} style={{ marginTop: 12 }} />
      </View>

      {/* Calories section skeleton */}
      <View style={[styles.progressSection, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.progressSectionHeader}>
          <SkeletonBox width={80} height={24} />
        </View>
        <SkeletonBox width={'100%'} height={200} style={{ marginTop: 12 }} />
      </View>

      {/* Insights section skeleton */}
      <View style={[styles.progressSection, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.progressSectionHeader}>
          <SkeletonBox width={80} height={24} />
        </View>
        <View style={styles.insightsRow}>
          <InsightCardSkeleton />
          <InsightCardSkeleton />
        </View>
      </View>
    </View>
  );
}

function InsightCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.insightCardSkeleton, { backgroundColor: colors.bgPrimary }]}>
      <SkeletonCircle size={24} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width={60} height={12} />
        <SkeletonBox width={50} height={20} />
        <SkeletonBox width={80} height={12} />
      </View>
    </View>
  );
}

// Settings screen skeleton
export function SettingsScreenSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header skeleton */}
      <View style={styles.settingsHeader}>
        <SkeletonBox width={100} height={32} />
      </View>

      {/* Goals section */}
      <View style={styles.settingsSection}>
        <SkeletonBox width={60} height={12} style={{ marginBottom: 8, marginLeft: 8 }} />
        <View style={[styles.settingsGroup, { backgroundColor: colors.bgSecondary }]}>
          <SettingsItemSkeleton />
          <SettingsItemSkeleton />
          <SettingsItemSkeleton />
        </View>
      </View>

      {/* Preferences section */}
      <View style={styles.settingsSection}>
        <SkeletonBox width={100} height={12} style={{ marginBottom: 8, marginLeft: 8 }} />
        <View style={[styles.settingsGroup, { backgroundColor: colors.bgSecondary }]}>
          <SettingsItemSkeleton />
          <SettingsItemSkeleton hasToggle />
        </View>
      </View>

      {/* Data section */}
      <View style={styles.settingsSection}>
        <SkeletonBox width={40} height={12} style={{ marginBottom: 8, marginLeft: 8 }} />
        <View style={[styles.settingsGroup, { backgroundColor: colors.bgSecondary }]}>
          <SettingsItemSkeleton />
          <SettingsItemSkeleton />
        </View>
      </View>
    </View>
  );
}

function SettingsItemSkeleton({ hasToggle = false }: { hasToggle?: boolean }) {
  const { colors } = useTheme();

  return (
    <View style={styles.settingsItemSkeleton}>
      <SkeletonBox width={36} height={36} borderRadius={br.md} />
      <View style={{ flex: 1, gap: 4 }}>
        <SkeletonBox width={100} height={18} />
        <SkeletonBox width={140} height={14} />
      </View>
      {hasToggle ? (
        <SkeletonBox width={80} height={32} borderRadius={br.md} />
      ) : (
        <SkeletonCircle size={20} />
      )}
    </View>
  );
}

// Full Today screen skeleton
export function TodayScreenSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <SkeletonCircle size={44} />
          <SkeletonBox width={180} height={24} />
          <SkeletonCircle size={44} />
        </View>
        <View style={styles.streakRow}>
          <SkeletonBox width={100} height={24} borderRadius={br.full} />
        </View>
      </View>

      {/* Calorie ring */}
      <View style={styles.ringWrapper}>
        <CalorieRingSkeleton />
      </View>

      {/* Macro summary */}
      <MacroSummarySkeleton />

      {/* Meal sections */}
      <View style={styles.mealsContainer}>
        <MealSectionSkeleton />
        <MealSectionSkeleton />
        <MealSectionSkeleton />
        <MealSectionSkeleton />
      </View>
    </View>
  );
}

// Food search skeleton
export function FoodSearchSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.foodSearchContainer, { backgroundColor: colors.bgPrimary }]}>
      {/* Header skeleton */}
      <View style={styles.foodSearchHeader}>
        <SkeletonBox width={120} height={32} />
      </View>

      {/* Search bar skeleton */}
      <View style={styles.searchHeader}>
        <View style={[styles.searchBar, { backgroundColor: colors.bgSecondary }]}>
          <SkeletonCircle size={20} />
          <SkeletonBox width={'70%' as any} height={20} />
        </View>
        <SkeletonBox width={48} height={48} borderRadius={br.md} />
      </View>

      {/* Results skeleton */}
      <View style={styles.searchResults}>
        <SkeletonBox width={120} height={14} style={{ marginBottom: 12 }} />
        <FoodItemSkeleton />
        <FoodItemSkeleton />
        <FoodItemSkeleton />
        <FoodItemSkeleton />
      </View>

      {/* Bottom actions skeleton */}
      <View style={[styles.bottomActions, { borderTopColor: colors.borderDefault }]}>
        <View style={[styles.actionButton, { backgroundColor: colors.bgSecondary }]}>
          <SkeletonCircle size={20} />
          <SkeletonBox width={80} height={18} />
        </View>
        <View style={[styles.actionButton, { backgroundColor: colors.bgSecondary }]}>
          <SkeletonCircle size={20} />
          <SkeletonBox width={80} height={18} />
        </View>
      </View>
    </View>
  );
}

function FoodItemSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.foodItem, { backgroundColor: colors.bgSecondary }]}>
      <View style={styles.foodItemLeft}>
        <SkeletonBox width={140} height={18} style={{ marginBottom: 4 }} />
        <SkeletonBox width={80} height={14} />
      </View>
      <SkeletonBox width={60} height={16} />
    </View>
  );
}

// Restaurant list screen skeleton
export function RestaurantListSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header skeleton */}
      <View style={styles.restaurantListHeader}>
        <SkeletonCircle size={24} />
        <SkeletonBox width={120} height={28} />
      </View>

      {/* Search bar skeleton */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.bgSecondary }]}>
          <SkeletonCircle size={20} />
          <SkeletonBox width={'70%' as any} height={20} />
        </View>
      </View>

      {/* Recent section skeleton */}
      <View style={styles.restaurantSection}>
        <SkeletonBox width={100} height={14} style={{ marginBottom: 12 }} />
        <RestaurantCardSkeleton />
        <RestaurantCardSkeleton />
      </View>

      {/* All restaurants skeleton */}
      <View style={styles.restaurantSection}>
        <SkeletonBox width={120} height={14} style={{ marginBottom: 12 }} />
        <RestaurantCardSkeleton />
        <RestaurantCardSkeleton />
        <RestaurantCardSkeleton />
        <RestaurantCardSkeleton />
      </View>
    </View>
  );
}

function RestaurantCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.restaurantCard, { backgroundColor: colors.bgSecondary }]}>
      <SkeletonBox width={48} height={48} borderRadius={br.sm} />
      <View style={styles.restaurantCardContent}>
        <SkeletonBox width={140} height={18} style={{ marginBottom: 6 }} />
        <View style={styles.restaurantCardDetails}>
          <SkeletonBox width={60} height={12} />
          <SkeletonBox width={70} height={12} />
        </View>
      </View>
      <SkeletonCircle size={20} />
    </View>
  );
}

// Restaurant menu screen skeleton
export function RestaurantMenuSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header skeleton */}
      <View style={styles.restaurantMenuHeader}>
        <SkeletonCircle size={24} />
        <SkeletonBox width={40} height={40} borderRadius={br.sm} />
        <View style={{ flex: 1 }}>
          <SkeletonBox width={140} height={24} style={{ marginBottom: 4 }} />
          <SkeletonBox width={60} height={14} />
        </View>
      </View>

      {/* Search bar skeleton */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.bgSecondary }]}>
          <SkeletonCircle size={20} />
          <SkeletonBox width={'70%' as any} height={20} />
        </View>
      </View>

      {/* Category chips skeleton */}
      <View style={styles.categoryChipsContainer}>
        <SkeletonBox width={50} height={32} borderRadius={br.full} />
        <SkeletonBox width={80} height={32} borderRadius={br.full} />
        <SkeletonBox width={70} height={32} borderRadius={br.full} />
        <SkeletonBox width={60} height={32} borderRadius={br.full} />
      </View>

      {/* Menu items skeleton */}
      <View style={styles.menuItems}>
        <MenuItemSkeleton />
        <MenuItemSkeleton />
        <MenuItemSkeleton />
        <MenuItemSkeleton />
        <MenuItemSkeleton />
      </View>
    </View>
  );
}

function MenuItemSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.menuItem, { backgroundColor: colors.bgSecondary }]}>
      <View style={{ flex: 1 }}>
        <SkeletonBox width={'80%' as any} height={18} style={{ marginBottom: 6 }} />
        <SkeletonBox width={'50%' as any} height={14} />
      </View>
      <SkeletonBox width={60} height={24} />
    </View>
  );
}

// Food detail screen skeleton
export function FoodDetailSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header skeleton */}
      <View style={styles.foodDetailHeader}>
        <SkeletonCircle size={24} />
        <View style={{ flex: 1 }} />
        <SkeletonCircle size={24} />
      </View>

      {/* Food info skeleton */}
      <View style={styles.foodDetailInfo}>
        <SkeletonBox width={'70%' as any} height={28} style={{ marginBottom: 8 }} />
        <SkeletonBox width={'40%' as any} height={18} style={{ marginBottom: 16 }} />

        {/* Calories display */}
        <View style={[styles.caloriesCard, { backgroundColor: colors.bgSecondary }]}>
          <SkeletonBox width={80} height={40} />
          <SkeletonBox width={50} height={18} />
        </View>
      </View>

      {/* Macros skeleton */}
      <View style={[styles.macrosCard, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.macroDetailRow}>
          <MacroDetailSkeleton />
          <MacroDetailSkeleton />
          <MacroDetailSkeleton />
        </View>
      </View>

      {/* Serving size skeleton */}
      <View style={[styles.servingCard, { backgroundColor: colors.bgSecondary }]}>
        <SkeletonBox width={100} height={14} style={{ marginBottom: 12 }} />
        <View style={styles.servingRow}>
          <SkeletonBox width={80} height={48} borderRadius={br.md} />
          <SkeletonBox width={100} height={48} borderRadius={br.md} />
        </View>
      </View>

      {/* Add button skeleton */}
      <View style={styles.addButtonContainer}>
        <SkeletonBox width={'100%' as any} height={52} borderRadius={br.md} />
      </View>
    </View>
  );
}

function MacroDetailSkeleton() {
  return (
    <View style={styles.macroDetail}>
      <SkeletonBox width={30} height={24} style={{ marginBottom: 4 }} />
      <SkeletonBox width={50} height={14} />
    </View>
  );
}

// Settings subscreen skeleton (for Fasting, Meal Planning, etc.)
export function SettingsSubscreenSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Toggle card skeleton */}
      <View style={[styles.settingsSubCard, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.settingsSubToggleRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBox width={120} height={18} />
            <SkeletonBox width={180} height={14} />
          </View>
          <SkeletonBox width={50} height={30} borderRadius={15} />
        </View>
      </View>

      {/* Section skeleton */}
      <View style={styles.settingsSubSection}>
        <SkeletonBox width={140} height={12} style={{ marginBottom: 12 }} />
        <View style={styles.settingsSubOptionsList}>
          <SettingsSubOptionSkeleton />
          <SettingsSubOptionSkeleton />
          <SettingsSubOptionSkeleton />
        </View>
      </View>

      {/* Another section skeleton */}
      <View style={styles.settingsSubSection}>
        <SkeletonBox width={100} height={12} style={{ marginBottom: 12 }} />
        <View style={[styles.settingsSubCard, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.settingsSubRow}>
            <SkeletonBox width={80} height={16} />
            <SkeletonBox width={70} height={16} />
          </View>
          <View style={[styles.settingsSubDivider, { backgroundColor: colors.borderDefault }]} />
          <View style={styles.settingsSubRow}>
            <SkeletonBox width={80} height={16} />
            <SkeletonBox width={70} height={16} />
          </View>
        </View>
      </View>
    </View>
  );
}

function SettingsSubOptionSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.settingsSubOption, { backgroundColor: colors.bgSecondary }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <SkeletonBox width={80} height={18} />
        <SkeletonBox width={160} height={14} />
      </View>
      <SkeletonCircle size={24} />
    </View>
  );
}

// Macro cycling setup skeleton
export function MacroCyclingSetupSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Progress dots skeleton */}
      <View style={styles.macroCyclingProgress}>
        <SkeletonCircle size={8} />
        <SkeletonCircle size={8} />
        <SkeletonCircle size={8} />
      </View>

      {/* Title skeleton */}
      <View style={styles.macroCyclingContent}>
        <SkeletonBox width={200} height={24} style={{ alignSelf: 'center', marginBottom: 16 }} />

        {/* Option cards skeleton */}
        <View style={styles.macroCyclingOptions}>
          <MacroCyclingOptionSkeleton />
          <MacroCyclingOptionSkeleton />
          <MacroCyclingOptionSkeleton />
        </View>
      </View>

      {/* Footer button skeleton */}
      <View style={styles.macroCyclingFooter}>
        <SkeletonBox width={'100%' as any} height={52} borderRadius={br.md} />
      </View>
    </View>
  );
}

function MacroCyclingOptionSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.macroCyclingOption, { backgroundColor: colors.bgSecondary }]}>
      <SkeletonCircle size={48} />
      <View style={{ flex: 1, gap: 4 }}>
        <SkeletonBox width={140} height={18} />
        <SkeletonBox width={180} height={14} />
      </View>
      <SkeletonCircle size={24} />
    </View>
  );
}

// Import preview skeleton
export function ImportPreviewSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header skeleton */}
      <View style={styles.importPreviewHeader}>
        <SkeletonCircle size={24} />
        <SkeletonBox width={80} height={20} />
        <View style={{ width: 24 }} />
      </View>

      {/* Preview card skeleton */}
      <View style={[styles.importPreviewCard, { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.importPreviewCardHeader}>
          <SkeletonCircle size={44} />
          <View style={{ flex: 1, gap: 4 }}>
            <SkeletonBox width={140} height={18} />
            <SkeletonBox width={100} height={14} />
          </View>
        </View>
        <View style={[styles.settingsSubDivider, { backgroundColor: colors.borderDefault }]} />
        <View style={styles.importPreviewStats}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <SkeletonBox width={40} height={24} />
            <SkeletonBox width={30} height={12} />
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <SkeletonBox width={40} height={24} />
            <SkeletonBox width={40} height={12} />
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <SkeletonBox width={50} height={24} />
            <SkeletonBox width={50} height={12} />
          </View>
        </View>
      </View>

      {/* Sample days skeleton */}
      <View style={styles.importPreviewSection}>
        <SkeletonBox width={120} height={12} style={{ marginBottom: 12 }} />
        <ImportSampleDaySkeleton />
        <ImportSampleDaySkeleton />
        <ImportSampleDaySkeleton />
      </View>
    </View>
  );
}

function ImportSampleDaySkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.importSampleDay, { backgroundColor: colors.bgSecondary }]}>
      <View style={styles.importSampleDayHeader}>
        <SkeletonBox width={100} height={16} />
        <SkeletonBox width={60} height={14} />
      </View>
      <View style={styles.importSampleDayItems}>
        <SkeletonBox width={'60%' as any} height={14} />
        <SkeletonBox width={'40%' as any} height={14} />
      </View>
    </View>
  );
}

// Generic list screen skeleton
export function ListScreenSkeleton({ itemCount = 6 }: { itemCount?: number }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header skeleton */}
      <View style={styles.genericHeader}>
        <SkeletonCircle size={24} />
        <SkeletonBox width={140} height={28} />
      </View>

      {/* List items skeleton */}
      <View style={styles.listItems}>
        {Array.from({ length: itemCount }).map((_, i) => (
          <View key={i} style={[styles.listItem, { backgroundColor: colors.bgSecondary }]}>
            <SkeletonCircle size={44} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonBox width={'70%' as any} height={18} style={{ marginBottom: 6 }} />
              <SkeletonBox width={'40%' as any} height={14} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  streakRow: {
    marginTop: 8,
  },
  ringWrapper: {
    alignItems: 'center',
    marginVertical: 16,
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
  },
  macroContainer: {
    marginBottom: 24,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroItem: {
    flex: 1,
    padding: 12,
    borderRadius: br.md,
    alignItems: 'center',
  },
  mealsContainer: {
    gap: 12,
  },
  mealSection: {
    borderRadius: br.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foodSearchHeader: {
    paddingVertical: 16,
  },
  searchHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: br.md,
    gap: 8,
  },
  searchResults: {
    paddingTop: 12,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: br.md,
    marginBottom: 8,
  },
  foodItemLeft: {
    flex: 1,
  },
  foodSearchContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    marginTop: 'auto',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: br.md,
  },
  // Progress screen skeleton styles
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  progressSection: {
    borderRadius: br.lg,
    padding: 16,
    marginBottom: 16,
  },
  progressSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRangeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  insightsRow: {
    gap: 12,
    marginTop: 12,
  },
  insightCardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: br.md,
  },
  // Settings screen skeleton styles
  settingsHeader: {
    paddingVertical: 16,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsGroup: {
    borderRadius: br.lg,
    overflow: 'hidden',
  },
  settingsItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  // Restaurant list skeleton styles
  restaurantListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  searchBarContainer: {
    paddingBottom: 12,
  },
  restaurantSection: {
    marginTop: 16,
  },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: br.md,
    marginBottom: 8,
    gap: 12,
  },
  restaurantCardContent: {
    flex: 1,
  },
  restaurantCardDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  // Restaurant menu skeleton styles
  restaurantMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  menuItems: {
    marginTop: 12,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: br.md,
  },
  // Food detail skeleton styles
  foodDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  foodDetailInfo: {
    paddingVertical: 16,
  },
  caloriesCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: br.lg,
    marginTop: 16,
    gap: 4,
  },
  macrosCard: {
    padding: 16,
    borderRadius: br.lg,
    marginTop: 16,
  },
  macroDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroDetail: {
    alignItems: 'center',
  },
  servingCard: {
    padding: 16,
    borderRadius: br.lg,
    marginTop: 16,
  },
  servingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addButtonContainer: {
    marginTop: 'auto',
    paddingVertical: 16,
  },
  // Generic list skeleton styles
  genericHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  listItems: {
    marginTop: 8,
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: br.md,
  },
  // Settings subscreen skeleton styles
  settingsSubCard: {
    borderRadius: br.lg,
    padding: 16,
    marginTop: 16,
  },
  settingsSubToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsSubSection: {
    marginTop: 24,
  },
  settingsSubOptionsList: {
    gap: 12,
  },
  settingsSubOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: br.lg,
  },
  settingsSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsSubDivider: {
    height: 1,
    marginVertical: 8,
  },
  // Macro cycling setup skeleton styles
  macroCyclingProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  macroCyclingContent: {
    flex: 1,
    paddingTop: 16,
  },
  macroCyclingOptions: {
    gap: 12,
  },
  macroCyclingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: br.lg,
    gap: 12,
  },
  macroCyclingFooter: {
    paddingVertical: 16,
  },
  // Import preview skeleton styles
  importPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  importPreviewCard: {
    borderRadius: br.lg,
    padding: 16,
    marginTop: 16,
  },
  importPreviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  importPreviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
  },
  importPreviewSection: {
    marginTop: 24,
  },
  importSampleDay: {
    borderRadius: br.md,
    padding: 12,
    marginBottom: 12,
  },
  importSampleDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  importSampleDayItems: {
    gap: 6,
  },
});
