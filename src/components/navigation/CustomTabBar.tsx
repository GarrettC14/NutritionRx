import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { componentSpacing } from '@/constants/spacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabItem {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  href: string;
  matchPaths?: string[];
}

const TABS: TabItem[] = [
  {
    name: 'index',
    title: 'Today',
    icon: 'today-outline',
    iconActive: 'today',
    href: '/(tabs)',
  },
  {
    name: 'food',
    title: 'Food',
    icon: 'restaurant-outline',
    iconActive: 'restaurant',
    href: '/add-food',
    matchPaths: ['/add-food'],
  },
  {
    name: 'progress',
    title: 'Progress',
    icon: 'bar-chart-outline',
    iconActive: 'bar-chart',
    href: '/(tabs)/progress',
    matchPaths: ['/progress'],
  },
  {
    name: 'settings',
    title: 'Settings',
    icon: 'settings-outline',
    iconActive: 'settings',
    href: '/(tabs)/settings',
    matchPaths: ['/settings'],
  },
];

export function CustomTabBar() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isTabActive = (tab: TabItem): boolean => {
    // Today tab - active on root/index
    if (tab.name === 'index') {
      return pathname === '/' || pathname === '/index' || pathname === '';
    }

    // Other tabs - check matchPaths
    if (tab.matchPaths) {
      return tab.matchPaths.some((path) => pathname.startsWith(path));
    }
    return false;
  };

  const handleTabPress = (tab: TabItem) => {
    if (tab.name === 'food') {
      router.push('/add-food');
    } else {
      router.replace(tab.href as any);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSecondary,
          borderTopColor: colors.borderDefault,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = isTabActive(tab);
        const color = isActive ? colors.accent : colors.textSecondary;

        return (
          <Pressable
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab)}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});
