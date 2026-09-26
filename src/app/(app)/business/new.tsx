import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { ColorField, HEX_COLOR } from '@/features/business/ColorField';
import { ImagePickerField } from '@/features/business/ImagePickerField';
import { api, errorMessage } from '@/lib/api';
import { formatNumber, ltr } from '@/lib/format';
import type { PickedImage } from '@/lib/images';
import { keys } from '@/lib/queries';
import { radius, space, useTheme } from '@/lib/theme';
import { useToast } from '@/ui/feedback';
import { HeaderClose } from '@/ui/HeaderClose';
import { Field } from '@/ui/inputs';
import { FormScroll } from '@/ui/layout';
import { Button, Card, Icon, KeyValue } from '@/ui/primitives';
import { InlineNotice } from '@/ui/states';
import { Text } from '@/ui/Text';

const DEFAULT_PASSWORD = '123456';

const INITIAL = {
  businessName: '',
  clientName: '',
  address: '',
  primaryColor: '#111111',
  adminName: '',
  adminPhone: '',
  adminPassword: DEFAULT_PASSWORD,
  autoPulseem: true,
  pulseemSubPassword: '',
  pulseemFromNumber: '',
  pulseemApiKey: '',
  pulseemWsUserId: '',
  pulseemWsPassword: '',
};

type Form = typeof INITIAL;
type Errors = Partial<Record<keyof Form, string>>;
type Images = { logo: PickedImage | null; icon: PickedImage | null; splash: PickedImage | null };

type CreateResult = {
  ok: boolean;
  businessId: string;
  clientName: string;
  pulseemCreated: boolean;
  pulseemError?: string;
  pulseemDirectSmsCredits?: string;
  uploadedFiles: string[];
  uploadWarnings: string[];
};

const STEPS = [
  { title: 'פרטי העסק', description: 'השם שיופיע באפליקציה ושם התיקייה באנגלית.' },
  { title: 'מנהל העסק', description: 'המשתמש הראשון שיוכל להתחבר לאפליקציה כמנהל.' },
  { title: 'פולסים', description: 'חשבון ה-SMS שממנו יישלחו תזכורות והודעות.' },
  { title: 'מיתוג', description: 'צבע ותמונות. אפשר גם להעלות אחר כך מעמוד העסק.' },
  { title: 'סיכום', description: 'בדקו שהכול נכון לפני היצירה.' },
] as const;

const CLIENT_NAME = /^[a-zA-Z][a-zA-Z0-9]*$/;

function validate(step: number, form: Form): Errors {
  const errors: Errors = {};
  if (step === 0) {
    if (!form.businessName.trim()) errors.businessName = 'צריך להזין את שם העסק';
    if (!CLIENT_NAME.test(form.clientName)) errors.clientName = 'אותיות באנגלית וספרות בלבד, ומתחיל באות';
  }
  if (step === 1) {
    if (!form.adminName.trim()) errors.adminName = 'צריך להזין את שם המנהל';
    if (form.adminPhone.replace(/\D/g, '').length < 9) errors.adminPhone = 'צריך להזין טלפון תקין';
    if (!form.adminPassword) errors.adminPassword = 'צריך להזין סיסמה';
  }
  if (step === 3 && !HEX_COLOR.test(form.primaryColor)) errors.primaryColor = 'צבע בפורמט #RRGGBB';
  return errors;
}

function StepIndicator({ step }: { step: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`שלב ${step + 1} מתוך ${STEPS.length}`}>
      {STEPS.map((item, index) => (
        <View
          key={item.title}
          style={{
            flex: 1,
            height: 4,
            borderRadius: radius.pill,
            backgroundColor: index <= step ? theme.primary : theme.border,
          }}
        />
      ))}
    </View>
  );
}

function Choice({
  selected,
  title,
  description,
  onPress,
}: {
  selected: boolean;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Card
      onPress={onPress}
      style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', borderColor: selected ? theme.primary : theme.border, borderWidth: selected ? 2 : 1 }}
    >
      <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} color={selected ? theme.primary : theme.faint} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="semibold">{title}</Text>
        <Text variant="small" tone="muted">
          {description}
        </Text>
      </View>
    </Card>
  );
}

