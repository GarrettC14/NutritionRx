import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { Sentiment } from '@/repositories/reflectionRepository';

interface SentimentOption {
  value: Sentiment;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SENTIMENT_OPTIONS: SentimentOption[] = [
  { value: 'positive', label: 'Feeling good', icon: 'sunny-outline' },
  { value: 'neutral', label: 'Hanging in there', icon: 'remove-outline' },
  { value: 'negative', label: 'cloud-outline', icon: 'cloud-outline' },
];

// Fix the label for negative
SENTIMENT_OPTIONS[2].label = "It's tough";

interface SentimentSectionProps {
  selected: Sentiment | null;
  onSelect: (sentiment: Sentiment | null) => void;
}

export function SentimentSection({ selected, onSelect }: SentimentSectionProps) {
  const { colors } = useTheme();

  const handlePress = (value: Sentiment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Toggle off if already selected
    onSelect(selected === value ? null : value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          How are you feeling about things?
        </Text>
        <Text style={[styles.optional, { color: colors.textTertiary }]}>
          (optional)
        </Text>
      </View>

      <View style={styles.cardsRow}>
        {SENTIMENT_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.card,
                {
                  backgroundColor: isSelected ? '#7C9A82' : colors.bgSecondary,
                  borderColor: isSelected ? '#7C9A82' : colors.borderDefault,
                },
              ]}
              onPress={() => handlePress(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
            >
              <Ionicons
                name={option.icon}
                size={28}
                color={isSelected ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.cardLabel,
                  { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  label: {
    ...typography.title.small,
    fontWeight: '600',
  },
  optional: {
    ...typography.body.small,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
    minHeight: 88,
  },
  cardLabel: {
    ...typography.body.small,
    fontWeight: '500',
    textAlign: 'center',
  },
});
