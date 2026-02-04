/**
 * Follow-Up Chips
 * Horizontal row of tappable chips for related questions
 */

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { getQuestionById } from '../constants/questionLibrary';

interface FollowUpChipsProps {
  followUpIds: string[];
  onFollowUp: (questionId: string) => void;
}

export function FollowUpChips({ followUpIds, onFollowUp }: FollowUpChipsProps) {
  const { colors } = useTheme();

  if (followUpIds.length === 0) return null;

  const validFollowUps = followUpIds
    .map((id) => ({ id, definition: getQuestionById(id) }))
    .filter((f) => f.definition != null);

  if (validFollowUps.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {validFollowUps.map(({ id, definition }) => (
        <TouchableOpacity
          key={id}
          onPress={() => onFollowUp(id)}
          style={[styles.chip, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '30' }]}
        >
          <Text style={[styles.chipText, { color: colors.accent }]} numberOfLines={1}>
            {definition!.shortDescription}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  scrollContent: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 200,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