function ResultView({ form, result }: { form: Form; result: CreateResult }) {
  const theme = useTheme();
  const checks: { ok: boolean; label: string; detail?: string }[] = [
    { ok: true, label: 'פרופיל העסק, המנהל ושלושה שירותים נוצרו' },
    {
      ok: result.pulseemCreated,
      label: result.pulseemCreated ? 'תת-חשבון פולסים נוצר' : 'פולסים לא חובר',
      detail: result.pulseemCreated
        ? result.pulseemDirectSmsCredits
          ? `יתרה: ${formatNumber(result.pulseemDirectSmsCredits)} הודעות`
          : undefined
        : result.pulseemError,
    },
    {
      ok: result.uploadWarnings.length === 0,
      label: result.uploadedFiles.length ? `הועלו ${result.uploadedFiles.length} קבצי מיתוג` : 'לא הועלו קבצי מיתוג',
      detail: result.uploadWarnings.join(' · ') || undefined,
    },
  ];
  return (
    <FormScroll
      footer={
        <Button
          label="לעמוד העסק"
          icon="arrow-back"
          onPress={() => router.replace(`/business/${result.businessId}`)}
        />
      }
    >
      <Stack.Screen options={{ title: 'העסק נוצר', headerLeft: Platform.OS === 'ios' ? () => <HeaderClose /> : undefined }} />
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
        <View
          style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="checkmark" size={32} color={theme.onAccent} />
        </View>
        <Text variant="title" center>
          {form.businessName || result.clientName} נוצר בהצלחה
        </Text>
        <Text tone="muted" center>
          המנהל יכול להתחבר עם הטלפון {ltr(form.adminPhone)} והסיסמה {ltr(form.adminPassword)}.
        </Text>
      </View>
      <Card style={{ gap: space.md }}>
        {checks.map((check) => (
          <View key={check.label} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <Icon
              name={check.ok ? 'checkmark-circle' : 'warning'}
              color={check.ok ? theme.success : theme.warning}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text weight="medium">{check.label}</Text>
              {check.detail ? (
                <Text variant="small" tone="muted">
                  {check.detail}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </Card>
    </FormScroll>
  );
}

export default function NewBusinessScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(INITIAL);
  const [images, setImages] = useState<Images>({ logo: null, icon: null, splash: null });
  const [errors, setErrors] = useState<Errors>({});

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  const create = useMutation({
    mutationFn: () =>
      api<CreateResult>('/api/admin/apps/create', {
        method: 'POST',
        body: {
          ...form,
          businessName: form.businessName.trim(),
          adminName: form.adminName.trim(),
          adminPhone: form.adminPhone.trim(),
          address: form.address.trim(),
          logoBase64: images.logo?.dataUrl,
          iconBase64: images.icon?.dataUrl,
          splashBase64: images.splash?.dataUrl,
        },
        timeoutMs: 130_000,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.businesses });
      void queryClient.invalidateQueries({ queryKey: keys.summary });
    },
    onError: (error) => toast(errorMessage(error), 'danger'),
  });

  if (create.data) return <ResultView form={form} result={create.data} />;

  const last = step === STEPS.length - 1;
  const pending = create.isPending;

  function next() {
    const found = validate(step, form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function submit() {
    for (let index = 0; index < STEPS.length - 1; index += 1) {
      const found = validate(index, form);
      if (Object.values(found).some(Boolean)) {
        setErrors(found);
        setStep(index);
        return;
      }
    }
    create.mutate();
  }

  const summary: [string, string][] = [
    ['שם העסק', form.businessName],
    ['שם האפליקציה', ltr(form.clientName)],
    ['כתובת', form.address || '—'],
    ['מנהל', form.adminName],
    ['טלפון המנהל', ltr(form.adminPhone)],
    ['סיסמה ראשונית', ltr(form.adminPassword)],
    ['פולסים', form.autoPulseem ? 'תת-חשבון חדש' : 'חשבון קיים'],
    ['צבע', ltr(form.primaryColor)],
    [
      'תמונות',
      [images.logo && 'לוגו', images.icon && 'אייקון', images.splash && 'מסך פתיחה'].filter(Boolean).join(', ') || 'בלי תמונות',
    ],
  ];

  return (
    <FormScroll
      footer={
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {step > 0 ? (
            <Button label="חזרה" variant="secondary" disabled={pending} onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
          ) : null}
          <Button
            label={last ? (pending ? 'יוצר את העסק…' : 'יצירת העסק') : 'המשך'}
            icon={last ? 'sparkles-outline' : undefined}
            loading={pending}
            onPress={last ? submit : next}
            style={{ flex: 2 }}
          />
        </View>
      }
    >
      <Stack.Screen
        options={{
          gestureEnabled: !pending,
          headerLeft: Platform.OS === 'ios' ? () => <HeaderClose disabled={pending} /> : undefined,
          headerBackVisible: !pending,
        }}
      />
      <StepIndicator step={step} />
      <View style={{ gap: 4 }}>
        <Text variant="h2">
          {step + 1}. {STEPS[step].title}
        </Text>
        <Text tone="muted">{STEPS[step].description}</Text>
      </View>

      {step === 0 ? (
        <Card style={{ gap: space.md }}>
          <Field
            label="שם העסק"
            value={form.businessName}
            onChangeText={(value) => set('businessName', value)}
            placeholder="למשל: סטודיו שרה"
            error={errors.businessName}
            returnKeyType="next"
          />
          <Field
            label="שם האפליקציה באנגלית"
            value={form.clientName}
            onChangeText={(value) => set('clientName', value.replace(/\s/g, ''))}
            placeholder="SarahStudio"
            autoCapitalize="none"
            autoCorrect={false}
            ltr
            error={errors.clientName}
            hint="משמש לתיקיית המיתוג ולתת-חשבון פולסים. אי אפשר לשנות אחר כך."
          />
          <Field label="כתובת" value={form.address} onChangeText={(value) => set('address', value)} hint="לא חובה" />
        </Card>
      ) : null}

      {step === 1 ? (
        <Card style={{ gap: space.md }}>
          <Field label="שם המנהל" value={form.adminName} onChangeText={(value) => set('adminName', value)} error={errors.adminName} />
          <Field
            label="טלפון נייד"
            value={form.adminPhone}
            onChangeText={(value) => set('adminPhone', value)}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            placeholder="050-0000000"
            ltr
            error={errors.adminPhone}
          />
          <Field
            label="סיסמה ראשונית"
            value={form.adminPassword}
            onChangeText={(value) => set('adminPassword', value)}
            autoCapitalize="none"
            autoCorrect={false}
            ltr
            error={errors.adminPassword}
            hint="המנהל יוכל לשנות אותה באפליקציה."
          />
          <InlineNotice
            tone="info"
            icon="key-outline"
            title={`הסיסמה הראשונית: ${ltr(form.adminPassword || '—')}`}
            message={form.adminPassword === DEFAULT_PASSWORD ? 'זו סיסמת ברירת המחדל. כדאי למסור אותה למנהל העסק.' : undefined}
          />
        </Card>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: space.md }}>
          <Choice
            selected={form.autoPulseem}
            title="תת-חשבון חדש"
            description="נוצר ומתחבר אוטומטית. מומלץ."
            onPress={() => set('autoPulseem', true)}
          />
          <Choice
            selected={!form.autoPulseem}
            title="חשבון קיים"
            description="לעסק שכבר יש לו חשבון פולסים."
            onPress={() => set('autoPulseem', false)}
          />
          <Card style={{ gap: space.md }}>
            {form.autoPulseem ? (
              <>
                <Field
                  label="סיסמה לתת-החשבון"
                  value={form.pulseemSubPassword}
                  onChangeText={(value) => set('pulseemSubPassword', value)}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  hint="ריק = סיסמה אקראית"
                  ltr
                />
                <Field
                  label="מספר או שם שולח"
                  value={form.pulseemFromNumber}
                  onChangeText={(value) => set('pulseemFromNumber', value)}
                  autoCapitalize="none"
                  hint="ריק = שם האפליקציה"
                  ltr
                />
              </>
            ) : (
              <>
                <Field
                  label="מפתח API"
                  value={form.pulseemApiKey}
                  onChangeText={(value) => set('pulseemApiKey', value)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  ltr
                />
                <Field
                  label="שם משתמש WS"
                  value={form.pulseemWsUserId}
                  onChangeText={(value) => set('pulseemWsUserId', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  ltr
                />
                <Field
                  label="סיסמת WS"
                  value={form.pulseemWsPassword}
                  onChangeText={(value) => set('pulseemWsPassword', value)}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  ltr
                />
                <Field
                  label="מספר שולח"
                  value={form.pulseemFromNumber}
                  onChangeText={(value) => set('pulseemFromNumber', value)}
                  autoCapitalize="none"
                  ltr
                />
              </>
            )}
          </Card>
        </View>
      ) : null}

      {step === 3 ? (
        <>
          <Card style={{ gap: space.md }}>
            <ColorField value={form.primaryColor} onChange={(value) => set('primaryColor', value)} />
            {errors.primaryColor ? (
              <Text variant="small" tone="danger">
                {errors.primaryColor}
              </Text>
            ) : null}
          </Card>
          <Card style={{ gap: space.xl }}>
            <ImagePickerField
              label="אייקון"
              hint="ריבוע 1024×1024"
              value={images.icon}
              onChange={(icon) => setImages((current) => ({ ...current, icon }))}
              maxWidth={1024}
              aspect={[1, 1]}
            />
            <ImagePickerField
              label="לוגו"
              hint="PNG שקוף, לפחות 512px"
              value={images.logo}
              onChange={(logo) => setImages((current) => ({ ...current, logo }))}
              maxWidth={1024}
            />
            <ImagePickerField
              label="מסך פתיחה"
              hint="לאורך, 1242×2688"
              value={images.splash}
              onChange={(splash) => setImages((current) => ({ ...current, splash }))}
              maxWidth={1242}
              previewAspect={0.5}
            />
          </Card>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Card>
            {summary.map(([label, value]) => (
              <KeyValue key={label} label={label} value={value} />
            ))}
          </Card>
          <InlineNotice
            tone="info"
            icon="time-outline"
            title="היצירה לוקחת כחצי דקה"
            message="השאירו את המסך פתוח עד שתופיע הודעת הסיום."
          />
        </>
      ) : null}
    </FormScroll>
  );
}
