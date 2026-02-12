import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStore } from '@/stores/networkStore';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import type { ServiceId } from '@/types/network';

interface OfflineFeatureGateProps {
  /** Child content to render when online */
  children: ReactNode;
  /** Optional service to check health for */
  service?: ServiceId;
  /** Optional custom message when offline */
  message?: string;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
}

/**
 * Contextual gate that blocks features requiring network access.
 * Shows a gentle offline message instead of the feature when disconnected.
 *
 * @example
 * <OfflineFeatureGate service="ai" message="AI photo analysis requires an internet connection">
 *   <AIPhotoAnalyzer />
 * </OfflineFeatureGate>
 */
export function OfflineFeatureGate({
  children,
  service,
  message = 'This feature requires an internet connection',
  fallback,
}: OfflineFeatureGateProps) {
  const { colors } = useTheme();
  const connectivity = useNetworkStore((s) => s.connectivity);
  const serviceHealth = useNetworkStore((s) => s.serviceHealth);

  const isOffline = connectivity === 'offline';
  const isServiceDown = service ? serviceHealth[service].health === 'down' : false;
  const isBlocked = isOffline || isServiceDown;

  if (!isBlocked) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const displayMessage = isServiceDown && !isOffline
    ? 'This service is temporarily unavailable. Please try again shortly.'
    : message;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>
      <Ionicons name="cloud-offline-outline" size={32} color={colors.textTertiary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {displayMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  message: {
    ...typography.body.medium,
    textAlign: 'center',
  },
});
