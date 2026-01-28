import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function ImportDataLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="source" />
      <Stack.Screen name="type" />
      <Stack.Screen name="preview" />
      <Stack.Screen name="progress" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
