import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import {
  appRouteFromWebHref,
  formatIls,
  formatNumber,
  formatRelative,
  INCLUDED_SMS,
  LOW_SMS_BALANCE,
  toNumberOrNull,
} from '@/lib/format';
import { keys, useMainBalance, useSmsBalances, useSummary } from '@/lib/queries';
import { space, toneColors, useTheme, type Tone } from '@/lib/theme';
import type { ActivityItem, AdminSummary, SmsBalance } from '@/lib/types';
import { ScreenScroll } from '@/ui/layout';
import { Card, Divider, Fab, Icon, Row, Section, StatCard, type IconName } from '@/ui/primitives';
import { CardsSkeleton, EmptyState, ErrorState, InlineNotice, ListSkeleton } from '@/ui/states';
import { Text } from '@/ui/Text';

type Attention = {
  id: string;
  icon: IconName;
  tone: Tone;
  title: string;
  detail: string;
  at?: string | null;
  route?: string;
};

function buildAttention(
  summary: AdminSummary,
  balances: Record<string, SmsBalance> | undefined,
  mainCredits: number | null,
): Attention[] {
  const items: Attention[] = [];
  const monthlyRefill = summary.smsBusinesses.length * INCLUDED_SMS;
  if (mainCredits != null && mainCredits < monthlyRefill) {
    items.push({
      id: 'pulseem-main',
      icon: 'paper-plane-outline',
      tone: 'danger',
      title: 'יתרה נמוכה בחשבון פולסים הראשי',
      detail: `נשארו ${formatNumber(mainCredits)} הודעות · החידוש החודשי צריך עד ${formatNumber(monthlyRefill)}`,
    });
  }
  for (const request of summary.openCancellations) {
    items.push({
      id: `c-${request.id}`,
      icon: 'person-remove-outline',
      tone: 'warning',
      title: `${request.businessName} ביקשו לבטל את המנוי`,
      detail: `${request.requestedByName}${request.status === 'seen' ? ' · נצפה' : ' · בקשה חדשה'}`,
      at: request.requestedAt,
      route: '/requests',
    });
  }
  for (const request of summary.recentDeletions) {
    items.push({
      id: `d-${request.id}`,
      icon: 'trash-outline',
      tone: 'danger',
      title: `בקשת מחיקת חשבון: ${request.fullName || 'משתמש'}`,
      detail: request.appName || 'אפליקציה לא ידועה',
      at: request.createdAt,
      route: '/requests?view=deletions',
    });
  }
  for (const purchase of summary.failedPurchases) {
    items.push({
      id: `p-${purchase.id}`,
      icon: 'close-circle-outline',
      tone: 'danger',
      title: `רכישה נכשלה: ${purchase.businessName}`,
      detail: `${formatNumber(purchase.smsCredits)} הודעות · ${formatIls(purchase.amountIls)}${
        purchase.errorMessage ? ` · ${purchase.errorMessage}` : ''
      }`,
      at: purchase.createdAt,
      route: `/business/${purchase.businessId}?tab=billing`,
    });
  }
  for (const chat of summary.waitingChats ?? []) {
    items.push({
      id: `w-${chat.phone}`,
      icon: 'headset-outline',
      tone: 'info',
      title: `${chat.name || chat.phone} מחכים לנציג בוואטסאפ`,
      detail: 'השיחה הועברה מהבוט',
      at: chat.lastMessageAt,
      route: `/chat/${chat.phone}`,
    });
  }
  for (const business of summary.smsBusinesses) {
    const credits = toNumberOrNull(balances?.[business.id]?.credits);
    if (credits == null || credits >= LOW_SMS_BALANCE) continue;
    items.push({
      id: `s-${business.id}`,
      icon: 'chatbox-ellipses-outline',
      tone: 'warning',
      title: `יתרת SMS נמוכה: ${business.name}`,
      detail: `נשארו ${formatNumber(credits)} הודעות`,
      route: `/business/${business.id}?tab=sms`,
    });
  }
  return items;
}

const ACTIVITY_ICON: Record<ActivityItem['kind'], { icon: IconName; tone: Tone }> = {
  business: { icon: 'storefront-outline', tone: 'brand' },
  purchase: { icon: 'card-outline', tone: 'success' },
  cancellation: { icon: 'person-remove-outline', tone: 'warning' },
  deletion: { icon: 'trash-outline', tone: 'danger' },
};

function ToneIcon({ icon, tone }: { icon: IconName; tone: Tone }) {
  const theme = useTheme();
  const colors = toneColors(theme, tone);
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={18} color={colors.fg} />
    </View>
  );
}

