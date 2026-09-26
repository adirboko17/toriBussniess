import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useBadges } from '@/lib/queries';
import { useTheme } from '@/lib/theme';
import { fonts } from '@/ui/Text';

function badge(count: number | undefined) {
  if (!count) return undefined;
  return count > 99 ? '99+' : count;
}

export default function TabsLayout() {
  const theme = useTheme();
  const badges = useBadges(true);
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.page },
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: theme.text },
        tabBarActiveTintColor: theme.scheme === 'dark' ? theme.accent : theme.text,
        tabBarInactiveTintColor: theme.faint,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarBadgeStyle: { backgroundColor: theme.danger, color: '#ffffff', fontFamily: fonts.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: theme.page },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'לוח בקרה',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="businesses"
        options={{
          title: 'עסקים',
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'בקשות',
          tabBarBadge: badge(badges.data?.openRequests),
          tabBarIcon: ({ color, size }) => <Ionicons name="mail-unread-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="whatsapp"
        options={{
          title: 'וואטסאפ',
          tabBarBadge: badge(badges.data?.waitingChats),
          tabBarIcon: ({ color, size }) => <Ionicons name="logo-whatsapp" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'עוד',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
