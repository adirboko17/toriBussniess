import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { formatNumber, formatTime, INCLUDED_SMS, LOW_SMS_BALANCE, ltr, toNumberOrNull } from '@/lib/format';
import { keys, useBusinesses, usePulseemState, useSmsBalance } from '@/lib/queries';
import { radius, space, useTheme } from '@/lib/theme';
import type { BusinessDetails } from '@/lib/types';
import { useConfirm, useToast } from '@/ui/feedback';
import { Field, SearchBar } from '@/ui/inputs';
import { FormScroll } from '@/ui/layout';
import { Badge, Button, Card, Divider, IconButton, KeyValue, Row, Section } from '@/ui/primitives';
import { EmptyState, InlineNotice } from '@/ui/states';
import { Text } from '@/ui/Text';

const PRESETS = [100, 250, 500, 1000];
const MAX_TRANSFER = 10_000;

function SecretStatus({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return <Badge label={ok ? yes : no} tone={ok ? 'success' : 'neutral'} icon={ok ? 'checkmark' : 'remove'} />;
}

export function SmsTab({ id, name, details }: { id: string; name: string; details: BusinessDetails }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const state = usePulseemState(id);
  const profile = details.profile!;
  const hasAccount = !!(state.data?.hasApiKey || (state.data?.userId && state.data?.hasPassword)) ||
    !!(profile.pulseem_has_api_key || (profile.pulseem_has_user_id && profile.pulseem_has_password));
  const balance = useSmsBalance(id, hasAccount, name);
  const credits = toNumberOrNull(balance.data);

  const [preset, setPreset] = useState<number | null>(PRESETS[1]);
  const [custom, setCustom] = useState('');
  const amount = custom ? Math.floor(Number(custom)) : preset ?? 0;
  const amountValid = Number.isFinite(amount) && amount >= 1 && amount <= MAX_TRANSFER;

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [sender, setSender] = useState<string | null>(null);
  const fromNumber = sender ?? state.data?.fromNumber ?? '';

  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [moveAmount, setMoveAmount] = useState('');
  const [moveSearch, setMoveSearch] = useState('');
  const businesses = useBusinesses();
  const targets = useMemo(() => {
    const term = moveSearch.trim().toLowerCase();
    return (businesses.data ?? [])
      .filter((b) => b.id !== id && b.hasPulseem)
      .filter((b) => !term || b.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [businesses.data, id, moveSearch]);
  const target = businesses.data?.find((b) => b.id === moveTarget) ?? null;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.smsBalance(id) });
    void queryClient.invalidateQueries({ queryKey: keys.pulseemState(id) });
    void queryClient.invalidateQueries({ queryKey: ['balances'] });
    void queryClient.invalidateQueries({ queryKey: keys.mainBalance });
  };

  const topUp = useMutation({
    mutationFn: (value: number) =>
      api<{ smsCreditsAfter: number | null }>('/api/admin/pulseem/transfer', {
        method: 'POST',
        body: { businessId: id, smsCredits: value },
        timeoutMs: 90_000,
      }),
    onSuccess: (data, value) => {
      const after = typeof data.smsCreditsAfter === 'number' ? data.smsCreditsAfter : null;
      toast(`הוטענו ${formatNumber(value)} הודעות${after != null ? `. יתרה חדשה: ${formatNumber(after)}` : ''}`);
      setCustom('');
      refresh();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const move = useMutation({
    mutationFn: (input: { amount: number; destination: string }) =>
      api(`/api/admin/customers/${id}/transfer`, { method: 'POST', body: input, timeoutMs: 90_000 }),
    onSuccess: () => {
      toast('ההודעות הועברו');
      setMoveAmount('');
      setMoveTarget(null);
      refresh();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const save = useMutation({
    mutationFn: () =>
      api<{ envSynced: boolean }>('/api/admin/pulseem/save', {
        method: 'POST',
        body: {
          businessId: id,
          userId: userId.trim() || state.data?.userId || '',
          password,
          fromNumber: fromNumber.trim(),
        },
        timeoutMs: 60_000,
      }),
    onSuccess: () => {
      toast('פרטי פולסים נשמרו וסונכרנו');
      setPassword('');
      setUserId('');
      setSender(null);
      refresh();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const test = useMutation({
    mutationFn: () =>
      api<{ credits?: string; balanceNote?: string | null }>('/api/admin/pulseem/test', {
        method: 'POST',
        body: { businessId: id, userId: userId.trim() || state.data?.userId || '', password, subAccountName: name },
        timeoutMs: 60_000,
      }),
    onSuccess: (data) =>
      toast(`החיבור תקין. יתרה: ${data.credits != null ? formatNumber(data.credits) : '—'}${data.balanceNote ? ` (${data.balanceNote})` : ''}`),
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  async function onTopUp() {
    if (!amountValid) return;
    const ok = await confirm({
      title: `להטעין ${formatNumber(amount)} הודעות?`,
      message: `ההודעות יועברו מהחשבון הראשי בפולסים אל ${name}. אי אפשר להחזיר אותן אחרי ההעברה.`,
      confirmLabel: 'הטענה',
    });
    if (ok) topUp.mutate(amount);
  }

  async function onMove() {
    const value = Math.floor(Number(moveAmount));
    if (!target || !Number.isFinite(value) || value < 1) {
      toast('בחרו עסק יעד וכמות הודעות', 'danger');
      return;
    }
    const ok = await confirm({
      title: `להעביר ${formatNumber(value)} הודעות ל${target.name}?`,
      message: `ההודעות יורדו מהיתרה של ${name} ויתווספו ל${target.name}.`,
      confirmLabel: 'העברה',
    });
    if (ok) move.mutate({ amount: value, destination: target.id });
  }

  const tone = credits == null ? theme.text : credits < LOW_SMS_BALANCE ? theme.danger : theme.success;
  const pct = credits == null ? 0 : Math.max(0, Math.min(100, (credits / INCLUDED_SMS) * 100));

  return (
    <FormScroll>
      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="label" tone="muted" style={{ flex: 1 }}>
            יתרת הודעות SMS{balance.dataUpdatedAt ? ` · עודכן ${formatTime(new Date(balance.dataUpdatedAt).toISOString())}` : ''}
          </Text>
          {hasAccount ? (
            balance.isFetching ? (
              <ActivityIndicator color={theme.muted} />
            ) : (
              <IconButton icon="refresh" label="רענון היתרה" onPress={() => void balance.refetch()} />
            )
          ) : null}
        </View>
        {hasAccount ? (
          <>
            <Text variant="display" color={tone}>
              {credits != null ? ltr(formatNumber(credits)) : '—'}
            </Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.sunken, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: 8, backgroundColor: tone }} />
            </View>
            <Text variant="small" tone="muted">
              {credits == null
                ? `${formatNumber(INCLUDED_SMS)} הודעות כלולות בחודש`
                : credits >= INCLUDED_SMS
                  ? `${formatNumber(credits - INCLUDED_SMS)}+ מעבר ל-${formatNumber(INCLUDED_SMS)} הכלולות`
                  : credits < LOW_SMS_BALANCE
                    ? 'יתרה נמוכה, כדאי להטעין'
                    : `${Math.round(pct)}% מהחבילה החודשית`}
              {' · '}מתחדש ל-{formatNumber(INCLUDED_SMS)} בכל 1 לחודש
            </Text>
            {balance.isError ? <InlineNotice tone="danger" title={errorMessage(balance.error)} /> : null}
          </>
        ) : (
          <EmptyState
            icon="chatbox-outline"
            title="לעסק אין חשבון פולסים"
            message="תת-חשבון נוצר אוטומטית כשיוצרים עסק חדש. אם כבר יש לעסק חשבון, אפשר לחבר אותו בפרטי החיבור."
          />
        )}
      </Card>

      {hasAccount ? (
        <Section title={`הטענת הודעות מהחשבון הראשי · עד ${formatNumber(MAX_TRANSFER)} בפעם`}>
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {PRESETS.map((value) => {
                const active = !custom && preset === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setPreset(value);
                      setCustom('');
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      flexGrow: 1,
                      minWidth: 70,
                      paddingVertical: 10,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      alignItems: 'center',
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? theme.primary : theme.card,
                    }}
                  >
                    <Text weight="semibold" color={active ? theme.onPrimary : theme.text}>
                      {ltr(`+${formatNumber(value)}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Field
              label="או כמות אחרת"
              value={custom}
              onChangeText={(value) => setCustom(value.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="למשל 750"
              ltr
              error={amount > MAX_TRANSFER ? `מקסימום ${formatNumber(MAX_TRANSFER)} בהעברה אחת` : null}
            />
            <Button
              label={amountValid ? `הטענת ${formatNumber(amount)} הודעות` : 'בחרו כמות להטענה'}
              icon="flash-outline"
              disabled={!amountValid}
              loading={topUp.isPending}
              onPress={onTopUp}
            />
          </Card>
        </Section>
      ) : null}

      {hasAccount ? (
        <Section title="העברת הודעות לעסק אחר">
          <Card style={{ gap: space.md }}>
            {target ? (
              <Row
                title={target.name}
                subtitle="עסק יעד"
                trailing={<Button label="החלפה" size="sm" variant="secondary" onPress={() => setMoveTarget(null)} />}
              />
            ) : (
              <>
                <SearchBar value={moveSearch} onChangeText={setMoveSearch} placeholder="חיפוש עסק יעד" />
                {targets.map((b, index) => (
                  <View key={b.id}>
                    {index > 0 ? <Divider /> : null}
                    <Row title={b.name} onPress={() => setMoveTarget(b.id)} />
                  </View>
                ))}
              </>
            )}
            <Field
              label="כמות הודעות"
              value={moveAmount}
              onChangeText={(value) => setMoveAmount(value.replace(/\D/g, ''))}
              keyboardType="number-pad"
              ltr
            />
            <Button
              label="העברה"
              icon="swap-horizontal"
              variant="secondary"
              disabled={!target || !moveAmount}
              loading={move.isPending}
              onPress={onMove}
            />
          </Card>
        </Section>
      ) : null}

      <Section title="פרטי חיבור לפולסים">
        <Card style={{ gap: space.md }}>
          <View style={{ gap: 2 }}>
            <KeyValue label="שם משתמש">
              <SecretStatus ok={!!state.data?.userId} yes="מוגדר" no="חסר" />
            </KeyValue>
            <KeyValue label="סיסמה">
              <SecretStatus ok={!!state.data?.hasPassword} yes="שמורה" no="חסרה" />
            </KeyValue>
            <KeyValue label="מפתח API">
              <SecretStatus ok={!!state.data?.hasApiKey} yes="שמור" no="חסר" />
            </KeyValue>
          </View>
          <Text variant="small" tone="muted">
            הפרטים נשמרים מוצפנים בשרת ולא מוצגים באפליקציה. השאירו שדה ריק כדי לא לשנות אותו.
          </Text>
          <Field
            label="שם משתמש (WS)"
            value={userId}
            onChangeText={setUserId}
            placeholder={state.data?.userId ? 'מוגדר, השאירו ריק כדי לא לשנות' : ''}
            autoCapitalize="none"
            autoCorrect={false}
            ltr
          />
          <Field
            label="סיסמה"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder={state.data?.hasPassword ? 'שמורה, השאירו ריק כדי לא לשנות' : ''}
            ltr
          />
          <Field
            label="מספר או שם שולח"
            value={fromNumber}
            onChangeText={setSender}
            hint="מה שהלקוחות רואים כשולח ההודעה."
            autoCapitalize="none"
            ltr
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="שמירה" icon="save-outline" loading={save.isPending} onPress={() => save.mutate()} style={{ flex: 1 }} />
            <Button
              label="בדיקת חיבור"
              variant="secondary"
              disabled={!password || !(userId.trim() || state.data?.userId)}
              loading={test.isPending}
              onPress={() => test.mutate()}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </Section>
    </FormScroll>
  );
}
