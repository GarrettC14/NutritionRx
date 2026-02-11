import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: 'default', // Platform-native push/pop animations
        gestureEnabled: false, // Prevent accidental back navigation during onboarding
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
  );
}
