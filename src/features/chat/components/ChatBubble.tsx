/**
 * ChatBubble Component
 * Displays a single chat message bubble
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { ChatMessage } from '../types/chat';

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.accent }]
            : [
                styles.assistantBubble,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.borderDefault,
                },
              ],
          isError && { backgroundColor: colors.errorBg, borderColor: colors.error },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: isUser
                ? '#FFFFFF'
                : isError
                ? colors.error
                : colors.textPrimary,
            },
          ]}
        >
          {message.content}
          {isStreaming && message.status === 'sending' && (
            <Text style={{ color: isUser ? 'rgba(255,255,255,0.6)' : colors.textTertiary }}>
              {' \u258C'}
            </Text>
          )}
        </Text>
      </View>
      <Text
        style={[
          styles.timestamp,
          { color: colors.textTertiary },
          isUser ? styles.userTimestamp : styles.assistantTimestamp,
        ]}
      >
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[4],
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.xl,
  },
  userBubble: {
    borderBottomRightRadius: borderRadius.sm,
  },
  assistantBubble: {
    borderBottomLeftRadius: borderRadius.sm,
    borderWidth: 1,
  },
  messageText: {
    ...typography.body.medium,
  },
  timestamp: {
    ...typography.caption,
    marginTop: spacing[1],
  },
  userTimestamp: {
    marginRight: spacing[1],
  },
  assistantTimestamp: {
    marginLeft: spacing[1],
  },
});
