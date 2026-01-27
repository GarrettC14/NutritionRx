import { View, StyleSheet } from 'react-native';
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
          animation: 'none',
          contentStyle: { flex: 1, backgroundColor: colors.bgPrimary },
        }}
      >
        <Stack.Screen name="index" />
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
