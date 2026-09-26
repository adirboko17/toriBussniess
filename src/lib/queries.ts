import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type {
  AccountDeletion,
  AdminBusiness,
  AdminCustomerDetail,
  AdminPurchase,
  AdminSummary,
  Badges,
  BusinessDetails,
  CancellationRequest,
  HelpCategory,
  Lead,
  OperationalMessage,
  Pricing,
  PrivacyApp,
  PulseemState,
  PushPreferences,
  PushType,
  SmsBalance,
  SmsPackageRow,
  WaConversation,
  WaMessage,
} from './types';

export const keys = {
  summary: ['summary'] as const,
  mainBalance: ['main-balance'] as const,
  businesses: ['businesses'] as const,
  balances: (ids: string[]) => ['balances', ids.join(',')] as const,
  business: (id: string) => ['business', id] as const,
  customer: (id: string) => ['customer', id] as const,
  pulseemState: (id: string) => ['pulseem-state', id] as const,
  smsBalance: (id: string) => ['sms-balance', id] as const,
  cancellations: ['cancellations'] as const,
  deletions: ['deletions'] as const,
  purchases: ['purchases'] as const,
  pricing: ['pricing'] as const,
  packages: ['packages'] as const,
  conversations: ['wa-conversations'] as const,
  messages: (phone: string) => ['wa-messages', phone] as const,
  leads: ['wa-leads'] as const,
  waSettings: ['wa-settings'] as const,
  opMessages: ['op-messages'] as const,
  help: ['help'] as const,
  privacyApps: ['privacy-apps'] as const,
  pushPrefs: ['push-prefs'] as const,
  badges: ['badges'] as const,
};

export const WA_POLL_MS = 8_000;

export function useSummary() {
  return useQuery({
    queryKey: keys.summary,
    queryFn: async () => (await api<{ summary: AdminSummary }>('/api/admin/summary', { timeoutMs: 45_000 })).summary,
  });
}

export function useMainBalance() {
  return useQuery({
    queryKey: keys.mainBalance,
    queryFn: async () => (await api<{ smsCredits: number }>('/api/admin/pulseem/main-balance')).smsCredits,
    staleTime: 60_000,
  });
}

export function useBusinesses() {
  return useQuery({
    queryKey: keys.businesses,
    queryFn: async () => (await api<{ businesses: AdminBusiness[] }>('/api/admin/businesses')).businesses,
  });
}

export function useSmsBalances(ids: string[]) {
  const sorted = [...new Set(ids)].sort();
  return useQuery({
    queryKey: keys.balances(sorted),
    enabled: sorted.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const merged: Record<string, SmsBalance> = {};
      for (let i = 0; i < sorted.length; i += 50) {
        const result = await api<{ balances: Record<string, SmsBalance> }>('/api/admin/pulseem/balances', {
          method: 'POST',
          body: { businessIds: sorted.slice(i, i + 50) },
          timeoutMs: 90_000,
        });
        Object.assign(merged, result.balances);
      }
      return merged;
    },
  });
}

export function useBusiness(id: string) {
  return useQuery({
    queryKey: keys.business(id),
    queryFn: () => api<BusinessDetails>(`/api/admin/apps/${id}?redact=1`, { timeoutMs: 45_000 }),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: keys.customer(id),
    queryFn: async () => (await api<{ customer: AdminCustomerDetail }>(`/api/admin/customers/${id}`)).customer,
  });
}

export function usePulseemState(id: string) {
  return useQuery({
    queryKey: keys.pulseemState(id),
    queryFn: async () =>
      (await api<{ state: PulseemState }>('/api/admin/pulseem/state', { method: 'POST', body: { businessId: id } }))
        .state,
  });
}

export function useSmsBalance(id: string, enabled: boolean, subAccountName?: string) {
  return useQuery({
    queryKey: keys.smsBalance(id),
    enabled,
    staleTime: 30_000,
    queryFn: async () =>
      (
        await api<{ directSmsCredits: string }>('/api/admin/pulseem/balance', {
          method: 'POST',
          body: { businessId: id, subAccountName },
          timeoutMs: 60_000,
        })
      ).directSmsCredits,
  });
}

export function useCancellations() {
  return useQuery({
    queryKey: keys.cancellations,
    queryFn: () => api<{ openCount: number; requests: CancellationRequest[] }>('/api/admin/cancellations'),
  });
}

export function useDeletions() {
  return useQuery({
    queryKey: keys.deletions,
    queryFn: async () => (await api<{ requests: AccountDeletion[] }>('/api/admin/account-deletions')).requests,
  });
}

export function usePurchases() {
  return useQuery({
    queryKey: keys.purchases,
    queryFn: async () => (await api<{ purchases: AdminPurchase[] }>('/api/admin/purchases')).purchases,
  });
}

export function usePricing() {
  return useQuery({ queryKey: keys.pricing, queryFn: () => api<Pricing>('/api/admin/pricing') });
}

export function usePackages() {
  return useQuery({
    queryKey: keys.packages,
    queryFn: async () => (await api<{ packages: SmsPackageRow[] }>('/api/admin/packages')).packages,
  });
}

export function useConversations(poll: boolean) {
  return useQuery({
    queryKey: keys.conversations,
    queryFn: async () =>
      (await api<{ conversations: WaConversation[] }>('/api/admin/whatsapp/conversations')).conversations,
    refetchInterval: poll ? WA_POLL_MS : false,
  });
}

export function useMessages(phone: string) {
  return useQuery({
    queryKey: keys.messages(phone),
    queryFn: async () =>
      (await api<{ messages: WaMessage[] }>(`/api/admin/whatsapp/conversations/${encodeURIComponent(phone)}`)).messages,
    refetchInterval: WA_POLL_MS,
  });
}

export function useLeads() {
  return useQuery({
    queryKey: keys.leads,
    queryFn: async () => (await api<{ leads: Lead[] }>('/api/admin/whatsapp/leads')).leads,
  });
}

export function useWaSettings() {
  return useQuery({
    queryKey: keys.waSettings,
    queryFn: async () => (await api<{ enabled: boolean }>('/api/admin/whatsapp/settings')).enabled,
  });
}

export function useOpMessages() {
  return useQuery({
    queryKey: keys.opMessages,
    queryFn: async () => (await api<{ messages: OperationalMessage[] }>('/api/admin/operational-messages')).messages,
  });
}

export function useHelp() {
  return useQuery({
    queryKey: keys.help,
    queryFn: async () => (await api<{ categories: HelpCategory[] }>('/api/admin/help')).categories,
  });
}

export function usePrivacyApps() {
  return useQuery({
    queryKey: keys.privacyApps,
    queryFn: async () => (await api<{ apps: PrivacyApp[] }>('/api/admin/privacy-apps')).apps,
  });
}

export function usePushPrefs() {
  return useQuery({
    queryKey: keys.pushPrefs,
    queryFn: () =>
      api<{ preferences: PushPreferences; catalog: { type: PushType; label: string }[] }>(
        '/api/admin/push-preferences',
      ),
  });
}

export function useBadges(enabled: boolean) {
  return useQuery({
    queryKey: keys.badges,
    enabled,
    queryFn: () => api<Badges>('/api/admin/badges'),
    refetchInterval: 60_000,
  });
}
