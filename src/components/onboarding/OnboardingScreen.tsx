import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useOnboardingStep } from '@/hooks/useOnboardingStep';
import { typography } from '@/constants/typography';
import { spacing, componentSpacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';

interface OnboardingScreenProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  backTestID?: string;
  continueTestID?: string;
  screenTestID?: string;
  infoText?: string;
  keyboardAvoiding?: boolean;
}

export function OnboardingScreen({
  children,
  title,
  subtitle,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  continueLoading = false,
  backTestID,
  continueTestID,
  screenTestID,
  infoText,
  keyboardAvoiding = false,
}: OnboardingScreenProps) {
  const { colors } = useTheme();
  const { currentStep, totalSteps } = useOnboardingStep();

  const content = (
    <>
      {/* Header: back button + step indicator */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack ? (
            <Pressable testID={backTestID} onPress={onBack} style={styles.backButton} hitSlop={8}>
              <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}
        </View>
        {currentStep > 0 && (
          <Text style={[styles.stepIndicator, { color: colors.textTertiary }]}>
            Step {currentStep}/{totalSteps}
          </Text>
        )}
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
          {title}
        </Text>

        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}

        {children}

        {infoText && (
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              {infoText}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          testID={continueTestID}
          label={continueLabel}
          onPress={onContinue}
          disabled={continueDisabled}
          loading={continueLoading}
          fullWidth
        />
      </View>
    </>
  );

  const wrappedContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {content}
    </KeyboardAvoidingView>
  ) : content;

  return (
    <SafeAreaView
      testID={screenTestID}
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      edges={['bottom']}
    >
      {wrappedContent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  headerLeft: {
    width: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    ...typography.body.small,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
  },
  title: {
    ...typography.display.medium,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...typography.body.large,
    marginBottom: spacing[6],
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginTop: spacing[6],
    paddingHorizontal: spacing[1],
  },
  infoText: {
    ...typography.body.small,
    flex: 1,
  },
  footer: {
    paddingHorizontal: componentSpacing.screenEdgePadding,
    paddingBottom: spacing[6],
    paddingTop: spacing[4],
  },
});
