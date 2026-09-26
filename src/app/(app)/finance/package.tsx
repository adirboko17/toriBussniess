import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { perMessage } from '@/lib/format';
import { keys, usePackages } from '@/lib/queries';
import { space } from '@/lib/theme';
import type { SmsPackageRow } from '@/lib/types';
import { useConfirm, useToast } from '@/ui/feedback';
import { Field, SwitchRow } from '@/ui/inputs';
import { FormScroll } from '@/ui/layout';
import { Button, Card, Divider } from '@/ui/primitives';
import { ErrorState, ListSkeleton } from '@/ui/states';
import { Text } from '@/ui/Text';

function PackageForm({ pack }: { pack: SmsPackageRow | null }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const [label, setLabel] = useState(pack?.label ?? '');
  const [smsCredits, setSmsCredits] = useState(pack ? String(pack.sms_credits) : '');
  const [amountIls, setAmountIls] = useState(pack ? String(pack.amount_ils) : '');
  const [featured, setFeatured] = useState(pack?.featured ?? false);
  const [isActive, setIsActive] = useState(pack?.is_active ?? true);

  const credits = Number(smsCredits);
  const amount = Number(amountIls);
  const valid =
    label.trim().length > 0 && Number.isInteger(credits) && credits > 0 && amountIls !== '' && Number.isFinite(amount) && amount >= 0;

  const done = (message: string) => {
    toast(message);
    void queryClient.invalidateQueries({ queryKey: keys.packages });
    router.back();
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { label: label.trim(), smsCredits: credits, amountIls: amount, featured, isActive };
      return pack
        ? api(`/api/admin/packages/${pack.id}`, { method: 'PATCH', body })
        : api('/api/admin/packages', { method: 'POST', body });
    },
    onSuccess: () => done(pack ? 'החבילה עודכנה' : 'החבילה נוספה'),
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/admin/packages/${pack!.id}`, { method: 'DELETE' }),
    onSuccess: () => done('החבילה נמחקה'),
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  async function onDelete() {
    if (!pack) return;
    const ok = await confirm({
      title: `למחוק את "${pack.label}"?`,
      message: 'החבילה תוסר מהחנות באתר. רכישות קודמות לא יושפעו. אם רוצים רק להסתיר אותה, אפשר לכבות אותה במקום.',
      confirmLabel: 'מחיקה',
      destructive: true,
    });
    if (ok) remove.mutate();
  }

  return (
    <FormScroll
      footer={
        <Button
          label={pack ? 'שמירה' : 'הוספת החבילה'}
          icon="checkmark"
          disabled={!valid || remove.isPending}
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
      }
    >
      <Stack.Screen options={{ title: pack ? 'עריכת חבילה' : 'חבילה חדשה' }} />
      <Text tone="muted">הכמות והמחיר הם מה שנמכר בחנות ה-SMS באתר.</Text>
      <Card style={{ gap: space.md }}>
        <Field label="שם החבילה" value={label} onChangeText={setLabel} placeholder="למשל: 500 הודעות" />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field
              label="כמות הודעות"
              value={smsCredits}
              onChangeText={(text) => setSmsCredits(text.replace(/\D/g, ''))}
              keyboardType="number-pad"
              ltr
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="מחיר (₪)"
              value={amountIls}
              onChangeText={(text) => setAmountIls(text.replace(/[^\d.]/g, ''))}
              keyboardType="decimal-pad"
              ltr
            />
          </View>
        </View>
        <Text variant="small" tone="muted">
          {valid ? perMessage({ amount_ils: amount, sms_credits: credits }) : 'המחיר להודעה יחושב אוטומטית.'}
        </Text>
      </Card>
      <Card padded={false}>
        <SwitchRow label="סימון כ״הכי משתלם״" value={featured} onValueChange={setFeatured} />
        <Divider inset={16} />
        <SwitchRow label="מוצגת בחנות" value={isActive} onValueChange={setIsActive} />
      </Card>
      {pack ? (
        <Button label="מחיקת החבילה" icon="trash-outline" variant="danger" loading={remove.isPending} onPress={onDelete} />
      ) : null}
    </FormScroll>
  );
}

export default function PackageScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const packages = usePackages();
  if (!params.id) return <PackageForm pack={null} />;
  if (packages.isPending) return <ListSkeleton rows={3} avatar={false} />;
  const pack = packages.data?.find((row) => row.id === params.id);
  if (!pack) {
    return <ErrorState error={packages.error ?? new Error('החבילה לא נמצאה.')} onRetry={() => void packages.refetch()} />;
  }
  return <PackageForm key={pack.id} pack={pack} />;
}
