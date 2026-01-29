/**
 * HealthKit Permission Screen
 * Pre-permission UI shown before requesting HealthKit access
 * Uses "Nourished Calm" design language - warm, supportive, no pressure
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { spacing, borderRadius } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface HealthKitPermissionScreenProps {
  /**
   * Called when user taps "Connect" to proceed with permission request
   */
  onConnect: () => void;
  /**
   * Called when user taps "Maybe Later" to skip for now
   */
  onSkip: () => void;
  /**
   * Optional loading state while authorization is in progress
   */
  isLoading?: boolean;
}

interface BenefitRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

function BenefitRow({ icon, text }: BenefitRowProps) {
  const { colors } = useTheme();

  return (
    <Card variant="elevated" padding="md" style={styles.benefitCard}>
      <View style={styles.benefitRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.successBg }]}>
          <Ionicons name={icon} size={20} color={colors.success} />
        </View>
        <Text style={[styles.benefitText, { color: colors.textPrimary }]}>{text}</Text>
      </View>
    </Card>
  );
}

export function HealthKitPermissionScreen({
  onConnect,
  onSkip,
  isLoading = false,
}: HealthKitPermissionScreenProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.content}>
        {/* Header illustration */}
        <View style={[styles.headerIcon, { backgroundColor: colors.successBg }]}>
          <Ionicons name="heart-circle" size={64} color={colors.success} />
        </View>

        {/* Title - warm, inviting language */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Keep Everything in Sync
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your nutrition journey, all in one place.
        </Text>

        {/* Benefits list */}
        <View style={styles.benefitsContainer}>
          <BenefitRow
            icon="restaurant-outline"
            text="Your meals sync automatically to Apple Health"
          />
          <BenefitRow
            icon="sync-outline"
            text="Weight updates flow between apps"
          />
          <BenefitRow
            icon="water-outline"
            text="Track water intake across devices"
          />
          <BenefitRow
            icon="lock-closed-outline"
            text="Your health data stays secure"
          />
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonsContainer}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={onConnect}
          loading={isLoading}
          disabled={isLoading}
        >
          Connect to Apple Health
        </Button>

        <Button
          variant="ghost"
          size="md"
          onPress={onSkip}
          disabled={isLoading}
          style={styles.skipButton}
        >
          Maybe Later
        </Button>
      </View>

      {/* Privacy reassurance */}
      <Text style={[styles.privacyNote, { color: colors.textTertiary }]}>
        Your health data syncs directly with Apple Health.{'\n'}
        We never access your health information directly.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: spacing[5],
    paddingBottom: spacing[8],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  title: {
    ...typography.display.medium,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.large,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  benefitsContainer: {
    width: '100%',
    gap: spacing[3],
  },
  benefitCard: {
    marginBottom: 0,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  benefitText: {
    ...typography.body.medium,
    flex: 1,
  },
  buttonsContainer: {
    marginTop: spacing[8],
    width: '100%',
  },
  skipButton: {
    marginTop: spacing[3],
    alignSelf: 'center',
  },
  privacyNote: {
    ...typography.body.small,
    textAlign: 'center',
    marginTop: spacing[6],
    lineHeight: 20,
  },
});
