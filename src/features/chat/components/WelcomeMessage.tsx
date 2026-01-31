/**
 * WelcomeMessage Component
 * Displayed when the user first opens the chat
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';

export function WelcomeMessage() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.bgElevated,
            borderColor: colors.borderDefault,
          },
        ]}
      >
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>
          Hi! I'm your nutrition assistant.
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          I can help you with:
        </Text>
        <View style={styles.capabilities}>
          <Text style={[styles.capability, { color: colors.textSecondary }]}>
            {'\u2022'} Meal suggestions based on your remaining macros
          </Text>
          <Text style={[styles.capability, { color: colors.textSecondary }]}>
            {'\u2022'} Answering nutrition questions
          </Text>
          <Text style={[styles.capability, { color: colors.textSecondary }]}>
            {'\u2022'} Understanding your eating patterns
          </Text>
        </View>
        <Text style={[styles.prompt, { color: colors.textPrimary }]}>
          What would you like to know?
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
  },
  card: {
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  greeting: {
    ...typography.title.medium,
    marginBottom: spacing[2],
  },
  description: {
    ...typography.body.medium,
    marginBottom: spacing[2],
  },
  capabilities: {
    marginBottom: spacing[3],
    gap: spacing[1],
  },
  capability: {
    ...typography.body.medium,
    paddingLeft: spacing[2],
  },
  prompt: {
    ...typography.body.large,
    fontWeight: '500',
  },
});
