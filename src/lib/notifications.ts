import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { keys } from './queries';
import { queryClient } from './query';
import { getSession, setSession, useSession } from './session';

const handled = new Set<string>();

function isAppRoute(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

function queueFromResponse(response: Notifications.NotificationResponse) {
  const id = response.notification.request.identifier;
  if (handled.has(id)) return;
  handled.add(id);
  const url = response.notification.request.content.data?.url;
  Notifications.clearLastNotificationResponse();
  if (isAppRoute(url)) setSession({ pendingUrl: url });
}

/**
 * Tapped notifications (including the one that launched a killed app) are queued
 * and opened once the admin is signed in, so a logged-out tap goes login → target.
 */
export function useNotificationRouting() {
  const session = useSession();
  const navigationKey = useRootNavigationState()?.key;

  useEffect(() => {
    const last = Notifications.getLastNotificationResponse();
    if (last) queueFromResponse(last);
    const tapped = Notifications.addNotificationResponseReceivedListener(queueFromResponse);
    const received = Notifications.addNotificationReceivedListener(() => {
      if (getSession().status !== 'signedIn') return;
      void queryClient.invalidateQueries({ queryKey: keys.badges });
      void queryClient.invalidateQueries({ queryKey: keys.summary });
    });
    return () => {
      tapped.remove();
      received.remove();
    };
  }, []);

  useEffect(() => {
    if (session.status !== 'signedIn' || !session.pendingUrl || !navigationKey) return;
    const url = session.pendingUrl;
    setSession({ pendingUrl: null });
    const timer = setTimeout(() => router.push(url as never), 250);
    return () => clearTimeout(timer);
  }, [session.status, session.pendingUrl, navigationKey]);
}
