import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { useTheme } from '@/hooks/useTheme';
import { colors as themeColors } from '@/constants/colors';

// Default background to prevent white flash (dark mode is default)
const DEFAULT_BG = themeColors.dark.bgPrimary;

export default function RestaurantLayout() {
  const { colors } = useTheme();
  const bgColor = colors?.bgPrimary || DEFAULT_BG;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'default',
          gestureEnabled: Platform.OS === 'ios',
          contentStyle: { flex: 1, backgroundColor: bgColor },
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
