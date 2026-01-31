/**
 * QuickReplies Component
 * Suggested follow-up messages for the user
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { QuickReply } from '../types/chat';

interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
  disabled?: boolean;
}

export function QuickReplies({ replies, onSelect, disabled }: QuickRepliesProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {replies.map((reply, index) => (
        <Pressable
          key={index}
          onPress={() => !disabled && onSelect(reply)}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.accent,
              opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
            },
          ]}
          disabled={disabled}
        >
          <Text style={[styles.text, { color: colors.accent }]}>
            {reply.text}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  button: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  text: {
    ...typography.body.medium,
    textAlign: 'center',
  },
});
