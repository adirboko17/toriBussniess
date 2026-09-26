import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatDateTime, formatIls, formatMonth, formatNumber, israelDayKey, PURCHASE_STATUS } from '@/lib/format';
import { keys, useMainBalance, usePurchases } from '@/lib/queries';
import { space } from '@/lib/theme';
import type { AdminPurchase } from '@/lib/types';
import { DataList } from '@/ui/DataList';
import { Chips, SearchBar } from '@/ui/inputs';
import { Badge, Card, StatCard } from '@/ui/primitives';
import { Text } from '@/ui/Text';

type Filter = 'all' | 'paid' | 'pending' | 'failed';

const PAID = ['paid', 'fulfilled', 'processing'];
const FILTERS: Filter[] = ['all', 'paid', 'pending', 'failed'];

function matches(purchase: AdminPurchase, filter: Filter) {
  if (filter === 'paid') return PAID.includes(purchase.status);
  if (filter === 'pending') return purchase.status === 'pending';
  if (filter === 'failed') return purchase.status === 'failed';
  return true;
}

const monthKey = (value: string | Date) => israelDayKey(value).slice(0, 7);

export default function PurchasesScreen() {
  const queryClient = useQueryClient();
  const purchases = usePurchases();
  const mainBalance = useMainBalance();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const all = useMemo(() => purchases.data ?? [], [purchases.data]);

  const month = useMemo(() => {
    const current = monthKey(new Date());
    const paid = all.filter((p) => PAID.includes(p.status) && monthKey(p.paidAt || p.createdAt) === current);
    return {
      total: paid.reduce((sum, p) => sum + p.amountIls, 0),
      count: paid.length,
      credits: paid.reduce((sum, p) => sum + p.smsCredits, 0),
      failed: all.filter((p) => p.status === 'failed').length,
    };
  }, [all]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f, all.filter((p) => matches(p, f)).length])) as Record<Filter, number>,
    [all],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter(
      (p) => matches(p, filter) && (!term || `${p.businessName} ${p.packageLabel ?? ''}`.toLowerCase().includes(term)),
    );
  }, [all, filter, search]);

  const loading = purchases.isPending;

  return (
    <DataList
      query={{
        ...purchases,
        refetch: async () => {
          void queryClient.invalidateQueries({ queryKey: keys.mainBalance });
          return purchases.refetch();
        },
      }}
      items={visible}
      keyExtractor={(p) => p.id}
      emptyIcon="receipt-outline"
      emptyTitle="אין רכישות להצגה"
      emptyMessage="רכישות של חבילות הודעות מהאפליקציות יופיעו כאן."
      header={
        <View style={{ gap: space.md }}>
          <Text variant="label" tone="muted">
            {formatMonth()}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            <StatCard
              icon="cash-outline"
              tone="brand"
              loading={loading}
              label="הכנסות SMS החודש"
              value={formatIls(month.total)}
              hint={`${formatNumber(month.count)} רכישות`}
            />
            <StatCard
              icon="server-outline"
              loading={mainBalance.isPending}
              label="יתרה בחשבון הראשי"
              value={mainBalance.data != null ? formatNumber(mainBalance.data) : '—'}
              hint={mainBalance.isError ? 'לא זמין כרגע' : 'הודעות בפולסים'}
            />
            <StatCard icon="chatbox-outline" loading={loading} label="הודעות שנמכרו החודש" value={formatNumber(month.credits)} />
            <StatCard
              icon="close-circle-outline"
              tone={month.failed ? 'danger' : 'neutral'}
              loading={loading}
              label="רכישות שנכשלו"
              value={formatNumber(month.failed)}
              hint="תשלום שנדחה או הטענה שלא הושלמה"
            />
          </View>
          <SearchBar value={search} onChangeText={setSearch} placeholder="חיפוש לפי עסק או חבילה" />
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'הכול', count: loading ? undefined : counts.all },
              { value: 'paid', label: 'שולמו', count: loading ? undefined : counts.paid },
              { value: 'pending', label: 'ממתינות לתשלום', count: loading ? undefined : counts.pending },
              { value: 'failed', label: 'נכשלו', count: loading ? undefined : counts.failed },
            ]}
          />
          {!loading && all.length ? (
            <Text variant="caption" tone="muted">
              מוצגות {formatNumber(visible.length)} מתוך {formatNumber(all.length)} הרכישות האחרונות
            </Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const status = PURCHASE_STATUS[item.status] ?? { label: item.status, tone: 'neutral' as const };
        return (
          <Card onPress={() => router.push(`/business/${item.businessId}?tab=billing`)} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
              <Text weight="semibold" style={{ flex: 1 }}>
                {item.businessName}
              </Text>
              <Text weight="semibold">{formatIls(item.amountIls)}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <Text variant="small" tone="muted" style={{ flex: 1 }}>
                {item.packageLabel || '—'} · {formatNumber(item.smsCredits)} הודעות · {formatDateTime(item.createdAt)}
              </Text>
              <Badge label={status.label} tone={status.tone} />
            </View>
            {item.errorMessage && item.status === 'failed' ? (
              <Text variant="small" tone="danger">
                {item.errorMessage}
              </Text>
            ) : null}
          </Card>
        );
      }}
    />
  );
}
