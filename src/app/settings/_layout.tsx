import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { colors as themeColors } from '@/constants/colors';

// Default background to prevent white flash (dark mode is default)
const DEFAULT_BG = themeColors.dark.bgPrimary;

export default function SettingsLayout() {
  const { colors } = useTheme();
  const bgColor = colors?.bgPrimary || DEFAULT_BG;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: bgColor },
        animation: 'default', // Platform-native push/pop animations
        gestureEnabled: Platform.OS === 'ios', // iOS swipe back gesture
      }}
    >
      <Stack.Screen name="goals" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="units" />
      <Stack.Screen name="nutrition" />
      <Stack.Screen name="water" />
      <Stack.Screen name="data" />
      <Stack.Screen name="export-data" />
      <Stack.Screen name="about" />
      <Stack.Screen name="health-notice" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="terms-of-service" />
      <Stack.Screen name="widgets" />
      <Stack.Screen name="apple-health" />
      <Stack.Screen name="health-connect" />
      <Stack.Screen name="developer" />
      <Stack.Screen name="fasting" />
      <Stack.Screen name="meal-planning" />
    </Stack>
  );
}
