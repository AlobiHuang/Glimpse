import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import { getFlag } from '@/lib/prefs';
import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icon =
  (on: IconName, off: IconName, bump = 0) =>
  // eslint-disable-next-line react/display-name -- tiny render helper for tab icons
  ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => <Ionicons name={focused ? on : off} color={color} size={size + bump} />;

export default function TabsLayout() {
  // First launch: show the welcome guide once.
  useEffect(() => {
    if (!getFlag('welcomed')) {
      const t = setTimeout(() => router.push('/welcome'), 0);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.stamp,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.rule },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Archive', tabBarIcon: icon('images', 'images-outline') }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: icon('search', 'search-outline') }} />
      <Tabs.Screen name="capture" options={{ title: 'Capture', tabBarIcon: icon('add-circle', 'add-circle-outline', 4) }} />
      <Tabs.Screen name="now" options={{ title: 'Now', tabBarIcon: icon('time', 'time-outline') }} />
      <Tabs.Screen name="yours" options={{ title: 'You', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
