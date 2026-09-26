import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { PickedImage } from '@/lib/images';
import { keys } from '@/lib/queries';
import { space } from '@/lib/theme';
import type { BusinessDetails } from '@/lib/types';
import { useToast } from '@/ui/feedback';
import { FormScroll } from '@/ui/layout';
import { Button, Card, Section } from '@/ui/primitives';
import { InlineNotice } from '@/ui/states';
import { ColorField, HEX_COLOR } from './ColorField';
import { ImagePickerField } from './ImagePickerField';

type UploadResult = { uploaded: string[]; warnings: string[] };

function fileUrl(details: BusinessDetails, name: string) {
  const file = details.brandingFiles.find((item) => item.name === name);
  if (!file) return null;
  return file.updatedAt ? `${file.publicUrl}?v=${encodeURIComponent(file.updatedAt)}` : file.publicUrl;
}

export function BrandingTab({ id, details }: { id: string; details: BusinessDetails }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const savedColor = details.profile?.primary_color ?? '';
  const [color, setColor] = useState(savedColor);
  const [logo, setLogo] = useState<PickedImage | null>(null);
  const [icon, setIcon] = useState<PickedImage | null>(null);
  const [splash, setSplash] = useState<PickedImage | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const colorChanged = color.toLowerCase() !== savedColor.toLowerCase();
  const colorValid = HEX_COLOR.test(color);
  const dirty = (colorChanged && colorValid) || !!logo || !!icon || !!splash;

  const save = useMutation({
    mutationFn: () =>
      api<UploadResult>(`/api/admin/apps/${id}/branding`, {
        method: 'POST',
        body: {
          primaryColor: colorChanged && colorValid ? color : undefined,
          logoBase64: logo?.dataUrl,
          iconBase64: icon?.dataUrl,
          splashBase64: splash?.dataUrl,
        },
        timeoutMs: 90_000,
      }),
    onSuccess: (result) => {
      setWarnings(result.warnings ?? []);
      toast(result.uploaded?.length ? `עודכנו ${result.uploaded.length} קבצים` : 'המיתוג עודכן');
      setLogo(null);
      setIcon(null);
      setSplash(null);
      void queryClient.invalidateQueries({ queryKey: keys.business(id) });
      void queryClient.invalidateQueries({ queryKey: keys.businesses });
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  return (
    <FormScroll
      footer={
        <Button
          label="שמירת המיתוג"
          icon="save-outline"
          disabled={!dirty}
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
      }
    >
      {warnings.length ? <InlineNotice title="הועלה עם אזהרות" message={warnings.join('\n')} /> : null}
      <Section title="צבע">
        <Card>
          <ColorField value={color} onChange={setColor} />
        </Card>
      </Section>
      <Section title="קבצים">
        <Card style={{ gap: space.xl }}>
          <ImagePickerField
            label="אייקון האפליקציה"
            hint="ריבועי, מומלץ 1024×1024."
            currentUrl={fileUrl(details, 'icon.png')}
            value={icon}
            onChange={setIcon}
            maxWidth={1024}
            aspect={[1, 1]}
          />
          <ImagePickerField
            label="לוגו"
            currentUrl={fileUrl(details, 'logo.png')}
            value={logo}
            onChange={setLogo}
            maxWidth={1024}
          />
          <ImagePickerField
            label="מסך פתיחה (ספלאש)"
            currentUrl={fileUrl(details, 'splash.png')}
            value={splash}
            onChange={setSplash}
            maxWidth={1242}
            previewAspect={0.5}
          />
        </Card>
      </Section>
    </FormScroll>
  );
}
