import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Linking, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { registerForPush, type PushRegistration } from '@/lib/push';
import { keys, usePushPrefs } from '@/lib/queries';
import { space } from '@/lib/theme';
import type { PushPreferences, PushType } from '@/lib/types';
import { useToast } from '@/ui/feedback';
import { SwitchRow } from '@/ui/inputs';
import { ScreenScroll } from '@/ui/layout';
import { Badge, Button, Card, Divider, Section } from '@/ui/primitives';
import { ErrorState, InlineNotice, ListSkeleton } from '@/ui/states';
import { Text } from '@/ui/Text';

type PrefsData = { preferences: PushPreferences; catalog: { type: PushType; label: string }[] };

const DEVICE_STATUS: Record<PushRegistration['status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  registered: { label: 'מחובר', tone: 'success' },
  denied: { label: 'אין הרשאה', tone: 'danger' },
  unsupported: { label: 'לא נתמך', tone: 'neutral' },
  'no-project': { label: 'לא מוגדר', tone: 'warning' },
  error: { label: 'שגיאה', tone: 'danger' },
};

function DeviceCard() {
  const toast = useToast();
  const device = useQuery({
    queryKey: ['push-device'],
    queryFn: async () => {
      const [permission, registration] = await Promise.all([
        Notifications.getPermissionsAsync(),
        registerForPush({ ask: false }),
      ]);
      return { permission, registration };
    },
    staleTime: 0,
  });

  const { refetch } = device;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const enable = useMutation({
    mutationFn: async () => {
      const current = await Notifications.getPermissionsAsync();
      if (!current.granted && !current.canAskAgain) {
        await Linking.openSettings();
        return null;
      }
      return registerForPush({ ask: true });
    },
    onSuccess: (result) => {
      if (result?.status === 'registered') toast('המכשיר רשום לקבלת התראות');
      else if (result?.status === 'error') toast(result.message, 'danger');
      void device.refetch();
    },
  });

  const status = device.data?.registration.status;
  const info = status ? DEVICE_STATUS[status] : null;

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text variant="h3" style={{ flex: 1 }}>
          המכשיר הזה
        </Text>
        {info ? <Badge label={info.label} tone={info.tone} /> : <Badge label="בודק…" />}
      </View>
      {status === 'denied' ? (
        <Text tone="muted">
          ההתראות חסומות. {device.data?.permission.canAskAgain ? 'אפשר לאשר אותן עכשיו.' : 'אפשר לאשר אותן בהגדרות המכשיר.'}
        </Text>
      ) : status === 'unsupported' ? (
        <Text tone="muted">התראות פוש עובדות רק על מכשיר אמיתי, לא בסימולטור.</Text>
      ) : status === 'no-project' ? (
        <Text tone="muted">לבילד הזה חסר מזהה פרויקט EAS, ולכן אי אפשר לקבל התראות. צריך להריץ eas init ולבנות מחדש.</Text>
      ) : status === 'error' && device.data?.registration.status === 'error' ? (
        <Text tone="danger">{device.data.registration.message}</Text>
      ) : status === 'registered' ? (
        <Text tone="muted">התראות יגיעו למכשיר הזה גם כשהאפליקציה סגורה.</Text>
      ) : null}
      {status && status !== 'registered' && status !== 'unsupported' && status !== 'no-project' ? (
        <Button
          label={device.data?.permission.canAskAgain === false ? 'פתיחת הגדרות המכשיר' : 'הפעלת התראות'}
          icon="notifications-outline"
          loading={enable.isPending}
          onPress={() => enable.mutate()}
        />
      ) : null}
    </Card>
  );
}

export default function NotificationSettingsScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const prefs = usePushPrefs();

  const save = useMutation({
    mutationFn: (next: PushPreferences) =>
      api<PrefsData>('/api/admin/push-preferences', { method: 'PUT', body: next }),
    onMutate: (next) => {
      const previous = queryClient.getQueryData<PrefsData>(keys.pushPrefs);
      if (previous) queryClient.setQueryData<PrefsData>(keys.pushPrefs, { ...previous, preferences: next });
      return { previous };
    },
    onError: (error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(keys.pushPrefs, context.previous);
      toast(errorMessage(error), 'danger');
    },
    onSuccess: (data) => queryClient.setQueryData(keys.pushPrefs, data),
  });

  const test = useMutation({
    mutationFn: () => api<{ sent?: number }>('/api/admin/push/test', { method: 'POST' }),
    onSuccess: () => toast('נשלחה התראת בדיקה. היא אמורה להגיע תוך כמה שניות.'),
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  if (prefs.isPending) return <ListSkeleton rows={6} avatar={false} />;
  if (prefs.isError) return <ErrorState error={prefs.error} onRetry={() => void prefs.refetch()} />;

  const { preferences, catalog } = prefs.data;

  function update(next: Partial<PushPreferences>) {
    save.mutate({ ...preferences, ...next, types: { ...preferences.types, ...next.types } });
  }

  return (
    <ScreenScroll refreshing={prefs.isRefetching} onRefresh={() => void prefs.refetch()}>
      <DeviceCard />

      <Card padded={false}>
        <SwitchRow
          label="קבלת התראות"
          description="כיבוי עוצר את כל ההתראות לכל המכשירים שלכם."
          value={preferences.enabled}
          onValueChange={(enabled) => update({ enabled })}
        />
      </Card>

      <Section title="סוגי התראות">
        <Card padded={false}>
          {catalog.map((item, index) => (
            <View key={item.type}>
              {index > 0 ? <Divider inset={16} /> : null}
              <SwitchRow
                label={item.label}
                value={preferences.types[item.type] !== false}
                disabled={!preferences.enabled}
                onValueChange={(value) => update({ types: { [item.type]: value } as Record<PushType, boolean> })}
              />
            </View>
          ))}
        </Card>
      </Section>

      <Button
        label="שליחת התראת בדיקה"
        icon="paper-plane-outline"
        variant="secondary"
        loading={test.isPending}
        onPress={() => test.mutate()}
      />
      <InlineNotice
        tone="info"
        icon="information-circle-outline"
        title="המספר על אייקון האפליקציה"
        message="סכום הבקשות הפתוחות והשיחות שממתינות לנציג."
      />
    </ScreenScroll>
  );
}
