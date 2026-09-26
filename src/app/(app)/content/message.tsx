import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { formatPhone, ltr } from '@/lib/format';
import { keys, useBusinesses, useOpMessages } from '@/lib/queries';
import { space, useTheme } from '@/lib/theme';
import type { AdminBusiness, OperationalMessage } from '@/lib/types';
import { useToast } from '@/ui/feedback';
import { Field, SearchBar, Segmented } from '@/ui/inputs';
import { FormScroll } from '@/ui/layout';
import { Button, Card, Divider, Icon, Section } from '@/ui/primitives';
import { ErrorState, InlineNotice, ListSkeleton } from '@/ui/states';
import { Text } from '@/ui/Text';

type Audience = OperationalMessage['audience'];
type Draft = { title: string; body: string; actionLabel: string; actionUrl: string; audience: Audience; businessIds: string[] };

const EMPTY: Draft = { title: '', body: '', actionLabel: '', actionUrl: '', audience: 'staff', businessIds: [] };

function validate(draft: Draft) {
  if (!draft.title.trim()) return 'צריך כותרת';
  if (!draft.body.trim()) return 'צריך תוכן להודעה';
  if (draft.actionUrl.trim() && !/^https:\/\/\S+$/i.test(draft.actionUrl.trim())) return 'הקישור צריך להתחיל ב-https://';
  if (draft.actionUrl.trim() && !draft.actionLabel.trim()) return 'צריך טקסט לכפתור כשיש קישור';
  if (draft.businessIds.length === 0) return 'צריך לבחור לפחות עסק אחד';
  if (draft.businessIds.length > 500) return 'אפשר לבחור עד 500 עסקים';
  return '';
}

function BusinessCheck({ business, checked, onToggle }: { business: AdminBusiness; checked: boolean; onToggle: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: 10,
        paddingHorizontal: space.lg,
        backgroundColor: pressed ? theme.sunken : 'transparent',
      })}
    >
      <Icon name={checked ? 'checkbox' : 'square-outline'} color={checked ? theme.primary : theme.faint} />
      <Text style={{ flex: 1 }}>{business.name || 'עסק ללא שם'}</Text>
      {business.phone ? (
        <Text variant="caption" tone="faint">
          {ltr(formatPhone(business.phone))}
        </Text>
      ) : null}
    </Pressable>
  );
}

