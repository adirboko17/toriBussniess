import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { I18nFields, type I18nValue } from '@/features/help/I18nFields';
import { compactI18n, isHelpSlug, nextSortOrder, slugifyHelp, uploadHelpFile } from '@/features/help/shared';
import { api, errorMessage } from '@/lib/api';
import { keys, useHelp } from '@/lib/queries';
import { radius, space, useTheme } from '@/lib/theme';
import type { HelpCategory, HelpVideo } from '@/lib/types';
import { useToast } from '@/ui/feedback';
import { Field, Segmented, SwitchRow } from '@/ui/inputs';
import { FormScroll } from '@/ui/layout';
import { Button, Card, Icon, Section } from '@/ui/primitives';
import { ErrorState, InlineNotice, ListSkeleton } from '@/ui/states';
import { Text } from '@/ui/Text';

type Picked = { uri: string; name: string; mimeType: string };

function extFor(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function VideoForm({ category, video }: { category: HelpCategory; video: HelpVideo | null }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [texts, setTexts] = useState<I18nValue>({
    title: { ...(video?.title_i18n ?? {}), he: video?.title ?? '' },
    description: { ...(video?.description_i18n ?? {}), he: video?.description ?? '' },
  });
  const [slug, setSlug] = useState(video?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(video));
  const [source, setSource] = useState<'file' | 'url'>('file');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<Picked | null>(null);
  const [thumb, setThumb] = useState<Picked | null>(null);
  const [duration, setDuration] = useState(video?.duration_seconds ? String(video.duration_seconds) : '');
  const [published, setPublished] = useState(video?.is_published ?? true);
  const [step, setStep] = useState('');

  const cleanSlug = slug.trim().toLowerCase();
  const slugError = cleanSlug && !isHelpSlug(cleanSlug) ? 'אותיות קטנות באנגלית, ספרות ומקפים' : null;
  const title = texts.title.he?.trim() ?? '';
  const hasSource = Boolean(video) || (source === 'file' ? Boolean(videoFile) : /^https:\/\/\S+$/i.test(videoUrl.trim()));
  const valid = !!title && !slugError && hasSource;

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast('אין הרשאה לגלריה. אפשר לאשר אותה בהגדרות המכשיר.', 'danger');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setVideoFile({ uri: asset.uri, name: asset.fileName || 'video.mp4', mimeType: 'video/mp4' });
    if (asset.duration && !duration) setDuration(String(Math.round(asset.duration / 1000)));
  }

  async function pickFromFiles() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'video/mp4', copyToCacheDirectory: true });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setVideoFile({ uri: asset.uri, name: asset.name, mimeType: 'video/mp4' });
  }

  async function pickThumb() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast('אין הרשאה לגלריה. אפשר לאשר אותה בהגדרות המכשיר.', 'danger');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [16, 9] });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const mimeType = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg';
    setThumb({ uri: asset.uri, name: asset.fileName || 'thumb', mimeType });
  }

  const save = useMutation({
    mutationFn: async () => {
      const fileSlug = cleanSlug || slugifyHelp(texts.title.en ?? '') || `video-${Date.now()}`;
      const payload: Record<string, unknown> = {
        title,
        title_i18n: compactI18n(texts.title),
        description: texts.description.he?.trim() ?? '',
        description_i18n: compactI18n(texts.description),
        slug: cleanSlug || null,
        duration_seconds: duration.trim() ? Number(duration) : null,
        is_published: published,
      };
      if (thumb) {
        setStep('מעלה תמונה…');
        payload.thumbnail_url = await uploadHelpFile(`${category.slug}/${fileSlug}-thumb.${extFor(thumb.mimeType)}`, thumb.uri, thumb.mimeType);
      }
      if (video) {
        setStep('שומר…');
        return api(`/api/admin/help/videos/${video.id}`, { method: 'PATCH', body: payload });
      }
      let storagePath: string | null = null;
      let finalUrl = videoUrl.trim();
      if (source === 'file' && videoFile) {
        setStep('מעלה סרטון…');
        storagePath = `${category.slug}/${fileSlug}.mp4`;
        finalUrl = await uploadHelpFile(storagePath, videoFile.uri, videoFile.mimeType);
      }
      setStep('שומר…');
      return api('/api/admin/help/videos', {
        method: 'POST',
        body: {
          ...payload,
          category_id: category.id,
          video_url: finalUrl,
          storage_path: storagePath,
          thumbnail_url: payload.thumbnail_url ?? null,
          sort_order: nextSortOrder(category.videos),
        },
      });
    },
    onSuccess: () => {
      toast(video ? 'הסרטון עודכן' : 'הסרטון נוסף');
      void queryClient.invalidateQueries({ queryKey: keys.help });
      router.back();
    },
    onError: (error) => toast(errorMessage(error, 'שמירת הסרטון נכשלה'), 'danger'),
    onSettled: () => setStep(''),
  });

  const thumbPreview = thumb?.uri ?? video?.thumbnail_url ?? null;

  return (
    <FormScroll
      footer={
        <Button
          label={save.isPending ? step || 'שומר…' : video ? 'שמירה' : 'הוספת הסרטון'}
          icon="checkmark"
          disabled={!valid}
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
      }
    >
      <Stack.Screen options={{ title: video ? 'עריכת סרטון' : 'סרטון חדש', gestureEnabled: !save.isPending }} />
      <Text tone="muted">בקטגוריה: {category.title}</Text>
      <Card>
        <I18nFields
          value={texts}
          onChange={setTexts}
          titleLabel="שם הסרטון"
          onEnglishTitle={(text) => {
            if (!slugTouched) setSlug(slugifyHelp(text));
          }}
        />
      </Card>

      {video ? null : (
        <Section title="הסרטון">
          <Segmented
            options={[
              { value: 'file', label: 'העלאת קובץ' },
              { value: 'url', label: 'קישור ישיר' },
            ]}
            value={source}
            onChange={setSource}
          />
          {source === 'file' ? (
            <Card style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                <Icon name="videocam-outline" size={22} color={theme.muted} />
                <Text style={{ flex: 1 }} numberOfLines={1}>
                  {videoFile ? videoFile.name : 'לא נבחר קובץ'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button label="מהגלריה" icon="images-outline" size="sm" variant="secondary" onPress={() => void pickFromGallery()} style={{ flex: 1 }} />
                <Button label="מהקבצים" icon="folder-outline" size="sm" variant="secondary" onPress={() => void pickFromFiles()} style={{ flex: 1 }} />
              </View>
            </Card>
          ) : (
            <Field
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://…/video.mp4"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              ltr
            />
          )}
        </Section>
      )}

      <Section title="תמונה ממוזערת">
        <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <View
            style={{
              width: 112,
              height: 63,
              borderRadius: radius.sm,
              overflow: 'hidden',
              backgroundColor: theme.sunken,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {thumbPreview ? (
              <Image source={{ uri: thumbPreview }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Icon name="image-outline" color={theme.faint} />
            )}
          </View>
          <View style={{ flex: 1, gap: space.sm }}>
            <Button
              label={thumbPreview ? 'החלפת התמונה' : 'בחירת תמונה'}
              icon="images-outline"
              size="sm"
              variant="secondary"
              onPress={() => void pickThumb()}
            />
            <Text variant="caption" tone="muted">
              לא חובה
            </Text>
          </View>
        </Card>
      </Section>

      <Card style={{ gap: space.md }}>
        <Field
          label="משך (שניות)"
          value={duration}
          onChangeText={(text) => setDuration(text.replace(/\D/g, ''))}
          keyboardType="number-pad"
          ltr
          hint={videoFile && duration ? 'זוהה מהקובץ' : undefined}
        />
        <Field
          label="מזהה (slug)"
          value={slug}
          onChangeText={(text) => {
            setSlugTouched(true);
            setSlug(text);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          ltr
          error={slugError}
          hint="נוצר אוטומטית מהשם באנגלית. קובע גם את שם הקובץ."
        />
      </Card>
      <Card padded={false}>
        <SwitchRow label="מפורסם באפליקציות" value={published} onValueChange={setPublished} />
      </Card>
      {save.isPending && source === 'file' && !video ? (
        <InlineNotice tone="info" icon="cloud-upload-outline" title={step || 'מעלה…'} message="השאירו את המסך פתוח עד שההעלאה תסתיים." />
      ) : null}
    </FormScroll>
  );
}

export default function VideoScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; id?: string }>();
  const help = useHelp();
  if (help.isPending) return <ListSkeleton rows={4} avatar={false} />;
  if (help.isError) return <ErrorState error={help.error} onRetry={() => void help.refetch()} />;
  const category = help.data.find((item) => item.id === params.categoryId);
  if (!category) return <ErrorState error={new Error('הקטגוריה לא נמצאה.')} onRetry={() => void help.refetch()} />;
  const video = params.id ? category.videos.find((item) => item.id === params.id) ?? null : null;
  if (params.id && !video) return <ErrorState error={new Error('הסרטון לא נמצא.')} onRetry={() => void help.refetch()} />;
  return <VideoForm key={video?.id ?? `new-${category.id}`} category={category} video={video} />;
}
