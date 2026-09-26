import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { CANCELLATION_STATUS, formatDate, formatDateTime, formatPhone, formatRelative, ltr } from '@/lib/format';
import { keys, useCancellations, useDeletions } from '@/lib/queries';
import { space } from '@/lib/theme';
import type { AccountDeletion, CancellationRequest, CancellationStatus } from '@/lib/types';
import { useParamState } from '@/lib/useParamState';
import { DataList } from '@/ui/DataList';
import { useConfirm, useToast } from '@/ui/feedback';
import { Chips, SearchBar, Segmented } from '@/ui/inputs';
import { Badge, Button, Card, KeyValue } from '@/ui/primitives';
import { Text } from '@/ui/Text';

type RequestView = 'cancellations' | 'deletions';
type Filter = 'open' | 'closed' | 'all';

function isOpen(status: CancellationStatus) {
  return status === 'requested' || status === 'seen';
}

function CancellationCard({ request }: { request: CancellationRequest }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const status = CANCELLATION_STATUS[request.status];
  const subscriptionActive = request.payplusSubscription?.status === 'active';

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.cancellations });
    void queryClient.invalidateQueries({ queryKey: keys.badges });
    void queryClient.invalidateQueries({ queryKey: keys.summary });
    void queryClient.invalidateQueries({ queryKey: keys.businesses });
    void queryClient.invalidateQueries({ queryKey: keys.customer(request.businessId) });
  };

  const setStatus = useMutation({
    mutationFn: (next: CancellationStatus) =>
      api(`/api/admin/cancellations/${request.id}`, { method: 'PATCH', body: { status: next } }),
    onSuccess: (_data, next) => {
      toast(`הבקשה של ${request.businessName} סומנה כ"${CANCELLATION_STATUS[next].label}"`);
      refresh();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const cancelRecurring = useMutation({
    mutationFn: () =>
      api(`/api/admin/customers/${request.businessId}/cancel-recurring`, { method: 'POST', timeoutMs: 45_000 }),
    onSuccess: () => {
      toast(`הוראת הקבע של ${request.businessName} בוטלה`);
      refresh();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const busy = setStatus.isPending || cancelRecurring.isPending;

  async function onCancelRecurring() {
    const ok = await confirm({
      title: `לבטל את הוראת הקבע של ${request.businessName}?`,
      message: 'החיוב הבא ב-PayPlus לא ירוץ. המחזור שכבר שולם נשאר, והבקשה תסומן כטופלה.',
      confirmLabel: 'ביטול הוראת הקבע',
      cancelLabel: 'חזרה',
      destructive: true,
    });
    if (ok) cancelRecurring.mutate();
  }

  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="semibold">{request.businessName}</Text>
          <Text variant="small" tone="muted">
            {request.requestedByName}
            {request.requestedByPhone ? ` · ${ltr(formatPhone(request.requestedByPhone))}` : ''}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <View>
        <KeyValue label="נשלחה" value={`${formatRelative(request.requestedAt)} · ${formatDateTime(request.requestedAt)}`} />
        <KeyValue label="סיום חיוב" value={request.effectiveAt ? formatDate(request.effectiveAt) : 'סוף המחזור'} />
        <KeyValue label="הוראת קבע">
          <Badge
            label={subscriptionActive ? 'פעילה' : request.payplusSubscription ? 'בוטלה' : 'לא מחוברת'}
            tone={subscriptionActive ? 'success' : 'neutral'}
          />
        </KeyValue>
        {request.note ? <KeyValue label="הערה" value={request.note} /> : null}
        {!isOpen(request.status) && request.reviewedAt ? (
          <KeyValue label="עודכן" value={formatDate(request.reviewedAt)} />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {isOpen(request.status) ? (
          <>
            {subscriptionActive ? (
              <Button
                label="ביטול הוראת קבע"
                size="sm"
                variant="danger"
                loading={cancelRecurring.isPending}
                disabled={busy}
                onPress={onCancelRecurring}
              />
            ) : (
              <Button label="טופל" icon="checkmark" size="sm" disabled={busy} onPress={() => setStatus.mutate('done')} />
            )}
            {request.status === 'requested' ? (
              <Button label="בטיפול" size="sm" variant="secondary" disabled={busy} onPress={() => setStatus.mutate('seen')} />
            ) : null}
            <Button label="לא רלוונטי" size="sm" variant="ghost" disabled={busy} onPress={() => setStatus.mutate('dismissed')} />
          </>
        ) : (
          <Button
            label="פתיחה מחדש"
            icon="arrow-undo-outline"
            size="sm"
            variant="ghost"
            disabled={busy}
            onPress={() => setStatus.mutate('requested')}
          />
        )}
        <Button
          label="לעמוד העסק"
          size="sm"
          variant="ghost"
          onPress={() => router.push(`/business/${request.businessId}?tab=billing`)}
        />
      </View>
    </Card>
  );
}

function DeletionCard({ item }: { item: AccountDeletion }) {
  return (
    <Card style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
        <Text weight="semibold" style={{ flex: 1 }}>
          {item.fullName || 'ללא שם'}
        </Text>
        <Text variant="caption" tone="muted">
          {formatRelative(item.createdAt)}
        </Text>
      </View>
      <Text variant="small" tone="muted">
        {[item.phone ? ltr(formatPhone(item.phone)) : null, item.appName || null].filter(Boolean).join(' · ')}
      </Text>
      {item.note ? <Text variant="small">{item.note}</Text> : null}
      <Text variant="caption" tone="faint">
        {formatDateTime(item.createdAt)}
      </Text>
    </Card>
  );
}

export default function RequestsScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useParamState<RequestView>(params.view, ['cancellations', 'deletions'], 'cancellations');
  const [filter, setFilter] = useState<Filter>('open');
  const [search, setSearch] = useState('');
  const cancellations = useCancellations();
  const deletions = useDeletions();

  const requests = useMemo(() => cancellations.data?.requests ?? [], [cancellations.data]);
  const counts = {
    open: requests.filter((r) => isOpen(r.status)).length,
    closed: requests.filter((r) => !isOpen(r.status)).length,
    all: requests.length,
  };
  const term = search.trim().toLowerCase();

  const visibleRequests = useMemo(
    () =>
      requests.filter((r) => {
        if (filter === 'open' && !isOpen(r.status)) return false;
        if (filter === 'closed' && isOpen(r.status)) return false;
        return !term || `${r.businessName} ${r.requestedByName} ${r.requestedByPhone}`.toLowerCase().includes(term);
      }),
    [requests, filter, term],
  );

  const visibleDeletions = useMemo(
    () =>
      (deletions.data ?? []).filter(
        (d) => !term || `${d.fullName} ${d.phone} ${d.appName} ${d.note}`.toLowerCase().includes(term),
      ),
    [deletions.data, term],
  );

  const header = (
    <View style={{ gap: space.md }}>
      <Segmented
        options={[
          { value: 'cancellations', label: counts.open ? `ביטולי מנוי · ${counts.open}` : 'ביטולי מנוי' },
          { value: 'deletions', label: 'מחיקת חשבון' },
        ]}
        value={view}
        onChange={setView}
      />
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={view === 'cancellations' ? 'חיפוש לפי עסק, שם או טלפון' : 'חיפוש לפי שם, טלפון או אפליקציה'}
      />
      {view === 'cancellations' ? (
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'open', label: 'פתוחות', count: cancellations.isPending ? undefined : counts.open },
            { value: 'closed', label: 'סגורות', count: cancellations.isPending ? undefined : counts.closed },
            { value: 'all', label: 'הכול', count: cancellations.isPending ? undefined : counts.all },
          ]}
        />
      ) : (
        <Text variant="small" tone="muted">
          בקשות של משתמשי קצה למחוק את החשבון שלהם. לתצוגה בלבד.
        </Text>
      )}
    </View>
  );

  if (view === 'deletions') {
    return (
      <DataList
        key="deletions"
        query={deletions}
        items={visibleDeletions}
        keyExtractor={(item) => item.id}
        header={header}
        emptyIcon="person-remove-outline"
        emptyTitle={term ? 'לא נמצאו בקשות' : 'אין בקשות למחיקת חשבון'}
        renderItem={({ item }) => <DeletionCard item={item} />}
      />
    );
  }

  return (
    <DataList
      key="cancellations"
      query={cancellations}
      items={visibleRequests}
      keyExtractor={(item) => item.id}
      header={header}
      emptyIcon={filter === 'open' ? 'checkmark-circle-outline' : 'file-tray-outline'}
      emptyTitle={filter === 'open' && !term ? 'אין בקשות ביטול פתוחות' : 'אין בקשות להצגה'}
      emptyMessage="כשמנהל עסק מאשר ביטול באפליקציה, הבקשה מגיעה לכאן."
      renderItem={({ item }) => <CancellationCard request={item} />}
    />
  );
}