function go(route: string | null | undefined) {
  if (route) router.push(route as never);
}

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const summary = useSummary();
  const main = useMainBalance();
  const smsIds = summary.data?.smsBusinesses.map((business) => business.id) ?? [];
  const balances = useSmsBalances(smsIds);
  const data = summary.data;
  const monthlyRefill = (data?.smsBusinesses.length ?? 0) * INCLUDED_SMS;
  const mainLow = main.data != null && data != null && main.data < monthlyRefill;
  const attention = data ? buildAttention(data, balances.data, main.data ?? null) : [];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.summary });
    void queryClient.invalidateQueries({ queryKey: keys.mainBalance });
    void queryClient.invalidateQueries({ queryKey: ['balances'] });
    void queryClient.invalidateQueries({ queryKey: keys.badges });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenScroll refreshing={summary.isRefetching} onRefresh={refresh} contentStyle={{ paddingBottom: 110 }}>
        {summary.isError && !data ? (
          <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        ) : null}

        {data?.errors.length ? (
          <InlineNotice
            title="חלק מהנתונים לא נטענו"
            message={`${data.errors.join(', ')}. המספרים עשויים להיות חלקיים.`}
          />
        ) : null}

        {summary.isPending ? (
          <CardsSkeleton count={6} />
        ) : data ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            <StatCard
              icon="trending-up-outline"
              tone="brand"
              label="הכנסה חודשית צפויה"
              value={formatIls(data.expectedMrrIls)}
              hint={`${formatNumber(data.activeSubscriptions)} מנויים × ${formatIls(data.monthlyPriceIls)}`}
            />
            <StatCard
              icon="paper-plane-outline"
              tone={mainLow ? 'danger' : main.isError ? 'warning' : 'info'}
              label="יתרה בפולסים הראשי"
              loading={main.isPending}
              value={main.data != null ? formatNumber(main.data) : '—'}
              hint={
                main.isError
                  ? 'לא ניתן לטעון את היתרה'
                  : `החידוש החודשי צריך עד ${formatNumber(monthlyRefill)}`
              }
              onPress={main.isError ? () => void main.refetch() : undefined}
            />
            <StatCard
              icon="storefront-outline"
              label="עסקים"
              value={formatNumber(data.businesses)}
              hint={`${formatNumber(data.newBusinessesThisMonth)} חדשים החודש`}
              onPress={() => router.push('/businesses')}
            />
            <StatCard
              icon="repeat-outline"
              tone="success"
              label="מנויים פעילים"
              value={formatNumber(data.activeSubscriptions)}
              hint="הוראות קבע פעילות ב-PayPlus"
              onPress={() => router.push({ pathname: '/businesses', params: { filter: 'active' } })}
            />
            <StatCard
              icon="cash-outline"
              tone="success"
              label="הכנסות SMS החודש"
              value={formatIls(data.smsRevenueThisMonthIls)}
              hint={`${formatNumber(data.smsPurchasesThisMonth)} רכישות`}
              onPress={() => router.push('/finance/purchases')}
            />
            <StatCard
              icon="people-outline"
              label="לקוחות באפליקציות"
              value={formatNumber(data.clients)}
              hint="בכל העסקים"
            />
          </View>
        ) : null}

        {data ? (
          <Section title={attention.length ? `דורש טיפול · ${attention.length}` : 'דורש טיפול'}>
            <Card padded={false}>
              {attention.length === 0 ? (
                <Row
                  title="אין כרגע משהו פתוח"
                  subtitle="בקשות, רכישות שנכשלו ויתרות נמוכות יופיעו כאן"
                  leading={<ToneIcon icon="checkmark-done-outline" tone="success" />}
                />
              ) : (
                attention.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 ? <Divider inset={64} /> : null}
                    <Row
                      title={item.title}
                      subtitle={item.at ? `${item.detail} · ${formatRelative(item.at)}` : item.detail}
                      leading={<ToneIcon icon={item.icon} tone={item.tone} />}
                      onPress={item.route ? () => go(item.route) : undefined}
                    />
                  </View>
                ))
              )}
            </Card>
          </Section>
        ) : null}

        <Section
          title="פעילות אחרונה"
          action={
            <Text tone="link" weight="medium" onPress={() => router.push('/finance/purchases')}>
              כל הרכישות
            </Text>
          }
        >
          <Card padded={false}>
            {summary.isPending ? (
              <ListSkeleton rows={5} />
            ) : data?.activity.length ? (
              data.activity.map((item, index) => {
                const route = appRouteFromWebHref(item.href);
                return (
                  <View key={item.id}>
                    {index > 0 ? <Divider inset={64} /> : null}
                    <Row
                      title={item.title}
                      subtitle={`${item.detail} · ${formatRelative(item.at)}`}
                      leading={<ToneIcon {...ACTIVITY_ICON[item.kind]} />}
                      trailing={
                        item.amountIls != null ? (
                          <Text weight="semibold">{formatIls(item.amountIls)}</Text>
                        ) : undefined
                      }
                      onPress={route ? () => go(route) : undefined}
                    />
                  </View>
                );
              })
            ) : data ? (
              <EmptyState icon="pulse-outline" title="אין פעילות עדיין" />
            ) : null}
          </Card>
        </Section>
      </ScreenScroll>
      <Fab icon="add" label="עסק חדש" onPress={() => router.push('/business/new')} />
    </View>
  );
}