function MessageForm({ message, businesses }: { message: OperationalMessage | null; businesses: AdminBusiness[] }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(
    message
      ? {
          title: message.title,
          body: message.body,
          actionLabel: message.actionLabel ?? '',
          actionUrl: message.actionUrl ?? '',
          audience: message.audience,
          businessIds: message.businessIds,
        }
      : EMPTY,
  );
  const [search, setSearch] = useState('');
  const [touched, setTouched] = useState(false);
  const problem = validate(draft);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return businesses;
    return businesses.filter((b) => `${b.name} ${b.phone}`.toLowerCase().includes(term));
  }, [businesses, search]);
  const allVisibleSelected = visible.length > 0 && visible.every((b) => draft.businessIds.includes(b.id));

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleBusiness(id: string) {
    update('businessIds', draft.businessIds.includes(id) ? draft.businessIds.filter((x) => x !== id) : [...draft.businessIds, id]);
  }

  function toggleVisible() {
    const ids = visible.map((b) => b.id);
    update(
      'businessIds',
      allVisibleSelected ? draft.businessIds.filter((id) => !ids.includes(id)) : [...new Set([...draft.businessIds, ...ids])],
    );
  }

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...draft,
        title: draft.title.trim(),
        body: draft.body.trim(),
        actionLabel: draft.actionLabel.trim(),
        actionUrl: draft.actionUrl.trim(),
      };
      return message
        ? api(`/api/admin/operational-messages/${message.id}`, { method: 'PATCH', body })
        : api('/api/admin/operational-messages', { method: 'POST', body });
    },
    onSuccess: () => {
      toast(message ? 'ההודעה עודכנה' : 'ההודעה פורסמה');
      void queryClient.invalidateQueries({ queryKey: keys.opMessages });
      router.back();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  function onSave() {
    setTouched(true);
    if (!problem) save.mutate();
  }

  return (
    <FormScroll
      footer={
        <>
          {touched && problem ? (
            <Text variant="small" tone="danger" center>
              {problem}
            </Text>
          ) : null}
          <Button
            label={message ? 'שמירת השינויים' : 'פרסום ההודעה'}
            icon={message ? 'checkmark' : 'megaphone-outline'}
            loading={save.isPending}
            onPress={onSave}
          />
        </>
      }
    >
      <Stack.Screen options={{ title: message ? 'עריכת הודעה' : 'הודעה חדשה' }} />
      <Text tone="muted">ההודעה קופצת פעם אחת בכניסה לאפליקציה, בלי תלות בגרסת הבילד.</Text>
      <Card style={{ gap: space.md }}>
        <Field
          label="כותרת"
          value={draft.title}
          onChangeText={(value) => update('title', value)}
          maxLength={120}
          hint={`${draft.title.length}/120`}
        />
        <Field
          label="תוכן"
          value={draft.body}
          onChangeText={(value) => update('body', value)}
          maxLength={2000}
          multiline
          hint={`${draft.body.length}/2000`}
        />
        <Field
          label="טקסט לכפתור"
          value={draft.actionLabel}
          onChangeText={(value) => update('actionLabel', value)}
          maxLength={40}
          placeholder="למשל: לעדכון"
          hint="לא חובה"
        />
        <Field
          label="קישור לכפתור"
          value={draft.actionUrl}
          onChangeText={(value) => update('actionUrl', value)}
          placeholder="https://"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          ltr
          hint="לא חובה. חייב להתחיל ב-https://"
        />
      </Card>

      <Section title="למי להציג">
        <Segmented
          options={[
            { value: 'staff', label: 'מנהל ועובדים' },
            { value: 'everyone', label: 'כולם (גם לקוחות)' },
          ]}
          value={draft.audience}
          onChange={(value) => update('audience', value)}
        />
      </Section>

      <Section
        title={`עסקים (${draft.businessIds.length} נבחרו)`}
        action={
          <Button
            label={allVisibleSelected ? 'ביטול בחירת המוצגים' : 'בחירת כל המוצגים'}
            size="sm"
            variant="ghost"
            disabled={visible.length === 0}
            onPress={toggleVisible}
          />
        }
      >
        <SearchBar value={search} onChangeText={setSearch} placeholder="חיפוש עסק" />
        <Card padded={false}>
          {visible.length === 0 ? (
            <Text tone="muted" style={{ padding: space.lg }}>
              לא נמצאו עסקים.
            </Text>
          ) : (
            visible.map((business, index) => (
              <View key={business.id}>
                {index > 0 ? <Divider inset={52} /> : null}
                <BusinessCheck
                  business={business}
                  checked={draft.businessIds.includes(business.id)}
                  onToggle={() => toggleBusiness(business.id)}
                />
              </View>
            ))
          )}
        </Card>
      </Section>
      {message ? (
        <InlineNotice
          tone="info"
          icon="information-circle-outline"
          title={`נסגרה אצל ${message.dismissalCount} משתמשים`}
          message="משתמשים שכבר סגרו את ההודעה לא יראו אותה שוב."
        />
      ) : null}
    </FormScroll>
  );
}

export default function MessageScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const messages = useOpMessages();
  const businesses = useBusinesses();
  if (businesses.isPending || (params.id && messages.isPending)) return <ListSkeleton rows={4} avatar={false} />;
  if (businesses.isError) return <ErrorState error={businesses.error} onRetry={() => void businesses.refetch()} />;
  const list = [...businesses.data].sort((a, b) => a.name.localeCompare(b.name, 'he'));
  if (!params.id) return <MessageForm message={null} businesses={list} />;
  const message = messages.data?.find((m) => m.id === params.id);
  if (!message) {
    return <ErrorState error={messages.error ?? new Error('ההודעה לא נמצאה.')} onRetry={() => void messages.refetch()} />;
  }
  return <MessageForm key={message.id} message={message} businesses={list} />;
}
