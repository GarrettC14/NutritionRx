/**
 * Chat Route
 * GPT-powered nutrition chat — premium feature
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '@/hooks/useRouter';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useLLMStatus } from '@/hooks/useLLMStatus';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { typography } from '@/constants/typography';
import { spacing, borderRadius } from '@/constants/spacing';
import { ChatScreen } from '@/features/chat/screens/ChatScreen';
import { useChatStore } from '@/features/chat/stores/chatStore';
import { ModelDownloadSheet } from '@/components/llm/ModelDownloadSheet';

function ChatPreview() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView edges={['bottom']} style={[styles.previewContainer, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.previewContent}>
        <View style={[styles.iconCircle, { backgroundColor: colors.premiumGoldMuted }]}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.premiumGold} />
        </View>
        <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
          Nutrition Assistant
        </Text>
        <Text style={[styles.previewDescription, { color: colors.textSecondary }]}>
          Get personalized meal suggestions, nutrition advice, and answers based on your
          logged food data.
        </Text>
        <Pressable
          onPress={() => router.push('/paywall?context=chat')}
          style={({ pressed }) => [
            styles.upgradeButton,
            {
              backgroundColor: colors.accent,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ChatDownloadPrompt() {
  const { colors } = useTheme();
  const [showDownloadSheet, setShowDownloadSheet] = useState(false);

  return (
    <SafeAreaView edges={['bottom']} style={[styles.previewContainer, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.previewContent}>
        <View style={[styles.iconCircle, { backgroundColor: colors.premiumGoldMuted }]}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.premiumGold} />
        </View>
        <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
          Nutrition Assistant
        </Text>
        <Text style={[styles.previewDescription, { color: colors.textSecondary }]}>
          Download a small AI model to start chatting about your nutrition.
        </Text>
        <Pressable
          onPress={() => setShowDownloadSheet(true)}
          style={({ pressed }) => [
            styles.upgradeButton,
            {
              backgroundColor: colors.accent,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="cloud-download-outline" size={16} color="#FFFFFF" />
          <Text style={styles.upgradeButtonText}>Download Model</Text>
        </Pressable>
      </View>
      <ModelDownloadSheet
        visible={showDownloadSheet}
        onDismiss={() => setShowDownloadSheet(false)}
        onComplete={() => setShowDownloadSheet(false)}
      />
    </SafeAreaView>
  );
}

function ChatUnsupported() {
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['bottom']} style={[styles.previewContainer, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.previewContent}>
        <View style={[styles.iconCircle, { backgroundColor: colors.bgInteractive }]}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
        </View>
        <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
          Nutrition Assistant
        </Text>
        <Text style={[styles.previewDescription, { color: colors.textSecondary }]}>
          AI chat is not available on this device.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function ChatRoute() {
  const { colors } = useTheme();
  const { isPremium } = useSubscriptionStore();
  const clearChat = useChatStore((s) => s.clearChat);
  const messageCount = useChatStore((s) => s.messageCount);
  const { needsDownload, isUnsupported } = useLLMStatus();

  const renderContent = () => {
    if (!isPremium) return <ChatPreview />;
    if (isUnsupported) return <ChatUnsupported />;
    if (needsDownload) return <ChatDownloadPrompt />;
    return <ChatScreen />;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Nutrition Assistant',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.textPrimary,
          headerRight: () =>
            isPremium && messageCount > 0 ? (
              <Pressable onPress={clearChat} hitSlop={8}>
                <Ionicons name="refresh-outline" size={22} color={colors.textSecondary} />
              </Pressable>
            ) : null,
        }}
      />
      {renderContent()}
    </>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  previewContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  previewTitle: {
    ...typography.title.large,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  previewDescription: {
    ...typography.body.medium,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
  },
  upgradeButtonText: {
    ...typography.title.small,
    color: '#FFFFFF',
  },
});
