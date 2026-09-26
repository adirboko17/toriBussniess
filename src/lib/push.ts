import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api, errorMessage } from './api';

const DEVICE_KEY = 'tori_admin_device_id';
const PUSH_TOKEN_KEY = 'tori_admin_push_token';

export type PushRegistration =
  | { status: 'registered' }
  | { status: 'denied' | 'unsupported' | 'no-project' }
  | { status: 'error'; message: string };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function getDeviceId() {
  let id = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_KEY, id);
  }
  return id;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'התראות ניהול',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 150, 200],
    lightColor: '#bfff51',
  });
}

export async function registerForPush(options: { ask: boolean }): Promise<PushRegistration> {
  try {
    await ensureAndroidChannel();
    if (!Device.isDevice) return { status: 'unsupported' };
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && options.ask && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return { status: 'denied' };
    const projectId =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      Constants.easConfig?.projectId;
    if (!projectId) return { status: 'no-project' };
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api('/api/admin/push-tokens', {
      method: 'POST',
      body: {
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceId: await getDeviceId(),
      },
    });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    return { status: 'registered' };
  } catch (error) {
    return { status: 'error', message: errorMessage(error, 'רישום ההתראות נכשל.') };
  }
}

export async function unregisterPush() {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  try {
    await api('/api/admin/push-tokens', {
      method: 'DELETE',
      body: { token: token ?? undefined, deviceId: await getDeviceId() },
      timeoutMs: 8_000,
    });
  } catch {
    // Logging out must succeed even when the server cannot be reached.
  }
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

export async function setAppBadge(count: number) {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Badge support depends on the launcher; ignore when unavailable.
  }
}
