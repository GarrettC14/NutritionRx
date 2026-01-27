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
      <Stack.Screen name="sex" />
      <Stack.Screen name="birthday" />
      <Stack.Screen name="height" />
      <Stack.Screen name="weight" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="goal" />
      <Stack.Screen name="target" />
      <Stack.Screen name="rate" />
      <Stack.Screen name="eating-style" />
      <Stack.Screen name="protein-priority" />
      <Stack.Screen name="summary" />
    </Stack>
  );
}
