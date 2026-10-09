import * as SecureStore from 'expo-secure-store';
import { api } from './api';
import { setAppBadge, unregisterPush } from './push';
import { queryClient } from './query';
import { onUnauthorized, setSession } from './session';

const TOKEN_KEY = 'tori_admin_session';
const EXPIRES_KEY = 'tori_admin_session_expires';

export async function restoreSession() {
  try {
    const [token, expires] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(EXPIRES_KEY),
    ]);
    const expiresAt = expires ? Date.parse(expires) : 0;
    if (token && expiresAt > Date.now() + 60_000) {
      setSession({ status: 'signedIn', token });
      return;
    }
  } catch {
    // Unreadable keychain entry: treat as signed out.
  }
  await clearLocalSession();
}

export async function startLogin(phone: string) {
  return api<{ phone: string; otpToken: string }>('/api/admin/start-login', {
    method: 'POST',
    body: { phone, client: 'mobile' },
  });
}

export async function verifyOtp(code: string, otpToken: string) {
  const result = await api<{ token: string; expiresAt: string }>('/api/admin/verify-otp', {
    method: 'POST',
    body: { code, otpToken, client: 'mobile' },
  });
  if (!result.token) throw new Error('ההתחברות נכשלה. נסו שוב.');
  await SecureStore.setItemAsync(TOKEN_KEY, result.token);
  await SecureStore.setItemAsync(EXPIRES_KEY, result.expiresAt);
  setSession({ status: 'signedIn', token: result.token });
}

export async function clearLocalSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(EXPIRES_KEY),
  ]).catch(() => undefined);
  queryClient.clear();
  setSession({ status: 'signedOut', token: null });
  void setAppBadge(0);
}

export async function signOut() {
  await unregisterPush();
  try {
    await api('/api/admin/logout', { method: 'POST', timeoutMs: 8_000 });
  } catch {
    // The local token is deleted regardless.
  }
  await clearLocalSession();
}

onUnauthorized(() => {
  void clearLocalSession();
});
