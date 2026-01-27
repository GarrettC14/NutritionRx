import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: 'default', // Platform-native push/pop animations
        gestureEnabled: Platform.OS === 'ios', // iOS swipe back gesture
      }}
    >
      <Stack.Screen name="goals" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="units" />
      <Stack.Screen name="nutrition" />
      <Stack.Screen name="data" />
      <Stack.Screen name="about" />
      <Stack.Screen name="developer" />
    </Stack>
  );
}
