/**
 * ProgressPhotosSummary Component
 * Compact overview card for progress photos in the Progress tab
 * Uses standardized LockedContentArea pattern for premium gating
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { ProgressPhoto, PhotoStats } from '@/types/progressPhotos';
import { LockedContentArea } from '@/components/premium';

interface ProgressPhotosSummaryProps {
  stats: PhotoStats;
  recentPhotos: ProgressPhoto[];
  firstPhoto?: ProgressPhoto;
  latestPhoto?: ProgressPhoto;
  isPremium?: boolean;
  onPress?: () => void;
  onAddPress?: () => void;
  onComparePress?: () => void;
}

export function ProgressPhotosSummary({
  stats,
  recentPhotos,
  firstPhoto,
  latestPhoto,
  isPremium = false,
  onPress,
  onAddPress,
  onComparePress,
}: ProgressPhotosSummaryProps) {
  const { colors } = useTheme();

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysSince = (): number | null => {
    if (!firstPhoto) return null;
    const first = new Date(firstPhoto.date);
    const now = new Date();
    return Math.floor((now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysSince = getDaysSince();

  // Empty state content
  const emptyContentArea = (
    <View style={styles.emptyContent}>
      <Ionicons name="camera-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Track Your Progress
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Take photos to visualize your fitness journey
      </Text>
      <Pressable
        style={[styles.addButton, { backgroundColor: colors.accent }]}
        onPress={onAddPress}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Take First Photo</Text>
      </Pressable>
    </View>
  );

  // Empty state
  if (stats.totalPhotos === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
        {/* Header - dimmed when locked */}
        <View
          style={[styles.header, !isPremium && styles.headerLocked]}
          pointerEvents={isPremium ? 'auto' : 'none'}
        >
          <View style={styles.headerLeft}>
            <Ionicons name="camera-outline" size={24} color={colors.accent} />
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Progress Photos
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Track your journey
              </Text>
            </View>
          </View>
        </View>

        {/* Content area - locked for non-premium */}
        {isPremium ? (
          emptyContentArea
        ) : (
          <View style={styles.lockedWrapper}>
            <LockedContentArea
              context="progress_photos"
              message="Upgrade to unlock"
              minHeight={150}
            >
              {emptyContentArea}
            </LockedContentArea>
          </View>
        )}
      </View>
    );
  }

  // Main content area
  const contentArea = (
    <>
      {/* Quick comparison preview */}
      {firstPhoto && latestPhoto && firstPhoto.id !== latestPhoto.id && (
        <Pressable style={styles.comparisonPreview} onPress={onComparePress}>
          <View style={styles.comparisonPhotos}>
            <View style={styles.comparisonPhoto}>
              <Image
                source={{ uri: firstPhoto.thumbnailUri || firstPhoto.localUri }}
                style={styles.comparisonImage}
                resizeMode="cover"
              />
              <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                {formatDate(firstPhoto.date)}
              </Text>
            </View>

            <View style={styles.comparisonArrow}>
              <Ionicons name="arrow-forward" size={20} color={colors.textTertiary} />
            </View>

            <View style={styles.comparisonPhoto}>
              <Image
                source={{ uri: latestPhoto.thumbnailUri || latestPhoto.localUri }}
                style={styles.comparisonImage}
                resizeMode="cover"
              />
              <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                {formatDate(latestPhoto.date)}
              </Text>
            </View>
          </View>

          <View style={[styles.compareButton, { backgroundColor: colors.bgInteractive }]}>
            <Ionicons name="git-compare-outline" size={16} color={colors.accent} />
            <Text style={[styles.compareButtonText, { color: colors.accent }]}>
              Compare
            </Text>
          </View>
        </Pressable>
      )}

      {/* Recent photos strip */}
      <View style={styles.recentSection}>
        <Text style={[styles.recentLabel, { color: colors.textSecondary }]}>
          Recent
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentPhotos}
        >
          {/* Add button */}
          <Pressable
            style={[styles.addThumbnail, { backgroundColor: colors.bgTertiary }]}
            onPress={onAddPress}
          >
            <Ionicons name="add" size={24} color={colors.accent} />
          </Pressable>

          {/* Recent photos */}
          {recentPhotos.slice(0, 5).map(photo => (
            <Pressable
              key={photo.id}
              style={styles.recentThumbnail}
              onPress={onPress}
            >
              <Image
                source={{ uri: photo.thumbnailUri || photo.localUri }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: colors.bgTertiary }]}>
        <View style={styles.stat}>
          <Ionicons name="body-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.photosByCategory.front}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Front</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="person-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.photosByCategory.side}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Side</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="person-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.photosByCategory.back}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Back</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.daysCovered}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Days</Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      {/* Header - dimmed when locked */}
      <Pressable
        style={[styles.header, !isPremium && styles.headerLocked]}
        onPress={isPremium ? onPress : undefined}
        disabled={!isPremium}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="camera-outline" size={24} color={colors.accent} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Progress Photos
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {stats.totalPhotos} photo{stats.totalPhotos !== 1 ? 's' : ''}
              {daysSince !== null && ` • ${daysSince} days`}
            </Text>
          </View>
        </View>
        {isPremium && (
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        )}
      </Pressable>

      {/* Content area - locked for non-premium */}
      {isPremium ? (
        contentArea
      ) : (
        <View style={styles.lockedWrapper}>
          <LockedContentArea
            context="progress_photos"
            message="Upgrade to unlock"
            minHeight={150}
          >
            {contentArea}
          </LockedContentArea>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
  },
  headerLocked: {
    opacity: 0.5,
  },
  lockedWrapper: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  headerText: {
    gap: 2,
  },
  title: {
    ...typography.title.small,
  },
  subtitle: {
    ...typography.caption,
  },
  // Empty state
  emptyContent: {
    alignItems: 'center',
    padding: spacing[6],
    gap: spacing[2],
  },
  emptyTitle: {
    ...typography.title.small,
    marginTop: spacing[2],
  },
  emptySubtitle: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    marginTop: spacing[2],
  },
  addButtonText: {
    color: '#FFFFFF',
    ...typography.body.medium,
    fontWeight: '600',
  },
  // Comparison preview
  comparisonPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  comparisonPhotos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  comparisonPhoto: {
    alignItems: 'center',
    gap: spacing[1],
  },
  comparisonImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
  },
  comparisonLabel: {
    ...typography.caption,
  },
  comparisonArrow: {
    paddingHorizontal: spacing[2],
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  compareButtonText: {
    ...typography.body.small,
    fontWeight: '500',
  },
  // Recent photos
  recentSection: {
    paddingBottom: spacing[3],
  },
  recentLabel: {
    ...typography.caption,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  recentPhotos: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  addThumbnail: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentThumbnail: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  statLabel: {
    ...typography.caption,
  },
});
