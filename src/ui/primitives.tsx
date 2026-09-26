import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radius, space, toneColors, useTheme, type Tone } from '@/lib/theme';
import { Text } from './Text';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={color ?? theme.text} />;
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: padded ? space.lg : 0,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [base, pressed && { opacity: 0.7 }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const theme = useTheme();
  const colors = toneColors(theme, tone);
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={colors.fg} /> : null}
      <Text variant="caption" weight="medium" color={colors.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  size = 'md',
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.primary, fg: theme.onPrimary, border: theme.primary },
    secondary: { bg: theme.card, fg: theme.text, border: theme.border },
    danger: { bg: theme.dangerBg, fg: theme.danger, border: theme.dangerBg },
    ghost: { bg: 'transparent', fg: theme.link, border: 'transparent' },
  };
  const colors = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        { backgroundColor: colors.bg, borderColor: colors.border },
        pressed && { opacity: 0.75 },
        inactive && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={colors.fg} /> : null}
          <Text variant={size === 'sm' ? 'small' : 'body'} weight="semibold" color={colors.fg} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
  disabled,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }, disabled && { opacity: 0.4 }]}
    >
      <Ionicons name={icon} size={22} color={color ?? theme.text} />
    </Pressable>
  );
}

export function Section({ title, action, children, style }: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: space.sm }, style]}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? (
            <Text variant="label" tone="muted" style={{ flex: 1 }}>
              {title}
            </Text>
          ) : null}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Row({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  chevron = !!onPress,
  destructive,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
}) {
  const theme = useTheme();
  const content = (
    <>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="medium" tone={destructive ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="muted">
            {subtitle}
          </Text>
        ) : null}
        {meta}
      </View>
      {trailing}
      {chevron ? <Ionicons name="chevron-back" size={18} color={theme.faint} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.sunken }]}
    >
      {content}
    </Pressable>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginStart: inset }} />;
}

export function KeyValue({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <View style={styles.keyValue}>
      <Text variant="small" tone="muted" style={{ minWidth: 110 }}>
        {label}
      </Text>
      <View style={{ flex: 1 }}>{children ?? <Text weight="medium">{value || '—'}</Text>}</View>
    </View>
  );
}

const AVATAR_COLORS = ['#bfff51', '#6bff85', '#0cffbe', '#ffd166', '#9ad1ff', '#ffb3c7'];

export function Avatar({ uri, name, size = 44, color }: { uri?: string | null; name?: string | null; size?: number; color?: string | null }) {
  const theme = useTheme();
  const letter = String(name ?? '').trim().charAt(0) || '·';
  const fallback = color || AVATAR_COLORS[letter.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: fallback,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.border,
      }}
    >
      <Text weight="bold" color="#171616" style={{ fontSize: size * 0.4, lineHeight: size * 0.52 }} center>
        {letter}
      </Text>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
        />
      ) : null}
    </View>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  onPress,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone?: Tone;
  onPress?: () => void;
  loading?: boolean;
}) {
  const theme = useTheme();
  const colors = toneColors(theme, tone);
  return (
    <Card onPress={onPress} style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: colors.bg }]}>
        <Ionicons name={icon} size={18} color={colors.fg} />
      </View>
      <Text variant="small" tone="muted" numberOfLines={2}>
        {label}
      </Text>
      {loading ? (
        <View style={{ height: 30, justifyContent: 'center', alignItems: 'flex-start' }}>
          <ActivityIndicator color={theme.muted} />
        </View>
      ) : (
        <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      )}
      {hint ? (
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

export function Fab({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: theme.accent, bottom: space.lg },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <Ionicons name={icon} size={22} color={theme.onAccent} />
      <Text weight="semibold" color={theme.onAccent}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonSm: { minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.sm },
  iconButton: { padding: 6, borderRadius: radius.pill },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    minHeight: 56,
  },
  keyValue: { flexDirection: 'row', gap: space.md, paddingVertical: 6, alignItems: 'flex-start' },
  stat: { flex: 1, minWidth: 150, gap: 4 },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    end: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    height: 52,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
