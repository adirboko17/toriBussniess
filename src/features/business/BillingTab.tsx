import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import {
  formatDate,
  formatDateTime,
  formatIls,
  formatNumber,
  formatPhone,
  ltr,
  PURCHASE_STATUS,
  SUBSCRIPTION_STATUS,
} from '@/lib/format';
import { keys, useCustomer } from '@/lib/queries';
import { space, useTheme } from '@/lib/theme';
import type { Recurring } from '@/lib/types';
import { useConfirm, useToast } from '@/ui/feedback';
import { SearchBar } from '@/ui/inputs';
import { ScreenScroll } from '@/ui/layout';
import { Badge, Button, Card, Divider, KeyValue, Row, Section } from '@/ui/primitives';
import { EmptyState, ErrorState, InlineNotice, ListSkeleton } from '@/ui/states';
import { Text } from '@/ui/Text';

function useDebounced(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function BillingTab({ id }: { id: string }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const customer = useCustomer(id);
  const [linking, setLinking] = useState(false);
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim());

  const recurrings = useQuery({
    queryKey: ['recurrings', term],
    enabled: linking,
    queryFn: async () =>
      (
        await api<{ recurrings: Recurring[] }>(
          `/api/admin/payplus/recurrings${term ? `?search=${encodeURIComponent(term)}` : ''}`,
          { timeoutMs: 45_000 },
        )
      ).recurrings,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: keys.customer(id) });
    void queryClient.invalidateQueries({ queryKey: keys.businesses });
    void queryClient.invalidateQueries({ queryKey: keys.summary });
    void queryClient.invalidateQueries({ queryKey: keys.cancellations });
    void queryClient.invalidateQueries({ queryKey: keys.badges });
  };

  const link = useMutation({
    mutationFn: (recurringUid: string) =>
      api<{ verified: boolean }>(`/api/admin/customers/${id}/link-recurring`, {
        method: 'POST',
        body: { recurringUid },
        timeoutMs: 45_000,
      }),
    onSuccess: (result) => {
      toast(result.verified ? 'הוראת הקבע קושרה ואומתה מול PayPlus' : 'הוראת הקבע קושרה');
      setLinking(false);
      invalidate();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const cancel = useMutation({
    mutationFn: () =>
      api<{ alreadyCancelled: boolean }>(`/api/admin/customers/${id}/cancel-recurring`, {
        method: 'POST',
        timeoutMs: 45_000,
      }),
    onSuccess: (result) => {
      toast(result.alreadyCancelled ? 'הוראת הקבע כבר הייתה מבוטלת' : 'הוראת הקבע בוטלה');
      invalidate();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  if (customer.isPending) return <ListSkeleton rows={5} avatar={false} />;
  if (customer.isError) return <ErrorState error={customer.error} onRetry={() => void customer.refetch()} />;

  const data = customer.data;
  const sub = data.payplusSubscription;
  const status = sub ? SUBSCRIPTION_STATUS[sub.status] : SUBSCRIPTION_STATUS.none;

  async function onCancel() {
    const ok = await confirm({
      title: 'לבטל את הוראת הקבע?',
      message: `החיובים החודשיים של ${data.name} ב-PayPlus ייפסקו. אי אפשר לבטל את הפעולה מהאפליקציה.`,
      confirmLabel: 'ביטול הוראת קבע',
      cancelLabel: 'חזרה',
      destructive: true,
    });
    if (ok) cancel.mutate();
  }

  async function onLink(recurring: Recurring) {
    const ok = await confirm({
      title: 'לקשר את הוראת הקבע לעסק?',
      message: `${recurring.customerName || 'לקוח'} · ${recurring.amount != null ? formatIls(recurring.amount) : ''}${
        recurring.nextChargeAt ? ` · חיוב הבא ${formatDate(recurring.nextChargeAt)}` : ''
      }`,
      confirmLabel: 'קישור',
    });
    if (ok) link.mutate(recurring.uid);
  }

  return (
    <ScreenScroll refreshing={customer.isRefetching} onRefresh={() => void customer.refetch()}>
      <Section title="הוראת קבע">
        <Card style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="h3">מנוי חודשי</Text>
            <Badge label={status.label} tone={status.tone} />
          </View>
          {sub ? (
            <>
              {sub.amountIls != null ? <KeyValue label="סכום" value={formatIls(sub.amountIls)} /> : null}
              {sub.status === 'active' ? (
                <>
                  <KeyValue label="חיוב הבא" value={formatDate(sub.nextChargeAt)} />
                  <KeyValue label="חיוב אחרון" value={formatDate(sub.lastChargeAt)} />
                </>
              ) : (
                <KeyValue label="בוטל" value={formatDateTime(sub.cancelledAt)} />
              )}
            </>
          ) : (
            <Text tone="muted">לא מקושרת הוראת קבע לעסק הזה.</Text>
          )}
          {data.openCancellation ? (
            <InlineNotice tone="danger" title="העסק ביקש לבטל" message={formatDate(data.openCancellation.requestedAt)} />
          ) : null}
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
            {sub?.status === 'active' ? (
              <Button
                label="ביטול הוראת קבע"
                variant="danger"
                icon="close-circle-outline"
                loading={cancel.isPending}
                onPress={onCancel}
                style={{ flex: 1 }}
              />
            ) : null}
            <Button
              label={linking ? 'סגירת החיפוש' : sub ? 'קישור הוראת קבע אחרת' : 'קישור הוראת קבע'}
              variant="secondary"
              icon={linking ? 'close' : 'link-outline'}
              onPress={() => setLinking((value) => !value)}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </Section>

      {linking ? (
        <Section title="הוראות קבע ב-PayPlus">
          <SearchBar value={search} onChangeText={setSearch} placeholder="שם לקוח, טלפון או מספר הוראה" />
          <Card padded={false}>
            {recurrings.isPending ? (
              <ListSkeleton rows={3} avatar={false} />
            ) : recurrings.isError ? (
              <ErrorState error={recurrings.error} onRetry={() => void recurrings.refetch()} />
            ) : recurrings.data.length === 0 ? (
              <EmptyState icon="search-outline" title="לא נמצאו הוראות קבע" />
            ) : (
              recurrings.data.map((item, index) => (
                <View key={item.uid}>
                  {index > 0 ? <Divider /> : null}
                  <Row
                    title={item.customerName || 'לקוח ללא שם'}
                    subtitle={[
                      item.customerPhone ? ltr(formatPhone(item.customerPhone)) : null,
                      item.number ? `הוראה ${ltr(item.number)}` : null,
                      item.nextChargeAt ? `חיוב הבא ${formatDate(item.nextChargeAt)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    trailing={
                      link.isPending && link.variables === item.uid ? (
                        <ActivityIndicator color={theme.muted} />
                      ) : (
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text weight="semibold">{item.amount != null ? formatIls(item.amount) : '—'}</Text>
                          {!item.valid ? <Badge label="לא פעילה" tone="neutral" /> : null}
                        </View>
                      )
                    }
                    onPress={() => void onLink(item)}
                  />
                </View>
              ))
            )}
          </Card>
        </Section>
      ) : null}

      <Section title={`רכישות SMS · ${formatNumber(data.purchaseCount)} · ${formatIls(data.purchaseTotalIls)}`}>
        <Card padded={false}>
          {data.purchases.length === 0 ? (
            <EmptyState icon="card-outline" title="אין רכישות עדיין" />
          ) : (
            data.purchases.map((purchase, index) => {
              const s = PURCHASE_STATUS[purchase.status] ?? { label: purchase.status, tone: 'neutral' as const };
              return (
                <View key={purchase.id}>
                  {index > 0 ? <Divider /> : null}
                  <Row
                    title={`${formatNumber(purchase.smsCredits)} הודעות · ${formatIls(purchase.amountIls)}`}
                    subtitle={`${formatDateTime(purchase.createdAt)}${purchase.errorMessage ? ` · ${purchase.errorMessage}` : ''}`}
                    trailing={<Badge label={s.label} tone={s.tone} />}
                  />
                </View>
              );
            })
          )}
        </Card>
      </Section>
      <Text variant="caption" tone="muted" center>
        סליקה חדשה לא מתבצעת מהאפליקציה. הלקוחות משלמים דרך דף התשלום באתר.
      </Text>
    </ScreenScroll>
  );
}
