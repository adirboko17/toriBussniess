import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { BillingTab } from '@/features/business/BillingTab';
import { BrandingTab } from '@/features/business/BrandingTab';
import { OverviewTab } from '@/features/business/OverviewTab';
import { PeopleTab } from '@/features/business/PeopleTab';
import { SettingsTab } from '@/features/business/SettingsTab';
import { SmsTab } from '@/features/business/SmsTab';
import { useBusiness } from '@/lib/queries';
import { space, useTheme } from '@/lib/theme';
import { useParamState } from '@/lib/useParamState';
import { Chips } from '@/ui/inputs';
import { ErrorState, ListSkeleton } from '@/ui/states';

const TABS = [
  { value: 'overview', label: 'סקירה' },
  { value: 'billing', label: 'מנוי וחיובים' },
  { value: 'sms', label: 'SMS' },
  { value: 'people', label: 'משתמשים ושירותים' },
  { value: 'branding', label: 'מיתוג' },
  { value: 'settings', label: 'הגדרות' },
] as const;

type TabKey = (typeof TABS)[number]['value'];

const TAB_KEYS = TABS.map((tab) => tab.value);

export default function BusinessScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const id = String(params.id);
  const [tab, setTab] = useParamState<TabKey>(params.tab, TAB_KEYS, 'overview');

  const details = useBusiness(id);
  const name = details.data?.profile?.display_name?.trim() || 'עסק';

  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
      <Stack.Screen options={{ title: name }} />
      <View style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
        <Chips options={[...TABS]} value={tab} onChange={setTab} />
      </View>
      {details.isPending ? (
        <ListSkeleton rows={5} />
      ) : details.isError || !details.data?.profile ? (
        <ErrorState error={details.error ?? new Error('העסק לא נמצא.')} onRetry={() => void details.refetch()} />
      ) : tab === 'overview' ? (
        <OverviewTab id={id} details={details.data} onNavigate={setTab} />
      ) : tab === 'billing' ? (
        <BillingTab id={id} />
      ) : tab === 'sms' ? (
        <SmsTab id={id} name={name} details={details.data} />
      ) : tab === 'people' ? (
        <PeopleTab id={id} details={details.data} />
      ) : tab === 'branding' ? (
        <BrandingTab id={id} details={details.data} />
      ) : (
        <SettingsTab id={id} name={name} />
      )}
    </View>
  );
}
