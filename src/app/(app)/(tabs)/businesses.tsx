import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { formatNumber, formatPhone, LOW_SMS_BALANCE, ltr, SUBSCRIPTION_STATUS, toNumberOrNull } from '@/lib/format';
import { useBusinesses, useSmsBalances } from '@/lib/queries';
import { useParamState } from '@/lib/useParamState';
import { space, useTheme } from '@/lib/theme';
import type { AdminBusiness, SmsBalance } from '@/lib/types';
import { DataList } from '@/ui/DataList';
import { Chips, SearchBar } from '@/ui/inputs';
import { Avatar, Badge, Card, Fab, Icon } from '@/ui/primitives';
import { Text } from '@/ui/Text';

type Filter = 'all' | 'active' | 'cancelling' | 'low' | 'no-sms';

const FILTER_VALUES: Filter[] = ['all', 'active', 'cancelling', 'low', 'no-sms'];

function matches(business: AdminBusiness, filter: Filter, balance: SmsBalance | undefined) {
  const credits = toNumberOrNull(balance?.credits);
  switch (filter) {
    case 'active':
      return business.subscription === 'active';
    case 'cancelling':
      return Boolean(business.openCancellation);
    case 'low':
      return credits != null && credits < LOW_SMS_BALANCE;
    case 'no-sms':
      return !business.hasPulseem;
    default:
      return true;
  }
}

function SmsValue({ business, balance, loading }: { business: AdminBusiness; balance?: SmsBalance; loading: boolean }) {
  const theme = useTheme();
  if (!business.hasPulseem) return <Text variant="small" tone="faint">לא מחובר</Text>;
  if (!balance) return loading ? <ActivityIndicator size="small" color={theme.faint} /> : <Text variant="small" tone="faint">—</Text>;
  const credits = toNumberOrNull(balance.credits);
  if (credits == null) return <Text variant="small" tone="faint">לא זמין</Text>;
  const low = credits < LOW_SMS_BALANCE;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {low ? <Icon name="warning" size={14} color={theme.danger} /> : null}
      <Text variant="small" weight="semibold" tone={low ? 'danger' : 'text'}>
        {ltr(formatNumber(credits))} SMS
      </Text>
    </View>
  );
}

export default function BusinessesScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useParamState<Filter>(params.filter, FILTER_VALUES, 'all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const businesses = useBusinesses();
  const all = useMemo(() => businesses.data ?? [], [businesses.data]);
  const smsIds = all.filter((business) => business.hasPulseem).map((business) => business.id);
  const balances = useSmsBalances(smsIds);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    return all.filter((business) => {
      if (!matches(business, filter, balances.data?.[business.id])) return false;
      if (!term) return true;
      return (
        business.name.toLowerCase().includes(term) ||
        business.clientName.toLowerCase().includes(term) ||
        business.address.toLowerCase().includes(term) ||
        (digits.length >= 3 && business.phone.replace(/\D/g, '').includes(digits))
      );
    });
  }, [all, filter, search, balances.data]);

  const counts: Record<Filter, number> = {
    all: all.length,
    active: all.filter((b) => b.subscription === 'active').length,
    cancelling: all.filter((b) => b.openCancellation).length,
    low: all.filter((b) => matches(b, 'low', balances.data?.[b.id])).length,
    'no-sms': all.filter((b) => !b.hasPulseem).length,
  };

  return (
    <View style={{ flex: 1 }}>
      <DataList
        query={{
          ...businesses,
          refetch: async () => {
            void queryClient.invalidateQueries({ queryKey: ['balances'] });
            return businesses.refetch();
          },
        }}
        items={visible}
        keyExtractor={(business) => business.id}
        footerSpace={80}
        emptyIcon="storefront-outline"
        emptyTitle={search || filter !== 'all' ? 'לא נמצאו עסקים' : 'אין עסקים עדיין'}
        emptyMessage={search || filter !== 'all' ? 'נסו חיפוש אחר או סינון אחר' : undefined}
        header={
          <View style={{ gap: space.md }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="שם, טלפון, שם אפליקציה או כתובת" />
            <Chips
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'הכול', count: counts.all },
                { value: 'active', label: 'מנוי פעיל', count: counts.active },
                { value: 'cancelling', label: 'ביקשו לבטל', count: counts.cancelling },
                { value: 'low', label: 'יתרה נמוכה', count: balances.isPending && smsIds.length ? undefined : counts.low },
                { value: 'no-sms', label: 'בלי פולסים', count: counts['no-sms'] },
              ]}
            />
          </View>
        }
        renderItem={({ item }) => {
          const sub = SUBSCRIPTION_STATUS[item.subscription];
          return (
            <Card onPress={() => router.push(`/business/${item.id}`)} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                <Avatar uri={item.iconUrl} name={item.name} color={item.primaryColor} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight="semibold" numberOfLines={2}>
                    {item.name || 'עסק ללא שם'}
                  </Text>
                  <Text variant="small" tone="muted">
                    {item.phone ? ltr(formatPhone(item.phone)) : 'אין טלפון'} · {formatNumber(item.clientCount)} לקוחות
                  </Text>
                </View>
                <SmsValue business={item} balance={balances.data?.[item.id]} loading={balances.isFetching} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                <Badge label={sub.label} tone={sub.tone} />
                {item.openCancellation ? (
                  <Badge label={SUBSCRIPTION_STATUS.cancelling.label} tone="danger" icon="alert-circle" />
                ) : null}
              </View>
            </Card>
          );
        }}
      />
      <Fab icon="add" label="עסק חדש" onPress={() => router.push('/business/new')} />
    </View>
  );
}
