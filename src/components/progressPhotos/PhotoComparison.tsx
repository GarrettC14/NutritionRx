/**
 * PhotoComparison Component
 * Side-by-side and slider overlay comparison views for progress photos
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { ProgressPhoto, ComparisonType } from '@/types/progressPhotos';

interface PhotoComparisonProps {
  photo1: ProgressPhoto;
  photo2: ProgressPhoto;
  mode: ComparisonType;
  onModeChange?: (mode: ComparisonType) => void;
  onClose?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPARISON_WIDTH = SCREEN_WIDTH - spacing[8];
const COMPARISON_HEIGHT = COMPARISON_WIDTH * 1.33; // 3:4 aspect ratio

export function PhotoComparison({
  photo1,
  photo2,
  mode,
  onModeChange,
  onClose,
}: PhotoComparisonProps) {
  const { colors } = useTheme();
  const sliderPosition = useSharedValue(0.5);

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysDifference = (): number => {
    const d1 = new Date(photo1.date);
    const d2 = new Date(photo2.date);
    return Math.abs(Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  };

  // Slider gesture for overlay mode
  const sliderGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newPosition = Math.max(0, Math.min(1, event.x / COMPARISON_WIDTH));
      sliderPosition.value = newPosition;
    });

  const sliderAnimatedStyle = useAnimatedStyle(() => ({
    left: sliderPosition.value * COMPARISON_WIDTH - 2,
  }));

  const leftImageStyle = useAnimatedStyle(() => ({
    width: sliderPosition.value * COMPARISON_WIDTH,
  }));

  const renderSideBySide = () => (
    <View style={styles.sideBySideContainer}>
      {/* Photo 1 */}
      <View style={styles.sidePhoto}>
        <Image
          source={{ uri: photo1.localUri }}
          style={styles.sideImage}
          resizeMode="cover"
        />
        <View style={[styles.photoLabel, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.labelText}>Before</Text>
          <Text style={styles.labelDate}>{formatDate(photo1.date)}</Text>
        </View>
      </View>

      {/* Photo 2 */}
      <View style={styles.sidePhoto}>
        <Image
          source={{ uri: photo2.localUri }}
          style={styles.sideImage}
          resizeMode="cover"
        />
        <View style={[styles.photoLabel, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.labelText}>After</Text>
          <Text style={styles.labelDate}>{formatDate(photo2.date)}</Text>
        </View>
      </View>
    </View>
  );

  const renderSliderOverlay = () => (
    <GestureDetector gesture={sliderGesture}>
      <View style={styles.sliderContainer}>
        {/* Photo 2 (background - "after") */}
        <Image
          source={{ uri: photo2.localUri }}
          style={styles.sliderImage}
          resizeMode="cover"
        />

        {/* Photo 1 (foreground - "before", clipped) */}
        <Animated.View style={[styles.sliderOverlay, leftImageStyle]}>
          <Image
            source={{ uri: photo1.localUri }}
            style={[styles.sliderImage, { width: COMPARISON_WIDTH }]}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Slider handle */}
        <Animated.View style={[styles.sliderHandle, sliderAnimatedStyle]}>
          <View style={[styles.sliderLine, { backgroundColor: '#FFFFFF' }]} />
          <View style={[styles.sliderKnob, { backgroundColor: '#FFFFFF' }]}>
            <Ionicons name="swap-horizontal" size={16} color="#000000" />
          </View>
          <View style={[styles.sliderLine, { backgroundColor: '#FFFFFF' }]} />
        </Animated.View>

        {/* Labels */}
        <View style={[styles.sliderLabel, styles.sliderLabelLeft]}>
          <Text style={styles.sliderLabelText}>Before</Text>
        </View>
        <View style={[styles.sliderLabel, styles.sliderLabelRight]}>
          <Text style={styles.sliderLabelText}>After</Text>
        </View>
      </View>
    </GestureDetector>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {getDaysDifference()} days apart
          </Text>
          {photo1.weight && photo2.weight && (
            <Text style={[styles.weightChange, { color: colors.textSecondary }]}>
              {photo2.weight - photo1.weight > 0 ? '+' : ''}
              {(photo2.weight - photo1.weight).toFixed(1)} kg
            </Text>
          )}
        </View>

        {onClose && (
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close comparison">
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <Pressable
          style={[
            styles.modeButton,
            mode === 'side_by_side' && { backgroundColor: colors.bgInteractive },
          ]}
          onPress={() => onModeChange?.('side_by_side')}
          accessibilityRole="button"
          accessibilityLabel={`Side by Side view${mode === 'side_by_side' ? ', selected' : ''}`}
          accessibilityState={{ selected: mode === 'side_by_side' }}
        >
          <Ionicons
            name="grid-outline"
            size={18}
            color={mode === 'side_by_side' ? colors.accent : colors.textTertiary}
          />
          <Text
            style={[
              styles.modeText,
              { color: mode === 'side_by_side' ? colors.textPrimary : colors.textTertiary },
            ]}
          >
            Side by Side
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.modeButton,
            mode === 'slider_overlay' && { backgroundColor: colors.bgInteractive },
          ]}
          onPress={() => onModeChange?.('slider_overlay')}
          accessibilityRole="button"
          accessibilityLabel={`Slider view${mode === 'slider_overlay' ? ', selected' : ''}`}
          accessibilityState={{ selected: mode === 'slider_overlay' }}
        >
          <Ionicons
            name="git-compare-outline"
            size={18}
            color={mode === 'slider_overlay' ? colors.accent : colors.textTertiary}
          />
          <Text
            style={[
              styles.modeText,
              { color: mode === 'slider_overlay' ? colors.textPrimary : colors.textTertiary },
            ]}
          >
            Slider
          </Text>
        </Pressable>
      </View>

      {/* Comparison view */}
      {mode === 'side_by_side' ? renderSideBySide() : renderSliderOverlay()}
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
  headerInfo: {
    gap: 2,
  },
  title: {
    ...typography.title.small,
  },
  weightChange: {
    ...typography.body.small,
  },
  closeButton: {
    padding: spacing[1],
  },
  modeToggle: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  modeText: {
    ...typography.body.small,
    fontWeight: '500',
  },
  // Side by side styles
  sideBySideContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[4],
    paddingTop: 0,
  },
  sidePhoto: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  sideImage: {
    width: '100%',
    height: '100%',
  },
  photoLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[2],
    alignItems: 'center',
  },
  labelText: {
    color: '#FFFFFF',
    ...typography.body.small,
    fontWeight: '600',
  },
  labelDate: {
    color: '#FFFFFF',
    ...typography.caption,
    opacity: 0.8,
  },
  // Slider overlay styles
  sliderContainer: {
    width: COMPARISON_WIDTH,
    height: COMPARISON_HEIGHT,
    alignSelf: 'center',
    marginBottom: spacing[4],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  sliderImage: {
    width: COMPARISON_WIDTH,
    height: COMPARISON_HEIGHT,
  },
  sliderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: COMPARISON_HEIGHT,
    overflow: 'hidden',
  },
  sliderHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderLine: {
    width: 2,
    flex: 1,
  },
  sliderKnob: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderLabel: {
    position: 'absolute',
    top: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: borderRadius.sm,
  },
  sliderLabelLeft: {
    left: spacing[2],
  },
  sliderLabelRight: {
    right: spacing[2],
  },
  sliderLabelText: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '600',
  },
});
