import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ImagePickError, pickImage, type ImageSource, type PickedImage } from '@/lib/images';
import { radius, space, useTheme } from '@/lib/theme';
import { useToast } from '@/ui/feedback';
import { Button, Icon } from '@/ui/primitives';
import { Text } from '@/ui/Text';

export function ImagePickerField({
  label,
  hint,
  currentUrl,
  value,
  onChange,
  maxWidth,
  aspect,
  previewAspect = 1,
}: {
  label: string;
  hint?: string;
  currentUrl?: string | null;
  value: PickedImage | null;
  onChange: (image: PickedImage | null) => void;
  maxWidth: number;
  aspect?: [number, number];
  previewAspect?: number;
}) {
  const theme = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const preview = value?.uri ?? currentUrl ?? null;

  async function pick(source: ImageSource) {
    setBusy(true);
    try {
      const image = await pickImage(source, { maxWidth, aspect });
      if (image) onChange(image);
    } catch (error) {
      toast(error instanceof ImagePickError ? error.message : 'טעינת התמונה נכשלה. נסו שוב.', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text variant="label" tone="muted" style={{ flex: 1 }}>
          {label}
        </Text>
        {value ? <Text variant="caption" tone="success">נבחרה תמונה חדשה</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <View
          style={[
            styles.preview,
            {
              width: previewAspect >= 1 ? 96 : 96 * previewAspect,
              height: previewAspect >= 1 ? 96 / previewAspect : 96,
              backgroundColor: theme.sunken,
              borderColor: theme.border,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={theme.muted} />
          ) : preview ? (
            <Image source={{ uri: preview }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="none" />
          ) : (
            <Icon name="image-outline" size={26} color={theme.faint} />
          )}
        </View>
        <View style={{ flex: 1, gap: space.sm }}>
          <Button label="מהגלריה" icon="images-outline" size="sm" variant="secondary" disabled={busy} onPress={() => void pick('library')} />
          <Button label="צילום" icon="camera-outline" size="sm" variant="secondary" disabled={busy} onPress={() => void pick('camera')} />
          {value ? <Button label="ביטול הבחירה" size="sm" variant="ghost" onPress={() => onChange(null)} /> : null}
        </View>
      </View>
      {hint ? (
        <Text variant="small" tone="muted">
          {hint}
        </Text>
      ) : !preview ? (
        <Text variant="small" tone="muted">
          אין קובץ שמור.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
