import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, useTheme } from '@/lib/theme';
import { Field } from './inputs';
import { Button } from './primitives';
import { Text } from './Text';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** The user must type this exact text before confirming. */
  typeToConfirm?: string;
};

type ToastTone = 'success' | 'danger' | 'info';

type FeedbackContext = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: (message: string, tone?: ToastTone) => void;
};

const Context = createContext<FeedbackContext | null>(null);

export function useConfirm() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('FeedbackProvider missing');
  return ctx.confirm;
}

export function useToast() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('FeedbackProvider missing');
  return ctx.toast;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState('');
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const [toastState, setToastState] = useState<{ message: string; tone: ToastTone; key: number } | null>(null);
  const [toastOpacity] = useState(() => new Animated.Value(0));

  const confirm = useCallback((options: ConfirmOptions) => {
    setTyped('');
    setDialog(options);
    if (options.destructive) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setDialog(null);
  };

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    setToastState({ message, tone, key: Date.now() });
    void Haptics.notificationAsync(
      tone === 'danger' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toastState) return;
    Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
        setToastState(null),
      );
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastState, toastOpacity]);

  const needsTyping = !!dialog?.typeToConfirm;
  const canConfirm = !needsTyping || typed.trim() === dialog?.typeToConfirm?.trim();
  const toastColors =
    toastState?.tone === 'danger'
      ? { bg: theme.dangerBg, fg: theme.danger, icon: 'alert-circle' as const }
      : toastState?.tone === 'info'
        ? { bg: theme.infoBg, fg: theme.info, icon: 'information-circle' as const }
        : { bg: theme.successBg, fg: theme.success, icon: 'checkmark-circle' as const };

  return (
    <Context.Provider value={{ confirm, toast }}>
      {children}
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior="padding" style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} accessibilityLabel="סגירה" />
          <View style={[styles.dialog, { backgroundColor: theme.card }]} accessibilityViewIsModal>
            <Text variant="h2">{dialog?.title}</Text>
            {dialog?.message ? <Text tone="muted">{dialog.message}</Text> : null}
            {needsTyping ? (
              <Field
                label={`להקליד "${dialog?.typeToConfirm}" לאישור`}
                value={typed}
                onChangeText={setTyped}
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus
              />
            ) : null}
            <View style={styles.actions}>
              <Button
                label={dialog?.confirmLabel ?? 'אישור'}
                variant={dialog?.destructive ? 'danger' : 'primary'}
                disabled={!canConfirm}
                onPress={() => close(true)}
                style={{ flex: 1 }}
              />
              <Button
                label={dialog?.cancelLabel ?? 'ביטול'}
                variant="secondary"
                onPress={() => close(false)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {toastState ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { top: insets.top + space.sm, backgroundColor: toastColors.bg, opacity: toastOpacity },
          ]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Ionicons name={toastColors.icon} size={18} color={toastColors.fg} />
          <Text weight="medium" color={toastColors.fg} style={{ flex: 1 }}>
            {toastState.message}
          </Text>
        </Animated.View>
      ) : null}
    </Context.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: space.xl },
  dialog: { borderRadius: radius.xl, padding: space.xl, gap: space.lg },
  actions: { flexDirection: 'row', gap: space.md },
  toast: {
    position: 'absolute',
    start: space.lg,
    end: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
