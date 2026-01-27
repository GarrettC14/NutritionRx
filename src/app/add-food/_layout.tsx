import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { useTheme } from '@/hooks/useTheme';

export default function AddFoodLayout() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'default', // Platform-native push/pop animations
          gestureEnabled: Platform.OS === 'ios', // iOS swipe back gesture
          contentStyle: { flex: 1, backgroundColor: colors.bgPrimary },
        }}
      >
        {/* Main search screen - no animation when arriving from tab bar */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />

        {/* Sub-screens - default platform push animation */}
        <Stack.Screen name="log" />
        <Stack.Screen name="quick" />
        <Stack.Screen name="create" />
        <Stack.Screen name="scan" />
      </Stack>
      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
