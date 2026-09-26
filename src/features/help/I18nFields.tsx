import { useState } from 'react';
import { View } from 'react-native';
import { space } from '@/lib/theme';
import type { HelpI18n, HelpLocale } from '@/lib/types';
import { Field, Segmented } from '@/ui/inputs';
import { HELP_LOCALES } from './shared';

export type I18nValue = { title: HelpI18n; description: HelpI18n };

export function I18nFields({
  value,
  onChange,
  titleLabel,
  onEnglishTitle,
}: {
  value: I18nValue;
  onChange: (value: I18nValue) => void;
  titleLabel: string;
  onEnglishTitle?: (title: string) => void;
}) {
  const [locale, setLocale] = useState<HelpLocale>('he');
  const latin = locale === 'en' || locale === 'ru';
  return (
    <View style={{ gap: space.md }}>
      <Segmented options={HELP_LOCALES} value={locale} onChange={setLocale} />
      <Field
        key={`title-${locale}`}
        label={locale === 'he' ? titleLabel : `${titleLabel} (${HELP_LOCALES.find((l) => l.value === locale)?.label})`}
        value={value.title[locale] ?? ''}
        onChangeText={(text) => {
          onChange({ ...value, title: { ...value.title, [locale]: text } });
          if (locale === 'en') onEnglishTitle?.(text);
        }}
        hint={locale === 'he' ? 'חובה' : locale === 'en' ? 'לא חובה. משמש גם לכתובת' : 'לא חובה'}
        ltr={latin}
        style={locale === 'ar' ? { writingDirection: 'rtl' } : undefined}
      />
      <Field
        key={`description-${locale}`}
        label="תיאור"
        value={value.description[locale] ?? ''}
        onChangeText={(text) => onChange({ ...value, description: { ...value.description, [locale]: text } })}
        multiline
        hint="לא חובה"
        ltr={latin}
      />
    </View>
  );
}
