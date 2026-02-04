/**
 * QuestionCategoryList - Accordion category browser
 * Groups questions by category with expand/collapse behavior.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { spacing, borderRadius } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { QuestionCard } from './QuestionCard';
import { questionCategories } from '../constants/dailyQuestionCategories';
import type {
  DailyQuestionCategory,
  DailyQuestionId,
  ScoredQuestion,
} from '../types/dailyInsights.types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface QuestionCategoryListProps {
  groupedQuestions: Map<DailyQuestionCategory, ScoredQuestion[]>;
  onQuestionPress: (questionId: DailyQuestionId) => void;
  responses?: Record<string, any>;
}

interface CategoryRowProps {
  category: DailyQuestionCategory;
  questions: ScoredQuestion[];
  expanded: boolean;
  onToggle: () => void;
  onQuestionPress: (questionId: DailyQuestionId) => void;
  responses: Record<string, any>;
}

function CategoryRow({
  category,
  questions,
  expanded,
  onToggle,
  onQuestionPress,
  responses,
}: CategoryRowProps) {
  const { colors } = useTheme();
  const rotation = useSharedValue(expanded ? 0 : -90);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    rotation.value = withTiming(expanded ? -90 : 0, { duration: 200 });
    onToggle();
  };

  const meta = questionCategories.find((m) => m.id === category);
  if (!meta) return null;

  return (
    <View style={styles.categoryContainer}>
      <Pressable
        onPress={handleToggle}
        style={[
          styles.categoryHeader,
          { borderColor: colors.borderDefault },
        ]}
      >
        <Text style={styles.categoryEmoji}>{meta.emoji}</Text>
        <View style={styles.categoryTextContainer}>
          <Text style={[styles.categoryLabel, { color: colors.textPrimary }]}>
            {meta.label}
          </Text>
          <Text style={[styles.categoryCount, { color: colors.textTertiary }]}>
            ({questions.length})
          </Text>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      {expanded && (
        <View style={styles.categoryContent}>
          {questions.map((scored) => (
            <QuestionCard
              key={scored.definition.id}
              question={scored.definition}
              onPress={() => onQuestionPress(scored.definition.id)}
              hasResponse={!!responses[scored.definition.id]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function QuestionCategoryList({
  groupedQuestions,
  onQuestionPress,
  responses = {},
}: QuestionCategoryListProps) {
  const { colors } = useTheme();
  const [expandedCategory, setExpandedCategory] = useState<DailyQuestionCategory | null>(null);

  const toggleCategory = (category: DailyQuestionCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const categories = Array.from(groupedQuestions.entries());

  if (categories.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Browse All Questions
      </Text>
      <View style={styles.list}>
        {categories.map(([category, questions]) => (
          <CategoryRow
            key={category}
            category={category}
            questions={questions}
            expanded={expandedCategory === category}
            onToggle={() => toggleCategory(category)}
            onQuestionPress={onQuestionPress}
            responses={responses}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    gap: spacing[2],
  },
  categoryContainer: {
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  categoryLabel: {
    ...typography.body.medium,
    fontWeight: '600',
  },
  categoryCount: {
    ...typography.body.small,
  },
  categoryContent: {
    paddingTop: spacing[2],
    paddingLeft: spacing[2],
    gap: spacing[2],
  },
});
