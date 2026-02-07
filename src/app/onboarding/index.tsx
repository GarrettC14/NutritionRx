import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { TestIDs } from '@/constants/testIDs';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const handleBegin = () => {
    router.push('/onboarding/goal');
  };

  return (
    <SafeAreaView testID={TestIDs.Onboarding.WelcomeScreen} style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Emoji with fade-in animation */}
        <Animated.View
          entering={FadeIn.duration(600).delay(200)}
          style={styles.emojiContainer}
        >
          <Ionicons name="nutrition" size={80} color={colors.accent} />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.duration(500).delay(400)}
          style={[styles.title, { color: colors.textPrimary }]}
        >
          NutritionRx
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={FadeInDown.duration(500).delay(600)}
          style={[styles.subtitle, { color: colors.textSecondary }]}
        >
          Nourish. Track. Thrive.
        </Animated.Text>
      </View>

      {/* Button */}
      <Animated.View
        entering={FadeInDown.duration(500).delay(800)}
        style={styles.footer}
      >
        <Button
          testID={TestIDs.Onboarding.BeginButton}
          label="Let's Begin"
          onPress={handleBegin}
          fullWidth
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: componentSpacing.screenEdgePadding,
  },
  emojiContainer: {
    marginBottom: spacing[6],
  },
  title: {
    ...typography.display.large,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.large,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[8],
  },
});
