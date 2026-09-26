import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { LEAD_STATUS } from '@/lib/format';
import { keys, useWaSettings } from '@/lib/queries';
import { useToast } from '@/ui/feedback';
import { SwitchRow } from '@/ui/inputs';
import { ScreenScroll } from '@/ui/layout';
import { Card, Section } from '@/ui/primitives';
import { ErrorState, ListSkeleton } from '@/ui/states';
import { Text } from '@/ui/Text';

export default function WhatsappSettingsScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const settings = useWaSettings();

  const update = useMutation({
    mutationFn: (enabled: boolean) => api('/api/admin/whatsapp/settings', { method: 'PATCH', body: { enabled } }),
    onMutate: (enabled) => {
      const previous = queryClient.getQueryData<boolean>(keys.waSettings);
      queryClient.setQueryData(keys.waSettings, enabled);
      return { previous };
    },
    onSuccess: (_data, enabled) => toast(enabled ? 'השליחה השעתית הופעלה' : 'השליחה השעתית כובתה'),
    onError: (error, _enabled, context) => {
      queryClient.setQueryData(keys.waSettings, context?.previous);
      toast(errorMessage(error), 'danger');
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: keys.waSettings }),
  });

  if (settings.isPending) return <ListSkeleton rows={2} avatar={false} />;
  if (settings.isError) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;

  return (
    <ScreenScroll refreshing={settings.isRefetching} onRefresh={() => void settings.refetch()}>
      <Section title="שליחה אוטומטית">
        <Card padded={false}>
          <SwitchRow
            label="שליחה שעתית"
            description={`כל שעה נשלחת הודעת פתיחה ללידים בסטטוס ״${LEAD_STATUS.no_contact.label}״.`}
            value={settings.data}
            disabled={update.isPending}
            onValueChange={(enabled) => update.mutate(enabled)}
          />
        </Card>
      </Section>
      <Text variant="small" tone="muted">
        הבוט עונה ללקוחות בוואטסאפ. כשלקוח מבקש נציג, השיחה מסומנת ״ממתין לנציג״ ומגיעה התראה למכשיר.
      </Text>
    </ScreenScroll>
  );
}
