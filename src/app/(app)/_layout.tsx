import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { registerForPush, setAppBadge } from '@/lib/push';
import { useBadges } from '@/lib/queries';
import { useTheme } from '@/lib/theme';
import { modalOptions } from '@/ui/HeaderClose';
import { fonts } from '@/ui/Text';

export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  const theme = useTheme();
  const badges = useBadges(true);

  useEffect(() => {
    void registerForPush({ ask: true });
  }, []);

  useEffect(() => {
    if (badges.data) void setAppBadge(badges.data.total);
  }, [badges.data]);

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.page },
        headerTintColor: theme.text,
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: theme.text },
        contentStyle: { backgroundColor: theme.page },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="business/[id]" options={{ title: 'עסק' }} />
      <Stack.Screen name="business/new" options={{ title: 'עסק חדש', ...modalOptions }} />
      <Stack.Screen name="chat/[phone]" options={{ title: 'שיחה' }} />
      <Stack.Screen name="whatsapp/lead" options={{ title: 'ליד', ...modalOptions }} />
      <Stack.Screen name="whatsapp/import" options={{ title: 'ייבוא לידים מאקסל', ...modalOptions }} />
      <Stack.Screen name="whatsapp/settings" options={{ title: 'הגדרות הבוט' }} />
      <Stack.Screen name="finance/purchases" options={{ title: 'רכישות SMS' }} />
      <Stack.Screen name="finance/pricing" options={{ title: 'מחיר מנוי' }} />
      <Stack.Screen name="finance/packages" options={{ title: 'חבילות SMS' }} />
      <Stack.Screen name="finance/package" options={{ title: 'חבילה', ...modalOptions }} />
      <Stack.Screen name="content/messages" options={{ title: 'הודעות תפעוליות' }} />
      <Stack.Screen name="content/message" options={{ title: 'הודעה', ...modalOptions }} />
      <Stack.Screen name="content/help" options={{ title: 'מרכז עזרה' }} />
      <Stack.Screen name="content/category" options={{ title: 'קטגוריה', ...modalOptions }} />
      <Stack.Screen name="content/video" options={{ title: 'סרטון', ...modalOptions }} />
      <Stack.Screen name="content/privacy" options={{ title: 'אפליקציות בפרטיות' }} />
      <Stack.Screen name="settings/notifications" options={{ title: 'הגדרות התראות' }} />
    </Stack>
  );
}
