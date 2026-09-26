import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  useFonts,
} from '@expo-google-fonts/heebo';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { DevSettings, I18nManager, Platform, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { restoreSession } from '@/lib/auth';
import { useNotificationRouting } from '@/lib/notifications';
import { queryClient } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useTheme } from '@/lib/theme';
import { FeedbackProvider } from '@/ui/feedback';

void SplashScreen.preventAutoHideAsync();

const RTL_RELOAD_KEY = 'tori_rtl_reload';

// app.json forces RTL only in a dev/production build. Expo Go ignores that, so
// set the native flag and reload once. A second launch that is still LTR falls
// through to the style direction below instead of reloading forever.
if (Platform.OS !== 'web' && !I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function RootNavigator() {
  const session = useSession();
  const theme = useTheme();
  useNotificationRouting();
  const signedIn = session.status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.page } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  const session = useSession();
  const [rtlReady, setRtlReady] = useState(Platform.OS === 'web' || I18nManager.isRTL);
  const [fontsLoaded, fontError] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
  });

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || I18nManager.isRTL) {
      void SecureStore.deleteItemAsync(RTL_RELOAD_KEY).catch(() => undefined);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const tried = await SecureStore.getItemAsync(RTL_RELOAD_KEY);
        if (tried === '1') {
          await SecureStore.deleteItemAsync(RTL_RELOAD_KEY);
          if (!cancelled) setRtlReady(true);
          return;
        }
        await SecureStore.setItemAsync(RTL_RELOAD_KEY, '1');
        if (typeof DevSettings.reload === 'function') {
          DevSettings.reload();
          return;
        }
      } catch {
        // SecureStore or reload failed: show the style-based RTL layout.
      }
      if (!cancelled) setRtlReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = (fontsLoaded || !!fontError) && session.status !== 'loading' && rtlReady;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.scheme === 'dark' ? theme.accent : theme.link,
      background: theme.page,
      card: theme.page,
      text: theme.text,
      border: theme.border,
      notification: theme.danger,
    },
  };

  return (
    <View style={{ flex: 1, direction: 'rtl' }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={navTheme}>
            <FeedbackProvider>
              <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
              <RootNavigator />
            </FeedbackProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </View>
  );
}
