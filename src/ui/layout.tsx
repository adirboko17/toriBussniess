import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '@/lib/theme';
import { OfflineBanner } from './states';

/** Scrollable screen body with pull-to-refresh and room for the home indicator. */
export function ScreenScroll({
  children,
  refreshing,
  onRefresh,
  contentStyle,
  bottomInset = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  bottomInset?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.page }}
      contentContainerStyle={[
        { padding: space.lg, gap: space.lg, paddingBottom: space.xxl + (bottomInset ? insets.bottom : 0) },
        contentStyle,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.muted} />
        ) : undefined
      }
    >
      <OfflineBanner />
      {children}
    </ScrollView>
  );
}

/** Form body that keeps the focused field, and the footer actions, above the keyboard. */
export function FormScroll({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, space.md);
  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
      <KeyboardAwareScrollView
        bottomOffset={footer ? 110 : 24}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: space.lg,
          gap: space.lg,
          paddingBottom: footer ? space.xxl : space.xxl + insets.bottom,
        }}
      >
        <OfflineBanner />
        {children}
      </KeyboardAwareScrollView>
      {footer ? (
        <KeyboardStickyView offset={{ closed: 0, opened: bottomPad - space.md }}>
          <View
            style={{
              paddingHorizontal: space.lg,
              paddingTop: space.md,
              paddingBottom: bottomPad,
              backgroundColor: theme.page,
              borderTopWidth: 0.5,
              borderTopColor: theme.border,
              gap: space.sm,
            }}
          >
            {footer}
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}
