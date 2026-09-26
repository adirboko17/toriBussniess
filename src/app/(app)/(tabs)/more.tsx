import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { formatPhone, ltr } from '@/lib/format';
import { space, useTheme } from '@/lib/theme';
import { useConfirm } from '@/ui/feedback';
import { ScreenScroll } from '@/ui/layout';
import { Avatar, Button, Card, Divider, Icon, Row, Section, type IconName } from '@/ui/primitives';
import { Text } from '@/ui/Text';

type Item = { title: string; subtitle?: string; icon: IconName; href: Href };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'כספים',
    items: [
      { title: 'רכישות SMS', subtitle: 'סיכום חודשי וסטטוס תשלומים', icon: 'receipt-outline', href: '/finance/purchases' },
      { title: 'מחיר מנוי', subtitle: 'המחיר החודשי לעסקים', icon: 'pricetag-outline', href: '/finance/pricing' },
      { title: 'חבילות SMS', subtitle: 'החבילות שעסקים יכולים לקנות', icon: 'cube-outline', href: '/finance/packages' },
    ],
  },
  {
    title: 'תוכן',
    items: [
      { title: 'הודעות תפעוליות', subtitle: 'הודעות שמוצגות באפליקציות העסקים', icon: 'megaphone-outline', href: '/content/messages' },
      { title: 'מרכז עזרה', subtitle: 'קטגוריות וסרטוני הדרכה', icon: 'play-circle-outline', href: '/content/help' },
      { title: 'אפליקציות בפרטיות', subtitle: 'האפליקציות שמופיעות במדיניות הפרטיות', icon: 'shield-checkmark-outline', href: '/content/privacy' },
    ],
  },
  {
    title: 'הגדרות',
    items: [
      { title: 'התראות', subtitle: 'אילו התראות יגיעו למכשיר הזה', icon: 'notifications-outline', href: '/settings/notifications' },
    ],
  },
];

function RowIcon({ name }: { name: IconName }) {
  const theme = useTheme();
  return (
    <View
      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.sunken, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={name} size={18} />
    </View>
  );
}

export default function MoreScreen() {
  const confirm = useConfirm();
  const [signingOut, setSigningOut] = useState(false);
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ phone: string; name: string | null }>('/api/admin/me'),
    staleTime: 5 * 60_000,
  });

  async function onSignOut() {
    const ok = await confirm({
      title: 'להתנתק מהאפליקציה?',
      message: 'המכשיר יפסיק לקבל התראות עד שתתחברו שוב.',
      confirmLabel: 'התנתקות',
      destructive: true,
    });
    if (!ok) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ScreenScroll refreshing={me.isRefetching} onRefresh={() => void me.refetch()}>
      <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <Avatar name={me.data?.name || 'T'} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="semibold">{me.data?.name || 'מנהל ראשי'}</Text>
          <Text variant="small" tone="muted">
            {me.data?.phone ? ltr(formatPhone(me.data.phone)) : me.isPending ? 'טוען…' : '—'}
          </Text>
        </View>
      </Card>

      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title}>
          <Card padded={false}>
            {group.items.map((item, index) => (
              <View key={item.title}>
                {index > 0 ? <Divider inset={66} /> : null}
                <Row
                  leading={<RowIcon name={item.icon} />}
                  title={item.title}
                  subtitle={item.subtitle}
                  onPress={() => router.push(item.href)}
                />
              </View>
            ))}
          </Card>
        </Section>
      ))}

      <Button label="התנתקות" icon="log-out-outline" variant="danger" loading={signingOut} onPress={onSignOut} />
      <Text variant="caption" tone="faint" center>
        Tori ניהול · גרסה {ltr(Constants.expoConfig?.version ?? '1.0.0')}
      </Text>
    </ScreenScroll>
  );
}
