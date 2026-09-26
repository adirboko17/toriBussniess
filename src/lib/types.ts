export type ActivityItem = {
  id: string;
  kind: 'business' | 'purchase' | 'cancellation' | 'deletion';
  title: string;
  detail: string;
  at: string;
  href: string;
  amountIls?: number;
};

export type AdminSummary = {
  monthlyPriceIls: number;
  businesses: number;
  newBusinessesThisMonth: number;
  clients: number;
  activeSubscriptions: number;
  expectedMrrIls: number;
  smsRevenueThisMonthIls: number;
  smsPurchasesThisMonth: number;
  openCancellations: CancellationRequest[];
  recentDeletions: AccountDeletion[];
  failedPurchases: AdminPurchase[];
  waitingChats: { phone: string; name: string; lastMessageAt: string | null }[] | null;
  smsBusinesses: { id: string; name: string }[];
  activity: ActivityItem[];
  errors: string[];
};

export type OpenCancellation = { id: string; status: CancellationStatus; requestedAt: string };

export type AdminBusiness = {
  id: string;
  name: string;
  phone: string;
  address: string;
  clientName: string;
  iconUrl: string | null;
  primaryColor: string | null;
  createdAt: string;
  clientCount: number;
  adminCount: number;
  hasPulseem: boolean;
  prepaidCredits: number;
  subscription: 'active' | 'cancelled' | 'none';
  openCancellation: OpenCancellation | null;
  purchaseCount: number;
  purchaseTotalIls: number;
};

export type SmsBalance = { credits: string | number | null; message?: string };

export type BusinessUser = {
  id: string;
  name: string | null;
  phone: string | null;
  user_type: string | null;
  created_at: string | null;
  image_url?: string | null;
};

export type BusinessService = {
  id: string;
  name: string | null;
  price: number | null;
  duration_minutes: number | null;
  is_active: boolean | null;
  order_index?: number | null;
};

export type BrandingFile = {
  name: string;
  path: string;
  publicUrl: string;
  size: number | null;
  updatedAt: string | null;
};

export type BusinessProfile = {
  id: string;
  display_name: string | null;
  address: string | null;
  phone: string | null;
  primary_color: string | null;
  created_at: string;
  branding_client_name: string | null;
  pulseem_from_number: string | null;
  pulseem_has_password: boolean | null;
  pulseem_has_api_key: boolean | null;
  pulseem_has_user_id: boolean;
};

export type BusinessDetails = {
  profile: BusinessProfile | null;
  users: BusinessUser[];
  services: BusinessService[];
  brandingFiles: BrandingFile[];
  brandingFolder: string | null;
};

export type PayplusSubscription = {
  id: string;
  businessId: string;
  recurringUid: string;
  status: 'active' | 'cancelled';
  cancelledAt: string | null;
  cancelledByPhone: string | null;
  amountIls: number | null;
  nextChargeAt: string | null;
  lastChargeAt: string | null;
  updatedAt: string | null;
};

export type AdminPurchase = {
  id: string;
  businessId: string;
  businessName: string;
  packageId: string | null;
  packageLabel: string;
  smsCredits: number;
  amountIls: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type AdminCustomerDetail = {
  id: string;
  name: string;
  phone: string;
  prepaidCredits: number;
  smsRemaining: number | null;
  createdAt: string;
  adminCount: number;
  purchaseCount: number;
  purchaseTotalIls: number;
  openCancellation: OpenCancellation | null;
  payplusSubscription: PayplusSubscription | null;
  admins: { id?: string; name: string | null; phone: string | null }[];
  purchases: AdminPurchase[];
};

export type Recurring = {
  uid: string;
  number: string;
  customerName: string;
  customerPhone: string;
  amount: number | null;
  startDate: string | null;
  nextChargeAt: string | null;
  valid: boolean;
};

export type PulseemState = {
  userId: string;
  fromNumber: string;
  hasPassword: boolean;
  hasApiKey: boolean;
  displayName: string | null;
  brandingClientName: string | null;
};

export type CancellationStatus = 'requested' | 'seen' | 'done' | 'dismissed';

export type CancellationRequest = {
  id: string;
  businessId: string;
  businessName: string;
  requestedByUserId: string | null;
  requestedByName: string;
  requestedByPhone: string;
  status: CancellationStatus;
  note: string;
  requestedAt: string;
  effectiveAt: string | null;
  reviewedAt: string | null;
  reviewedByPhone: string | null;
  payplusSubscription?: PayplusSubscription | null;
};

export type AccountDeletion = {
  id: string;
  fullName: string;
  phone: string;
  appName: string;
  note: string;
  createdAt: string;
};

export type Pricing = {
  monthlyPriceIls: number;
  subtotal: number;
  vat: number;
  total: number;
};

export type SmsPackageRow = {
  id: string;
  package_key: string;
  sms_credits: number;
  amount_ils: number;
  label: string;
  featured: boolean;
  sort_order: number;
  is_active: boolean;
};

export type WaConversation = {
  phone: string;
  name: string | null;
  status: string;
  last_message_at: string | null;
  last_message: string | null;
  last_user_message: string | null;
  proactive: boolean | null;
};

export type WaMessage = {
  id: string | number;
  phone: string;
  role: 'user' | 'bot' | 'human_agent' | string;
  content: string;
  created_at: string;
};

export type LeadStatus =
  | 'no_contact'
  | 'message_sent'
  | 'active_conversation'
  | 'relevant'
  | 'not_relevant';

export type Lead = {
  id: string;
  name: string | null;
  business: string | null;
  phone: string;
  business_type: string | null;
  notes: string | null;
  source: string | null;
  status: LeadStatus;
  message_name: string | null;
  created_at: string;
};

export type OperationalMessage = {
  id: string;
  title: string;
  body: string;
  actionLabel: string | null;
  actionUrl: string | null;
  audience: 'staff' | 'everyone';
  active: boolean;
  createdAt: string;
  createdByPhone: string | null;
  businessIds: string[];
  dismissalCount: number;
};

export type HelpLocale = 'he' | 'en' | 'ar' | 'ru';
export type HelpI18n = Partial<Record<HelpLocale, string>>;
export type HelpAudience = 'admin' | 'client' | 'all';

export type HelpVideo = {
  id: string;
  category_id: string;
  slug: string | null;
  title: string;
  title_i18n: HelpI18n;
  description: string | null;
  description_i18n: HelpI18n;
  video_url: string;
  storage_path: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  is_published: boolean;
};

export type HelpCategory = {
  id: string;
  slug: string;
  title: string;
  title_i18n: HelpI18n;
  description: string | null;
  description_i18n: HelpI18n;
  icon: string | null;
  sort_order: number;
  is_published: boolean;
  audience: HelpAudience;
  videos: HelpVideo[];
};

export type PrivacyApp = {
  id: string;
  name: string;
  bundle_id: string;
  created_at: string;
};

export type PushType =
  | 'new_business'
  | 'new_client'
  | 'sms_purchase_paid'
  | 'sms_purchase_failed'
  | 'cancellation_request'
  | 'account_deletion'
  | 'whatsapp_human'
  | 'sms_low_balance'
  | 'pulseem_main_low';

export type PushPreferences = { enabled: boolean; types: Record<PushType, boolean> };

export type Badges = { openRequests: number; waitingChats: number; total: number };
