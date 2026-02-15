import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { TestIDs } from '@/constants/testIDs';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { DisclaimerCard } from '@/features/legal/components/DisclaimerCard';
import { NUTRITION_DISCLAIMER_CONTENT } from '@/features/legal/content/nutritionrx';
import { useLegalAcknowledgment } from '@/features/legal/hooks/useLegalAcknowledgment';
import { useOnboardingStore } from '@/stores';
import { Button } from '@/components/ui/Button';

export default function LegalAcknowledgmentScreen() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const { acknowledge } = useLegalAcknowledgment();

  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkScale = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(checkScale.value, [0, 1], [0, 1]) }],
    opacity: checkScale.value,
  }));

  const handleCheckboxPress = () => {
    if (__DEV__) console.log('[Legal] handleCheckboxPress called');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newChecked = !isChecked;
    setIsChecked(newChecked);
    checkScale.value = reducedMotion
      ? (newChecked ? 1 : 0)
      : withSpring(newChecked ? 1 : 0, {
          damping: 15,
          stiffness: 300,
        });
  };

  const handleProceed = async () => {
    if (__DEV__) console.log('[Legal] handleProceed called, isChecked:', isChecked, 'isSubmitting:', isSubmitting);
    if (!isChecked || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (__DEV__) console.log('[Legal] Calling acknowledge()...');
      await acknowledge();
      if (__DEV__) console.log('[Legal] acknowledge() done');
      const onboardingComplete = useOnboardingStore.getState().isComplete;
      const target = onboardingComplete ? '/(tabs)' : '/onboarding/goal';
      if (__DEV__) console.log('[Legal] Navigating to:', target);
      router.replace(target);
    } catch (error) {
      if (__DEV__) console.error('[Legal] Failed to acknowledge:', error);
      setIsSubmitting(false);
    }
  };

  const handleTermsPress = () => {
    router.push('/legal-terms');
  };

  const content = NUTRITION_DISCLAIMER_CONTENT;

  return (
    <SafeAreaView
      testID={TestIDs.Legal.Screen}
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={['top', 'bottom']}
    >
      {/* Scrollable disclaimer content */}
      <ScrollView
        ref={scrollViewRef}
        testID={TestIDs.Legal.ScrollView}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Welcome to NutritionRx
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {content.introText}
          </Text>
        </View>

        {/* Disclaimer Sections */}
        {content.sections.map((section, index) => (
          <DisclaimerCard
            key={index}
            icon={section.icon}
            title={section.title}
            body={section.body}
          />
        ))}

      </ScrollView>

      {/* Fixed bottom section — always visible */}
      <View style={[styles.bottomSection, { borderTopColor: colors.borderDefault }]}>
        {/* Sentinel for Maestro — always rendered since checkbox is the real gate */}
        <View
          testID={TestIDs.Legal.ScrollComplete}
          collapsable={false}
          style={{ height: 1, width: 1 }}
        />
        {/* Checkbox */}
        <Pressable
          testID={TestIDs.Legal.Checkbox}
          style={[
            styles.checkbox,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: isChecked ? colors.accent : colors.borderDefault,
            },
          ]}
          onPress={handleCheckboxPress}
        >
          <View
            style={[
              styles.checkboxBox,
              {
                borderColor: isChecked ? colors.accent : colors.borderDefault,
                backgroundColor: isChecked ? colors.accent : 'transparent',
              },
            ]}
          >
            <Animated.View style={animatedCheckStyle}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </Animated.View>
          </View>
          <Text
            style={[
              styles.checkboxLabel,
              { color: colors.textPrimary },
            ]}
          >
            I've read and understand the above
          </Text>
        </Pressable>

        {/* Proceed Button */}
        <Button
          testID={TestIDs.Legal.ProceedButton}
          onPress={handleProceed}
          disabled={!isChecked}
          loading={isSubmitting}
          fullWidth
          style={styles.proceedButton}
        >
          {content.buttonText}
        </Button>

        {/* Terms Link */}
        <Pressable testID={TestIDs.Legal.TermsLink} onPress={handleTermsPress} style={styles.termsLink}>
          <Text style={[styles.termsText, { color: colors.textTertiary }]}>
            Read full Terms of Service
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    ...typography.display.small,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.medium,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSection: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    ...typography.body.medium,
    flex: 1,
  },
  proceedButton: {
    marginTop: spacing[3],
  },
  termsLink: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  termsText: {
    ...typography.body.small,
    textDecorationLine: 'underline',
  },
});
