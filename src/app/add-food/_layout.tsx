import { Stack } from 'expo-router';

export default function AddFoodLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="log" />
      <Stack.Screen name="quick" />
      <Stack.Screen name="create" />
      <Stack.Screen name="scan" />
    </Stack>
  );
}
