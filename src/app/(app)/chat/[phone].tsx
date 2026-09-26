import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { roleLabel } from '@/features/whatsapp/copy';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime, formatPhone, ltr } from '@/lib/format';
import { keys, useConversations, useMessages } from '@/lib/queries';
import { radius, space, useTheme } from '@/lib/theme';
import type { WaMessage } from '@/lib/types';
import { useConfirm, useToast } from '@/ui/feedback';
import { Badge, Button, Icon, IconButton } from '@/ui/primitives';
import { EmptyState, ErrorState, ListSkeleton, OfflineBanner } from '@/ui/states';
import { Text, fonts } from '@/ui/Text';

function Bubble({ message }: { message: WaMessage }) {
  const theme = useTheme();
  const incoming = message.role === 'user';
  const agent = message.role === 'human_agent';
  const background = incoming ? theme.bubbleUser : agent ? theme.bubbleAgent : theme.bubbleBot;
  return (
    <View
      style={[
        styles.bubble,
        {
          alignSelf: incoming ? 'flex-start' : 'flex-end',
          backgroundColor: background,
          borderColor: agent ? theme.success : theme.border,
          borderBottomStartRadius: incoming ? 4 : radius.lg,
          borderBottomEndRadius: incoming ? radius.lg : 4,
        },
      ]}
    >
      <Text selectable>{message.content}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {!incoming ? <Icon name={agent ? 'person-circle-outline' : 'hardware-chip-outline'} size={12} color={theme.muted} /> : null}
        <Text variant="caption" tone="muted">
          {roleLabel(message.role)} · {formatDateTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const params = useLocalSearchParams<{ phone: string }>();
  const phone = decodeURIComponent(String(params.phone));
  const path = `/api/admin/whatsapp/conversations/${encodeURIComponent(phone)}`;
  const messages = useMessages(phone);
  const conversations = useConversations(false);
  const conversation = conversations.data?.find((item) => item.phone === phone);
  const withAgent = conversation?.status === 'human';
  const name = conversation?.name || formatPhone(phone);
  const [draft, setDraft] = useState('');
  const reversed = useMemo(() => [...(messages.data ?? [])].reverse(), [messages.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.messages(phone) });
    void queryClient.invalidateQueries({ queryKey: keys.conversations });
    void queryClient.invalidateQueries({ queryKey: keys.badges });
    void queryClient.invalidateQueries({ queryKey: keys.summary });
  };

  const send = useMutation({
    mutationFn: (message: string) => api(`${path}/send`, { method: 'POST', body: { message }, timeoutMs: 45_000 }),
    onSuccess: refresh,
    onError: (error, message) => {
      setDraft((current) => current || message);
      toast(errorMessage(error), 'danger');
    },
  });

  const toggle = useMutation({
    mutationFn: (action: 'handoff' | 'handback') => api(`${path}/${action}`, { method: 'POST' }),
    onSuccess: (_data, action) => {
      toast(action === 'handoff' ? 'השיחה הועברה אליכם' : 'השיחה חזרה לבוט');
      refresh();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const remove = useMutation({
    mutationFn: () => api(path, { method: 'DELETE' }),
    onSuccess: () => {
      toast('השיחה נמחקה');
      queryClient.removeQueries({ queryKey: keys.messages(phone) });
      void queryClient.invalidateQueries({ queryKey: keys.conversations });
      void queryClient.invalidateQueries({ queryKey: keys.badges });
      router.back();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  async function onDelete() {
    const ok = await confirm({
      title: `למחוק את השיחה עם ${name}?`,
      message: 'כל ההודעות בשיחה יימחקו. אי אפשר לשחזר.',
      confirmLabel: 'מחיקת השיחה',
      destructive: true,
    });
    if (ok) remove.mutate();
  }

  function onSend() {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft('');
    send.mutate(text);
  }

  const busy = toggle.isPending || remove.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
      <Stack.Screen
        options={{
          title: name,
          headerRight: () => (
            <IconButton icon="trash-outline" label="מחיקת השיחה" color={theme.danger} disabled={busy} onPress={onDelete} />
          ),
        }}
      />
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="small" tone="muted">
            {ltr(formatPhone(phone))}
          </Text>
          <Badge
            label={withAgent ? 'ממתין לנציג' : 'אצל הבוט'}
            tone={withAgent ? 'warning' : 'neutral'}
            icon={withAgent ? 'headset-outline' : 'hardware-chip-outline'}
          />
        </View>
        <Button
          label={withAgent ? 'החזרה לבוט' : 'העברה לנציג'}
          icon={withAgent ? 'hardware-chip-outline' : 'headset-outline'}
          size="sm"
          variant="secondary"
          loading={toggle.isPending}
          disabled={busy}
          onPress={() => toggle.mutate(withAgent ? 'handback' : 'handoff')}
        />
      </View>
      <OfflineBanner />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={headerHeight}>
        {messages.isPending ? (
          <View style={{ flex: 1 }}>
            <ListSkeleton rows={4} avatar={false} />
          </View>
        ) : messages.isError && !messages.data ? (
          <View style={{ flex: 1 }}>
            <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />
          </View>
        ) : reversed.length === 0 ? (
          <View style={{ flex: 1 }}>
            <EmptyState icon="chatbubble-outline" title="אין הודעות בשיחה" />
          </View>
        ) : (
          <FlatList
            data={reversed}
            inverted
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <Bubble message={item} />}
            contentContainerStyle={{ padding: space.lg, gap: space.sm }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}
        <View
          style={[
            styles.composer,
            { borderTopColor: theme.border, backgroundColor: theme.card, paddingBottom: Math.max(insets.bottom, space.sm) },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={withAgent ? 'תשובה כנציג' : 'הודעה כנציג (הבוט ממשיך לענות)'}
            placeholderTextColor={theme.faint}
            multiline
            maxLength={4096}
            accessibilityLabel="הודעה"
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.sunken, fontFamily: fonts.regular, textAlign: 'auto', writingDirection: 'rtl' },
            ]}
          />
          <Pressable
            onPress={onSend}
            disabled={!draft.trim() || send.isPending}
            accessibilityRole="button"
            accessibilityLabel="שליחה"
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: theme.primary, opacity: !draft.trim() || send.isPending ? 0.4 : pressed ? 0.7 : 1 },
            ]}
          >
            {send.isPending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Icon name="send" size={18} color={theme.onPrimary} />
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 140,
    borderRadius: 21,
    paddingHorizontal: space.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
