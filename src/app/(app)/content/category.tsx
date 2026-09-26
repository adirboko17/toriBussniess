import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { I18nFields, type I18nValue } from '@/features/help/I18nFields';
import {
  compactI18n,
  HELP_AUDIENCES,
  HELP_ICONS,
  isHelpSlug,
  nextSortOrder,
  slugifyHelp,
} from '@/features/help/shared';
import { api, errorMessage } from '@/lib/api';
import { keys, useHelp } from '@/lib/queries';
import { radius, space, useTheme } from '@/lib/theme';
import type { HelpAudience, HelpCategory } from '@/lib/types';
import { useConfirm, useToast } from '@/ui/feedback';
import { Field, Segmented, SwitchRow } from '@/ui/inputs';
import { FormScroll } from '@/ui/layout';
import { Button, Card, Section } from '@/ui/primitives';
import { ErrorState, ListSkeleton } from '@/ui/states';
import { Text } from '@/ui/Text';

function IconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
      {HELP_ICONS.map((icon) => {
        const active = icon === value;
        return (
          <Pressable
            key={icon}
            onPress={() => onChange(icon)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: active ? theme.primary : theme.border,
              backgroundColor: active ? theme.primary : theme.card,
            }}
          >
            <Text variant="caption" color={active ? theme.onPrimary : theme.text}>
              {icon}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CategoryForm({ category, sortOrder }: { category: HelpCategory | null; sortOrder: number }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const [texts, setTexts] = useState<I18nValue>({
    title: { ...(category?.title_i18n ?? {}), he: category?.title ?? '' },
    description: { ...(category?.description_i18n ?? {}), he: category?.description ?? '' },
  });
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [icon, setIcon] = useState(category?.icon ?? 'help');
  const [audience, setAudience] = useState<HelpAudience>(category?.audience ?? 'admin');
  const [published, setPublished] = useState(category?.is_published ?? true);

  const cleanSlug = slug.trim().toLowerCase();
  const slugError = cleanSlug && !isHelpSlug(cleanSlug) ? 'אותיות קטנות באנגלית, ספרות ומקפים' : null;
  const title = texts.title.he?.trim() ?? '';
  const valid = !!title && isHelpSlug(cleanSlug);

  const done = (message: string) => {
    toast(message);
    void queryClient.invalidateQueries({ queryKey: keys.help });
    router.back();
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title,
        title_i18n: compactI18n(texts.title),
        description: texts.description.he?.trim() ?? '',
        description_i18n: compactI18n(texts.description),
        slug: cleanSlug,
        icon,
        audience,
        is_published: published,
        ...(category ? {} : { sort_order: sortOrder }),
      };
      return category
        ? api(`/api/admin/help/categories/${category.id}`, { method: 'PATCH', body })
        : api('/api/admin/help/categories', { method: 'POST', body });
    },
    onSuccess: () => done(category ? 'הקטגוריה עודכנה' : 'הקטגוריה נוספה'),
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/admin/help/categories/${category!.id}`, { method: 'DELETE' }),
    onSuccess: () => done('הקטגוריה נמחקה'),
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  async function onDelete() {
    if (!category) return;
    const ok = await confirm({
      title: `למחוק את "${category.title}"?`,
      message: `יימחקו גם ${category.videos.length} הסרטונים שבקטגוריה.`,
      confirmLabel: 'מחיקה',
      destructive: true,
    });
    if (ok) remove.mutate();
  }

  return (
    <FormScroll
      footer={
        <Button
          label={category ? 'שמירה' : 'הוספת הקטגוריה'}
          icon="checkmark"
          disabled={!valid || remove.isPending}
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
      }
    >
      <Stack.Screen options={{ title: category ? 'עריכת קטגוריה' : 'קטגוריה חדשה' }} />
      <Text tone="muted">קטגוריה מקבצת סרטונים במרכז העזרה של כל האפליקציות.</Text>
      <Card>
        <I18nFields
          value={texts}
          onChange={setTexts}
          titleLabel="שם הקטגוריה"
          onEnglishTitle={(text) => {
            if (!slugTouched) setSlug(slugifyHelp(text));
          }}
        />
      </Card>
      <Section title="למי מוצג">
        <Segmented options={HELP_AUDIENCES} value={audience} onChange={setAudience} />
      </Section>
      <Section title="אייקון באפליקציה">
        <IconPicker value={icon} onChange={setIcon} />
      </Section>
      <Card padded={false}>
        <SwitchRow label="מפורסמת באפליקציות" value={published} onValueChange={setPublished} />
      </Card>
      <Card>
        <Field
          label="מזהה בכתובת (slug)"
          value={slug}
          onChangeText={(text) => {
            setSlugTouched(true);
            setSlug(text);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          ltr
          error={slugError}
          hint={!cleanSlug ? 'נוצר אוטומטית מהשם באנגלית. חובה.' : undefined}
        />
      </Card>
      {category ? (
        <Button label="מחיקת הקטגוריה" icon="trash-outline" variant="danger" loading={remove.isPending} onPress={onDelete} />
      ) : null}
    </FormScroll>
  );
}

export default function CategoryScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const help = useHelp();
  if (help.isPending) return <ListSkeleton rows={4} avatar={false} />;
  if (help.isError) return <ErrorState error={help.error} onRetry={() => void help.refetch()} />;
  const sortOrder = nextSortOrder(help.data);
  if (!params.id) return <CategoryForm category={null} sortOrder={sortOrder} />;
  const category = help.data.find((item) => item.id === params.id);
  if (!category) return <ErrorState error={new Error('הקטגוריה לא נמצאה.')} onRetry={() => void help.refetch()} />;
  return <CategoryForm key={category.id} category={category} sortOrder={sortOrder} />;
}
