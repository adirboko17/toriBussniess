import { File, UploadType } from 'expo-file-system';
import { api } from '@/lib/api';
import type { HelpAudience, HelpI18n, HelpLocale } from '@/lib/types';

export const HELP_LOCALES: { value: HelpLocale; label: string }[] = [
  { value: 'he', label: 'עברית' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
  { value: 'ru', label: 'Русский' },
];

export const HELP_AUDIENCES: { value: HelpAudience; label: string }[] = [
  { value: 'admin', label: 'מנהלים' },
  { value: 'all', label: 'כולם' },
  { value: 'client', label: 'לקוחות' },
];

/** Icon keys the salon manager app renders; anything else falls back to "help". */
export const HELP_ICONS = [
  'appointments', 'calendar', 'clock', 'time', 'users', 'clients', 'employees', 'settings', 'palette', 'design',
  'bell', 'notifications', 'image', 'gallery', 'repeat', 'recurring', 'help', 'book', 'book-open', 'scissors',
  'services', 'wallet', 'finance', 'store', 'branches', 'message', 'message-circle', 'headphones', 'support',
  'phone', 'star', 'home', 'shield', 'sparkles', 'layout', 'layout-grid', 'user-plus', 'mail',
] as const;

const HELP_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isHelpSlug(value: string) {
  return HELP_SLUG.test(value);
}

export function slugifyHelp(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function audienceLabel(audience: HelpAudience) {
  return HELP_AUDIENCES.find((item) => item.value === audience)?.label ?? audience;
}

export function formatDuration(seconds: number | null | undefined) {
  const n = Math.max(0, Math.round(Number(seconds ?? 0)));
  if (!n) return '—';
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

export function compactI18n(input: HelpI18n): HelpI18n {
  const out: HelpI18n = {};
  for (const { value } of HELP_LOCALES) {
    const text = input[value]?.trim();
    if (text) out[value] = text;
  }
  return out;
}

export function nextSortOrder(items: { sort_order: number }[]) {
  return items.reduce((max, item) => Math.max(max, Number(item.sort_order) || 0), 0) + 10;
}

/** Uploads through a one-time signed URL issued by the site; the app never holds storage credentials. */
export async function uploadHelpFile(path: string, uri: string, mimeType: string) {
  const prepared = await api<{ signedUrl: string; publicUrl: string; token?: string }>('/api/admin/help/upload-url', {
    method: 'POST',
    body: { path, upsert: true },
  });
  const result = await new File(uri).upload(prepared.signedUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    mimeType,
    headers: {
      'Content-Type': mimeType,
      'x-upsert': 'true',
      ...(prepared.token ? { Authorization: `Bearer ${prepared.token}` } : {}),
    },
  });
  if (result.status < 200 || result.status >= 300) throw new Error('העלאת הקובץ נכשלה. נסו שוב.');
  return `${prepared.publicUrl}?t=${Date.now()}`;
}
