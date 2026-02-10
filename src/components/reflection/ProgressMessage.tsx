import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { SentimentPattern } from '@/utils/reflectionMessages';

const SENTIMENT_MESSAGES: Record<Exclude<SentimentPattern, null>, string> = {
  tough_streak:
    "It sounds like things have been hard lately. That's okay \u2014 every journey has rough patches. Would you like to adjust your pace to something that feels more manageable right now?",
  recovery:
    "Glad things are feeling better this week! You showed up even when it was tough, and that matters.",
  positive_streak:
    "Three weeks of feeling good \u2014 you're building real momentum!",
};

interface ProgressMessageProps {
  /** The contextual progress message text */
  message: string;
  /** Optional detected sentiment pattern */
  sentimentPattern?: SentimentPattern;
  /** Called when user taps "Adjust pace" in tough_streak message */
  onAdjustPace?: () => void;
}

export function ProgressMessage({
  message,
  sentimentPattern,
  onAdjustPace,
}: ProgressMessageProps) {
  const { colors } = useTheme();

  // Announce for accessibility
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <View style={styles.container} accessibilityRole="summary">
      <Text style={[styles.messageText, { color: colors.textSecondary }]}>
        {message}
      </Text>

      {sentimentPattern && sentimentPattern !== null && (
        <View
          style={[
            styles.sentimentCard,
            {
              backgroundColor: sentimentPattern === 'tough_streak'
                ? `${colors.warning}15`
                : `${'#7C9A82'}15`,
              borderColor: sentimentPattern === 'tough_streak'
                ? `${colors.warning}30`
                : `${'#7C9A82'}30`,
            },
          ]}
        >
          <Ionicons
            name={sentimentPattern === 'tough_streak' ? 'heart-outline' : 'sparkles-outline'}
            size={18}
            color={sentimentPattern === 'tough_streak' ? colors.warning : '#7C9A82'}
          />
          <Text style={[styles.sentimentText, { color: colors.textSecondary }]}>
            {SENTIMENT_MESSAGES[sentimentPattern]}
          </Text>
          {sentimentPattern === 'tough_streak' && onAdjustPace && (
            <Pressable
              onPress={onAdjustPace}
              style={[styles.adjustButton, { borderColor: colors.warning }]}
              accessibilityRole="button"
              accessibilityLabel="Adjust pace"
            >
              <Text style={[styles.adjustButtonText, { color: colors.warning }]}>
                Adjust pace
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  messageText: {
    ...typography.body.medium,
    lineHeight: 22,
  },
  sentimentCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[3],
    gap: spacing[2],
  },
  sentimentText: {
    ...typography.body.small,
    lineHeight: 20,
  },
  adjustButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    marginTop: spacing[1],
  },
  adjustButtonText: {
    ...typography.body.small,
    fontWeight: '600',
  },
});
