/**
 * PhotoTimeline Component
 * Displays progress photos grouped by date with timeline visualization
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { PhotoTimelineEntry, PhotoCategory } from '@/types/progressPhotos';
import { useSettingsStore } from '@/stores';
import { PhotoThumbnail } from './PhotoThumbnail';

interface PhotoTimelineProps {
  timeline: PhotoTimelineEntry[];
  onPhotoPress?: (photoId: string) => void;
  onPhotoLongPress?: (photoId: string) => void;
  selectedPhotoId?: string | null;
  comparisonMode?: boolean;
  comparisonPhoto1Id?: string | null;
  comparisonPhoto2Id?: string | null;
  emptyMessage?: string;
}

export function PhotoTimeline({
  timeline,
  onPhotoPress,
  onPhotoLongPress,
  selectedPhotoId,
  comparisonMode = false,
  comparisonPhoto1Id,
  comparisonPhoto2Id,
  emptyMessage = 'No photos yet',
}: PhotoTimelineProps) {
  const { colors } = useTheme();
  const weightUnit = useSettingsStore((s) => s.settings.weightUnit);
  const isLbs = weightUnit === 'lbs';

  const displayWeight = (weightKg: number): string => {
    if (isLbs) return `${(weightKg * 2.20462).toFixed(1)} lbs`;
    return `${weightKg.toFixed(1)} kg`;
  };

  const formatDate = (date: string): string => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getSelectionNumber = (photoId: string): number | undefined => {
    if (!comparisonMode) return undefined;
    if (photoId === comparisonPhoto1Id) return 1;
    if (photoId === comparisonPhoto2Id) return 2;
    return undefined;
  };

  if (timeline.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.bgSecondary }]}>
        <Ionicons name="images-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {timeline.map((entry, index) => (
        <View key={entry.date} style={styles.dayEntry}>
          {/* Timeline connector */}
          <View style={styles.timelineColumn}>
            <View style={[styles.timelineDot, { backgroundColor: colors.accent }]} />
            {index < timeline.length - 1 && (
              <View style={[styles.timelineLine, { backgroundColor: colors.bgSecondary }]} />
            )}
          </View>

          {/* Content */}
          <View style={styles.contentColumn}>
            {/* Date header */}
            <View style={styles.dateHeader}>
              <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                {formatDate(entry.date)}
              </Text>
              <Text style={[styles.daysText, { color: colors.textTertiary }]}>
                Day {entry.daysSinceFirst + 1}
              </Text>
              {entry.weight && (
                <View style={[styles.weightBadge, { backgroundColor: colors.bgSecondary }]}>
                  <Ionicons name="scale-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.weightText, { color: colors.textSecondary }]}>
                    {displayWeight(entry.weight)}
                  </Text>
                </View>
              )}
            </View>

            {/* Photos */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosContainer}
            >
              {entry.photos.map(photo => {
                const isSelected = selectedPhotoId === photo.id ||
                  comparisonPhoto1Id === photo.id ||
                  comparisonPhoto2Id === photo.id;

                return (
                  <PhotoThumbnail
                    key={photo.id}
                    photo={photo}
                    size="medium"
                    isSelected={isSelected}
                    selectionNumber={getSelectionNumber(photo.id)}
                    onPress={() => onPhotoPress?.(photo.id)}
                    onLongPress={() => onPhotoLongPress?.(photo.id)}
                    showCategory
                    showDate={false}
                  />
                );
              })}
            </ScrollView>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[2],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  emptyText: {
    ...typography.body.medium,
    textAlign: 'center',
  },
  dayEntry: {
    flexDirection: 'row',
    marginBottom: spacing[4],
  },
  timelineColumn: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  contentColumn: {
    flex: 1,
    paddingLeft: spacing[3],
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
    flexWrap: 'wrap',
  },
  dateText: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  daysText: {
    ...typography.caption,
  },
  weightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  weightText: {
    ...typography.caption,
  },
  photosContainer: {
    gap: spacing[2],
    paddingRight: spacing[4],
  },
});
