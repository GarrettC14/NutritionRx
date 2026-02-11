/**
 * PhotoThumbnail Component
 * Displays a progress photo thumbnail with optional selection state
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { ProgressPhoto, PhotoCategory } from '@/types/progressPhotos';

interface PhotoThumbnailProps {
  photo: ProgressPhoto;
  size?: 'small' | 'medium' | 'large';
  isSelected?: boolean;
  selectionNumber?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  showDate?: boolean;
  showCategory?: boolean;
}

const SIZES = {
  small: 80,
  medium: 120,
  large: 160,
};

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
  other: 'Other',
};

export function PhotoThumbnail({
  photo,
  size = 'medium',
  isSelected = false,
  selectionNumber,
  onPress,
  onLongPress,
  showDate = false,
  showCategory = true,
}: PhotoThumbnailProps) {
  const { colors } = useTheme();
  const dimension = SIZES[size];

  const formatDate = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <Pressable
      style={[
        styles.container,
        { width: dimension, borderColor: isSelected ? colors.accent : 'transparent' },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Progress photo from ${formatDate(photo.date)}, ${CATEGORY_LABELS[photo.category]} view${isSelected ? ', selected' : ''}`}
      accessibilityState={{ selected: isSelected }}
    >
      <Image
        source={{ uri: photo.thumbnailUri || photo.localUri }}
        style={[
          styles.image,
          { width: dimension, height: dimension },
        ]}
        resizeMode="cover"
      />

      {/* Selection badge — always rendered, visibility toggled via opacity */}
      <View
        style={[
          styles.selectionBadge,
          { backgroundColor: colors.accent, opacity: isSelected ? 1 : 0 },
        ]}
      >
        {selectionNumber !== undefined ? (
          <Text style={styles.selectionNumber}>{selectionNumber}</Text>
        ) : (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        )}
      </View>

      {/* Category label */}
      {showCategory && (
        <View style={[styles.categoryBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.categoryText}>{CATEGORY_LABELS[photo.category]}</Text>
        </View>
      )}

      {/* Date label */}
      {showDate && (
        <View style={[styles.dateBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.dateText}>{formatDate(photo.date)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 3,
  },
  image: {
    borderRadius: borderRadius.md,
  },
  selectionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  dateBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
});
