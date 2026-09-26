import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useCustomer } from '@/lib/queries';
import { space } from '@/lib/theme';
import { useConfirm, useToast } from '@/ui/feedback';
import { ScreenScroll } from '@/ui/layout';
import { Button, Card, Section } from '@/ui/primitives';
import { InlineNotice } from '@/ui/states';
import { Text } from '@/ui/Text';

type DeleteResult = {
  success: boolean;
  pulseem?: { deleted?: boolean; skipped?: boolean; error?: string | null } | null;
  brandingFolderDeleted?: boolean;
  tableErrors?: Record<string, string>;
};

export function SettingsTab({ id, name }: { id: string; name: string }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const customer = useCustomer(id);
  const [result, setResult] = useState<DeleteResult | null>(null);
  const activeSubscription = customer.data?.payplusSubscription?.status === 'active';

  const remove = useMutation({
    mutationFn: () => api<DeleteResult>(`/api/admin/apps/${id}`, { method: 'DELETE', timeoutMs: 120_000 }),
    onSuccess: (data) => {
      if (data.success) {
        toast(`${name} נמחק`);
        queryClient.removeQueries({ queryKey: ['business', id] });
        queryClient.removeQueries({ queryKey: ['customer', id] });
        void queryClient.invalidateQueries();
        router.replace('/businesses');
        return;
      }
      setResult(data);
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  async function onDelete() {
    const ok = await confirm({
      title: `למחוק את ${name}?`,
      message:
        'יימחקו תת-חשבון הפולסים, כל הנתונים של האפליקציה (משתמשים, תורים, שירותים) וקבצי המיתוג. אי אפשר לשחזר.',
      confirmLabel: 'מחיקה לצמיתות',
      destructive: true,
      typeToConfirm: name,
    });
    if (ok) {
      setResult(null);
      remove.mutate();
    }
  }

  const problems = Object.entries(result?.tableErrors ?? {});

  return (
    <ScreenScroll>
      <Section title="מחיקת העסק">
        <Card style={{ gap: space.md }}>
          <Text variant="h3" tone="danger">
            פעולה בלתי הפיכה
          </Text>
          <Text tone="muted">
            המחיקה מסירה את תת-חשבון הפולסים, את כל הנתונים של האפליקציה ואת קבצי המיתוג. לפני המחיקה כדאי לוודא שהוראת
            הקבע ב-PayPlus בוטלה.
          </Text>
          {activeSubscription ? (
            <InlineNotice
              tone="danger"
              title="לעסק יש הוראת קבע פעילה"
              message="אפשר לבטל אותה בלשונית מנוי וחיובים לפני המחיקה."
            />
          ) : null}
          {result ? (
            <InlineNotice
              tone="danger"
              icon="alert-circle-outline"
              title="המחיקה לא הושלמה"
              message={[
                `פולסים: ${
                  result.pulseem?.deleted ? 'נמחק' : result.pulseem?.error || (result.pulseem?.skipped ? 'דולג' : '—')
                }.`,
                `תיקיית מיתוג: ${result.brandingFolderDeleted ? 'נמחקה' : 'לא נמחקה'}.`,
                problems.length ? `${problems.length} טבלאות לא נמחקו. אפשר לנסות שוב.` : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          ) : null}
          <Button
            label="מחיקת העסק"
            icon="trash-outline"
            variant="danger"
            loading={remove.isPending}
            onPress={onDelete}
          />
        </Card>
      </Section>
    </ScreenScroll>
  );
}
