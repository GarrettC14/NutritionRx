/**
 * ChatScreen
 * Main chat UI for the GPT nutrition assistant
 */

import React, { useRef, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { useFoodLogStore } from '@/stores/foodLogStore';
import { useGoalStore } from '@/stores/goalStore';
import { useResolvedTargets } from '@/hooks/useResolvedTargets';
import { useProfileStore } from '@/stores/profileStore';
import { useChatStore } from '../stores/chatStore';
import { ChatContext, ChatMessage } from '../types/chat';
import { QUICK_REPLIES } from '../services/contextBuilder';
import { ChatBubble } from '../components/ChatBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { QuickReplies } from '../components/QuickReplies';
import { ChatInput } from '../components/ChatInput';
import { WelcomeMessage } from '../components/WelcomeMessage';

export function ChatScreen() {
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  // Chat state
  const messages = useChatStore((s) => s.messages);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const sendMessage = useChatStore((s) => s.sendMessage);

  // App state for context
  const dailyTotals = useFoodLogStore((s) => s.dailyTotals);
  const entries = useFoodLogStore((s) => s.entries);
  const activeGoal = useGoalStore((s) => s.activeGoal);
  const { calories: calorieTarget, protein: proteinTarget, carbs: carbTarget, fat: fatTarget } = useResolvedTargets();
  const profile = useProfileStore((s) => s.profile);

  // Build context from current app state
  const context = useMemo((): ChatContext => {
    // Get goal type description
    let primaryGoal = 'General nutrition';
    if (activeGoal) {
      const goalLabels: Record<string, string> = {
        lose: 'Weight loss',
        maintain: 'Weight maintenance',
        gain: 'Weight gain',
      };
      primaryGoal = goalLabels[activeGoal.type] || activeGoal.type;
    }

    // Get eating style as dietary preference
    const restrictions: string[] = [];
    if (profile?.eatingStyle && profile.eatingStyle !== 'flexible') {
      const styleLabels: Record<string, string> = {
        carb_focused: 'Carb-focused',
        fat_focused: 'Fat-focused',
        very_low_carb: 'Very low carb / Keto',
      };
      restrictions.push(styleLabels[profile.eatingStyle] || profile.eatingStyle);
    }

    // Get recent food names
    const recentFoods = entries.slice(0, 10).map((e) => e.foodName || 'Unknown food');

    return {
      todayLog: {
        calories: dailyTotals.calories,
        calorieTarget,
        protein: dailyTotals.protein,
        proteinTarget,
        carbs: dailyTotals.carbs,
        carbTarget,
        fat: dailyTotals.fat,
        fatTarget,
        water: 0,      // Water store not wired here for simplicity
        waterTarget: 8, // Default
      },
      weeklyAverage: {
        calories: dailyTotals.calories, // Simplified: use today's data
        protein: dailyTotals.protein,
        daysLogged: 1,
      },
      goals: { primaryGoal },
      preferences: { restrictions },
      recentFoods,
    };
  }, [dailyTotals, entries, calorieTarget, proteinTarget, carbTarget, fatTarget, activeGoal, profile]);

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text, context);
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [sendMessage, context]
  );

  const handleQuickReply = useCallback(
    (reply: { text: string; prompt: string }) => {
      handleSend(reply.prompt);
    },
    [handleSend]
  );

  const showWelcome = messages.length === 0;
  const showQuickReplies = messages.length === 0 || messages.length <= 2;

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isLast = index === messages.length - 1;
      const isStreaming = isLast && item.role === 'assistant' && item.status === 'sending';
      return <ChatBubble message={item} isStreaming={isStreaming} />;
    },
    [messages.length, isGenerating]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={showWelcome ? <WelcomeMessage /> : null}
        ListFooterComponent={
          <View>
            {isGenerating && messages[messages.length - 1]?.content === '' && (
              <TypingIndicator />
            )}
            {showQuickReplies && !isGenerating && (
              <QuickReplies
                replies={QUICK_REPLIES}
                onSelect={handleQuickReply}
                disabled={isGenerating}
              />
            )}
          </View>
        }
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />
      <SafeAreaView edges={['bottom']}>
        <ChatInput onSend={handleSend} disabled={isGenerating} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    flexGrow: 1,
    paddingBottom: spacing[2],
  },
});
