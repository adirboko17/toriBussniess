import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Switch, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { formatDate, formatIls, formatNumber, formatPhone, ltr } from '@/lib/format';
import { keys } from '@/lib/queries';
import { space, useTheme } from '@/lib/theme';
import type { BusinessDetails, BusinessService } from '@/lib/types';
import { useToast } from '@/ui/feedback';
import { Field, SearchBar, Segmented } from '@/ui/inputs';
import { FormScroll } from '@/ui/layout';
import { Avatar, Badge, Button, Card, Divider, Row, Section } from '@/ui/primitives';
import { EmptyState } from '@/ui/states';
import { Text } from '@/ui/Text';

type Draft = { id: string | null; name: string; price: string; duration: string };

const USER_TYPE_LABEL: Record<string, string> = { admin: 'מנהל', client: 'לקוח', worker: 'עובד' };

export function PeopleTab({ id, details }: { id: string; details: BusinessDetails }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [view, setView] = useState<'users' | 'services'>('users');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);

  const users = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    const order = (type: string | null) => (type === 'admin' ? 0 : type === 'worker' ? 1 : 2);
    return details.users
      .filter(
        (user) =>
          !term ||
          (user.name ?? '').toLowerCase().includes(term) ||
          (digits.length > 0 && (user.phone ?? '').replace(/\D/g, '').includes(digits)),
      )
      .sort((a, b) => order(a.user_type) - order(b.user_type) || (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }, [details.users, search]);

  const services = useMemo(
    () => [...details.services].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [details.services],
  );

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: keys.business(id) });

  const saveService = useMutation({
    mutationFn: (input: Draft) => {
      const body = {
        name: input.name.trim(),
        price: Number(input.price),
        durationMinutes: Math.round(Number(input.duration)),
      };
      return input.id
        ? api(`/api/admin/apps/${id}/services`, { method: 'PATCH', body: { serviceId: input.id, ...body } })
        : api(`/api/admin/apps/${id}/services`, { method: 'POST', body });
    },
    onSuccess: (_data, input) => {
      toast(input.id ? 'השירות עודכן' : 'השירות נוסף');
      setDraft(null);
      invalidate();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const toggleService = useMutation({
    mutationFn: (input: { serviceId: string; isActive: boolean }) =>
      api(`/api/admin/apps/${id}/services`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  function edit(service: BusinessService) {
    setDraft({
      id: service.id,
      name: service.name ?? '',
      price: service.price != null ? String(service.price) : '',
      duration: service.duration_minutes != null ? String(service.duration_minutes) : '',
    });
  }

  const priceNum = Number(draft?.price);
  const durationNum = Number(draft?.duration);
  const draftErrors = draft
    ? {
        name: draft.name.trim() ? null : 'יש להזין שם שירות',
        price: draft.price !== '' && Number.isFinite(priceNum) && priceNum >= 0 && priceNum <= 100_000 ? null : 'מחיר בין 0 ל-100,000',
        duration:
          Number.isInteger(durationNum) && durationNum >= 5 && durationNum <= 1440 ? null : 'משך בין 5 ל-1440 דקות',
      }
    : null;
  const draftValid = !!draftErrors && !draftErrors.name && !draftErrors.price && !draftErrors.duration;

  return (
    <FormScroll>
      <Segmented
        options={[
          { value: 'users', label: `משתמשים · ${formatNumber(details.users.length)}` },
          { value: 'services', label: `שירותים · ${formatNumber(details.services.length)}` },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'users' ? (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="חיפוש לפי שם או טלפון" />
          <Card padded={false}>
            {users.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title={search ? 'לא נמצאו משתמשים' : 'אין משתמשים עדיין'}
              />
            ) : (
              users.map((user, index) => (
                <View key={user.id}>
                  {index > 0 ? <Divider inset={72} /> : null}
                  <Row
                    leading={<Avatar uri={user.image_url} name={user.name} size={40} />}
                    title={user.name || 'ללא שם'}
                    subtitle={[user.phone ? ltr(formatPhone(user.phone)) : null, user.created_at ? `הצטרף ${formatDate(user.created_at)}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                    trailing={
                      <Badge
                        label={USER_TYPE_LABEL[user.user_type ?? ''] ?? user.user_type ?? '—'}
                        tone={user.user_type === 'admin' ? 'info' : 'neutral'}
                      />
                    }
                  />
                </View>
              ))
            )}
          </Card>
        </>
      ) : (
        <>
          {draft ? (
            <Section title={draft.id ? 'עריכת שירות' : 'שירות חדש'}>
              <Card style={{ gap: space.md }}>
                <Field
                  label="שם השירות"
                  value={draft.name}
                  onChangeText={(name) => setDraft({ ...draft, name })}
                  maxLength={255}
                  error={draft.name ? null : draftErrors?.name}
                />
                <View style={{ flexDirection: 'row', gap: space.md }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="מחיר (₪)"
                      value={draft.price}
                      onChangeText={(price) => setDraft({ ...draft, price: price.replace(/[^\d.]/g, '') })}
                      keyboardType="decimal-pad"
                      ltr
                      error={draft.price ? draftErrors?.price : null}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="משך (דקות)"
                      value={draft.duration}
                      onChangeText={(duration) => setDraft({ ...draft, duration: duration.replace(/\D/g, '') })}
                      keyboardType="number-pad"
                      ltr
                      error={draft.duration ? draftErrors?.duration : null}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button
                    label="שמירה"
                    icon="checkmark"
                    disabled={!draftValid}
                    loading={saveService.isPending}
                    onPress={() => saveService.mutate(draft)}
                    style={{ flex: 1 }}
                  />
                  <Button label="ביטול" variant="secondary" onPress={() => setDraft(null)} style={{ flex: 1 }} />
                </View>
              </Card>
            </Section>
          ) : (
            <Button
              label="הוספת שירות"
              icon="add"
              variant="secondary"
              onPress={() => setDraft({ id: null, name: '', price: '', duration: '30' })}
            />
          )}
          <Card padded={false}>
            {services.length === 0 ? (
              <EmptyState icon="cut-outline" title="אין שירותים עדיין" />
            ) : (
              services.map((service, index) => (
                <View key={service.id}>
                  {index > 0 ? <Divider /> : null}
                  <Row
                    title={service.name || 'שירות ללא שם'}
                    subtitle={`${service.price != null ? formatIls(service.price) : '—'} · ${
                      service.duration_minutes != null ? `${formatNumber(service.duration_minutes)} דק׳` : '—'
                    }`}
                    onPress={() => edit(service)}
                    chevron={false}
                    trailing={
                      <Switch
                        value={!!service.is_active}
                        disabled={toggleService.isPending}
                        onValueChange={(isActive) => toggleService.mutate({ serviceId: service.id, isActive })}
                        trackColor={{ true: theme.scheme === 'dark' ? '#6b9a1f' : '#00b183', false: theme.border }}
                        thumbColor="#ffffff"
                        accessibilityLabel={`שירות פעיל: ${service.name ?? ''}`}
                      />
                    }
                  />
                </View>
              ))
            )}
          </Card>
          <Text variant="caption" tone="muted" center>
            הקישו על שירות כדי לערוך אותו. המתג מסתיר או מציג אותו באפליקציית העסק.
          </Text>
        </>
      )}
    </FormScroll>
  );
}
