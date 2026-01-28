import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { Restaurant } from '@/types/restaurant';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
}

export function RestaurantCard({ restaurant, onPress }: RestaurantCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.bgSecondary },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {/* Logo placeholder or icon */}
      <View style={[styles.logoContainer, { backgroundColor: colors.bgTertiary }]}>
        {restaurant.logoAssetPath ? (
          <Image
            source={{ uri: restaurant.logoAssetPath }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="restaurant" size={24} color={colors.textSecondary} />
        )}
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {restaurant.name}
        </Text>
        <View style={styles.detailsRow}>
          <Text style={[styles.itemCount, { color: colors.textSecondary }]}>
            {restaurant.metadata.itemCount} items
          </Text>
          {restaurant.metadata.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.verifiedText, { color: colors.success }]}>
                Verified
              </Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[3],
  },
  pressed: {
    opacity: 0.7,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    gap: spacing[1],
  },
  name: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  itemCount: {
    ...typography.caption,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  verifiedText: {
    ...typography.caption,
    fontSize: 11,
  },
});
