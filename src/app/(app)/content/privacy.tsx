import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { formatDate, ltr } from '@/lib/format';
import { keys, usePrivacyApps } from '@/lib/queries';
import { space, useTheme } from '@/lib/theme';
import type { PrivacyApp } from '@/lib/types';
import { DataList } from '@/ui/DataList';
import { useConfirm, useToast } from '@/ui/feedback';
import { Field } from '@/ui/inputs';
import { Button, Card, IconButton } from '@/ui/primitives';
import { Text } from '@/ui/Text';

const BUNDLE_ID = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;

type Draft = { id: string | null; name: string; bundleId: string };

function AppForm({ draft, onChange, onCancel }: { draft: Draft; onChange: (draft: Draft) => void; onCancel: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const bundleError = draft.bundleId && !BUNDLE_ID.test(draft.bundleId.trim()) ? 'פורמט כמו com.example.app' : null;
  const valid = !!draft.name.trim() && BUNDLE_ID.test(draft.bundleId.trim());

  const save = useMutation({
    mutationFn: () => {
      const body = { name: draft.name.trim(), bundleId: draft.bundleId.trim() };
      return draft.id
        ? api(`/api/admin/privacy-apps/${draft.id}`, { method: 'PATCH', body })
        : api('/api/admin/privacy-apps', { method: 'POST', body });
    },
    onSuccess: () => {
      toast(draft.id ? 'האפליקציה עודכנה' : 'האפליקציה נוספה');
      void queryClient.invalidateQueries({ queryKey: keys.privacyApps });
      onCancel();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  return (
    <Card style={{ gap: space.md }}>
      <Text variant="h3">{draft.id ? 'עריכת אפליקציה' : 'אפליקציה חדשה'}</Text>
      <Field label="שם האפליקציה" value={draft.name} onChangeText={(name) => onChange({ ...draft, name })} />
      <Field
        label="מזהה חבילה (Bundle ID)"
        value={draft.bundleId}
        onChangeText={(bundleId) => onChange({ ...draft, bundleId })}
        placeholder="com.example.app"
        autoCapitalize="none"
        autoCorrect={false}
        ltr
        error={bundleError}
      />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button label="שמירה" icon="checkmark" disabled={!valid} loading={save.isPending} onPress={() => save.mutate()} style={{ flex: 1 }} />
        <Button label="ביטול" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

export default function PrivacyAppsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const apps = usePrivacyApps();
  const [draft, setDraft] = useState<Draft | null>(null);

  const remove = useMutation({
    mutationFn: (app: PrivacyApp) => api(`/api/admin/privacy-apps/${app.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('האפליקציה נמחקה');
      void queryClient.invalidateQueries({ queryKey: keys.privacyApps });
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  async function onDelete(app: PrivacyApp) {
    const ok = await confirm({
      title: `למחוק את ${app.name}?`,
      message: 'האפליקציה תוסר מרשימת האפליקציות במדיניות הפרטיות.',
      confirmLabel: 'מחיקה',
      destructive: true,
    });
    if (ok) remove.mutate(app);
  }

  return (
    <DataList
      query={apps}
      items={apps.data ?? []}
      keyExtractor={(app) => app.id}
      emptyIcon="shield-checkmark-outline"
      emptyTitle="אין אפליקציות ברשימה"
      emptyMessage="אפליקציות שמופיעות כאן מקבלות עמוד מדיניות פרטיות באתר."
      header={
        draft ? (
          <AppForm draft={draft} onChange={setDraft} onCancel={() => setDraft(null)} />
        ) : (
          <Button label="אפליקציה חדשה" icon="add" onPress={() => setDraft({ id: null, name: '', bundleId: '' })} />
        )
      }
      renderItem={({ item }) => (
        <Card style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text weight="semibold">{item.name}</Text>
            <Text variant="small" tone="muted">
              {ltr(item.bundle_id)} · {formatDate(item.created_at)}
            </Text>
          </View>
          <IconButton
            icon="create-outline"
            label={`עריכת ${item.name}`}
            onPress={() => setDraft({ id: item.id, name: item.name, bundleId: item.bundle_id })}
          />
          <IconButton
            icon="trash-outline"
            label={`מחיקת ${item.name}`}
            color={theme.danger}
            disabled={remove.isPending}
            onPress={() => void onDelete(item)}
          />
        </Card>
      )}
    />
  );
}
