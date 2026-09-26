import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  useFonts,
} from '@expo-google-fonts/heebo';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { restoreSession } from '@/lib/auth';
import { useNotificationRouting } from '@/lib/notifications';
import { queryClient } from '@/lib/query';
import { useSession } from '@/lib/session';
import { useTheme } from '@/lib/theme';
import { FeedbackProvider } from '@/ui/feedback';

void SplashScreen.preventAutoHideAsync();

// Native RTL is forced in app.json; this covers dev clients that start LTR once.
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
  const [fontsLoaded, fontError] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
  });

  useEffect(() => {
    void restoreSession();
  }, []);

  const ready = (fontsLoaded || !!fontError) && session.status !== 'loading';
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
  );
}
