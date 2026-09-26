import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import {
  canSendFirstMessage,
  DEFAULT_BUSINESS_TYPE,
  firstLeadMessagePreview,
  LEAD_STATUSES,
  leadStatusOf,
  sourceLabel,
} from '@/features/whatsapp/copy';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime, formatPhone, LEAD_STATUS, ltr } from '@/lib/format';
import { keys, useLeads } from '@/lib/queries';
import { radius, space, useTheme } from '@/lib/theme';
import type { Lead, LeadStatus } from '@/lib/types';
import { useConfirm, useToast } from '@/ui/feedback';
import { Field } from '@/ui/inputs';
import { FormScroll } from '@/ui/layout';
import { Button, Card, KeyValue, Section } from '@/ui/primitives';
import { ErrorState, ListSkeleton } from '@/ui/states';
import { Text } from '@/ui/Text';

function useInvalidateLeads() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: keys.leads });
    void queryClient.invalidateQueries({ queryKey: keys.conversations });
  };
}

function NewLead() {
  const toast = useToast();
  const invalidate = useInvalidateLeads();
  const [business, setBusiness] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState(DEFAULT_BUSINESS_TYPE);
  const [notes, setNotes] = useState('');
  const valid = !!business.trim() && !!phone.trim();

  const save = useMutation({
    mutationFn: () =>
      api('/api/admin/whatsapp/leads', {
        method: 'POST',
        body: { business, name, phone, business_type: businessType, notes },
      }),
    onSuccess: () => {
      toast('הליד נוסף');
      invalidate();
      router.back();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  return (
    <FormScroll
      footer={<Button label="הוספת הליד" icon="add" disabled={!valid} loading={save.isPending} onPress={() => save.mutate()} />}
    >
      <Stack.Screen options={{ title: 'ליד חדש' }} />
      <Card style={{ gap: space.md }}>
        <Field label="שם העסק" value={business} onChangeText={setBusiness} />
        <Field
          label="טלפון"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="05X-XXXXXXX"
          ltr
        />
        <Field label="איש קשר" value={name} onChangeText={setName} hint="ברירת מחדל: שם העסק" />
        <Field label="סוג העסק" value={businessType} onChangeText={setBusinessType} />
        <Field label="הערות" value={notes} onChangeText={setNotes} multiline hint="לא חובה" />
      </Card>
    </FormScroll>
  );
}

function StatusPicker({ value, onChange }: { value: LeadStatus; onChange: (value: LeadStatus) => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {LEAD_STATUSES.map((status) => {
        const active = status === value;
        return (
          <Pressable
            key={status}
            onPress={() => onChange(status)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: active ? theme.primary : theme.border,
              backgroundColor: active ? theme.primary : theme.card,
            }}
          >
            <Text variant="small" weight="medium" color={active ? theme.onPrimary : theme.text}>
              {LEAD_STATUS[status].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EditLead({ lead }: { lead: Lead }) {
  const theme = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const invalidate = useInvalidateLeads();
  const [messageName, setMessageName] = useState(lead.message_name ?? '');
  const [status, setStatus] = useState<LeadStatus>(leadStatusOf(lead));
  const dirty = messageName.trim() !== (lead.message_name ?? '').trim() || status !== leadStatusOf(lead);
  const canSend = canSendFirstMessage(lead.source);
  const path = `/api/admin/whatsapp/leads/${encodeURIComponent(lead.id)}`;
  const title = lead.business || formatPhone(lead.phone);

  const save = useMutation({
    mutationFn: () => api(path, { method: 'PATCH', body: { message_name: messageName.trim(), status } }),
    onSuccess: () => {
      toast('הליד עודכן');
      invalidate();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const sendFirst = useMutation({
    mutationFn: () => api(`${path}/send`, { method: 'POST', timeoutMs: 45_000 }),
    onSuccess: () => {
      toast('ההודעה הראשונה נשלחה');
      invalidate();
      router.back();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const remove = useMutation({
    mutationFn: () => api(path, { method: 'DELETE' }),
    onSuccess: () => {
      toast('הליד נמחק');
      invalidate();
      router.back();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const busy = save.isPending || sendFirst.isPending || remove.isPending;

  async function onSendFirst() {
    const ok = await confirm({
      title: `לשלוח הודעה ראשונה ל${lead.message_name}?`,
      message: firstLeadMessagePreview(lead.message_name ?? ''),
      confirmLabel: 'שליחה',
    });
    if (ok) sendFirst.mutate();
  }

  async function onDelete() {
    const ok = await confirm({
      title: `למחוק את ${lead.message_name || lead.business || formatPhone(lead.phone)}?`,
      message: 'הליד יוסר מהרשימה.',
      confirmLabel: 'מחיקה',
      destructive: true,
    });
    if (ok) remove.mutate();
  }

  return (
    <FormScroll
      footer={
        <Button label="שמירה" icon="checkmark" disabled={!dirty || busy} loading={save.isPending} onPress={() => save.mutate()} />
      }
    >
      <Stack.Screen options={{ title }} />
      <Card>
        <KeyValue label="איש קשר" value={lead.name || '—'} />
        <KeyValue label="טלפון">
          <Pressable
            onPress={() => void Linking.openURL(`https://wa.me/${lead.phone.replace(/\D/g, '')}`)}
            accessibilityRole="link"
          >
            <Text weight="medium" color={theme.link}>
              {ltr(formatPhone(lead.phone))}
            </Text>
          </Pressable>
        </KeyValue>
        <KeyValue label="סוג העסק" value={lead.business_type || '—'} />
        <KeyValue label="מקור" value={sourceLabel(lead.source)} />
        <KeyValue label="נוסף" value={formatDateTime(lead.created_at)} />
        {lead.notes ? <KeyValue label="הערות" value={lead.notes} /> : null}
      </Card>

      <Section title="סטטוס">
        <StatusPicker value={status} onChange={setStatus} />
      </Section>

      <Card style={{ gap: space.md }}>
        <Field
          label="שם בהודעה"
          value={messageName}
          onChangeText={setMessageName}
          hint="הפנייה בהודעה הראשונה, למשל ״היי דנה״"
        />
        {canSend ? (
          <View style={{ gap: space.sm }}>
            <Text variant="label" tone="muted">
              הודעה ראשונה
            </Text>
            <View
              style={{
                alignSelf: 'flex-end',
                maxWidth: '100%',
                padding: space.md,
                borderRadius: radius.lg,
                backgroundColor: theme.bubbleBot,
                borderWidth: 0.5,
                borderColor: theme.border,
              }}
            >
              <Text>{firstLeadMessagePreview(messageName)}</Text>
            </View>
            <Button
              label="שליחת ההודעה"
              icon="send"
              variant="secondary"
              disabled={busy || dirty || !(lead.message_name ?? '').trim()}
              loading={sendFirst.isPending}
              onPress={onSendFirst}
            />
            {dirty ? (
              <Text variant="small" tone="muted">
                שמרו קודם את השינויים
              </Text>
            ) : !(lead.message_name ?? '').trim() ? (
              <Text variant="small" tone="muted">
                צריך שם בהודעה
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Button label="מחיקת הליד" icon="trash-outline" variant="danger" disabled={busy} loading={remove.isPending} onPress={onDelete} />
    </FormScroll>
  );
}

export default function LeadScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const leads = useLeads();
  if (!params.id) return <NewLead />;
  if (leads.isPending) return <ListSkeleton rows={4} avatar={false} />;
  const lead = leads.data?.find((item) => item.id === params.id);
  if (!lead) {
    return <ErrorState error={leads.error ?? new Error('הליד לא נמצא. ייתכן שנמחק.')} onRetry={() => void leads.refetch()} />;
  }
  return <EditLead key={lead.id} lead={lead} />;
}
