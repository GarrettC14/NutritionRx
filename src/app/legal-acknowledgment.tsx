import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { TestIDs } from '@/constants/testIDs';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { DisclaimerCard } from '@/features/legal/components/DisclaimerCard';
import { NUTRITION_DISCLAIMER_CONTENT } from '@/features/legal/content/nutritionrx';
import { useLegalAcknowledgment } from '@/features/legal/hooks/useLegalAcknowledgment';
import { Button } from '@/components/ui/Button';

export default function LegalAcknowledgmentScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { acknowledge } = useLegalAcknowledgment();

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkScale = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(checkScale.value, [0, 1], [0, 1]) }],
    opacity: checkScale.value,
  }));

  const canProceed = hasScrolledToBottom && isChecked;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 40;
      const isAtBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;

      if (__DEV__) {
        console.log(
          `[Legal] onScroll: offset=${contentOffset.y.toFixed(0)} ` +
          `layout=${layoutMeasurement.height.toFixed(0)} ` +
          `content=${contentSize.height.toFixed(0)} ` +
          `atBottom=${isAtBottom}`
        );
      }

      if (isAtBottom) {
        setHasScrolledToBottom(true);
      }
    },
    []
  );

  const handleScrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleCheckboxPress = () => {
    if (!hasScrolledToBottom) {
      // Scroll to bottom first — programmatic scrollToEnd fires onScroll
      console.log('[Legal] Checkbox pressed before scroll — calling scrollToEnd');
      scrollViewRef.current?.scrollToEnd({ animated: false });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newChecked = !isChecked;
    setIsChecked(newChecked);
    checkScale.value = withSpring(newChecked ? 1 : 0, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handleProceed = async () => {
    console.log(`[Legal] Proceed pressed: canProceed=${canProceed} isSubmitting=${isSubmitting}`);
    if (!canProceed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await acknowledge();
      // Navigation will update automatically via the app index redirect logic
      router.replace('/');
    } catch (error) {
      console.error('Failed to acknowledge:', error);
      setIsSubmitting(false);
    }
  };

  const handleTermsPress = () => {
    // TODO: Open terms of service URL or modal
    console.log('Open terms of service');
  };

  const content = NUTRITION_DISCLAIMER_CONTENT;

  return (
    <SafeAreaView
      testID={TestIDs.Legal.Screen}
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        ref={scrollViewRef}
        testID={TestIDs.Legal.ScrollView}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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

        {/* Acknowledgment Section */}
        <View style={styles.acknowledgmentSection}>
          {/* Checkbox */}
          <Pressable
            testID={TestIDs.Legal.Checkbox}
            style={[
              styles.checkbox,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: hasScrolledToBottom
                  ? isChecked
                    ? colors.accent
                    : colors.borderDefault
                  : colors.bgInteractive,
                opacity: hasScrolledToBottom ? 1 : 0.5,
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
                { color: hasScrolledToBottom ? colors.textPrimary : colors.textTertiary },
              ]}
            >
              I've read and understand the above
            </Text>
          </Pressable>

          {/* Sentinel for Maestro: visible only after scroll-to-bottom detected */}
          {hasScrolledToBottom && (
            <View
              testID={TestIDs.Legal.ScrollComplete}
              collapsable={false}
              style={{ height: 1, width: 1 }}
            />
          )}

          {/* Scroll hint — tappable to auto-scroll to bottom */}
          {!hasScrolledToBottom && (
            <Pressable
              testID={TestIDs.Legal.ScrollToBottom}
              style={styles.scrollHint}
              onPress={handleScrollToBottom}
            >
              <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
              <Text style={[styles.scrollHintText, { color: colors.textTertiary }]}>
                Scroll to continue
              </Text>
            </Pressable>
          )}

          {/* Proceed Button */}
          <Button
            testID={TestIDs.Legal.ProceedButton}
            onPress={handleProceed}
            disabled={!canProceed}
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
      </ScrollView>
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
    paddingBottom: spacing[6],
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
  acknowledgmentSection: {
    marginTop: spacing[4],
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
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
  },
  scrollHintText: {
    ...typography.caption,
  },
  proceedButton: {
    marginTop: spacing[4],
  },
  termsLink: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  termsText: {
    ...typography.body.small,
    textDecorationLine: 'underline',
  },
});
