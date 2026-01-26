import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/onboarding/sex');
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={[styles.logoContainer, { backgroundColor: colors.accent + '20' }]}>
          <Ionicons name="nutrition-outline" size={64} color={colors.accent} />
        </View>

        {/* Welcome Text */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Welcome to NutritionRx
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your personal nutrition companion that learns and adapts to your body.
        </Text>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            icon="analytics-outline"
            title="Smart Tracking"
            description="Log food easily with barcode scanning and quick-add"
            colors={colors}
          />
          <FeatureItem
            icon="trending-up"
            title="Adaptive Learning"
            description="Your calorie targets adjust based on your actual results"
            colors={colors}
          />
          <FeatureItem
            icon="shield-checkmark-outline"
            title="100% Private"
            description="All your data stays on your device, always"
            colors={colors}
          />
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        <Button
          label="Let's Get Started"
          onPress={handleGetStarted}
          fullWidth
        />
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: any;
}

function FeatureItem({ icon, title, description, colors }: FeatureItemProps) {
  return (
    <View style={styles.feature}>
      <View style={[styles.featureIcon, { backgroundColor: colors.bgSecondary }]}>
        <Ionicons name={icon} size={24} color={colors.accent} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[8],
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: spacing[4],
  },
  features: {
    width: '100%',
    gap: spacing[4],
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  featureDescription: {
    ...typography.body.medium,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
    gap: spacing[3],
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  skipText: {
    ...typography.body.medium,
  },
});
