import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Switch, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { formatNumber, formatRelative } from '@/lib/format';
import { keys, useBusinesses, useOpMessages } from '@/lib/queries';
import { space, useTheme } from '@/lib/theme';
import type { OperationalMessage } from '@/lib/types';
import { DataList } from '@/ui/DataList';
import { useToast } from '@/ui/feedback';
import { Chips } from '@/ui/inputs';
import { Badge, Button, Card } from '@/ui/primitives';
import { Text } from '@/ui/Text';

type Filter = 'active' | 'inactive' | 'all';

export default function OperationalMessagesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const toast = useToast();
  const messages = useOpMessages();
  const businesses = useBusinesses();
  const [filter, setFilter] = useState<Filter>('active');
  const rows = useMemo(() => messages.data ?? [], [messages.data]);
  const names = useMemo(() => new Map((businesses.data ?? []).map((b) => [b.id, b.name])), [businesses.data]);
  const visible = rows.filter((m) => (filter === 'all' ? true : filter === 'active' ? m.active : !m.active));

  const setActive = useMutation({
    mutationFn: (input: { id: string; active: boolean }) =>
      api(`/api/admin/operational-messages/${input.id}`, { method: 'PATCH', body: { active: input.active } }),
    onMutate: ({ id, active }) => {
      queryClient.setQueryData<OperationalMessage[]>(keys.opMessages, (current) =>
        current?.map((row) => (row.id === id ? { ...row, active } : row)),
      );
    },
    onSuccess: (_data, { active }) => toast(active ? 'ההודעה הופעלה' : 'ההודעה כובתה'),
    onError: (error) => toast(errorMessage(error), 'danger'),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: keys.opMessages }),
  });

  function targets(message: OperationalMessage) {
    const list = message.businessIds.map((id) => names.get(id)).filter(Boolean) as string[];
    if (list.length === 0) return `${formatNumber(message.businessIds.length)} עסקים`;
    if (list.length <= 2) return list.join(', ');
    return `${list.slice(0, 2).join(', ')} ועוד ${list.length - 2}`;
  }

  return (
    <DataList
      query={messages}
      items={visible}
      keyExtractor={(m) => m.id}
      emptyIcon="megaphone-outline"
      emptyTitle={rows.length ? 'אין הודעות בסינון הזה' : 'עדיין אין הודעות'}
      emptyMessage="הודעה תפעולית קופצת פעם אחת לעסקים שבחרתם, למשל על עדכון גרסה או תקלה."
      header={
        <View style={{ gap: space.md }}>
          <Button label="הודעה חדשה" icon="add" onPress={() => router.push('/content/message')} />
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: 'פעילות', count: messages.isPending ? undefined : rows.filter((r) => r.active).length },
              { value: 'inactive', label: 'כבויות', count: messages.isPending ? undefined : rows.filter((r) => !r.active).length },
              { value: 'all', label: 'הכול', count: messages.isPending ? undefined : rows.length },
            ]}
          />
        </View>
      }
      renderItem={({ item }) => (
        <Card onPress={() => router.push(`/content/message?id=${item.id}`)} style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text weight="semibold">{item.title}</Text>
              <Text variant="small" tone="muted" numberOfLines={3}>
                {item.body}
              </Text>
            </View>
            <Switch
              value={item.active}
              disabled={setActive.isPending && setActive.variables?.id === item.id}
              onValueChange={(active) => setActive.mutate({ id: item.id, active })}
              trackColor={{ true: theme.scheme === 'dark' ? '#6b9a1f' : '#00b183', false: theme.border }}
              thumbColor="#ffffff"
              accessibilityLabel={`הצגת ${item.title}`}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
            <Badge label={item.audience === 'everyone' ? 'כולם' : 'מנהל ועובדים'} tone={item.audience === 'everyone' ? 'info' : 'neutral'} />
            <Text variant="caption" tone="muted">
              {targets(item)} · נסגרה אצל {formatNumber(item.dismissalCount)} משתמשים · {formatRelative(item.createdAt)}
            </Text>
          </View>
        </Card>
      )}
    />
  );
}
