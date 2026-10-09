import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '@/lib/api';
import { startLogin, verifyOtp } from '@/lib/auth';
import { formatPhone, isIsraeliMobile, ltr, normalizeIsraeliMobile } from '@/lib/format';
import { radius, space, useTheme } from '@/lib/theme';
import { Field } from '@/ui/inputs';
import { Button } from '@/ui/primitives';
import { OfflineBanner } from '@/ui/states';
import { Text, fonts } from '@/ui/Text';

const logo = require('../../assets/splash-icon.png');

export default function LoginScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [phoneForCode, setPhoneForCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<TextInput>(null);

  async function continueWithPhone() {
    setError(null);
    if (!isIsraeliMobile(phone)) {
      setError('צריך להזין מספר נייד ישראלי תקין.');
      return;
    }
    setBusy(true);
    try {
      const result = await startLogin(normalizeIsraeliMobile(phone));
      if (!result.otpToken) throw new Error('לא ניתן להמשיך. נסו שוב.');
      setOtpToken(result.otpToken);
      setPhoneForCode(result.phone);
      setCode('');
      setStep('code');
      setTimeout(() => codeRef.current?.focus(), 250);
    } catch (e) {
      setError(errorMessage(e, 'לא ניתן להמשיך. נסו שוב.'));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(value = code) {
    setError(null);
    if (value.length !== 6) {
      setError('יש להזין קוד בן 6 ספרות.');
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(value, otpToken);
    } catch (e) {
      setError(errorMessage(e, 'אימות הקוד נכשל.'));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }} edges={['top', 'bottom']}>
      <KeyboardAwareScrollView
        bottomOffset={32}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
      >
        <OfflineBanner />
        <View style={styles.brand}>
          <Image source={logo} style={{ width: 84, height: 84 }} contentFit="contain" />
          <Text variant="title" center>
            ניהול Tori
          </Text>
          <Text tone="muted" center>
            כניסה למנהלי האתר בלבד
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {step === 'phone' ? (
            <>
              <Field
                label="מספר נייד"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  setError(null);
                }}
                placeholder="050-0000000"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                ltr
                returnKeyType="done"
                onSubmitEditing={continueWithPhone}
                error={error}
                maxLength={14}
                autoFocus
              />
              <Button label="המשך" onPress={continueWithPhone} loading={busy} />
            </>
          ) : (
            <>
              <Text tone="muted">
                הזינו קוד בן 6 ספרות עבור {ltr(formatPhone(phoneForCode))}
              </Text>
              <TextInput
                ref={codeRef}
                value={code}
                onChangeText={(value) => {
                  const digits = value.replace(/\D/g, '').slice(0, 6);
                  setCode(digits);
                  setError(null);
                  if (digits.length === 6) void submitCode(digits);
                }}
                keyboardType="number-pad"
                textContentType="none"
                autoComplete="off"
                maxLength={6}
                editable={!busy}
                accessibilityLabel="קוד אימות"
                style={[
                  styles.code,
                  {
                    color: theme.text,
                    borderColor: error ? theme.danger : theme.border,
                    backgroundColor: theme.page,
                    fontFamily: fonts.semibold,
                  },
                ]}
                placeholder="••••••"
                placeholderTextColor={theme.faint}
              />
              {error ? (
                <Text variant="small" tone="danger">
                  {error}
                </Text>
              ) : null}
              <Button label="כניסה" onPress={() => void submitCode()} loading={busy} />
              <View style={styles.links}>
                <Pressable onPress={() => void continueWithPhone()} disabled={busy} hitSlop={8}>
                  <Text tone="link" weight="medium">
                    בקשה חדשה
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setStep('phone');
                    setError(null);
                  }}
                  disabled={busy}
                  hitSlop={8}
                >
                  <Text tone="link" weight="medium">
                    החלפת מספר
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.xl },
  brand: { alignItems: 'center', gap: space.sm },
  card: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: space.xl, gap: space.lg },
  code: {
    height: 60,
    borderWidth: 1,
    borderRadius: radius.md,
    fontSize: 28,
    letterSpacing: 10,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
});
