import { useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import {
  CANCELLATION_STATUS,
  formatDate,
  formatIls,
  formatNumber,
  formatPhone,
  ltr,
  SUBSCRIPTION_STATUS,
  toNumberOrNull,
} from '@/lib/format';
import { keys, useCustomer, useSmsBalance } from '@/lib/queries';
import { space } from '@/lib/theme';
import type { BusinessDetails } from '@/lib/types';
import { ScreenScroll } from '@/ui/layout';
import { Avatar, Badge, Card, KeyValue, Section, StatCard } from '@/ui/primitives';
import { InlineNotice } from '@/ui/states';
import { Text } from '@/ui/Text';

type TabKey = 'overview' | 'billing' | 'sms' | 'people' | 'branding' | 'settings';

export function OverviewTab({
  id,
  details,
  onNavigate,
}: {
  id: string;
  details: BusinessDetails;
  onNavigate: (tab: TabKey) => void;
}) {
  const queryClient = useQueryClient();
  const profile = details.profile!;
  const customer = useCustomer(id);
  const hasPulseem = !!(profile.pulseem_has_api_key || (profile.pulseem_has_user_id && profile.pulseem_has_password));
  const balance = useSmsBalance(id, hasPulseem, profile.display_name?.trim() || undefined);
  const clients = details.users.filter((user) => user.user_type === 'client').length;
  const admins = details.users.filter((user) => user.user_type === 'admin').length;
  const icon = details.brandingFiles.find((file) => file.name === 'icon.png')?.publicUrl;
  const sub = customer.data?.payplusSubscription;
  const subscription = sub ? SUBSCRIPTION_STATUS[sub.status] : SUBSCRIPTION_STATUS.none;
  const credits = toNumberOrNull(balance.data);
  const open = customer.data?.openCancellation;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.business(id) });
    void queryClient.invalidateQueries({ queryKey: keys.customer(id) });
    void queryClient.invalidateQueries({ queryKey: keys.smsBalance(id) });
  };

  return (
    <ScreenScroll refreshing={customer.isRefetching} onRefresh={refresh}>
      <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <Avatar uri={icon} name={profile.display_name} color={profile.primary_color} size={56} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="h2">{profile.display_name || 'עסק ללא שם'}</Text>
          <Badge label={subscription.label} tone={subscription.tone} />
        </View>
      </Card>

      {open ? (
        <InlineNotice
          tone="danger"
          icon="alert-circle-outline"
          title="העסק ביקש לבטל את המנוי"
          message={`${CANCELLATION_STATUS[open.status]?.label ?? ''} · ${formatDate(open.requestedAt)}`}
        />
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <StatCard
          icon="people-outline"
          label="לקוחות"
          value={formatNumber(clients)}
          hint={`${formatNumber(admins)} מנהלים`}
          onPress={() => onNavigate('people')}
        />
        <StatCard
          icon="chatbox-ellipses-outline"
          tone={hasPulseem ? (credits != null && credits < 200 ? 'danger' : 'success') : 'neutral'}
          label="יתרת SMS"
          loading={hasPulseem && balance.isPending}
          value={!hasPulseem ? 'לא מחובר' : credits != null ? formatNumber(credits) : '—'}
          onPress={() => onNavigate('sms')}
        />
        <StatCard
          icon="card-outline"
          label="רכישות SMS"
          loading={customer.isPending}
          value={formatIls(customer.data?.purchaseTotalIls ?? 0)}
          hint={`${formatNumber(customer.data?.purchaseCount ?? 0)} רכישות`}
          onPress={() => onNavigate('billing')}
        />
        <StatCard
          icon="cut-outline"
          label="שירותים"
          value={formatNumber(details.services.length)}
          hint={`${formatNumber(details.services.filter((s) => s.is_active).length)} פעילים`}
          onPress={() => onNavigate('people')}
        />
      </View>

      <Section title="פרטי העסק">
        <Card>
          <KeyValue label="טלפון" value={profile.phone ? ltr(formatPhone(profile.phone)) : '—'} />
          <KeyValue label="כתובת" value={profile.address || '—'} />
          <KeyValue label="שם האפליקציה" value={profile.branding_client_name ? ltr(profile.branding_client_name) : '—'} />
          <KeyValue label="נוצר" value={formatDate(profile.created_at)} />
          <KeyValue label="מנוי">
            <Badge label={subscription.label} tone={subscription.tone} />
          </KeyValue>
          {sub?.nextChargeAt ? <KeyValue label="חיוב הבא" value={formatDate(sub.nextChargeAt)} /> : null}
          {sub?.amountIls != null ? <KeyValue label="סכום חודשי" value={formatIls(sub.amountIls)} /> : null}
        </Card>
      </Section>
    </ScreenScroll>
  );
}
