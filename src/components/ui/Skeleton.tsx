import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
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
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
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
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.6]),
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
});
