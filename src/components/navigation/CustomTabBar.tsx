import { View, Pressable, Text, StyleSheet, Platform, Keyboard } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { componentSpacing } from '@/constants/spacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { TestIDs } from '@/constants/testIDs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface TabItem {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  routeName: string;
}

const TAB_TEST_IDS: Record<string, string> = {
  index: TestIDs.TabBar.HomeTab,
  food: TestIDs.TabBar.FoodTab,
  progress: TestIDs.TabBar.ProgressTab,
  settings: TestIDs.TabBar.SettingsTab,
};

const TABS: TabItem[] = [
  {
    name: 'index',
    title: 'Today',
    icon: 'today-outline',
    iconActive: 'today',
    routeName: 'index',
  },
  {
    name: 'food',
    title: 'Food',
    icon: 'restaurant-outline',
    iconActive: 'restaurant',
    routeName: 'food',
  },
  {
    name: 'progress',
    title: 'Progress',
    icon: 'bar-chart-outline',
    iconActive: 'bar-chart',
    routeName: 'progress',
  },
  {
    name: 'settings',
    title: 'Settings',
    icon: 'settings-outline',
    iconActive: 'settings',
    routeName: 'settings',
  },
];

/**
 * Map pathname to the corresponding tab name.
 * Handles routes outside the tab navigator (e.g. /add-food/* → 'food').
 */
function resolveActiveTab(pathname: string, tabState?: BottomTabBarProps['state']): string {
  // When inside the tab navigator, use its state directly
  if (tabState) {
    return tabState.routes[tabState.index]?.name ?? 'index';
  }

  // Outside the tab navigator — resolve from the current pathname
  if (pathname.startsWith('/add-food') || pathname.startsWith('/restaurant')) {
    return 'food';
  }
  if (pathname.startsWith('/progress') || pathname === '/(tabs)/progress') {
    return 'progress';
  }
  if (pathname.startsWith('/settings') || pathname === '/(tabs)/settings') {
    return 'settings';
  }
  return 'index';
}

export function CustomTabBar(props: Partial<BottomTabBarProps>) {
  const { navigation, state } = props as BottomTabBarProps;
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Hide tab bar when keyboard is visible
  if (isKeyboardVisible) {
    return null;
  }

  const activeTab = resolveActiveTab(pathname, state);

  const isTabActive = (tab: TabItem): boolean => {
    return tab.name === activeTab;
  };

  const handleTabPress = (tab: TabItem) => {
    if (tab.name === 'food') {
      router.push('/add-food');
    } else if (navigation) {
      // Inside the tab navigator — use tab navigation
      navigation.navigate(tab.routeName);
    } else {
      // Outside the tab navigator — use router to go back to tabs
      router.replace(`/(tabs)/${tab.routeName === 'index' ? '' : tab.routeName}` as any);
    }
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bgSecondary }]}>
      <View
        testID={TestIDs.TabBar.Container}
        style={[
          styles.container,
          {
            backgroundColor: colors.bgSecondary,
            borderTopColor: colors.borderDefault,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = isTabActive(tab);
          const color = isActive ? colors.accent : colors.textSecondary;

          return (
            <Pressable
              key={tab.name}
              testID={TAB_TEST_IDS[tab.name]}
              style={styles.tab}
              onPress={() => handleTabPress(tab)}
              accessibilityRole="tab"
              accessibilityLabel={tab.title}
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={24}
                color={color}
              />
              <Text style={[styles.label, { color }]}>{tab.title}</Text>
            </Pressable>
          );
        })}
      </View>
      {/* Safe area bottom fill */}
      <View
        style={{
          height: insets.bottom > 0 ? insets.bottom : 20,
          backgroundColor: colors.bgSecondary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Ensures background color fills the entire bottom area
  },
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});
