import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { OnboardingProgressBar } from '@/components/onboarding/OnboardingProgressBar';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <OnboardingProgressBar />
      </SafeAreaView>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgPrimary },
          animation: 'default',
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="goal" />
        <Stack.Screen name="about-you" />
        <Stack.Screen name="body-stats" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="eating-style" />
        <Stack.Screen name="protein" />
        <Stack.Screen name="target" />
        <Stack.Screen name="your-plan" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {},
});
