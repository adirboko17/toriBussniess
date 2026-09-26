import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { LEAD_STATUSES, leadStatusOf } from '@/features/whatsapp/copy';
import { formatDate, formatPhone, formatRelative, LEAD_STATUS, ltr } from '@/lib/format';
import { useConversations, useLeads } from '@/lib/queries';
import { space, useTheme } from '@/lib/theme';
import type { LeadStatus, WaConversation } from '@/lib/types';
import { useParamState } from '@/lib/useParamState';
import { DataList } from '@/ui/DataList';
import { Chips, SearchBar, Segmented } from '@/ui/inputs';
import { Avatar, Badge, Button, Card } from '@/ui/primitives';
import { Text } from '@/ui/Text';

type Tab = 'chats' | 'leads';

function byWaitingThenRecent(a: WaConversation, b: WaConversation) {
  const waiting = Number(b.status === 'human') - Number(a.status === 'human');
  if (waiting) return waiting;
  return (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '');
}

function ConversationsList({ tabs }: { tabs: ReactElement }) {
  const theme = useTheme();
  const focused = useIsFocused();
  const conversations = useConversations(focused);
  const [filter, setFilter] = useState<'all' | 'human'>('all');
  const [search, setSearch] = useState('');
  const all = useMemo(() => conversations.data ?? [], [conversations.data]);
  const waiting = all.filter((item) => item.status === 'human').length;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all
      .filter((item) => (filter === 'human' ? item.status === 'human' : true))
      .filter((item) => !term || `${item.name ?? ''} ${item.phone} ${item.last_user_message ?? ''}`.toLowerCase().includes(term))
      .sort(byWaitingThenRecent);
  }, [all, filter, search]);

  return (
    <DataList
      query={conversations}
      items={visible}
      keyExtractor={(item) => item.phone}
      emptyIcon="chatbubbles-outline"
      emptyTitle={all.length ? 'אין שיחות בסינון הזה' : 'אין שיחות עדיין'}
      emptyMessage={filter === 'human' ? 'אף לקוח לא מחכה לנציג כרגע.' : 'השיחות מתעדכנות אוטומטית כל כמה שניות.'}
      header={
        <View style={{ gap: space.md }}>
          {tabs}
          <SearchBar value={search} onChangeText={setSearch} placeholder="חיפוש שם או טלפון" />
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'הכול', count: conversations.isPending ? undefined : all.length },
              { value: 'human', label: 'ממתינים לנציג', count: conversations.isPending ? undefined : waiting },
            ]}
          />
        </View>
      }
      renderItem={({ item }) => {
        const human = item.status === 'human';
        return (
          <Card
            onPress={() => router.push(`/chat/${encodeURIComponent(item.phone)}`)}
            style={[{ flexDirection: 'row', gap: space.md, alignItems: 'center' }, human && { borderColor: theme.warning }]}
          >
            <Avatar name={item.name || item.phone} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                <Text weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                  {item.name || ltr(formatPhone(item.phone))}
                </Text>
                <Text variant="caption" tone="muted">
                  {formatRelative(item.last_message_at)}
                </Text>
              </View>
              <Text variant="small" tone="muted" numberOfLines={2}>
                {item.last_user_message || item.last_message || 'אין הודעות'}
              </Text>
              {human ? <Badge label="ממתין לנציג" tone="warning" icon="headset-outline" /> : null}
            </View>
          </Card>
        );
      }}
    />
  );
}

function LeadsList({ tabs }: { tabs: ReactElement }) {
  const leads = useLeads();
  const [filter, setFilter] = useState<'all' | LeadStatus>('all');
  const [search, setSearch] = useState('');
  const rows = useMemo(() => leads.data ?? [], [leads.data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((lead) => {
      if (filter !== 'all' && leadStatusOf(lead) !== filter) return false;
      return !term || `${lead.business ?? ''} ${lead.name ?? ''} ${lead.phone} ${lead.message_name ?? ''}`.toLowerCase().includes(term);
    });
  }, [rows, filter, search]);

  return (
    <DataList
      query={leads}
      items={visible}
      keyExtractor={(lead) => lead.id}
      emptyIcon="people-outline"
      emptyTitle={rows.length ? 'לא נמצאו לידים' : 'אין לידים עדיין'}
      emptyMessage={rows.length ? 'נסו סינון או חיפוש אחר.' : 'הוסיפו ליד ידנית או ייבאו רשימה מאקסל.'}
      header={
        <View style={{ gap: space.md }}>
          {tabs}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="ליד חדש" icon="add" size="sm" onPress={() => router.push('/whatsapp/lead')} style={{ flex: 1 }} />
            <Button
              label="ייבוא מאקסל"
              icon="document-outline"
              size="sm"
              variant="secondary"
              onPress={() => router.push('/whatsapp/import')}
              style={{ flex: 1 }}
            />
            <Button
              label="הגדרות"
              icon="settings-outline"
              size="sm"
              variant="secondary"
              onPress={() => router.push('/whatsapp/settings')}
            />
          </View>
          <SearchBar value={search} onChangeText={setSearch} placeholder="חיפוש עסק, שם או טלפון" />
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'הכול', count: leads.isPending ? undefined : rows.length },
              ...LEAD_STATUSES.map((status) => ({
                value: status,
                label: LEAD_STATUS[status].label,
                count: leads.isPending ? undefined : rows.filter((lead) => leadStatusOf(lead) === status).length,
              })),
            ]}
          />
          {!leads.isPending && rows.length ? (
            <Text variant="caption" tone="muted">
              {visible.length === rows.length ? `${rows.length} לידים` : `${visible.length} מתוך ${rows.length} לידים`}
            </Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const status = LEAD_STATUS[leadStatusOf(item)];
        return (
          <Card onPress={() => router.push(`/whatsapp/lead?id=${encodeURIComponent(item.id)}`)} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
              <Text weight="semibold" style={{ flex: 1 }}>
                {item.business || item.name || '—'}
              </Text>
              <Badge label={status.label} tone={status.tone} />
            </View>
            <Text variant="small" tone="muted">
              {[ltr(formatPhone(item.phone)), item.business_type, formatDate(item.created_at)].filter(Boolean).join(' · ')}
            </Text>
            {item.message_name ? (
              <Text variant="caption" tone="muted">
                בהודעה: {item.message_name}
              </Text>
            ) : null}
          </Card>
        );
      }}
    />
  );
}

export default function WhatsappScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [tab, setTab] = useParamState<Tab>(params.view, ['chats', 'leads'], 'chats');

  const tabs = (
    <Segmented
      options={[
        { value: 'chats', label: 'שיחות' },
        { value: 'leads', label: 'לידים' },
      ]}
      value={tab}
      onChange={setTab}
    />
  );

  return tab === 'chats' ? <ConversationsList tabs={tabs} /> : <LeadsList tabs={tabs} />;
}
