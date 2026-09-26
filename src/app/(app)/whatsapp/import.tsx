import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DEFAULT_BUSINESS_TYPE } from '@/features/whatsapp/copy';
import { api, errorMessage } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { keys } from '@/lib/queries';
import { space, useTheme } from '@/lib/theme';
import { useToast } from '@/ui/feedback';
import { Field, SwitchRow } from '@/ui/inputs';
import { FormScroll } from '@/ui/layout';
import { Button, Card, Icon } from '@/ui/primitives';
import { InlineNotice } from '@/ui/states';
import { Text } from '@/ui/Text';

const MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/comma-separated-values',
];

type ImportResult = {
  inserted: number;
  skipped: number;
  openingsSent: number;
  parsed?: number;
  parseErrors?: { sheet: string; row: number; error: string }[];
};

export default function ImportLeadsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [businessType, setBusinessType] = useState(DEFAULT_BUSINESS_TYPE);
  const [sendOpening, setSendOpening] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function pick() {
    const picked = await DocumentPicker.getDocumentAsync({ type: MIME_TYPES, copyToCacheDirectory: true, multiple: false });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    if (!/\.(xlsx|xls|csv)$/i.test(asset.name)) {
      toast('אפשר לייבא רק קובצי xlsx, xls או csv', 'danger');
      return;
    }
    setFile(asset);
    setResult(null);
  }

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('בחרו קובץ');
      const form = new FormData();
      form.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as unknown as Blob);
      form.append('businessType', businessType.trim() || DEFAULT_BUSINESS_TYPE);
      form.append('sendOpening', sendOpening ? 'true' : 'false');
      return api<ImportResult>('/api/admin/whatsapp/leads/import', { method: 'POST', form, timeoutMs: 120_000 });
    },
    onSuccess: (data) => {
      setResult(data);
      const parts = [`יובאו ${formatNumber(data.inserted)} לידים`];
      if (data.skipped) parts.push(`${formatNumber(data.skipped)} כבר היו ברשימה`);
      if (sendOpening) parts.push(`${formatNumber(data.openingsSent)} הודעות פתיחה נשלחו`);
      toast(parts.join(' · '));
      void queryClient.invalidateQueries({ queryKey: keys.leads });
      if (!data.parseErrors?.length) router.back();
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  return (
    <FormScroll
      footer={<Button label="ייבוא" icon="cloud-upload-outline" disabled={!file} loading={upload.isPending} onPress={() => upload.mutate()} />}
    >
      <Text tone="muted">טלפונים שכבר קיימים ברשימה מדולגים אוטומטית.</Text>
      <Card onPress={() => void pick()} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <View
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: theme.sunken, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="document-text-outline" size={22} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="semibold">קובץ Excel או CSV</Text>
          <Text variant="small" tone="muted" numberOfLines={1}>
            {file ? file.name : 'הקישו לבחירת קובץ'}
          </Text>
        </View>
      </Card>
      <Card style={{ gap: space.md }}>
        <Field label="סוג העסק" value={businessType} onChangeText={setBusinessType} hint="יישמר לכל הלידים בקובץ" />
      </Card>
      <Card padded={false}>
        <SwitchRow
          label="הודעת פתיחה"
          description="לשלוח הודעת פתיחה לכל ליד חדש מיד אחרי הייבוא"
          value={sendOpening}
          onValueChange={setSendOpening}
        />
      </Card>
      {result?.parseErrors?.length ? (
        <InlineNotice
          title={`${result.parseErrors.length} שורות לא נקלטו`}
          message={result.parseErrors
            .slice(0, 10)
            .map((item) => `שורה ${item.row}${item.sheet ? ` (${item.sheet})` : ''}: ${item.error}`)
            .join('\n')}
        />
      ) : null}
    </FormScroll>
  );
}
