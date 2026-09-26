import type { Lead, LeadStatus } from '@/lib/types';

export const DEFAULT_BUSINESS_TYPE = 'סלון ציפורניים';

export const LEAD_STATUSES: LeadStatus[] = [
  'no_contact',
  'message_sent',
  'active_conversation',
  'relevant',
  'not_relevant',
];

export function leadStatusOf(lead: Pick<Lead, 'status'>): LeadStatus {
  return LEAD_STATUSES.includes(lead.status) ? lead.status : 'no_contact';
}

export function canSendFirstMessage(source: string | null | undefined) {
  return source === 'manual' || source === 'excel-import';
}

export function sourceLabel(source: string | null) {
  if (source === 'manual') return 'הוספה ידנית';
  if (source === 'excel-import') return 'ייבוא מאקסל';
  return source || '—';
}

/** Preview only; the server builds the message it actually sends. */
export function firstLeadMessagePreview(messageName: string) {
  const name = messageName.trim();
  return `${name ? `היי ${name}` : 'היי'} מה שלומך ?\nהבנתי שאת בונת ציפורניים , זה נכון ?`;
}

export function roleLabel(role: string) {
  if (role === 'user') return 'לקוח';
  if (role === 'human_agent') return 'נציג';
  return 'בוט';
}
