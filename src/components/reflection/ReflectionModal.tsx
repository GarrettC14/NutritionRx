import { useEffect, useMemo, useCallback, useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from '@/hooks/useRouter';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { Button } from '@/components/ui/Button';
import { Toast, useToast } from '@/components/ui/Toast';
import { useReflectionStore } from '@/stores/reflectionStore';
import { useGoalStore } from '@/stores/goalStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMacroCycleStore } from '@/stores/macroCycleStore';
import { reflectionRepository } from '@/repositories/reflectionRepository';
import { getProgressMessage, checkSentimentPatterns, SentimentPattern } from '@/utils/reflectionMessages';
import { WeightInputSection } from './WeightInputSection';
import { SentimentSection } from './SentimentSection';
import { PlanUpdateSection } from './PlanUpdateSection';
import { ProgressMessage } from './ProgressMessage';

interface ReflectionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ReflectionModal({ visible, onClose }: ReflectionModalProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const {
    inputWeightKg,
    selectedSentiment,
    previewCalories,
    previewProteinG,
    previewCarbsG,
    previewFatG,
    hasChanges,
    isSubmitting,
    submitError,
    daysSinceLastReflection,
    setInputWeight,
    setSentiment,
    submitReflection,
    cancelReflection,
  } = useReflectionStore();

  const { activeGoal } = useGoalStore();
  const { settings } = useSettingsStore();
  const { config: macroCycleConfig } = useMacroCycleStore();

  const unit = settings?.weightUnit ?? 'lbs';
  const macroCyclingEnabled = macroCycleConfig?.enabled ?? false;

  // Track last reflection data
  const [lastReflection, setLastReflection] = useState<{
    weightKg: number;
    reflectedAt: string;
  } | null>(null);
  const [reflectionCount, setReflectionCount] = useState(0);
  const [trendWeightKg, setTrendWeightKg] = useState<number | null>(null);
  const [sentimentPattern, setSentimentPattern] = useState<SentimentPattern>(null);

  const isFirstReflection = reflectionCount === 0;

  // Load context data when modal opens
  useEffect(() => {
    if (visible) {
      loadContextData();
    }
  }, [visible]);

  const loadContextData = async () => {
    try {
      const [latest, count, sentiments] = await Promise.all([
        reflectionRepository.getLatest(),
        reflectionRepository.getCount(),
        reflectionRepository.getRecentSentiments(3),
      ]);

      if (latest) {
        setLastReflection({
          weightKg: latest.weightKg,
          reflectedAt: latest.reflectedAt,
        });
        setTrendWeightKg(latest.weightTrendKg);
      }
      setReflectionCount(count);

      // Check sentiment patterns (cast to match expected type)
      const pattern = checkSentimentPatterns(
        sentiments.map(s => ({
          sentiment: s.sentiment as 'positive' | 'neutral' | 'negative' | null,
          reflectedAt: s.reflectedAt,
        }))
      );
      setSentimentPattern(pattern);
    } catch (error) {
      if (__DEV__) console.error('Failed to load reflection context:', error);
    }
  };

  // Weight input is valid
  const isWeightValid = inputWeightKg != null && inputWeightKg >= 30 && inputWeightKg <= 300;

  // Current targets from active goal
  const previousCalories = activeGoal?.currentTargetCalories ?? 0;
  const previousProteinG = activeGoal?.currentProteinG ?? 0;
  const previousCarbsG = activeGoal?.currentCarbsG ?? 0;
  const previousFatG = activeGoal?.currentFatG ?? 0;

  // Progress message
  const progressMessage = useMemo(() => {
    if (!isWeightValid || !activeGoal) return null;

    const weightChangeKg = lastReflection
      ? inputWeightKg! - lastReflection.weightKg
      : null;

    return getProgressMessage(
      isFirstReflection,
      weightChangeKg,
      activeGoal.type as 'lose' | 'gain' | 'maintain',
      inputWeightKg!,
      daysSinceLastReflection ?? 7,
      activeGoal.targetWeightKg ?? null,
      null, // estimatedCompletionDate - not available in current implementation
      unit,
    );
  }, [isWeightValid, inputWeightKg, activeGoal, lastReflection, isFirstReflection, daysSinceLastReflection, unit]);

  const { toastState, showSuccess, showError, hideToast } = useToast();

  const handleConfirm = useCallback(async () => {
    try {
      await submitReflection();
      showSuccess('Plan updated \u2713');
      // Delay close to allow toast to show
      setTimeout(() => {
        onClose();
      }, 300);
    } catch {
      // Error is handled by the store
    }
  }, [submitReflection, showSuccess, onClose]);

  const handleAdjustPace = useCallback(async () => {
    try {
      await submitReflection();
      onClose();
      // Navigate to goal settings
      router.push('/settings/goals' as any);
    } catch {
      // Error is handled by the store
    }
  }, [submitReflection, onClose, router]);

  const handleCancel = useCallback(() => {
    cancelReflection();
    onClose();
  }, [cancelReflection, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderDefault }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Weekly Reflection
            </Text>
            <Pressable
              onPress={handleCancel}
              style={[styles.closeButton, { backgroundColor: colors.bgInteractive }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close reflection"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1: Weight Input */}
            <WeightInputSection
              inputWeightKg={inputWeightKg}
              onWeightChange={setInputWeight}
              unit={unit}
              lastReflectionWeightKg={lastReflection?.weightKg ?? null}
              lastReflectionDate={lastReflection?.reflectedAt ?? null}
              trendWeightKg={trendWeightKg}
              isFirstReflection={isFirstReflection}
            />

            {/* Section 2: Sentiment */}
            <SentimentSection
              selected={selectedSentiment}
              onSelect={setSentiment}
            />

            {/* Section 3: Plan Update */}
            <PlanUpdateSection
              hasChanges={hasChanges}
              isFirstReflection={isFirstReflection}
              macroCyclingEnabled={macroCyclingEnabled}
              previousCalories={previousCalories}
              previousProteinG={previousProteinG}
              previousCarbsG={previousCarbsG}
              previousFatG={previousFatG}
              previewCalories={previewCalories}
              previewProteinG={previewProteinG}
              previewCarbsG={previewCarbsG}
              previewFatG={previewFatG}
            />

            {/* Progress Message */}
            {progressMessage && (
              <ProgressMessage
                message={progressMessage}
                sentimentPattern={sentimentPattern}
                onAdjustPace={handleAdjustPace}
              />
            )}

            {/* Error message */}
            {submitError && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {submitError}
              </Text>
            )}
          </ScrollView>

          {/* Fixed Footer */}
          <View style={[styles.footer, { borderTopColor: colors.borderDefault }]}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={!isWeightValid || isSubmitting}
              onPress={handleConfirm}
              accessibilityHint={!isWeightValid ? 'Enter your weight first' : undefined}
            >
              Sounds Good
            </Button>
            <Pressable
              onPress={handleAdjustPace}
              disabled={!isWeightValid || isSubmitting}
              style={styles.adjustLink}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.adjustLinkText,
                  {
                    color: !isWeightValid || isSubmitting ? colors.textDisabled : colors.accent,
                  },
                ]}
              >
                {macroCyclingEnabled ? 'Adjust my pace or cycling' : 'Adjust my pace'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        <Toast
          visible={toastState.visible}
          type={toastState.type}
          title={toastState.title}
          onDismiss={hideToast}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.title.large,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[6],
  },
  errorText: {
    ...typography.body.small,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderTopWidth: 1,
    gap: spacing[3],
    alignItems: 'center',
  },
  adjustLink: {
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  adjustLinkText: {
    ...typography.body.medium,
    fontWeight: '500',
  },
});
