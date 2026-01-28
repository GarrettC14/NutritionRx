import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

interface PremiumGateProps {
  children: React.ReactNode;
  context?: string;
  onPremiumRequired?: () => void; // Optional callback before showing paywall
}

/**
 * Wraps children and intercepts taps for non-premium users.
 * Shows paywall when non-premium user taps.
 */
export function PremiumGate({
  children,
  context = 'general',
  onPremiumRequired,
}: PremiumGateProps) {
  const router = useRouter();
  const { isPremium } = useSubscriptionStore();

  const handlePress = () => {
    if (isPremium) return; // Let the tap through

    onPremiumRequired?.();
    router.push(`/paywall?context=${context}`);
  };

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress} style={styles.container}>
      <View pointerEvents="none">{children}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    // Preserve child layout
  },
});
