import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { useTheme } from '@/hooks/useTheme';

export default function RestaurantLayout() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'default',
          gestureEnabled: Platform.OS === 'ios',
          contentStyle: { flex: 1, backgroundColor: colors.bgPrimary },
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="[restaurantId]" />
        <Stack.Screen name="food/[foodId]" />
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
