import type { Tone } from './theme';

export const LOW_SMS_BALANCE = 200;
export const INCLUDED_SMS = 1000;
export const VAT_RATE = 0.18;

const TZ = 'Asia/Jerusalem';
const LRI = '\u2066';
const PDI = '\u2069';

/** Keeps phones, numbers and latin ids in LTR order inside Hebrew text. */
export function ltr(value: string | number | null | undefined) {
  if (value == null || value === '') return '';
  return `${LRI}${value}${PDI}`;
}

const number = new Intl.NumberFormat('he-IL');
const dateFmt = new Intl.DateTimeFormat('he-IL', {
  timeZone: TZ,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const dateTimeFmt = new Intl.DateTimeFormat('he-IL', {
  timeZone: TZ,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('he-IL', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
});
const monthFmt = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, month: 'long', year: 'numeric' });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function toDate(value: string | number | Date | null | undefined) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatNumber(value: number | string | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? number.format(n) : '—';
}

export function formatIls(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₪${number.format(Math.round(n * 100) / 100)}`;
}

export function formatDate(value: string | null | undefined) {
  const date = toDate(value);
  return date ? dateFmt.format(date) : '—';
}

export function formatDateTime(value: string | null | undefined) {
  const date = toDate(value);
  return date ? dateTimeFmt.format(date) : '—';
}

export function formatTime(value: string | null | undefined) {
  const date = toDate(value);
  return date ? timeFmt.format(date) : '';
}

export function formatMonth(value: Date = new Date()) {
  return monthFmt.format(value);
}

export function israelDayKey(value: string | Date | null | undefined) {
  const date = toDate(value ?? null);
  return date ? dayKeyFmt.format(date) : '';
}

export function formatRelative(value: string | null | undefined) {
  const date = toDate(value);
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return minutes === 1 ? 'לפני דקה' : `לפני ${minutes} דקות`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'לפני שעה' : hours === 2 ? 'לפני שעתיים' : `לפני ${hours} שעות`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'אתמול';
  if (days < 7) return `לפני ${days} ימים`;
  return formatDate(value);
}

export function formatPhone(value: string | null | undefined) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (/^05\d{8}$/.test(digits)) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (/^9725\d{8}$/.test(digits)) return `0${digits.slice(3, 5)}-${digits.slice(5)}`;
  return String(value ?? '');
}

export function normalizeIsraeliMobile(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('972')) digits = `0${digits.slice(3)}`;
  return digits;
}

export function isIsraeliMobile(value: string) {
  return /^05\d{8}$/.test(normalizeIsraeliMobile(value));
}

export function withVat(amount: number) {
  return Math.round(amount * (1 + VAT_RATE) * 100) / 100;
}

export function perMessage(pack: { amount_ils: number; sms_credits: number }) {
  if (!pack.sms_credits) return '—';
  const agorot = (Number(pack.amount_ils) / Number(pack.sms_credits)) * 100;
  return `${agorot.toLocaleString('he-IL', { maximumFractionDigits: 1 })} אג׳ להודעה`;
}

export const PURCHASE_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'ממתין לתשלום', tone: 'warning' },
  processing: { label: 'בטעינה', tone: 'info' },
  paid: { label: 'שולם', tone: 'success' },
  fulfilled: { label: 'הושלם', tone: 'success' },
  failed: { label: 'נכשל', tone: 'danger' },
};

export const SUBSCRIPTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'מנוי פעיל', tone: 'success' },
  cancelled: { label: 'מנוי בוטל', tone: 'neutral' },
  none: { label: 'אין הוראת קבע', tone: 'warning' },
  cancelling: { label: 'ביקשו לבטל', tone: 'danger' },
};

export const CANCELLATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  requested: { label: 'חדש', tone: 'warning' },
  seen: { label: 'בטיפול', tone: 'info' },
  done: { label: 'טופל', tone: 'success' },
  dismissed: { label: 'לא רלוונטי', tone: 'neutral' },
};

export const LEAD_STATUS: Record<string, { label: string; tone: Tone }> = {
  no_contact: { label: 'לא נוצר קשר', tone: 'neutral' },
  message_sent: { label: 'נשלח הודעה', tone: 'info' },
  active_conversation: { label: 'שיחה פעילה', tone: 'brand' },
  relevant: { label: 'רלוונטי', tone: 'success' },
  not_relevant: { label: 'לא רלוונטי', tone: 'danger' },
};

export function smsTone(credits: number | null | undefined): Tone {
  if (credits == null) return 'neutral';
  return credits < LOW_SMS_BALANCE ? 'danger' : 'success';
}

/** Maps the web panel links returned by the API (activity feed) to app routes. */
export function appRouteFromWebHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const [path, query = ''] = href.split('?');
  const business = /^\/admin\/businesses\/([0-9a-fA-F-]{36})$/.exec(path);
  if (business) return `/business/${business[1]}${query ? `?${query}` : ''}`;
  if (path === '/admin/requests/deletions') return '/requests?view=deletions';
  if (path === '/admin/requests') return '/requests';
  if (path === '/admin/billing') return '/finance/purchases';
  if (path === '/admin/businesses') return '/businesses';
  if (path === '/admin/whatsapp') {
    const phone = new URLSearchParams(query).get('phone');
    return phone && /^\d{8,15}$/.test(phone) ? `/chat/${phone}` : '/whatsapp';
  }
  return null;
}

export function toNumberOrNull(value: unknown) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
