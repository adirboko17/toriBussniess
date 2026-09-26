import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { formatIls, ltr, withVat } from '@/lib/format';
import { keys, usePricing } from '@/lib/queries';
import { space } from '@/lib/theme';
import type { Pricing } from '@/lib/types';
import { useConfirm, useToast } from '@/ui/feedback';
import { Field } from '@/ui/inputs';
import { FormScroll } from '@/ui/layout';
import { Button, Card, KeyValue, Section } from '@/ui/primitives';
import { ErrorState, InlineNotice, ListSkeleton } from '@/ui/states';
import { Text } from '@/ui/Text';

export default function PricingScreen() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const pricing = usePricing();
  const [edited, setEdited] = useState<string | null>(null);
  const value = edited ?? (pricing.data ? String(pricing.data.monthlyPriceIls) : '');

  const price = Number(value);
  const valid = value !== '' && Number.isFinite(price) && price > 0;
  const changed = valid && price !== pricing.data?.monthlyPriceIls;

  const save = useMutation({
    mutationFn: () => api<Pricing>('/api/admin/pricing', { method: 'PUT', body: { monthlyPriceIls: price } }),
    onSuccess: (data) => {
      queryClient.setQueryData(keys.pricing, data);
      setEdited(null);
      void queryClient.invalidateQueries({ queryKey: keys.summary });
      toast(`המחיר החודשי עודכן ל-${formatIls(price)}`);
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  async function onSave() {
    const ok = await confirm({
      title: `לעדכן את המחיר החודשי ל-${formatIls(price)}?`,
      message: `כולל מע״מ: ${formatIls(withVat(price))}. הוראות קבע קיימות ב-PayPlus לא משתנות אוטומטית.`,
      confirmLabel: 'עדכון',
    });
    if (ok) save.mutate();
  }

  if (pricing.isPending) return <ListSkeleton rows={3} avatar={false} />;
  if (pricing.isError) return <ErrorState error={pricing.error} onRetry={() => void pricing.refetch()} />;
  const data = pricing.data;

  return (
    <FormScroll
      footer={<Button label="שמירה" icon="save-outline" disabled={!changed} loading={save.isPending} onPress={onSave} />}
    >
      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <Text variant="display">{ltr(formatIls(data.monthlyPriceIls))}</Text>
          <Text tone="muted">לחודש, לפני מע״מ</Text>
        </View>
        <KeyValue label="מע״מ 18%" value={formatIls(data.vat)} />
        <KeyValue label="סה״כ לתשלום" value={formatIls(data.total)} />
      </Card>
      <Section title="עדכון המחיר">
        <Card style={{ gap: space.md }}>
          <Field
            label="מחיר לפני מע״מ (₪)"
            value={value}
            onChangeText={(text) => setEdited(text.replace(/[^\d.]/g, ''))}
            keyboardType="decimal-pad"
            ltr
            error={value && !valid ? 'יש להזין מחיר חיובי' : null}
            hint={valid ? `כולל מע״מ: ${formatIls(withVat(price))}` : undefined}
          />
          <Text variant="small" tone="muted">
            המחיר שמוצג באתר ונגבה בהוראת הקבע של עסקים חדשים.
          </Text>
        </Card>
      </Section>
      <InlineNotice tone="info" icon="information-circle-outline" title="הוראות קבע קיימות ב-PayPlus לא משתנות אוטומטית." />
    </FormScroll>
  );
}
