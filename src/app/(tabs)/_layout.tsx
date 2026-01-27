import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { useTheme } from '@/hooks/useTheme';
import { colors as themeColors } from '@/constants/colors';

// Get the default dark background for immediate render (no flash)
const DEFAULT_BG = themeColors.dark.bgPrimary;

export default function TabLayout() {
  const { colors } = useTheme();
  const bgColor = colors?.bgPrimary || DEFAULT_BG;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          lazy: false, // Pre-render all tab screens to avoid flash
          // @ts-ignore - sceneContainerStyle exists on BottomTabNavigator
          sceneContainerStyle: { backgroundColor: bgColor },
        }}
        tabBar={() => <CustomTabBar />}
      >
        <Tabs.Screen
          name="index"
          options={{
            // @ts-ignore
            contentStyle: { backgroundColor: bgColor },
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            // @ts-ignore
            contentStyle: { backgroundColor: bgColor },
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            // @ts-ignore
            contentStyle: { backgroundColor: bgColor },
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
