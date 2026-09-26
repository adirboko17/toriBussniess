import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { formatIls, formatNumber, perMessage } from '@/lib/format';
import { keys, usePackages } from '@/lib/queries';
import { space, useTheme } from '@/lib/theme';
import type { SmsPackageRow } from '@/lib/types';
import { DataList } from '@/ui/DataList';
import { useToast } from '@/ui/feedback';
import { Badge, Button, Card, IconButton } from '@/ui/primitives';
import { Text } from '@/ui/Text';

export default function PackagesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const toast = useToast();
  const packages = usePackages();
  const rows = packages.data ?? [];
  const [busy, setBusy] = useState(false);

  const patch = (id: string, body: Record<string, unknown>) =>
    api(`/api/admin/packages/${id}`, { method: 'PATCH', body });

  const toggle = useMutation({
    mutationFn: (input: { pack: SmsPackageRow; isActive: boolean }) => patch(input.pack.id, { isActive: input.isActive }),
    onMutate: ({ pack, isActive }) => {
      queryClient.setQueryData<SmsPackageRow[]>(keys.packages, (current) =>
        current?.map((row) => (row.id === pack.id ? { ...row, is_active: isActive } : row)),
      );
    },
    onSuccess: (_data, { pack, isActive }) =>
      toast(isActive ? `"${pack.label}" מוצגת בחנות` : `"${pack.label}" הוסתרה מהחנות`),
    onError: (error) => toast(errorMessage(error), 'danger'),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: keys.packages }),
  });

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const ordered = [...rows];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const next = ordered.map((row, position) => ({ ...row, sort_order: (position + 1) * 10 }));
    const previous = new Map(rows.map((row) => [row.id, row.sort_order]));
    const changed = next.filter((row) => previous.get(row.id) !== row.sort_order);
    setBusy(true);
    queryClient.setQueryData(keys.packages, next);
    try {
      await Promise.all(changed.map((row) => patch(row.id, { sortOrder: row.sort_order })));
    } catch (error) {
      toast(errorMessage(error, 'שינוי הסדר נכשל'), 'danger');
    } finally {
      void queryClient.invalidateQueries({ queryKey: keys.packages });
      setBusy(false);
    }
  }

  return (
    <DataList
      query={packages}
      items={rows}
      keyExtractor={(pack) => pack.id}
      emptyIcon="cube-outline"
      emptyTitle="אין חבילות"
      emptyMessage="כל עוד אין חבילות, החנות מציגה את חבילות ברירת המחדל."
      header={
        <View style={{ gap: space.md }}>
          <Text tone="muted">מה שנמכר בחנות ה-SMS באתר, לפי סדר ההצגה.</Text>
          <Button label="חבילה חדשה" icon="add" variant="secondary" onPress={() => router.push('/finance/package')} />
        </View>
      }
      renderItem={({ item, index }) => (
        <Card onPress={() => router.push(`/finance/package?id=${item.id}`)} style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
                <Text weight="semibold">{item.label}</Text>
                {item.featured ? <Badge label="הכי משתלם" tone="brand" /> : null}
                {!item.is_active ? <Badge label="מוסתרת" tone="neutral" /> : null}
              </View>
              <Text variant="small" tone="muted">
                {formatNumber(Number(item.sms_credits))} הודעות · {formatIls(Number(item.amount_ils))} · {perMessage(item)}
              </Text>
            </View>
            <Switch
              value={item.is_active}
              disabled={toggle.isPending || busy}
              onValueChange={(isActive) => toggle.mutate({ pack: item, isActive })}
              trackColor={{ true: theme.scheme === 'dark' ? '#6b9a1f' : '#00b183', false: theme.border }}
              thumbColor="#ffffff"
              accessibilityLabel={`מוצגת בחנות: ${item.label}`}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: space.xs, alignSelf: 'flex-end' }}>
            <IconButton icon="chevron-up" label="הזזה למעלה" disabled={index === 0 || busy} onPress={() => void move(index, -1)} />
            <IconButton
              icon="chevron-down"
              label="הזזה למטה"
              disabled={index === rows.length - 1 || busy}
              onPress={() => void move(index, 1)}
            />
          </View>
        </Card>
      )}
    />
  );
}
