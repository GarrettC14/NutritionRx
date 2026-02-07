/**
 * ChatInput Component
 * Text input with send button for the chat
 */

import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask me anything...',
}: ChatInputProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={[styles.container, { borderTopColor: colors.borderDefault }]}>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.bgElevated,
            borderColor: colors.borderDefault,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={500}
          editable={!disabled}
          accessibilityLabel="Message input"
          accessibilityHint="Type your question here"
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: canSend ? colors.accent : colors.bgInteractive,
              opacity: pressed && canSend ? 0.7 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
        >
          <Ionicons
            name="send"
            size={18}
            color={canSend ? '#FFFFFF' : colors.textDisabled}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: Platform.OS === 'ios' ? spacing[1] : spacing[2],
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingLeft: spacing[4],
    paddingRight: spacing[1],
    paddingVertical: spacing[1],
  },
  input: {
    flex: 1,
    ...typography.body.medium,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? spacing[2] : spacing[1],
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
});
