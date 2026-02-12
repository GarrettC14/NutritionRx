import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStore } from '@/stores/networkStore';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

/**
 * Passive network status banner.
 * Slides down from the top when offline, slides away when back online.
 * Shows a brief "Back online" confirmation on reconnect.
 */
export function NetworkBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const connectivity = useNetworkStore((s) => s.connectivity);
  const justReconnected = useNetworkStore((s) => s.justReconnected);

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const isVisible = connectivity === 'offline' || justReconnected;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  // Don't render at all in 'unknown' initial state
  if (connectivity === 'unknown' && !justReconnected) {
    return null;
  }

  const isOffline = connectivity === 'offline';
  const backgroundColor = isOffline ? colors.warningBg : colors.successBg;
  const iconColor = isOffline ? colors.warning : colors.success;
  const textColor = isOffline ? colors.warning : colors.success;
  const iconName = isOffline ? 'cloud-offline-outline' : 'cloud-done-outline';
  const message = isOffline
    ? 'No internet connection'
    : 'Back online';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          paddingTop: insets.top + spacing[1],
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.content}>
        <Ionicons name={iconName} size={16} color={iconColor} />
        <Text style={[styles.text, { color: textColor }]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: spacing[2],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
  },
  text: {
    ...typography.body.small,
    fontWeight: '500',
  },
});
