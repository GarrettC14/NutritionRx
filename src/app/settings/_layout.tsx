import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="goals" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="units" />
      <Stack.Screen name="data" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
