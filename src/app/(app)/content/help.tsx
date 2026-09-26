import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Switch, View } from 'react-native';
import { audienceLabel, formatDuration } from '@/features/help/shared';
import { api, errorMessage } from '@/lib/api';
import { formatNumber, ltr } from '@/lib/format';
import { keys, useHelp } from '@/lib/queries';
import { radius, space, useTheme } from '@/lib/theme';
import type { HelpCategory, HelpVideo } from '@/lib/types';
import { DataList } from '@/ui/DataList';
import { useConfirm, useToast } from '@/ui/feedback';
import { Badge, Button, Card, Divider, Icon, IconButton } from '@/ui/primitives';
import { Text } from '@/ui/Text';

type Sortable = { id: string; sort_order: number };

function swapOrders<T extends Sortable>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return [];
  const ordered = [...items];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const previous = new Map(items.map((item) => [item.id, item.sort_order]));
  return ordered
    .map((item, position) => ({ id: item.id, sort_order: (position + 1) * 10 }))
    .filter((item) => previous.get(item.id) !== item.sort_order);
}

function VideoRow({
  video,
  first,
  last,
  busy,
  onMove,
  onToggle,
  onDelete,
}: {
  video: HelpVideo;
  first: boolean;
  last: boolean;
  busy: boolean;
  onMove: (direction: -1 | 1) => void;
  onToggle: (value: boolean) => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <View
          style={{
            width: 64,
            height: 40,
            borderRadius: radius.sm,
            overflow: 'hidden',
            backgroundColor: theme.sunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {video.thumbnail_url ? (
            <Image source={{ uri: video.thumbnail_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Icon name="play" size={16} color={theme.muted} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="medium" numberOfLines={2}>
            {video.title}
          </Text>
          <Text variant="caption" tone="muted">
            {ltr(formatDuration(video.duration_seconds))}
            {!video.is_published ? ' · מוסתר' : ''}
          </Text>
        </View>
        <Switch
          value={video.is_published}
          disabled={busy}
          onValueChange={onToggle}
          trackColor={{ true: theme.scheme === 'dark' ? '#6b9a1f' : '#00b183', false: theme.border }}
          thumbColor="#ffffff"
          accessibilityLabel={`פרסום ${video.title}`}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: space.xs, alignSelf: 'flex-end' }}>
        <IconButton icon="chevron-up" label="הזזה למעלה" disabled={first || busy} onPress={() => onMove(-1)} />
        <IconButton icon="chevron-down" label="הזזה למטה" disabled={last || busy} onPress={() => onMove(1)} />
        <IconButton icon="open-outline" label={`צפייה ב${video.title}`} onPress={() => void Linking.openURL(video.video_url)} />
        <IconButton
          icon="create-outline"
          label={`עריכת ${video.title}`}
          onPress={() => router.push(`/content/video?categoryId=${video.category_id}&id=${video.id}`)}
        />
        <IconButton icon="trash-outline" label={`מחיקת ${video.title}`} color={theme.danger} disabled={busy} onPress={onDelete} />
      </View>
    </View>
  );
}

export default function HelpScreen() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const help = useHelp();
  const categories = help.data ?? [];
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<unknown>, success?: string) {
    setBusy(true);
    try {
      await task();
      if (success) toast(success);
    } catch (error) {
      toast(errorMessage(error), 'danger');
    } finally {
      await queryClient.invalidateQueries({ queryKey: keys.help });
      setBusy(false);
    }
  }

  const moveCategory = (index: number, direction: -1 | 1) =>
    run(() =>
      Promise.all(
        swapOrders(categories, index, direction).map((item) =>
          api(`/api/admin/help/categories/${item.id}`, { method: 'PATCH', body: { sort_order: item.sort_order } }),
        ),
      ),
    );

  const moveVideo = (category: HelpCategory, index: number, direction: -1 | 1) =>
    run(() =>
      Promise.all(
        swapOrders(category.videos, index, direction).map((item) =>
          api(`/api/admin/help/videos/${item.id}`, { method: 'PATCH', body: { sort_order: item.sort_order } }),
        ),
      ),
    );

  const toggleVideo = (video: HelpVideo, value: boolean) =>
    run(
      () => api(`/api/admin/help/videos/${video.id}`, { method: 'PATCH', body: { is_published: value } }),
      value ? 'הסרטון פורסם' : 'הסרטון הוסתר',
    );

  async function deleteVideo(video: HelpVideo) {
    const ok = await confirm({
      title: `למחוק את "${video.title}"?`,
      message: 'הסרטון יוסר ממרכז העזרה בכל האפליקציות.',
      confirmLabel: 'מחיקה',
      destructive: true,
    });
    if (ok) await run(() => api(`/api/admin/help/videos/${video.id}`, { method: 'DELETE' }), 'הסרטון נמחק');
  }

  return (
    <DataList
      query={help}
      items={categories}
      keyExtractor={(category) => category.id}
      emptyIcon="videocam-outline"
      emptyTitle="אין קטגוריות עדיין"
      emptyMessage="צרו קטגוריה ראשונה ואז הוסיפו לה סרטונים."
      header={
        <View style={{ gap: space.md }}>
          <Text tone="muted">תוכן גלובלי לכל העסקים. הקבצים נשמרים באחסון של מרכז העזרה.</Text>
          <Button label="קטגוריה חדשה" icon="add" onPress={() => router.push('/content/category')} />
        </View>
      }
      renderItem={({ item: category, index }) => (
        <Card padded={false}>
          <View style={{ padding: space.lg, gap: space.sm }}>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
                  <Text variant="h3">{category.title}</Text>
                  {!category.is_published ? <Badge label="טיוטה" /> : null}
                </View>
                <Text variant="small" tone="muted">
                  {audienceLabel(category.audience)} · {formatNumber(category.videos.length)} סרטונים
                </Text>
              </View>
              <IconButton
                icon="create-outline"
                label={`עריכת ${category.title}`}
                onPress={() => router.push(`/content/category?id=${category.id}`)}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <Button
                label="סרטון"
                icon="add"
                size="sm"
                variant="secondary"
                onPress={() => router.push(`/content/video?categoryId=${category.id}`)}
              />
              <View style={{ flex: 1 }} />
              <IconButton icon="chevron-up" label="הזזת הקטגוריה למעלה" disabled={index === 0 || busy} onPress={() => void moveCategory(index, -1)} />
              <IconButton
                icon="chevron-down"
                label="הזזת הקטגוריה למטה"
                disabled={index === categories.length - 1 || busy}
                onPress={() => void moveCategory(index, 1)}
              />
            </View>
          </View>
          {category.videos.length === 0 ? (
            <>
              <Divider />
              <Text variant="small" tone="muted" style={{ padding: space.lg }}>
                אין סרטונים בקטגוריה הזו עדיין.
              </Text>
            </>
          ) : (
            category.videos.map((video, videoIndex) => (
              <View key={video.id}>
                <Divider />
                <VideoRow
                  video={video}
                  first={videoIndex === 0}
                  last={videoIndex === category.videos.length - 1}
                  busy={busy}
                  onMove={(direction) => void moveVideo(category, videoIndex, direction)}
                  onToggle={(value) => void toggleVideo(video, value)}
                  onDelete={() => void deleteVideo(video)}
                />
              </View>
            ))
          )}
        </Card>
      )}
    />
  );
}
