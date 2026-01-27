import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '@/db/database';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TooltipProvider } from '@/contexts/TooltipContext';
import { TooltipModal } from '@/components/ui/TooltipModal';
import { useTheme } from '@/hooks/useTheme';
import { colors as themeColors } from '@/constants/colors';

// Default background to prevent white flash (dark mode is default)
const DEFAULT_BG = themeColors.dark.bgPrimary;

function RootLayoutContent() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'default', // Platform-native push/pop animations
          gestureEnabled: Platform.OS === 'ios', // iOS swipe back gesture
          contentStyle: { backgroundColor: colors.bgPrimary },
        }}
      >
        {/* App initializer - no animation needed */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />

        {/* Main tabs - no animation (handled by tab navigator) */}
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />

        {/* Legal acknowledgment - full screen, no back */}
        <Stack.Screen
          name="legal-acknowledgment"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            gestureEnabled: false,
          }}
        />

        {/* Full screen modal flow - slide up, no gesture dismiss */}
        <Stack.Screen
          name="onboarding"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />

        {/* Settings nested stack - default push animation */}
        <Stack.Screen name="settings" />

        {/* Add food - treated as pseudo-tab, no animation from tabs */}
        <Stack.Screen name="add-food" options={{ animation: 'none' }} />

        {/* Detail screens - default platform push animation */}
        <Stack.Screen name="food/[id]" />

        {/* Modal forms - slide up from bottom */}
        <Stack.Screen
          name="log-entry/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="log-weight"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="weekly-reflection"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Initialize database on app start and wait for it
    initDatabase()
      .then(() => setDbReady(true))
      .catch((error) => {
        console.error('Database initialization failed:', error);
        setDbReady(true); // Still proceed to show error state
      });
  }, []);

  // Wait for database before rendering routes
  if (!dbReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0D1117' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#58a6ff" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: DEFAULT_BG }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <TooltipProvider>
            <RootLayoutContent />
            <TooltipModal />
          </TooltipProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
